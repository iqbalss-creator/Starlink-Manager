'use client'

import { Customer } from '@/types'
import { Button } from '@/components/ui/button'
import { UpdateExpiryDialog } from '@/components/dashboard/update-expiry-dialog'
import { MessageCircle, AlertTriangle, Clock, Users } from 'lucide-react'

function getDaysUntilExpiry(expiryDate: string | null | undefined): number | null {
  if (!expiryDate) return null
  const now = new Date()
  const expiry = new Date(expiryDate)
  const diffMs = expiry.getTime() - now.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

function getExpiryBadge(days: number | null) {
  if (days === null) return <span className="bg-muted text-muted-foreground px-3 py-1 rounded-full text-xs font-bold">Tidak diketahui</span>
  if (days < 0) return <span className="bg-[#FFE7D9] text-[#B71D18] px-3 py-1 rounded-full text-xs font-bold">Sudah kadaluarsa {Math.abs(days)} hari lalu</span>
  if (days === 0) return <span className="bg-[#FFE7D9] text-[#B71D18] px-3 py-1 rounded-full text-xs font-bold">Kadaluarsa hari ini!</span>
  if (days <= 3) return <span className="bg-[#FFE7D9] text-[#B71D18] px-3 py-1 rounded-full text-xs font-bold">{days} hari lagi</span>
  return <span className="bg-[#FFF7CD] text-[#B76E00] px-3 py-1 rounded-full text-xs font-bold">{days} hari lagi</span>
}

function buildWhatsAppMessage(customer: Customer, days: number | null): string {
  const packageName = customer.packages?.name || 'paket langganan'
  const price = customer.packages?.price
  const priceStr = price ? `Rp ${Number(price).toLocaleString('id-ID')}` : ''
  
  let urgencyText = ''
  if (days === null || days < 0) {
    urgencyText = 'masa aktif Anda *sudah berakhir*'
  } else if (days === 0) {
    urgencyText = 'masa aktif Anda *berakhir hari ini*'
  } else {
    urgencyText = `masa aktif Anda akan berakhir dalam *${days} hari lagi*`
  }

  const message = `Halo *${customer.name}* 👋\n\nKami ingin menginformasikan bahwa ${urgencyText} untuk paket *${packageName}*${priceStr ? ` (${priceStr}/bulan)` : ''}.\n\nSilakan segera lakukan pembayaran agar akses internet Anda tetap aktif tanpa gangguan.\n\nTerima kasih 🙏`
  
  return encodeURIComponent(message)
}

function CustomerReminderRow({ customer, showBadge = true }: { customer: Customer, showBadge?: boolean }) {
  const days = getDaysUntilExpiry(customer.expiry_date)
  const waNumber = customer.whatsapp_number?.replace(/^0/, '62').replace(/\D/g, '')
  const waMessage = buildWhatsAppMessage(customer, days)
  const waLink = `https://wa.me/${waNumber}?text=${waMessage}`

  return (
    <tr className="border-b border-border hover:bg-muted/50 transition-colors">
      <td className="px-6 py-4">
        <div className="font-semibold text-foreground">{customer.name}</div>
        <div className="text-muted-foreground text-xs">{customer.whatsapp_number}</div>
      </td>
      <td className="px-6 py-4 text-muted-foreground font-medium">
        {customer.packages?.name || '-'}
      </td>
      <td className="px-6 py-4 text-muted-foreground">
        {customer.expiry_date 
          ? new Date(customer.expiry_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
          : '-'}
      </td>
      {showBadge && (
        <td className="px-6 py-4">{getExpiryBadge(days)}</td>
      )}
      <td className="px-6 py-4 text-right">
        <div className="flex justify-end gap-2">
          <UpdateExpiryDialog customer={customer} />
          <a href={waLink} target="_blank" rel="noopener noreferrer">
            <Button 
              size="sm" 
              className="bg-[#25D366] hover:bg-[#1da851] text-white gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              Kirim WA
            </Button>
          </a>
        </div>
      </td>
    </tr>
  )
}

export function BillReminderList({
  urgentCustomers,
  inactiveCustomers,
}: {
  urgentCustomers: Customer[]
  inactiveCustomers: Customer[]
}) {
  const expiredCustomers = urgentCustomers.filter(c => getDaysUntilExpiry(c.expiry_date) !== null && getDaysUntilExpiry(c.expiry_date)! < 0)
  const soonCustomers = urgentCustomers.filter(c => {
    const d = getDaysUntilExpiry(c.expiry_date)
    return d !== null && d >= 0
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[24.5px] font-semibold text-foreground tracking-tight">Tagihan & Pengingat</h1>
        <p className="text-sm text-muted-foreground font-medium">
          Pantau pelanggan yang masa aktifnya hampir/sudah habis dan kirim pengingat WhatsApp
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl p-5 shadow-[rgba(145,158,171,0.2)_0px_0px_2px_0px,rgba(145,158,171,0.12)_0px_12px_24px_-4px] dark:shadow-none dark:border flex items-center gap-4">
          <div className="p-3 bg-[#FFE7D9] rounded-xl">
            <AlertTriangle className="w-5 h-5 text-[#B71D18]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">{expiredCustomers.length}</div>
            <div className="text-xs text-muted-foreground font-medium">Sudah Kadaluarsa</div>
          </div>
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-[rgba(145,158,171,0.2)_0px_0px_2px_0px,rgba(145,158,171,0.12)_0px_12px_24px_-4px] dark:shadow-none dark:border flex items-center gap-4">
          <div className="p-3 bg-[#FFF7CD] rounded-xl">
            <Clock className="w-5 h-5 text-[#B76E00]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">{soonCustomers.length}</div>
            <div className="text-xs text-muted-foreground font-medium">Hampir Jatuh Tempo (≤7 hari)</div>
          </div>
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-[rgba(145,158,171,0.2)_0px_0px_2px_0px,rgba(145,158,171,0.12)_0px_12px_24px_-4px] dark:shadow-none dark:border flex items-center gap-4">
          <div className="p-3 bg-muted rounded-xl">
            <Users className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">{inactiveCustomers.length}</div>
            <div className="text-xs text-muted-foreground font-medium">Pelanggan Nonaktif</div>
          </div>
        </div>
      </div>

      {/* Expired / About to Expire */}
      <div className="bg-card rounded-2xl shadow-[rgba(145,158,171,0.2)_0px_0px_2px_0px,rgba(145,158,171,0.12)_0px_12px_24px_-4px] dark:shadow-none dark:border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#B71D18]" />
          <h2 className="font-semibold text-foreground">Perlu Perhatian Segera</h2>
          <span className="ml-auto text-xs text-muted-foreground">{urgentCustomers.length} pelanggan</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[12px] font-semibold text-foreground bg-muted border-b border-border">
              <tr>
                <th className="px-6 py-3">NAMA & KONTAK</th>
                <th className="px-6 py-3">PAKET</th>
                <th className="px-6 py-3">JATUH TEMPO</th>
                <th className="px-6 py-3">STATUS</th>
                <th className="px-6 py-3 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody>
              {urgentCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    🎉 Tidak ada pelanggan yang jatuh tempo dalam 7 hari ke depan!
                  </td>
                </tr>
              ) : (
                urgentCustomers.map(c => <CustomerReminderRow key={c.id} customer={c} />)
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inactive Customers */}
      {inactiveCustomers.length > 0 && (
        <div className="bg-card rounded-2xl shadow-[rgba(145,158,171,0.2)_0px_0px_2px_0px,rgba(145,158,171,0.12)_0px_12px_24px_-4px] dark:shadow-none dark:border overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">Pelanggan Nonaktif / Ditangguhkan</h2>
            <span className="ml-auto text-xs text-muted-foreground">{inactiveCustomers.length} pelanggan</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[12px] font-semibold text-foreground bg-muted border-b border-border">
                <tr>
                  <th className="px-6 py-3">NAMA & KONTAK</th>
                  <th className="px-6 py-3">PAKET</th>
                  <th className="px-6 py-3">TERAKHIR AKTIF</th>
                  <th className="px-6 py-3 text-right">AKSI</th>
                </tr>
              </thead>
              <tbody>
                {inactiveCustomers.map(c => (
                  <CustomerReminderRow key={c.id} customer={c} showBadge={false} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
