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
