import { createClient } from '@/utils/supabase/server'
import { CheckCircle, XCircle, AlertCircle, Database, Globe, Wifi, Activity, Router } from 'lucide-react'
import { mikrotikQuery } from '@/lib/mikrotik'

async function checkSupabase() {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('customers').select('id').limit(1)
    return error ? 'error' : 'ok'
  } catch {
    return 'error'
  }
}

export default async function MonitoringPage() {
  const supabaseStatus = await checkSupabase()
  const now = new Date().toLocaleString('id-ID')

  const mikrotikHost = process.env.MIKROTIK_HOST
  const mikrotikConfigured = !!mikrotikHost

  let resources: any = null
  if (mikrotikConfigured) {
    try {
      const resourceRes = await mikrotikQuery('/system/resource/print')
      if (resourceRes && resourceRes.length > 0) {
        resources = resourceRes[0]
      }
    } catch (e) {
      console.error('Failed to fetch mikrotik resources')
    }
  }

  const statuses = [
    {
      label: 'Supabase Database',
      description: 'Koneksi ke database utama',
      status: supabaseStatus,
      icon: Database,
    },
    {
      label: 'MikroTik Router',
      description: mikrotikConfigured ? `Host: ${mikrotikHost}` : 'Belum dikonfigurasi di .env.local',
      status: mikrotikConfigured ? 'configured' : 'unconfigured',
      icon: Wifi,
    },
    {
      label: 'Aplikasi',
      description: 'Next.js server berjalan normal',
      status: 'ok',
      icon: Globe,
    },
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
      case 'configured':
        return <CheckCircle className="w-5 h-5 text-[#00A76F]" />
      case 'unconfigured':
        return <AlertCircle className="w-5 h-5 text-amber-500" />
      default:
        return <XCircle className="w-5 h-5 text-destructive" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ok': return <span className="bg-[#C8FAD6] text-[#007867] px-2 py-0.5 rounded-full text-xs font-bold">Online</span>
      case 'configured': return <span className="bg-[#C8FAD6] text-[#007867] px-2 py-0.5 rounded-full text-xs font-bold">Dikonfigurasi</span>
      case 'unconfigured': return <span className="bg-[#FFF7CD] text-[#B76E00] px-2 py-0.5 rounded-full text-xs font-bold">Belum Dikonfigurasi</span>
      default: return <span className="bg-[#FFE7D9] text-[#B71D18] px-2 py-0.5 rounded-full text-xs font-bold">Error</span>
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[24.5px] font-semibold text-foreground tracking-tight">Monitoring Sistem</h1>
        <p className="text-sm text-muted-foreground font-medium">
          Status koneksi dan kesehatan sistem • Dicek pada {now}
        </p>
      </div>

      <div className="space-y-8">
        {/* Grup 1: Server & Aplikasi */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            Server & Aplikasi
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {statuses.filter(s => s.label !== 'MikroTik Router').map((s) => (
              <div
                key={s.label}
                className="bg-card rounded-2xl p-6 shadow-[rgba(145,158,171,0.2)_0px_0px_2px_0px,rgba(145,158,171,0.12)_0px_12px_24px_-4px] dark:shadow-none dark:border flex flex-col gap-4 border-t-4 border-t-primary"
              >
                <div className="flex justify-between items-start">
                  <div className="p-2 bg-muted rounded-xl">
                    <s.icon className="w-5 h-5 text-foreground/70" />
                  </div>
                  {getStatusIcon(s.status)}
                </div>
                <div>
                  <div className="font-semibold text-sm">{s.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.description}</div>
                </div>
                <div>{getStatusBadge(s.status)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Grup 2: MikroTik Router */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Router className="w-5 h-5 text-primary" />
            Jaringan MikroTik
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            {/* Status Koneksi */}
            {statuses.filter(s => s.label === 'MikroTik Router').map((s) => (
              <div
                key={s.label}
                className="bg-card rounded-2xl p-5 shadow-[rgba(145,158,171,0.2)_0px_0px_2px_0px,rgba(145,158,171,0.12)_0px_12px_24px_-4px] dark:shadow-none dark:border flex flex-col justify-between border-t-4 border-t-slate-500"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase">{s.label}</div>
                    {getStatusIcon(s.status)}
                  </div>
                  <div className="text-sm font-medium">{s.description}</div>
                </div>
                <div className="mt-4">{getStatusBadge(s.status)}</div>
              </div>
            ))}

            {/* Resource Monitoring MikroTik */}
            {mikrotikConfigured && resources && (
              <>
                <div className="bg-card rounded-2xl p-5 shadow-[rgba(145,158,171,0.2)_0px_0px_2px_0px,rgba(145,158,171,0.12)_0px_12px_24px_-4px] dark:shadow-none dark:border border-t-4 border-t-blue-500">
                  <div className="text-xs font-semibold text-muted-foreground uppercase">CPU Load</div>
                  <div className="text-2xl font-bold mt-1">{resources['cpu-load']}%</div>
                  <div className="text-xs text-muted-foreground mt-2">{resources['cpu']}</div>
                </div>
                <div className="bg-card rounded-2xl p-5 shadow-[rgba(145,158,171,0.2)_0px_0px_2px_0px,rgba(145,158,171,0.12)_0px_12px_24px_-4px] dark:shadow-none dark:border border-t-4 border-t-emerald-500">
                  <div className="text-xs font-semibold text-muted-foreground uppercase">Free Memory</div>
                  <div className="text-2xl font-bold mt-1">{(Number(resources['free-memory']) / 1024 / 1024).toFixed(1)} MB</div>
                  <div className="text-xs text-muted-foreground mt-2">Total {(Number(resources['total-memory']) / 1024 / 1024).toFixed(0)} MB</div>
                </div>
                <div className="bg-card rounded-2xl p-5 shadow-[rgba(145,158,171,0.2)_0px_0px_2px_0px,rgba(145,158,171,0.12)_0px_12px_24px_-4px] dark:shadow-none dark:border border-t-4 border-t-amber-500">
                  <div className="text-xs font-semibold text-muted-foreground uppercase">Uptime</div>
                  <div className="text-2xl font-bold mt-1 text-base">{resources['uptime']}</div>
                  <div className="text-xs text-muted-foreground mt-2">Sejak direstart</div>
                </div>
                <div className="bg-card rounded-2xl p-5 shadow-[rgba(145,158,171,0.2)_0px_0px_2px_0px,rgba(145,158,171,0.12)_0px_12px_24px_-4px] dark:shadow-none dark:border border-t-4 border-t-purple-500">
                  <div className="text-xs font-semibold text-muted-foreground uppercase">OS Version</div>
                  <div className="text-2xl font-bold mt-1 text-base">{resources['version']}</div>
                  <div className="text-xs text-muted-foreground mt-2">MikroTik RouterOS</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* MikroTik setup info */}
      {!mikrotikConfigured && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold text-amber-800 dark:text-amber-400 mb-2">Konfigurasi MikroTik Diperlukan</h3>
              <p className="text-sm text-amber-700 dark:text-amber-500 mb-3">
                Untuk menghubungkan MikroTik, tambahkan variabel berikut ke file <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">.env.local</code>:
              </p>
              <pre className="bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-300 p-3 rounded-lg text-xs font-mono overflow-x-auto">
{`MIKROTIK_HOST=192.168.88.1
MIKROTIK_USER=admin
MIKROTIK_PASS=your_password
MIKROTIK_PORT=8728`}
              </pre>
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-3">
                Pastikan API service aktif di MikroTik: IP → Services → api (port 8728)
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
