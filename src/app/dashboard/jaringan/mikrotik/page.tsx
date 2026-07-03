'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Router, RefreshCw, Wifi, Users, Activity, AlertCircle, CheckCircle, XCircle, Server } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts'

function TrafficMonitor({ interfaces }: { interfaces: any[] }) {
  const [selectedIface, setSelectedIface] = useState(() => {
    return interfaces.find(i => i.name.toLowerCase().includes('hotspot'))?.name || interfaces[0]?.name || ''
  })
  const [data, setData] = useState<any[]>([])
  const [downLogs, setDownLogs] = useState<{time: string, message: string}[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!selectedIface) return
    setData([]) // Reset data when interface changes
    setDownLogs([])
    
    let interval: NodeJS.Timeout
    const poll = async () => {
      try {
        const res = await fetch(`/api/mikrotik?action=monitor-traffic&interface=${encodeURIComponent(selectedIface)}`)
        const json = await res.json()
        if (json.success && json.data && json.data.length > 0) {
          const stats = json.data[0]
          const tx = parseInt(stats['tx-bits-per-second'] || '0')
          const rx = parseInt(stats['rx-bits-per-second'] || '0')
          const time = new Date().toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
          
          setData(prev => {
            const next = [...prev, { time, tx, rx, txMb: parseFloat((tx / 1000000).toFixed(2)), rxMb: parseFloat((rx / 1000000).toFixed(2)) }]
            
            // Check for internet down (3 consecutive 0s to avoid minor drops)
            if (next.length >= 3) {
              const last3 = next.slice(-3)
              if (last3.every(d => d.tx === 0 && d.rx === 0)) {
                const last4th = next.length >= 4 ? next[next.length - 4] : null
                if (!last4th || (last4th.tx > 0 || last4th.rx > 0)) {
                  setDownLogs(logs => [{ time, message: `Traffic Drop: ${selectedIface} (0 Mbps)` }, ...logs].slice(0, 50))
                }
              }
            }

            return next.slice(-60) // Keep 60 points for live view
          })
          setError('')
        } else if (json.error) {
          setError(json.error)
        }
      } catch (err) {
        setError('Gagal mengambil data traffic')
        setDownLogs(logs => [{ time: new Date().toLocaleTimeString('id-ID'), message: 'Koneksi ke router terputus/gagal' }, ...logs].slice(0, 50))
      }
    }
    
    poll()
    interval = setInterval(poll, 3000) // Diubah ke 3 detik biar gak terlalu nyepam di log MikroTik
    return () => clearInterval(interval)
  }, [selectedIface])
  
  const currentTx = data.length > 0 ? data[data.length - 1].txMb : 0
  const currentRx = data.length > 0 ? data[data.length - 1].rxMb : 0
  const maxTx = data.length > 0 ? Math.max(...data.map(d => d.txMb)) : 0
  const maxRx = data.length > 0 ? Math.max(...data.map(d => d.rxMb)) : 0

  return (
    <div className="bg-card rounded-2xl shadow-[rgba(145,158,171,0.2)_0px_0px_2px_0px,rgba(145,158,171,0.12)_0px_12px_24px_-4px] dark:shadow-none dark:border p-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold text-lg">Live Traffic</h2>
          <p className="text-sm text-muted-foreground">Monitoring bandwidth {selectedIface}</p>
        </div>
        <select 
          value={selectedIface}
          onChange={(e) => setSelectedIface(e.target.value)}
          className="bg-muted text-foreground px-3 py-2 rounded-lg text-sm font-medium border-none outline-none ring-0 cursor-pointer min-w-[200px]"
        >
          {interfaces.map(i => (
            <option key={i.name} value={i.name}>{i.name}</option>
          ))}
        </select>
      </div>
      
      {error && (
        <div className="mb-4 p-4 bg-destructive/10 text-destructive text-sm rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-muted/50 p-4 rounded-xl border border-border/50">
          <div className="text-xs text-muted-foreground mb-1 font-medium">Upload Saat Ini</div>
          <div className="text-lg font-bold text-[#FF5630]">{currentTx.toFixed(2)} Mbps</div>
        </div>
        <div className="bg-muted/50 p-4 rounded-xl border border-border/50">
          <div className="text-xs text-muted-foreground mb-1 font-medium">Download Saat Ini</div>
          <div className="text-lg font-bold text-[#00A76F]">{currentRx.toFixed(2)} Mbps</div>
        </div>
        <div className="bg-muted/50 p-4 rounded-xl border border-border/50">
          <div className="text-xs text-muted-foreground mb-1 font-medium">Max Upload</div>
          <div className="text-lg font-bold text-[#FF5630] opacity-80">{maxTx.toFixed(2)} Mbps</div>
        </div>
        <div className="bg-muted/50 p-4 rounded-xl border border-border/50">
          <div className="text-xs text-muted-foreground mb-1 font-medium">Max Download</div>
          <div className="text-lg font-bold text-[#00A76F] opacity-80">{maxRx.toFixed(2)} Mbps</div>
        </div>
      </div>

      <div className="h-[300px] w-full mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888888" strokeOpacity={0.2} />
            <XAxis dataKey="time" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} minTickGap={30} />
            <YAxis 
              stroke="#888888" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
              tickFormatter={(value) => `${value} Mbps`}
            />
            <RechartsTooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--)', color: '#ffffff' }}
              itemStyle={{ fontSize: '14px', fontWeight: '500' }}
              formatter={(value: any) => [`${value} Mbps`]}
            />
            <Line type="monotone" dataKey="rxMb" name="Download (RX)" stroke="#00A76F" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="txMb" name="Upload (TX)" stroke="#FF5630" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Down Logs */}
      {downLogs.length > 0 && (
        <div className="bg-destructive/5 rounded-xl border border-destructive/20 p-4">
          <h3 className="text-sm font-semibold text-destructive flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4" /> Log Gangguan Traffic
          </h3>
          <div className="max-h-[150px] overflow-y-auto space-y-2 text-xs">
            {downLogs.map((log, i) => (
              <div key={i} className="flex gap-3 text-muted-foreground border-b border-destructive/10 pb-2 last:border-0 last:pb-0">
                <span className="font-mono text-destructive/80 shrink-0">{log.time}</span>
                <span>{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


type MikrotikData = {
  resource?: Record<string, string>
  identity?: string
  interfaces?: Record<string, string>[]
  hotspotUsers?: Record<string, string>[]
  activeConnections?: Record<string, string>[]
}

type FetchState = 'idle' | 'loading' | 'success' | 'error'

function formatUptime(uptime: string): string {
  // MikroTik format: 1w2d3h4m5s
  return uptime || '-'
}

function formatBytes(bytes: string): string {
  const n = parseInt(bytes || '0')
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export default function MikrotikPage() {
  const [state, setState] = useState<FetchState>('idle')
  const [data, setData] = useState<MikrotikData>({})
  const [error, setError] = useState('')
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'interface' | 'hotspot' | 'traffic'>('overview')
  const [config, setConfig] = useState<{ host: string; port: number; configured: boolean } | null>(null)

  // Load config info (non-sensitive) on mount
  React.useEffect(() => {
    fetch('/api/mikrotik?action=config')
      .then(r => r.json())
      .then(j => setConfig(j))
      .catch(() => {})
  }, [])

  const fetchData = useCallback(async () => {
    setState('loading')
    setError('')
    try {
      const resRes = await fetch('/api/mikrotik?action=resource')
      const resJson = await resRes.json()
      
      const idRes = await fetch('/api/mikrotik?action=identity')
      const idJson = await idRes.json()

      const ifRes = await fetch('/api/mikrotik?action=interface')
      const ifJson = await ifRes.json()

      const hsRes = await fetch('/api/mikrotik?action=hotspot-users')
      const hsJson = await hsRes.json()

      const activeRes = await fetch('/api/mikrotik?action=active-connections')
      const activeJson = await activeRes.json()

      if (!resRes.ok || !resJson.success) {
        throw new Error(resJson.error || 'Gagal mengambil data MikroTik')
      }

      setData({
        resource: resJson.data?.[0],
        identity: idJson.data?.[0]?.name,
        interfaces: ifJson.data || [],
        hotspotUsers: hsJson.data || [],
        activeConnections: activeJson.data || [],
      })
      setLastRefresh(new Date())
      setState('success')
    } catch (e) {
      setError((e as Error).message)
      setState('error')
    }
  }, [])

  // Auto connect on mount
  useEffect(() => {
    fetchData()
  }, [fetchData])


  const TABS = [
    { id: 'overview', label: 'Overview', icon: Server },
    { id: 'interface', label: 'Interface', icon: Wifi },
    { id: 'traffic', label: 'Live Traffic', icon: Activity },
    { id: 'hotspot', label: 'Hotspot Users', icon: Users },
  ] as const

  const r = data.resource

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Router className="w-5 h-5 text-[#00A76F]" />
            <h1 className="text-[24.5px] font-semibold text-foreground tracking-tight">
              MikroTik {data.identity ? `— ${data.identity}` : ''}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            {lastRefresh
              ? `Terakhir diperbarui: ${lastRefresh.toLocaleTimeString('id-ID')}`
              : 'Klik Refresh untuk mengambil data router'}
          </p>
        </div>
        <Button
          onClick={fetchData}
          disabled={state === 'loading'}
          className="bg-[#00A76F] hover:bg-[#007867] text-white gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${state === 'loading' ? 'animate-spin' : ''}`} />
          {state === 'loading' ? 'Mengambil...' : 'Refresh'}
        </Button>
      </div>

      {/* Error */}
      {state === 'error' && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
            <div className="w-full">
              <h3 className="font-semibold text-destructive mb-1">Koneksi Gagal</h3>
              <p className="text-sm text-destructive/80 mb-3">{error}</p>
              <div className="bg-muted rounded-lg p-3 text-xs font-mono text-muted-foreground space-y-1">
                <div><span className="text-foreground">Host:</span> {config?.host || '(tidak diset)'}</div>
                <div><span className="text-foreground">Port:</span> {config?.port}</div>
                <div className="pt-2 text-muted-foreground/70">Pastikan API service aktif di MikroTik:</div>
                <div className="text-muted-foreground/70">IP → Services → centang &quot;api&quot;</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Idle */}
      {state === 'idle' && (
        <div className="bg-card rounded-2xl p-10 text-center shadow-[rgba(145,158,171,0.2)_0px_0px_2px_0px,rgba(145,158,171,0.12)_0px_12px_24px_-4px] dark:shadow-none dark:border">
          <Router className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground text-sm mb-4">Klik tombol Refresh untuk mengambil data dari MikroTik router Anda</p>
          <Button onClick={fetchData} className="bg-[#00A76F] hover:bg-[#007867] text-white">
            Hubungkan Router
          </Button>
        </div>
      )}

      {/* Success — Data */}
      {state === 'success' && r && (
        <>
          {/* Status cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'CPU Load', value: `${r['cpu-load'] || 0}%`, color: parseInt(r['cpu-load'] || '0') > 80 ? 'text-destructive' : 'text-[#00A76F]' },
              { label: 'Memory', value: formatBytes(r['free-memory'] || '0') + ' free', color: 'text-primary' },
              { label: 'Uptime', value: formatUptime(r['uptime'] || ''), color: 'text-amber-500' },
              { label: 'Platform', value: r['board-name'] || r['platform'] || '-', color: 'text-muted-foreground' },
            ].map(m => (
              <div key={m.label} className="bg-card p-5 rounded-2xl shadow-[rgba(145,158,171,0.2)_0px_0px_2px_0px,rgba(145,158,171,0.12)_0px_12px_24px_-4px] dark:shadow-none dark:border">
                <div className={`text-[18px] font-bold ${m.color}`}>{m.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{m.label}</div>
              </div>
            ))}
          </div>

          {/* More resource info */}
          <div className="bg-card rounded-2xl p-6 shadow-[rgba(145,158,171,0.2)_0px_0px_2px_0px,rgba(145,158,171,0.12)_0px_12px_24px_-4px] dark:shadow-none dark:border">
            <h2 className="font-semibold mb-4">System Resource</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              {[
                ['Versi RouterOS', r['version'] || '-'],
                ['Architecture', r['architecture-name'] || '-'],
                ['CPU', r['cpu'] || '-'],
                ['CPU Count', r['cpu-count'] || '-'],
                ['Total Memory', formatBytes(r['total-memory'] || '0')],
                ['HDD Free', formatBytes(r['free-hdd-space'] || '0')],
                ['HDD Total', formatBytes(r['total-hdd-space'] || '0')],
                ['Bad Blocks', r['bad-blocks'] || '0'],
                ['Write Sect', r['write-sect-total'] || '-'],
              ].map(([key, val]) => (
                <div key={key} className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">{key}</span>
                  <span className="font-medium">{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit max-w-full overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === tab.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Interfaces */}
          {activeTab === 'interface' && (
            <div className="bg-card rounded-2xl shadow-[rgba(145,158,171,0.2)_0px_0px_2px_0px,rgba(145,158,171,0.12)_0px_12px_24px_-4px] dark:shadow-none dark:border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="text-[12px] font-semibold bg-muted border-b border-border">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 sm:py-4">STATUS</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4">NAMA</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4">TYPE</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4">TX</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4">RX</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.interfaces || []).map((iface, i) => (
                    <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/50">
                      <td className="px-3 sm:px-6 py-2 sm:py-3 text-center">
                        {iface.running === 'true'
                          ? <CheckCircle className="w-4 h-4 text-[#00A76F] inline" />
                          : <XCircle className="w-4 h-4 text-muted-foreground inline" />
                        }
                      </td>
                      <td className="px-3 sm:px-6 py-2 sm:py-3 font-semibold">{iface.name}</td>
                      <td className="px-3 sm:px-6 py-2 sm:py-3 text-muted-foreground">{iface.type}</td>
                      <td className="px-3 sm:px-6 py-2 sm:py-3 text-muted-foreground">{formatBytes(iface['tx-byte'] || '0')}</td>
                      <td className="px-3 sm:px-6 py-2 sm:py-3 text-muted-foreground">{formatBytes(iface['rx-byte'] || '0')}</td>
                    </tr>
                  ))}
                  {(data.interfaces || []).length === 0 && (
                    <tr><td colSpan={5} className="px-3 sm:px-6 py-6 text-center text-muted-foreground">Tidak ada interface.</td></tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>
          )}

          {/* Traffic Tab */}
          {activeTab === 'traffic' && (
            <TrafficMonitor interfaces={data.interfaces || []} />
          )}

          {/* Hotspot Users */}
          {activeTab === 'hotspot' && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="text-sm font-semibold">
                  {data.activeConnections?.length || 0} user aktif
                </div>
                <span className="text-muted-foreground">•</span>
                <div className="text-sm text-muted-foreground">
                  {data.hotspotUsers?.length || 0} total user
                </div>
              </div>
              <div className="bg-card rounded-2xl shadow-[rgba(145,158,171,0.2)_0px_0px_2px_0px,rgba(145,158,171,0.12)_0px_12px_24px_-4px] dark:shadow-none dark:border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="text-[12px] font-semibold bg-muted border-b border-border">
                      <tr>
                        <th className="px-3 sm:px-6 py-3 sm:py-4">USERNAME</th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4">PROFILE</th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-center">STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const activeUsers = (data.hotspotUsers || []).filter(user => 
                          (data.activeConnections || []).some(a => a.user === user.name)
                        );

                        if (activeUsers.length === 0) {
                          return (
                            <tr>
                              <td colSpan={3} className="px-3 sm:px-6 py-6 text-center text-muted-foreground">
                                Tidak ada user yang sedang aktif.
                              </td>
                            </tr>
                          );
                        }

                        return activeUsers.map((user, i) => (
                          <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/50">
                            <td className="px-3 sm:px-6 py-2 sm:py-3 font-semibold">{user.name}</td>
                            <td className="px-3 sm:px-6 py-2 sm:py-3 text-muted-foreground">{user.profile || '-'}</td>
                            <td className="px-3 sm:px-6 py-2 sm:py-3 text-center">
                              <span className="bg-[#C8FAD6] text-[#007867] px-2 py-0.5 rounded-full text-xs font-bold">Online</span>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Overview tab */}
          {activeTab === 'overview' && (
            <div className="bg-card rounded-2xl p-6 shadow-[rgba(145,158,171,0.2)_0px_0px_2px_0px,rgba(145,158,171,0.12)_0px_12px_24px_-4px] dark:shadow-none dark:border flex items-center gap-4">
              <Activity className="w-5 h-5 text-[#00A76F] shrink-0" />
              <div className="text-sm text-muted-foreground">
                Pilih tab <strong className="text-foreground">Interface</strong> atau <strong className="text-foreground">Hotspot Users</strong> untuk detail lebih lanjut.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
