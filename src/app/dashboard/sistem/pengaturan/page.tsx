'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sliders, Save, CheckCircle } from 'lucide-react'

const STORAGE_KEY = 'starlink_app_settings'

type AppSettings = {
  appName: string
  timezone: string
  invoicePrefix: string
  invoiceStartNumber: number
  currency: string
  whatsappFooter: string
  appLogo?: string
  autoLogout: number
}

const DEFAULT_SETTINGS: AppSettings = {
  appName: 'Starlink Manager',
  timezone: 'Asia/Jakarta',
  invoicePrefix: 'INV',
  invoiceStartNumber: 1001,
  currency: 'IDR',
  whatsappFooter: 'Terima kasih telah berlangganan layanan kami.',
  autoLogout: 0,
}

export default function PengaturanPage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) })
    } catch {/* ignore */}
  }, [])

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    window.dispatchEvent(new Event('appSettingsChanged'))
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const inputClass = "h-10"

  const sections = [
    {
      title: 'Umum',
      fields: [
        {
          label: 'Nama Aplikasi',
          desc: 'Tampil di sidebar dan halaman',
          render: (
            <Input
              className={inputClass}
              value={settings.appName}
              onChange={e => setSettings(s => ({ ...s, appName: e.target.value }))}
              placeholder="Allstar Manager"
            />
          ),
        },
        {
          label: 'Logo Aplikasi',
          desc: 'Tampil di sidebar (Kosongkan untuk menggunakan icon default)',
          render: (
            <div className="flex items-center gap-4">
              {settings.appLogo ? (
                <img src={settings.appLogo} alt="Logo" className="w-10 h-10 object-contain bg-slate-50 dark:bg-slate-800 rounded p-1" />
              ) : (
                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-center text-xs text-muted-foreground">Kosong</div>
              )}
              <div className="flex flex-col gap-2 flex-1">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const reader = new FileReader()
                      reader.onload = (e) => {
                        setSettings(s => ({ ...s, appLogo: e.target?.result as string }))
                      }
                      reader.readAsDataURL(file)
                    }
                  }}
                  className="h-10 file:bg-transparent file:text-sm file:font-medium file:text-foreground"
                />
                {settings.appLogo && (
                  <Button variant="outline" size="sm" onClick={() => setSettings(s => ({ ...s, appLogo: '' }))} className="w-fit text-destructive">
                    Hapus Logo
                  </Button>
                )}
              </div>
            </div>
          ),
        },
        {
          label: 'Zona Waktu',
          desc: 'Digunakan untuk tampilan tanggal',
          render: (
            <select
              value={settings.timezone}
              onChange={e => setSettings(s => ({ ...s, timezone: e.target.value }))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="Asia/Jakarta">WIB — Asia/Jakarta (UTC+7)</option>
              <option value="Asia/Makassar">WITA — Asia/Makassar (UTC+8)</option>
              <option value="Asia/Jayapura">WIT — Asia/Jayapura (UTC+9)</option>
            </select>
          ),
        },
        {
          label: 'Mata Uang',
          desc: 'Format tampilan harga',
          render: (
            <select
              value={settings.currency}
              onChange={e => setSettings(s => ({ ...s, currency: e.target.value }))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="IDR">IDR — Rupiah (Rp)</option>
            </select>
          ),
        },
        {
          label: 'Auto Logout',
          desc: 'Waktu tidak ada aktivitas sebelum otomatis logout',
          render: (
            <select
              value={settings.autoLogout}
              onChange={e => setSettings(s => ({ ...s, autoLogout: parseInt(e.target.value) }))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="0">Tidak Pernah (Never)</option>
              <option value="5">5 Menit</option>
              <option value="15">15 Menit</option>
              <option value="30">30 Menit</option>
              <option value="60">1 Jam</option>
            </select>
          ),
        },
      ],
    },
    {
      title: 'Invoice',
      fields: [
        {
          label: 'Prefix Nomor Invoice',
          desc: 'Awalan untuk nomor invoice (misal: INV, BAGI)',
          render: (
            <Input
              className={inputClass}
              value={settings.invoicePrefix}
              onChange={e => setSettings(s => ({ ...s, invoicePrefix: e.target.value.toUpperCase() }))}
              placeholder="INV"
              maxLength={6}
            />
          ),
        },
        {
          label: 'Nomor Awal Invoice',
          desc: 'Nomor urut pertama invoice (misal: 1001)',
          render: (
            <Input
              className={inputClass}
              type="number"
              value={settings.invoiceStartNumber}
              onChange={e => setSettings(s => ({ ...s, invoiceStartNumber: parseInt(e.target.value) || 1001 }))}
            />
          ),
        },
        {
          label: 'Preview Nomor',
          desc: 'Contoh nomor invoice yang akan dihasilkan',
          render: (
            <div className="flex h-10 items-center px-3 rounded-md bg-muted text-sm font-mono">
              {settings.invoicePrefix}-{String(settings.invoiceStartNumber).padStart(4, '0')}
            </div>
          ),
        },
      ],
    },
    {
      title: 'WhatsApp',
      fields: [
        {
          label: 'Footer Pesan',
          desc: 'Ditambahkan di akhir setiap pesan otomatis',
          render: (
            <Input
              className={inputClass}
              value={settings.whatsappFooter}
              onChange={e => setSettings(s => ({ ...s, whatsappFooter: e.target.value }))}
              placeholder="Terima kasih..."
            />
          ),
        },
      ],
    },
  ]

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      {/* Header */}
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sliders className="w-5 h-5 text-[#00A76F]" />
            <h1 className="text-[24.5px] font-semibold text-foreground tracking-tight">Pengaturan</h1>
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            Konfigurasi umum aplikasi {settings.appName}
          </p>
        </div>
        <Button
          onClick={handleSave}
          className="bg-[#00A76F] hover:bg-[#007867] text-white gap-2"
        >
          {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Tersimpan!' : 'Simpan Pengaturan'}
        </Button>
      </div>

      {/* Settings sections */}
      {sections.map(section => (
        <div key={section.title} className="bg-card rounded-2xl p-6 shadow-[rgba(145,158,171,0.2)_0px_0px_2px_0px,rgba(145,158,171,0.12)_0px_12px_24px_-4px] dark:shadow-none dark:border">
          <h2 className="font-semibold text-[15px] mb-5 pb-3 border-b border-border">{section.title}</h2>
          <div className="flex flex-col gap-5">
            {section.fields.map(field => (
              <div key={field.label} className="grid gap-1.5">
                <Label className="font-medium">{field.label}</Label>
                <p className="text-xs text-muted-foreground mb-1">{field.desc}</p>
                {field.render}
              </div>
            ))}
          </div>
        </div>
      ))}

      {saved && (
        <div className="flex items-center gap-2 text-[#00A76F] text-sm font-medium">
          <CheckCircle className="w-4 h-4" />
          Pengaturan berhasil disimpan
        </div>
      )}
    </div>
  )
}
