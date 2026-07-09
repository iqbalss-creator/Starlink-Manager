import { Info, GitBranch, Globe, Shield, Code2 } from 'lucide-react'

export default function TentangPage() {
  const features = [
    'Manajemen pelanggan Starlink lengkap',
    'Pencatatan pembayaran multi-metode (Tunai, Transfer, QRIS)',
    'Reminder tagihan otomatis & manual',
    'Laporan keuangan dengan grafik interaktif',
    'Kirim pesan WhatsApp langsung dari aplikasi',
    'Monitoring MikroTik router via RouterOS API',
    'Dashboard statistik real-time',
    'Accordion navigation 7 menu',
    'Dark mode & Light mode',
  ]

  const changelog = [
    { version: 'v0.1.0', date: 'Jul 2026', changes: ['Accordion sidebar 7 menu', 'Grafik pendapatan & customer', 'Search & Filter customer', 'Export CSV', 'Metode QRIS', 'Modul Laporan', 'Modul Komunikasi WA', 'MikroTik integration', 'Halaman Pengaturan', 'Auto Logout Timer', 'Custom Logo & Nama Aplikasi'] },
  ]

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Info className="w-5 h-5 text-[#00A76F]" />
          <h1 className="text-[24.5px] font-semibold text-foreground tracking-tight">Tentang Aplikasi</h1>
        </div>
        <p className="text-sm text-muted-foreground font-medium">
          Informasi versi dan lisensi Allstar Manager
        </p>
      </div>

      {/* App info card */}
      <div className="bg-card rounded-2xl p-6 shadow-[rgba(145,158,171,0.2)_0px_0px_2px_0px,rgba(145,158,171,0.12)_0px_12px_24px_-4px] dark:shadow-none dark:border">
        <div className="flex items-center gap-4 mb-6">
          <img src="/icon.png" alt="Allstar Manager Logo" className="w-16 h-16 object-contain drop-shadow-md" />
          <div>
            <h2 className="text-xl font-bold">Allstar Manager</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="bg-[#C8FAD6] text-[#007867] px-2 py-0.5 rounded-full text-xs font-bold">v0.1.0</span>
              <span className="text-xs text-muted-foreground">Rilis: Juli 2026</span>
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Allstar Manager adalah aplikasi manajemen pelanggan internet berbasis Starlink. 
          Dibangun dengan Next.js 16, Supabase, dan Tailwind CSS untuk performa dan skalabilitas terbaik.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {[
            { icon: Code2, label: 'Framework', value: 'Next.js 16' },
            { icon: Shield, label: 'Database', value: 'Supabase (PostgreSQL)' },
            { icon: Globe, label: 'Styling', value: 'Tailwind CSS v4' },
            { icon: GitBranch, label: 'Lisensi', value: 'Private / Proprietary' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3 p-3 bg-muted rounded-xl">
              <item.icon className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <div className="text-xs text-muted-foreground">{item.label}</div>
                <div className="text-sm font-medium">{item.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fitur */}
      <div className="bg-card rounded-2xl p-6 shadow-[rgba(145,158,171,0.2)_0px_0px_2px_0px,rgba(145,158,171,0.12)_0px_12px_24px_-4px] dark:shadow-none dark:border">
        <h2 className="font-semibold mb-4">Fitur Utama</h2>
        <ul className="space-y-2">
          {features.map((f, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00A76F] shrink-0" />
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* Changelog */}
      <div className="bg-card rounded-2xl p-6 shadow-[rgba(145,158,171,0.2)_0px_0px_2px_0px,rgba(145,158,171,0.12)_0px_12px_24px_-4px] dark:shadow-none dark:border">
        <h2 className="font-semibold mb-4">Changelog</h2>
        <div className="flex flex-col gap-6">
          {changelog.map(entry => (
            <div key={entry.version}>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-[#C8FAD6] text-[#007867] px-2 py-0.5 rounded-full text-xs font-bold">{entry.version}</span>
                <span className="text-xs text-muted-foreground">{entry.date}</span>
              </div>
              <ul className="space-y-1 pl-2">
                {entry.changes.map((c, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex gap-2">
                    <span className="text-[#00A76F]">+</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
