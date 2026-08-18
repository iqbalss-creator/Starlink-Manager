import { NextResponse } from 'next/server'
import { mikrotikQuery, getMikrotikConfig } from '@/lib/mikrotik'

// ─── API Handler ───────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'resource'

  const { host, port, user } = await getMikrotikConfig()

  // Return config info (non-sensitive) for diagnostics
  if (action === 'config') {
    return NextResponse.json({
      host: host || '(tidak diset)',
      port: port,
      user: user,
      configured: !!host,
    })
  }

  if (!host) {
    return NextResponse.json(
      { success: false, error: 'MIKROTIK_HOST tidak dikonfigurasi di .env.local' },
      { status: 503 }
    )
  }

  const commandMap: Record<string, { cmd: string; params?: string[] }> = {
    resource:            { cmd: '/system/resource/print' },
    identity:            { cmd: '/system/identity/print' },
    interface:           { cmd: '/interface/print' },
    'hotspot-users':     { cmd: '/ip/hotspot/user/print' },
    'active-connections':{ cmd: '/ip/hotspot/active/print' },
    'ip-address':        { cmd: '/ip/address/print' },
    'ppp-active':        { cmd: '/ppp/active/print' },
    'wireless-reg':      { cmd: '/interface/wireless/registration-table/print' },
    'dhcp-leases':       { cmd: '/ip/dhcp-server/lease/print' },
    'dns-cache':         { cmd: '/ip/dns/cache/print' },
    'hotspot-hosts':     { cmd: '/ip/hotspot/host/print' },
    'cookies':           { cmd: '/ip/hotspot/cookie/print' },
  }

  // Live Comprehensive Customer Activity Monitor
  if (action === 'customer-activity') {
    try {
      const [activeUsers, dhcpLeases, dnsCache, hotspotHosts] = await Promise.all([
        mikrotikQuery('/ip/hotspot/active/print').catch(() => []),
        mikrotikQuery('/ip/dhcp-server/lease/print').catch(() => []),
        mikrotikQuery('/ip/dns/cache/print').catch(() => []),
        mikrotikQuery('/ip/hotspot/host/print').catch(() => []),
      ])

      // Extract unique active domains from DNS cache
      const recentDomains = (dnsCache as any[] || [])
        .map(d => d.name)
        .filter(Boolean)
        .filter((d, idx, arr) => arr.indexOf(d) === idx)
        .slice(0, 100)

      // Enrich each active customer with device info and activity
      const enrichedUsers = (activeUsers as any[] || []).map(u => {
        const mac = u['mac-address']
        const ip = u.address

        // Find DHCP Lease for Hostname and OS
        const lease = (dhcpLeases as any[] || []).find(l => 
          (l['mac-address'] && l['mac-address'].toLowerCase() === (mac || '').toLowerCase()) ||
          (l['active-mac-address'] && l['active-mac-address'].toLowerCase() === (mac || '').toLowerCase()) ||
          l.address === ip || l['active-address'] === ip
        )

        // Find Host for bridge port and rates
        const host = (hotspotHosts as any[] || []).find(h => 
          (h['mac-address'] && h['mac-address'].toLowerCase() === (mac || '').toLowerCase()) ||
          h.address === ip || h['to-address'] === ip
        )

        let deviceName = lease?.['host-name'] || lease?.['active-host-name'] || null
        const osClass = lease?.['class-id'] || null
        let osFormatted = null
        if (osClass) {
          if (osClass.startsWith('android-dhcp-')) osFormatted = `Android ${osClass.replace('android-dhcp-', '')}`
          else if (osClass.includes('MSFT')) osFormatted = 'Windows PC'
          else if (osClass.toLowerCase().includes('apple') || osClass.toLowerCase().includes('ios')) osFormatted = 'Apple iOS'
          else osFormatted = osClass
        }

        if (!deviceName && osFormatted) deviceName = `${osFormatted} Device`
        if (!deviceName) deviceName = 'Perangkat Mobile'

        // Check Randomized MAC
        const isRandomMac = mac && ['2', '6', 'A', 'E'].includes(mac[1]?.toUpperCase())

        return {
          id: u['.id'],
          username: u.user,
          ip: u.address,
          mac: u['mac-address'],
          isRandomMac,
          uptime: u.uptime,
          idleTime: u['idle-time'],
          bytesIn: parseInt(u['bytes-in'] || '0'),
          bytesOut: parseInt(u['bytes-out'] || '0'),
          loginBy: u['login-by'] || 'HTTP',
          deviceName,
          osFormatted,
          dhcpStatus: lease?.status || 'bound',
          server: u.server || 'hotspot',
          comment: u.comment || '',
        }
      })

      return NextResponse.json({
        success: true,
        data: {
          totalActive: enrichedUsers.length,
          users: enrichedUsers,
          recentDomains: recentDomains.slice(0, 50),
          timestamp: new Date().toISOString()
        }
      })
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 })
    }
  }

  let entry = commandMap[action]
  
  if (action === 'monitor-traffic') {
    const iface = searchParams.get('interface') || 'bridge hotspot ptp'
    entry = { cmd: '/interface/monitor-traffic', params: [`=interface=${iface}`, '=once='] }
  }

  if (!entry) {
    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  }

  try {
    const data = await mikrotikQuery(entry.cmd, entry.params)
    return NextResponse.json({ success: true, data, host, port })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message, host, port },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const { host } = await getMikrotikConfig()
  if (!host) {
    return NextResponse.json({ success: false, error: 'MIKROTIK_HOST tidak dikonfigurasi' }, { status: 503 })
  }

  try {
    const body = await request.json()
    const { action, params } = body

    if (!action) {
      return NextResponse.json({ success: false, error: 'Action is required' }, { status: 400 })
    }

    // Convert action to MikroTik command
    let cmd = ''
    let cmdParams: string[] = []

    switch (action) {
      case 'add-user':
        cmd = '/ip/hotspot/user/add'
        cmdParams = [
          `=name=${params.name}`,
          `=password=${params.password}`,
          `=profile=${params.profile || 'default'}`,
          `=comment=${params.comment || ''}`
        ]
        break
      case 'enable-user':
        cmd = '/ip/hotspot/user/enable'
        cmdParams = [`=numbers=${params.name}`] // Hotspot user enable uses numbers matching the name usually, or we can use set disabled=no
        // Actually, safer to use set disabled=no if numbers doesn't match name directly, but `numbers` accepts item names in RouterOS 6+
        break
      case 'disable-user':
        cmd = '/ip/hotspot/user/disable'
        cmdParams = [`=numbers=${params.name}`]
        break
      case 'remove-scheduler':
        cmd = '/system/scheduler/remove'
        cmdParams = [`=numbers=${params.name}`]
        break
      case 'add-scheduler':
        cmd = '/system/scheduler/add'
        cmdParams = [
          `=name=${params.name}`,
          `=start-date=${params.startDate}`,
          `=start-time=${params.startTime}`,
          `=on-event=${params.onEvent}`
        ]
        break
      case 'kick-user': {
        const active = await mikrotikQuery('/ip/hotspot/active/print') as any[]
        const target = active.find((u: any) => u.user === params.name || u.address === params.ip || u['.id'] === params.id)
        if (target && target['.id']) {
          cmd = '/ip/hotspot/active/remove'
          cmdParams = [`=.id=${target['.id']}`]
        } else {
          return NextResponse.json({ success: true, message: 'User is already offline' })
        }
        break
      }
      case 'raw':
        cmd = params.cmd
        cmdParams = params.args || []
        break
      default:
        return NextResponse.json({ success: false, error: `Unknown POST action: ${action}` }, { status: 400 })
    }

    const data = await mikrotikQuery(cmd, cmdParams)
    return NextResponse.json({ success: true, data })

  } catch (error) {
    // Some commands like /remove might fail if item doesn't exist, we can ignore or return error
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}
