'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Send, MessageSquare, BookTemplate, Plus, Edit, Trash2, Search, ExternalLink, Clock, Bell, AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react'
import { markReminderSent } from './actions'

type Customer = {
  id: string
  name: string
  whatsapp_number: string
  status: string
  created_at: string
  packages?: { name: string } | null
  mikrotik_username?: string | null
}

type ExpiringVoucher = {
  id: string
  mikrotik_username: string | null
  expiry_date: string | null
  status: string
  packages?: { name: string; price: number } | null
  customers?: { 
    id: string; 
    name: string; 
    whatsapp_number: string;
    vouchers?: Array<{ payment_status: string; packages?: { price: number } | null }>
  } | null
}

type Template = {
  id: string
  name: string
  content: string
  createdAt: string
}

type LogItem = {
  id: string
  customer: string
  phone: string
  message: string
  sentAt: string
}

const TABS = ['WhatsApp', 'Reminder', 'Template', 'Riwayat'] as const
const STORAGE_KEY_TEMPLATES = 'starlink_wa_templates'
const STORAGE_KEY_LOGS = 'starlink_wa_logs'
const STORAGE_KEY_REMINDER_TPL = 'starlink_reminder_template'

const WELCOME_TEMPLATE = `Halo {nama}
Selamat datang di layanan internet kami!

Kami senang Bapak/Ibu telah bergabung. Paket yang didaftarkan saat ini adalah *{paket}*.
Untuk login, silakan gunakan kode voucher berikut: *{username}*

Jika sewaktu-waktu ada kendala jaringan atau ada pertanyaan, silakan hubungi nomor ini.

Terima kasih atas kepercayaannya!`

const DEFAULT_REMINDER_TEMPLATE = `Halo {nama}

Kami ingin menginformasikan bahwa masa aktif voucher WiFi Anda *{username}* (Paket: *{paket}*) akan berakhir dalam *{sisa_hari} hari* lagi, tepatnya pada tanggal *{tanggal_expired}*.

Segera hubungi kami untuk perpanjangan agar koneksi internet Anda tetap berjalan lancar.

{info_hutang}

Terima kasih!`

function applyTemplate(template: string, customer: Customer): string {
  return template
    .replace(/\{nama\}/g, customer.name)
    .replace(/\{paket\}/g, customer.packages?.name || '-')
    .replace(/\{nomor\}/g, customer.whatsapp_number)
    .replace(/\{username\}/g, customer.mikrotik_username || '-')
}

function applyReminderTemplate(template: string, voucher: ExpiringVoucher): string {
  const cust = voucher.customers
  const expiry = voucher.expiry_date ? new Date(voucher.expiry_date) : null
  const now = new Date()
  const diffMs = expiry ? expiry.getTime() - now.getTime() : 0
  const sisaHari = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  const tanggalExpired = expiry
    ? expiry.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : '-'

  const unpaidVouchers = cust?.vouchers?.filter(v => v.payment_status === 'Belum Lunas') || []
  const totalDebt = unpaidVouchers.reduce((sum, v) => sum + (v.packages?.price || 0), 0)
  
  let infoHutangText = ''
  if (totalDebt > 0) {
     infoHutangText = `*Pemberitahuan:* Anda memiliki tagihan/kasbon voucher sebesar *Rp ${totalDebt.toLocaleString('id-ID')}* yang belum dilunasi. Mohon sekiranya dapat diselesaikan bersamaan dengan perpanjangan ini.`
  }

  let result = template
    .replace(/\{nama\}/g, cust?.name || '-')
    .replace(/\{username\}/g, voucher.mikrotik_username || '-')
    .replace(/\{paket\}/g, voucher.packages?.name || '-')
    .replace(/\{sisa_hari\}/g, sisaHari.toString())
    .replace(/\{tanggal_expired\}/g, tanggalExpired)
    .replace(/\{nomor\}/g, cust?.whatsapp_number || '-')
    .replace(/\{info_hutang\}/g, infoHutangText)

  if (totalDebt > 0 && !template.includes('{info_hutang}')) {
    result += '\n\n' + infoHutangText
  }

  return result
}

function getDaysRemaining(expiryDate: string): number {
  const now = new Date()
  const expiry = new Date(expiryDate)
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

const isNewCustomer = (createdAt?: string) => {
  if (!createdAt) return false
  const diff = Date.now() - new Date(createdAt).getTime()
  return diff <= 7 * 24 * 60 * 60 * 1000 // 7 days
}

export function KomunikasiView({
  customers,
  expiringVouchers,
}: {
  customers: Customer[]
  expiringVouchers: ExpiringVoucher[]
}) {
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('WhatsApp')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [templates, setTemplates] = useState<Template[]>([])
  const [logs, setLogs] = useState<LogItem[]>([])
  const [isTemplateOpen, setIsTemplateOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [tplName, setTplName] = useState('')
  const [tplContent, setTplContent] = useState('')
  const [reminderTemplate, setReminderTemplate] = useState(DEFAULT_REMINDER_TEMPLATE)
  const [isEditingReminderTpl, setIsEditingReminderTpl] = useState(false)

  useEffect(() => {
    try {
      const t = localStorage.getItem(STORAGE_KEY_TEMPLATES)
      if (t) setTemplates(JSON.parse(t))
      const l = localStorage.getItem(STORAGE_KEY_LOGS)
      if (l) setLogs(JSON.parse(l))
      const rt = localStorage.getItem(STORAGE_KEY_REMINDER_TPL)
      if (rt) setReminderTemplate(rt)
    } catch {/* ignore */}

    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.substring(1).toLowerCase()
      const matchedTab = TABS.find(t => t.toLowerCase() === hash)
      if (matchedTab) {
        setActiveTab(matchedTab)
      }
    }
  }, [])

  const saveTemplates = (data: Template[]) => {
    setTemplates(data)
    localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(data))
  }

  const saveLogs = (data: LogItem[]) => {
    setLogs(data)
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(data))
  }

  const filteredCustomers = useMemo(() =>
    customers.filter(c =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.whatsapp_number.includes(search)
    ), [customers, search])

  const handleSendWA = (customer: Customer, msg: string) => {
    if (!msg.trim()) {
      alert('Pesan tidak boleh kosong')
      return
    }
    const phone = customer.whatsapp_number.replace(/\D/g, '')
    const waPhone = phone.startsWith('0') ? '62' + phone.slice(1) : phone
    const url = `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')

    const log: LogItem = {
      id: Date.now().toString(),
      customer: customer.name,
      phone: customer.whatsapp_number,
      message: msg,
      sentAt: new Date().toISOString(),
    }
    saveLogs([log, ...logs].slice(0, 100))
  }

  const handleSendReminderWA = (voucher: ExpiringVoucher) => {
    const cust = voucher.customers
    if (!cust) return
    const phone = cust.whatsapp_number.replace(/\D/g, '')
    const waPhone = phone.startsWith('0') ? '62' + phone.slice(1) : phone
    const msg = applyReminderTemplate(reminderTemplate, voucher)
    const url = `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')

    const log: LogItem = {
      id: Date.now().toString(),
      customer: cust.name,
      phone: cust.whatsapp_number,
      message: msg,
      sentAt: new Date().toISOString(),
    }
    saveLogs([log, ...logs].slice(0, 100))
    markReminderSent(voucher.id)
  }

  const handleSaveTemplate = () => {
    if (!tplName.trim() || !tplContent.trim()) {
      alert('Nama dan isi template wajib diisi')
      return
    }
    if (editingTemplate) {
      saveTemplates(templates.map(t => t.id === editingTemplate.id ? { ...t, name: tplName, content: tplContent } : t))
    } else {
      saveTemplates([...templates, { id: Date.now().toString(), name: tplName, content: tplContent, createdAt: new Date().toISOString() }])
    }
    setIsTemplateOpen(false)
    setEditingTemplate(null)
    setTplName('')
    setTplContent('')
  }

  const openEditTemplate = (t: Template) => {
    setEditingTemplate(t)
    setTplName(t.name)
    setTplContent(t.content)
    setIsTemplateOpen(true)
  }

  const deleteTemplate = (id: string) => {
    if (confirm('Hapus template ini?')) saveTemplates(templates.filter(t => t.id !== id))
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      Aktif: 'bg-[#C8FAD6] text-[#007867]',
      Suspended: 'bg-[#FFE7D9] text-[#B71D18]',
      Nonaktif: 'bg-muted text-muted-foreground',
    }
    return <span className={`${map[status] || 'bg-muted text-muted-foreground'} px-2 py-0.5 rounded-full text-xs font-bold`}>{status}</span>
  }

  const getUrgencyBadge = (days: number) => {
    if (days <= 1) return { label: 'Besok / Hari ini', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: AlertCircle, border: 'border-red-200 dark:border-red-800/50' }
    if (days <= 3) return { label: `${days} hari lagi`, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: AlertTriangle, border: 'border-orange-200 dark:border-orange-800/50' }
    return { label: `${days} hari lagi`, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Info, border: 'border-blue-200 dark:border-blue-800/50' }
  }

  const getUrgencyLevel = (days: number) => {
    if (days < 0) return 0 // Lewat jatuh tempo
    if (days <= 1) return 1 // Hari ini / Besok
    if (days <= 3) return 2 // 2-3 Hari
    return 3 // 4+ Hari
  }

  const isReminderUpToDate = (voucher: ExpiringVoucher) => {
    if (!voucher.last_reminder_sent_at) return false
    if (!voucher.expiry_date) return true

    const currentDays = getDaysRemaining(voucher.expiry_date)
    const expiryTime = new Date(voucher.expiry_date).getTime()
    const sentTime = new Date(voucher.last_reminder_sent_at).getTime()
    const daysWhenSent = Math.ceil((expiryTime - sentTime) / (1000 * 60 * 60 * 24))

    const currentLevel = getUrgencyLevel(currentDays)
    const sentLevel = getUrgencyLevel(daysWhenSent)

    // Jika level saat ini lebih urgent (angkanya lebih kecil) dari saat dikirim, maka minta diremind ulang
    return currentLevel >= sentLevel
  }

  // Group by sent status
  const unsentVouchers = expiringVouchers.filter(v => !isReminderUpToDate(v))
  const sentVouchers = expiringVouchers.filter(v => isReminderUpToDate(v))
  
  // Summary variables
  const today = expiringVouchers.filter(v => v.expiry_date && getDaysRemaining(v.expiry_date) <= 1)
  const soonThree = expiringVouchers.filter(v => v.expiry_date && getDaysRemaining(v.expiry_date) > 1 && getDaysRemaining(v.expiry_date) <= 3)
  const soonSeven = expiringVouchers.filter(v => v.expiry_date && getDaysRemaining(v.expiry_date) > 3)

  const groupVouchers = (vouchers: ExpiringVoucher[]) => {
    const expired = vouchers.filter(v => v.expiry_date && getDaysRemaining(v.expiry_date) < 0)
    const today = vouchers.filter(v => v.expiry_date && getDaysRemaining(v.expiry_date) >= 0 && getDaysRemaining(v.expiry_date) <= 1)
    const soonThree = vouchers.filter(v => v.expiry_date && getDaysRemaining(v.expiry_date) > 1 && getDaysRemaining(v.expiry_date) <= 3)
    const soonSeven = vouchers.filter(v => v.expiry_date && getDaysRemaining(v.expiry_date) > 3)

    return [
      { title: '⚫ Sudah Lewat Jatuh Tempo', items: expired },
      { title: '🔴 Jatuh Tempo Hari ini / Besok', items: today },
      { title: '🟠 Jatuh Tempo 2–3 Hari', items: soonThree },
      { title: '🔵 Jatuh Tempo 4+ Hari', items: soonSeven },
    ].filter(g => g.items.length > 0)
  }

  const cardClass = 'bg-card rounded-2xl shadow-[rgba(145,158,171,0.2)_0px_0px_2px_0px,rgba(145,158,171,0.12)_0px_12px_24px_-4px] dark:shadow-none dark:border'

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-[24.5px] font-semibold text-foreground tracking-tight">Komunikasi</h1>
        <p className="text-sm text-muted-foreground font-medium">
          Kirim pesan WhatsApp, reminder tagihan, dan kelola template komunikasi
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors relative ${
              activeTab === tab ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab}
            {tab === 'Reminder' && expiringVouchers.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {expiringVouchers.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: WhatsApp */}
      {activeTab === 'WhatsApp' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Customer list */}
          <div className={`lg:col-span-2 ${cardClass} overflow-hidden flex flex-col`}>
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari pelanggan..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>
            <div className="flex flex-col divide-y divide-border overflow-y-auto max-h-[420px]">
              {filteredCustomers.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedCustomer(c); setMessage('') }}
                  className={`flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors ${selectedCustomer?.id === c.id ? 'bg-[#C8FAD6]/40 dark:bg-[rgba(0,167,111,0.1)]' : ''}`}
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate flex items-center gap-2">
                      {c.name}
                      {isNewCustomer(c.created_at) && (
                        <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-[10px] px-1.5 py-0.5 rounded font-bold">Baru</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{c.whatsapp_number}</div>
                  </div>
                  {getStatusBadge(c.status)}
                </button>
              ))}
              {filteredCustomers.length === 0 && (
                <div className="p-6 text-center text-sm text-muted-foreground">Tidak ada pelanggan.</div>
              )}
            </div>
          </div>

          {/* Message compose */}
          <div className={`lg:col-span-3 ${cardClass} p-6 flex flex-col gap-4`}>
            {!selectedCustomer ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center py-12">
                <MessageSquare className="w-10 h-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Pilih pelanggan untuk memulai</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 pb-4 border-b border-border">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                    {selectedCustomer.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      {selectedCustomer.name}
                      {isNewCustomer(selectedCustomer.created_at) && (
                        <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-[10px] px-1.5 py-0.5 rounded font-bold">Pelanggan Baru</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{selectedCustomer.whatsapp_number} • {selectedCustomer.packages?.name || 'Tanpa Paket'}</div>
                  </div>
                </div>

                <div>
                  <Label className="text-xs mb-2 block">Pilih Template Pesan</Label>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setMessage(applyTemplate(WELCOME_TEMPLATE, selectedCustomer))}
                      className="text-xs px-3 py-1.5 rounded-full border border-[#00A76F]/30 bg-[#C8FAD6]/30 text-[#007867] dark:text-[#5BE584] hover:bg-[#C8FAD6] dark:hover:bg-[#C8FAD6]/20 transition-colors font-medium flex items-center gap-1.5"
                    >
                      Pesan Sambutan
                    </button>
                    {templates.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setMessage(applyTemplate(t.content, selectedCustomer))}
                        className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-muted transition-colors"
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2 flex-1">
                  <Label htmlFor="wa-message">Pesan</Label>
                  <textarea
                    id="wa-message"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder={`Halo {nama}, pesan Anda...`}
                    rows={6}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <p className="text-xs text-muted-foreground">
                    Variabel: <code className="bg-muted px-1 rounded">{'{nama}'}</code> <code className="bg-muted px-1 rounded">{'{paket}'}</code> <code className="bg-muted px-1 rounded">{'{nomor}'}</code>
                  </p>
                </div>

                <Button
                  onClick={() => handleSendWA(selectedCustomer, applyTemplate(message, selectedCustomer))}
                  className="bg-[#25D366] hover:bg-[#128C7E] text-white gap-2 w-full"
                >
                  <ExternalLink className="w-4 h-4" />
                  Buka WhatsApp & Kirim
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tab: Reminder */}
      {activeTab === 'Reminder' && (
        <div className="flex flex-col gap-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Jatuh Tempo Hari ini / Besok', count: today.length, color: 'text-red-500', bg: 'bg-red-500/10', icon: AlertCircle },
              { label: 'Jatuh Tempo 1–3 Hari', count: soonThree.length, color: 'text-orange-500', bg: 'bg-orange-500/10', icon: AlertTriangle },
              { label: 'Jatuh Tempo 4–7 Hari', count: soonSeven.length, color: 'text-blue-500', bg: 'bg-blue-500/10', icon: Info },
            ].map(s => (
              <div key={s.label} className={`${cardClass} p-5 flex items-center gap-4`}>
                <div className={`p-3 ${s.bg} ${s.color} rounded-xl`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{s.count}</div>
                  <div className="text-xs text-muted-foreground font-medium">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {expiringVouchers.length === 0 ? (
            <div className={`${cardClass} p-12 text-center`}>
              <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">Tidak ada voucher yang akan jatuh tempo dalam 7 hari ke depan.</p>
              <p className="text-xs text-muted-foreground mt-1">Semua voucher aktif masih aman! ✅</p>
            </div>
          ) : (
            <>
              {/* Template reminder */}
              <div className={`${cardClass} p-5`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-sm">Template Pesan Reminder</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Variabel: <code className="bg-muted px-1 rounded">{'{nama}'}</code> <code className="bg-muted px-1 rounded">{'{username}'}</code> <code className="bg-muted px-1 rounded">{'{paket}'}</code> <code className="bg-muted px-1 rounded">{'{sisa_hari}'}</code> <code className="bg-muted px-1 rounded">{'{tanggal_expired}'}</code>
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingReminderTpl(prev => !prev)}
                  >
                    <Edit className="w-3.5 h-3.5 mr-1.5" />
                    {isEditingReminderTpl ? 'Tutup' : 'Edit Template'}
                  </Button>
                </div>
                {isEditingReminderTpl ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={reminderTemplate}
                      onChange={e => setReminderTemplate(e.target.value)}
                      rows={8}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                    />
                    <Button
                      size="sm"
                      className="w-fit bg-[#00A76F] hover:bg-[#007867] text-white"
                      onClick={() => {
                        localStorage.setItem(STORAGE_KEY_REMINDER_TPL, reminderTemplate)
                        setIsEditingReminderTpl(false)
                      }}
                    >
                      Simpan Template
                    </Button>
                  </div>
                ) : (
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans bg-muted/40 rounded-lg p-3 line-clamp-4">{reminderTemplate}</pre>
                )}
              </div>

              {/* Belum Dikirim */}
              <div className="mb-8">
                <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" /> 
                  Belum Dikirim ({unsentVouchers.length})
                </h2>
                <div className="flex flex-col gap-4">
                  {unsentVouchers.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-4 bg-card rounded-xl text-center shadow-sm">Semua pelanggan dalam kategori ini sudah diingatkan.</p>
                  ) : (
                    groupVouchers(unsentVouchers).map(group => (
                      <div key={group.title} className={`${cardClass} overflow-hidden`}>
                        <div className="px-6 py-4 border-b border-border bg-muted/30">
                          <h3 className="font-semibold text-sm">{group.title}</h3>
                        </div>
                        <div className="divide-y divide-border">
                          {group.items.map(v => {
                            const days = v.expiry_date ? getDaysRemaining(v.expiry_date) : 0
                            const urgency = getUrgencyBadge(days)
                            const cust = v.customers
                            return (
                              <div key={v.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors">
                                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                                  {cust?.name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-4 mb-1">
                                    <h4 className="font-semibold text-sm truncate">{cust?.name || '-'}</h4>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${urgency.color} ${urgency.border} border`}>
                                      {urgency.label}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1.5"><Search className="w-3.5 h-3.5" />{v.mikrotik_username}</span>
                                    <span>{v.packages?.name || 'Tanpa Paket'}</span>
                                    <span className="font-medium">{v.expiry_date ? new Date(v.expiry_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' }) : '-'}</span>
                                  </div>
                                </div>
                                <Button size="sm" className="shrink-0 bg-[#00A76F] hover:bg-[#007867] text-white rounded-lg h-9 px-4 shadow-none" onClick={() => handleSendReminderWA(v)}>
                                  <Send className="w-3.5 h-3.5 mr-2" />Kirim WA
                                </Button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Sudah Dikirim */}
              {sentVouchers.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" /> 
                    Sudah Dikirim ({sentVouchers.length})
                  </h2>
                  <div className="flex flex-col gap-4 opacity-70 hover:opacity-100 transition-opacity">
                    {groupVouchers(sentVouchers).map(group => (
                      <div key={group.title} className={`${cardClass} overflow-hidden`}>
                        <div className="px-6 py-3 border-b border-border bg-muted/10">
                          <h3 className="font-semibold text-sm">{group.title}</h3>
                        </div>
                        <div className="divide-y divide-border">
                          {group.items.map(v => {
                            const days = v.expiry_date ? getDaysRemaining(v.expiry_date) : 0
                            const urgency = getUrgencyBadge(days)
                            const cust = v.customers
                            return (
                              <div key={v.id} className="flex items-center gap-4 px-6 py-3 hover:bg-muted/30 transition-colors">
                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold shrink-0 text-muted-foreground">
                                  {cust?.name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-4 mb-0.5">
                                    <h4 className="font-semibold text-sm truncate text-muted-foreground">{cust?.name || '-'}</h4>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 bg-muted text-muted-foreground border-transparent`}>
                                      {urgency.label}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1.5"><Search className="w-3.5 h-3.5" />{v.mikrotik_username}</span>
                                    <span>{v.packages?.name || 'Tanpa Paket'}</span>
                                    <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500" />Terkirim {new Date(v.last_reminder_sent_at!).toLocaleDateString('id-ID')}</span>
                                  </div>
                                </div>
                                <Button size="sm" variant="outline" className="shrink-0 rounded-lg h-8 px-3" onClick={() => handleSendReminderWA(v)}>
                                  <Send className="w-3 h-3 mr-1.5" />Kirim Ulang
                                </Button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Tab: Template */}
      {activeTab === 'Template' && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <Dialog open={isTemplateOpen} onOpenChange={(o) => {
              setIsTemplateOpen(o)
              if (!o) { setEditingTemplate(null); setTplName(''); setTplContent('') }
            }}>
              <DialogTrigger asChild>
                <Button className="bg-[#00A76F] hover:bg-[#007867] text-white gap-2">
                  <Plus className="w-4 h-4" />
                  Tambah Template
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                  <DialogTitle>{editingTemplate ? 'Edit Template' : 'Tambah Template Baru'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Nama Template</Label>
                    <Input value={tplName} onChange={e => setTplName(e.target.value)} placeholder="Misal: Reminder Tagihan" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Isi Pesan</Label>
                    <textarea
                      value={tplContent}
                      onChange={e => setTplContent(e.target.value)}
                      rows={6}
                      placeholder={`Halo {nama}, tagihan paket {paket} Anda akan jatuh tempo...`}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <p className="text-xs text-muted-foreground">
                      Gunakan: <code className="bg-muted px-1 rounded">{'{nama}'}</code> <code className="bg-muted px-1 rounded">{'{paket}'}</code> <code className="bg-muted px-1 rounded">{'{nomor}'}</code>
                    </p>
                  </div>
                  <Button onClick={handleSaveTemplate} className="bg-[#00A76F] hover:bg-[#007867] text-white">
                    {editingTemplate ? 'Simpan Perubahan' : 'Simpan Template'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {templates.length === 0 ? (
            <div className={`${cardClass} p-10 text-center text-muted-foreground`}>
              <BookTemplate className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Belum ada template. Tambah template untuk mempercepat pengiriman pesan.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map(t => (
                <div key={t.id} className={`${cardClass} p-5 flex flex-col gap-3`}>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm">{t.name}</h3>
                    <div className="flex gap-1">
                      <button onClick={() => openEditTemplate(t)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteTemplate(t.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-line flex-1">{t.content}</p>
                  <p className="text-[10px] text-muted-foreground/60">
                    {new Date(t.createdAt).toLocaleDateString('id-ID')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Riwayat */}
      {activeTab === 'Riwayat' && (
        <div className="flex flex-col gap-4">
          {logs.length === 0 ? (
            <div className={`${cardClass} p-10 text-center text-muted-foreground`}>
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Belum ada riwayat pengiriman.</p>
            </div>
          ) : (
            <div className={`${cardClass} overflow-hidden`}>
              <table className="w-full text-sm text-left">
                <thead className="text-[12px] font-semibold bg-muted border-b border-border">
                  <tr>
                    <th className="px-6 py-4">WAKTU</th>
                    <th className="px-6 py-4">PELANGGAN</th>
                    <th className="px-6 py-4">NOMOR</th>
                    <th className="px-6 py-4">PESAN</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(l => (
                    <tr key={l.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                      <td className="px-6 py-3 text-muted-foreground text-xs">
                        {new Date(l.sentAt).toLocaleString('id-ID')}
                      </td>
                      <td className="px-6 py-3 font-semibold">{l.customer}</td>
                      <td className="px-6 py-3 text-muted-foreground">{l.phone}</td>
                      <td className="px-6 py-3 text-muted-foreground max-w-xs truncate">{l.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}


