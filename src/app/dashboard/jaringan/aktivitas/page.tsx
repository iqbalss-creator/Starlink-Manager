'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Activity,
  RefreshCw,
  Search,
  Smartphone,
  Laptop,
  Wifi,
  Globe,
  Tv,
  MessageCircle,
  Camera,
  Gamepad2,
  ShoppingCart,
  UserX,
  ExternalLink,
  Info,
  Clock,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  Radio,
  Eye,
  SlidersHorizontal,
  Layers,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// ─── HELPER FORMATTERS ──────────────────────────────────────────────────────

function formatBytes(bytes: number) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatUptime(uptime: string) {
  if (!uptime) return '0s'
  return uptime.replace('w', 'mgg ').replace('d', 'h ').replace('h', 'j ').replace('m', 'm ').replace('s', 'd')
}

// ─── DOMAIN CATEGORIZER ─────────────────────────────────────────────────────

function categorizeDomain(domain: string) {
  const d = domain.toLowerCase()
  if (d.includes('youtube') || d.includes('googlevideo') || d.includes('ytimg') || d.includes('netflix') || d.includes('vidio.com')) {
    return { name: 'YouTube / Video', category: 'Streaming Video', icon: Tv, color: 'bg-red-500/10 text-red-500 border-red-500/20' }
  }
  if (d.includes('tiktok') || d.includes('byteoversea') || d.includes('ibytedtos') || d.includes('tiktokcdn')) {
    return { name: 'TikTok', category: 'Media Sosial', icon: Radio, color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20' }
  }
  if (d.includes('whatsapp') || d.includes('wa.me')) {
    return { name: 'WhatsApp', category: 'Chat & Komunikasi', icon: MessageCircle, color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' }
  }
  if (d.includes('instagram') || d.includes('facebook') || d.includes('fbcdn') || d.includes('cdninstagram')) {
    return { name: 'Instagram / FB', category: 'Media Sosial', icon: Camera, color: 'bg-pink-500/10 text-pink-500 border-pink-500/20' }
  }
  if (d.includes('mobilelegends') || d.includes('garena') || d.includes('freefire') || d.includes('pubg') || d.includes('roblox') || d.includes('riotgames') || d.includes('steam')) {
    return { name: 'Game Online', category: 'Gaming', icon: Gamepad2, color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' }
  }
  if (d.includes('shopee') || d.includes('tokopedia') || d.includes('lazada') || d.includes('blibli')) {
    return { name: 'E-Commerce', category: 'Belanja', icon: ShoppingCart, color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' }
  }
  if (d.includes('google') || d.includes('gstatic') || d.includes('googleapis') || d.includes('cloudflare')) {
    return { name: 'Google / Cloud', category: 'Web Service', icon: Globe, color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' }
  }
  return { name: domain, category: 'Web Browsing', icon: Globe, color: 'bg-slate-500/10 text-slate-500 border-slate-500/20' }
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

export default function CustomerActivityPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [recentDomains, setRecentDomains] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [autoRefreshSec, setAutoRefreshSec] = useState(5)
  const [selectedUser, setSelectedUser] = useState<any | null>(null)
  const [kickingId, setKickingId] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true)
    try {
      const res = await fetch('/api/mikrotik?action=customer-activity')
      const json = await res.json()
      if (json.success && json.data) {
        setUsers(json.data.users || [])
        setRecentDomains(json.data.recentDomains || [])
        setLastUpdated(new Date())
        setError(null)
      } else {
        setError(json.error || 'Gagal mengambil data dari MikroTik')
      }
    } catch (err: any) {
      setError(err.message || 'Koneksi ke server gagal')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (autoRefreshSec <= 0) return
    const timer = setInterval(() => {
      fetchData()
    }, autoRefreshSec * 1000)
    return () => clearInterval(timer)
  }, [autoRefreshSec, fetchData])

  const handleKickUser = async (user: any) => {
    if (!confirm(`Apakah Anda yakin ingin memutus koneksi (kick) pelanggan "${user.username}"?`)) return
    setKickingId(user.id)
    try {
      const res = await fetch('/api/mikrotik', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'kick-user', params: { id: user.id, name: user.username, ip: user.ip } }),
      })
      const json = await res.json()
      if (json.success) {
        setUsers(prev => prev.filter(u => u.id !== user.id))
        if (selectedUser?.id === user.id) setSelectedUser(null)
      } else {
        alert('Gagal kick user: ' + json.error)
      }
    } catch (e: any) {
      alert('Error: ' + e.message)
    } finally {
      setKickingId(null)
    }
  }

  // Summary Metrics
  const totalDownload = useMemo(() => users.reduce((acc, u) => acc + (u.bytesOut || 0), 0), [users])
  const totalUpload = useMemo(() => users.reduce((acc, u) => acc + (u.bytesIn || 0), 0), [users])
  const mobileCount = useMemo(() => users.filter(u => !u.osFormatted?.includes('Windows')).length, [users])
  const pcCount = useMemo(() => users.filter(u => u.osFormatted?.includes('Windows')).length, [users])

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSearch =
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.deviceName && u.deviceName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.ip && u.ip.includes(searchQuery)) ||
        (u.mac && u.mac.toLowerCase().includes(searchQuery.toLowerCase()))

      return matchSearch
    })
  }, [users, searchQuery])

  // Top Domain Categories
  const domainCategorySummary = useMemo(() => {
    const counts: Record<string, { count: number; info: any }> = {}
    recentDomains.forEach(domain => {
      const cat = categorizeDomain(domain)
      if (!counts[cat.name]) {
        counts[cat.name] = { count: 0, info: cat }
      }
      counts[cat.name].count += 1
    })
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 6)
  }, [recentDomains])

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Aktivitas Pelanggan (Live Monitor)
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1 font-medium">
            Pantau perangkat, konsumsi kuota, dan akses domain pelanggan hotspot secara real-time
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Auto Refresh selector */}
          <div className="flex items-center bg-muted rounded-xl p-1 text-xs font-semibold">
            <span className="px-2.5 text-muted-foreground">Auto:</span>
            {[
              { label: '3d', val: 3 },
              { label: '5d', val: 5 },
              { label: '10d', val: 10 },
              { label: 'Off', val: 0 },
            ].map(item => (
              <button
                key={item.label}
                onClick={() => setAutoRefreshSec(item.val)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  autoRefreshSec === item.val
                    ? 'bg-card text-foreground shadow-sm font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <Button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="bg-[#00A76F] hover:bg-[#007867] text-white rounded-xl gap-2 font-semibold shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Memuat...' : 'Refresh'}</span>
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl flex items-center gap-3 text-sm">
          <Info className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-2xl p-5 shadow-[rgba(145,158,171,0.15)_0px_0px_2px_0px,rgba(145,158,171,0.08)_0px_12px_24px_-4px] dark:border border-border/50">
          <div className="flex justify-between items-start">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">User Online</div>
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <div className="text-2xl font-black text-foreground mt-2">{users.length} <span className="text-sm font-normal text-muted-foreground">Pelanggan</span></div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-blue-500" /> {mobileCount} HP / Mobile • <Laptop className="w-3.5 h-3.5 text-purple-500" /> {pcCount} PC
          </div>
        </div>

        <div className="bg-card rounded-2xl p-5 shadow-[rgba(145,158,171,0.15)_0px_0px_2px_0px,rgba(145,158,171,0.08)_0px_12px_24px_-4px] dark:border border-border/50">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Download</div>
          <div className="text-2xl font-black text-[#00A76F] mt-2 flex items-center gap-1">
            <ArrowDownRight className="w-6 h-6 shrink-0" />
            {formatBytes(totalDownload)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Akumulasi traffic masuk sesi aktif</div>
        </div>

        <div className="bg-card rounded-2xl p-5 shadow-[rgba(145,158,171,0.15)_0px_0px_2px_0px,rgba(145,158,171,0.08)_0px_12px_24px_-4px] dark:border border-border/50">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Upload</div>
          <div className="text-2xl font-black text-[#FF5630] mt-2 flex items-center gap-1">
            <ArrowUpRight className="w-6 h-6 shrink-0" />
            {formatBytes(totalUpload)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Akumulasi traffic keluar sesi aktif</div>
        </div>

        <div className="bg-card rounded-2xl p-5 shadow-[rgba(145,158,171,0.15)_0px_0px_2px_0px,rgba(145,158,171,0.08)_0px_12px_24px_-4px] dark:border border-border/50">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status Jaringan</div>
          <div className="text-2xl font-black text-emerald-500 mt-2 flex items-center gap-1.5">
            <Wifi className="w-5 h-5" /> Normal
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {lastUpdated ? `Sync: ${lastUpdated.toLocaleTimeString('id-ID')}` : 'Sinkronisasi...'}
          </div>
        </div>
      </div>

      {/* Top Active Services Bar */}
      {domainCategorySummary.length > 0 && (
        <div className="bg-card rounded-2xl p-5 shadow-[rgba(145,158,171,0.15)_0px_0px_2px_0px,rgba(145,158,171,0.08)_0px_12px_24px_-4px] dark:border border-border/50">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-foreground">Layanan / Platform yang Sedang Ramai Diakses di Jaringan</h2>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {domainCategorySummary.map((item, idx) => {
              const Icon = item.info.icon
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-semibold ${item.info.color}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.info.name}</span>
                  <span className="opacity-70 bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded-full text-[10px]">
                    {item.count} request
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan kode voucher, nama perangkat (vivo, iPhone, dll), IP, atau MAC..."
            className="pl-10 h-11 rounded-xl bg-card border-border/60"
          />
        </div>
      </div>

      {/* Customer Activity Table */}
      <div className="bg-card rounded-2xl shadow-[rgba(145,158,171,0.15)_0px_0px_2px_0px,rgba(145,158,171,0.08)_0px_12px_24px_-4px] dark:border border-border/50 overflow-hidden">
        <div className="p-5 border-b border-border/50 flex justify-between items-center">
          <div className="font-bold text-base text-foreground flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            Daftar Pelanggan Online ({filteredUsers.length})
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Menghubungkan ke MikroTik & menganalisis aktivitas pelanggan...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
            <Smartphone className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-sm font-medium">Tidak ada pelanggan aktif yang sesuai dengan pencarian Anda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-[11px] font-bold uppercase tracking-wider bg-muted/50 text-muted-foreground border-b border-border/50">
                <tr>
                  <th className="px-5 py-3.5">PELANGGAN / VOUCHER</th>
                  <th className="px-5 py-3.5">PERANGKAT & OS</th>
                  <th className="px-5 py-3.5">IP & MAC ADDRESS</th>
                  <th className="px-5 py-3.5">WAKTU AKTIF</th>
                  <th className="px-5 py-3.5">TOTAL TRAFFIC</th>
                  <th className="px-5 py-3.5 text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredUsers.map((user) => {
                  const isWindows = user.osFormatted?.includes('Windows')
                  const totalData = (user.bytesIn || 0) + (user.bytesOut || 0)

                  return (
                    <tr key={user.id} className="hover:bg-muted/40 transition-colors">
                      {/* Customer / Voucher */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-foreground flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span>{user.username}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Metode: <span className="font-medium text-foreground/80">{user.loginBy}</span>
                        </div>
                      </td>

                      {/* Device & OS */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {isWindows ? (
                            <Laptop className="w-4 h-4 text-purple-500 shrink-0" />
                          ) : (
                            <Smartphone className="w-4 h-4 text-blue-500 shrink-0" />
                          )}
                          <span className="font-semibold text-foreground">{user.deviceName}</span>
                        </div>
                        {user.osFormatted && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {user.osFormatted}
                          </div>
                        )}
                      </td>

                      {/* IP & MAC */}
                      <td className="px-5 py-4">
                        <div className="font-mono text-xs font-semibold text-foreground">
                          {user.ip}
                        </div>
                        <div className="font-mono text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <span>{user.mac}</span>
                          {user.isRandomMac && (
                            <span className="px-1.5 py-0.2 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] rounded font-sans font-bold">
                              MAC Acak
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Uptime */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 font-medium text-foreground text-xs">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{formatUptime(user.uptime)}</span>
                        </div>
                      </td>

                      {/* Traffic */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-foreground text-xs">
                          {formatBytes(totalData)}
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                          <span className="text-[#00A76F]">⬇️ {formatBytes(user.bytesOut)}</span>
                          <span className="text-[#FF5630]">⬆️ {formatBytes(user.bytesIn)}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedUser(user)}
                            className="h-8 px-3 rounded-lg text-xs gap-1.5 font-semibold"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Detail
                          </Button>

                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={kickingId === user.id}
                            onClick={() => handleKickUser(user)}
                            className="h-8 px-3 rounded-lg text-xs gap-1.5 font-semibold"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            {kickingId === user.id ? 'Memutus...' : 'Kick'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Detail Modal Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              Detail Aktivitas: {selectedUser?.username}
            </DialogTitle>
            <DialogDescription>
              Rincian koneksi perangkat dan statistik sesi internet live
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4 text-sm mt-3">
              {/* Device Box */}
              <div className="bg-muted/50 p-4 rounded-xl space-y-2 border border-border/40">
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-xs">Perangkat:</span>
                  <span className="font-semibold">{selectedUser.deviceName}</span>
                </div>
                {selectedUser.osFormatted && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-xs">Sistem Operasi:</span>
                    <span className="font-medium">{selectedUser.osFormatted}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-xs">IP Address:</span>
                  <span className="font-mono font-semibold">{selectedUser.ip}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-xs">MAC Address:</span>
                  <span className="font-mono text-xs">{selectedUser.mac} {selectedUser.isRandomMac ? '(Private MAC)' : ''}</span>
                </div>
              </div>

              {/* Session Box */}
              <div className="bg-muted/50 p-4 rounded-xl space-y-2 border border-border/40">
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-xs">Durasi Sesi Aktif:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatUptime(selectedUser.uptime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-xs">Metode Login:</span>
                  <span className="font-medium">{selectedUser.loginBy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-xs">Download:</span>
                  <span className="font-semibold text-[#00A76F]">{formatBytes(selectedUser.bytesOut)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-xs">Upload:</span>
                  <span className="font-semibold text-[#FF5630]">{formatBytes(selectedUser.bytesIn)}</span>
                </div>
              </div>

              {/* Action Buttons in Modal */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="destructive"
                  className="w-full rounded-xl gap-2 font-semibold"
                  onClick={() => handleKickUser(selectedUser)}
                >
                  <UserX className="w-4 h-4" />
                  Putus Koneksi User Ini
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
