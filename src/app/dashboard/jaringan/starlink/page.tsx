import { Satellite, Info } from 'lucide-react'

export default function StarlinkPage() {
  const starlinkConfigured = !!process.env.STARLINK_API_URL

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Satellite className="w-5 h-5 text-[#00A76F]" />
          <h1 className="text-[24.5px] font-semibold text-foreground tracking-tight">Starlink</h1>
        </div>
        <p className="text-sm text-muted-foreground font-medium">
          Monitoring perangkat dan performa Starlink dish
        </p>
      </div>

      {/* Info card */}
      <div className="bg-card rounded-2xl p-8 shadow-[rgba(145,158,171,0.2)_0px_0px_2px_0px,rgba(145,158,171,0.12)_0px_12px_24px_-4px] dark:shadow-none dark:border">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Info className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-lg mb-2">Integrasi Starlink API</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Untuk monitoring Starlink dish secara real-time (status online/offline, latency, kecepatan, data usage), 
              diperlukan akses ke Starlink gRPC API yang berjalan secara lokal di dish Anda.
            </p>
            <div className="bg-muted rounded-lg p-4 text-sm space-y-2">
              <p className="font-medium">Cara mengakses Starlink local API:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 text-xs">
                <li>Hubungkan perangkat ke jaringan Starlink</li>
                <li>API tersedia di: <code className="bg-background px-1 rounded">192.168.100.1:9201</code></li>
                <li>Protocol: gRPC (diperlukan library grpc-web atau grpc-node)</li>
                <li>Endpoint: <code className="bg-background px-1 rounded">SpaceX.API.Device.Device/Handle</code></li>
              </ul>
            </div>
            <div className="mt-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-lg p-3 text-xs text-amber-700 dark:text-amber-400">
              <strong>Coming Soon:</strong> Integrasi penuh Starlink local gRPC API akan segera tersedia. 
              Tambahkan <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">STARLINK_API_URL</code> ke .env.local jika Anda punya proxy.
            </div>
          </div>
        </div>
      </div>

      {/* Placeholder metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Status Dish', value: '— —', sub: 'Belum terhubung' },
          { label: 'Latency', value: '— ms', sub: 'Avg latency' },
          { label: 'Download', value: '— Mbps', sub: 'Download speed' },
          { label: 'Upload', value: '— Mbps', sub: 'Upload speed' },
        ].map(m => (
          <div key={m.label} className="bg-card p-5 rounded-2xl shadow-[rgba(145,158,171,0.2)_0px_0px_2px_0px,rgba(145,158,171,0.12)_0px_12px_24px_-4px] dark:shadow-none dark:border">
            <div className="text-[20px] font-bold text-muted-foreground/50">{m.value}</div>
            <div className="text-xs font-semibold mt-1">{m.label}</div>
            <div className="text-xs text-muted-foreground">{m.sub}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
