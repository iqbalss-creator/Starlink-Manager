'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LogOut, Wifi, Clock, Activity, CreditCard, Ticket, PlusCircle, CheckCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { logoutPortal } from './actions'

const RENEWAL_PACKAGES = [
  "1 Bulan Premium",
  "1 Bulan Basic",
  "1 Minggu",
  "1 Hari",
  "6 Jam",
  "1 Jam"
]

const ADMIN_WA = "08124869807"

export function PortalClient({ customer, vouchers, payments, totalBelumLunas, totalLunas }: any) {
  const [isRenewOpen, setIsRenewOpen] = useState(false)
  const [selectedVoucher, setSelectedVoucher] = useState<any>(null)
  const [renewPkg, setRenewPkg] = useState(RENEWAL_PACKAGES[0])
  const [renewQty, setRenewQty] = useState("1")

  function handleLogout() {
    logoutPortal()
  }

  function openRenew(voucher: any) {
    setSelectedVoucher(voucher)
    setIsRenewOpen(true)
  }

  function sendRenewWA() {
    if (!selectedVoucher) return
    const text = `Halo Admin, saya ingin memperpanjang paket untuk voucher *${selectedVoucher.mikrotik_username}*.\n\nDetail:\nPaket: ${renewPkg}\nJumlah: ${renewQty} Voucher\n\nMohon diproses ya.`
    const url = `https://wa.me/${ADMIN_WA}?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
    setIsRenewOpen(false)
  }

  function formatBytes(bytes: number) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
            Selamat Datang, {customer?.name || 'Pelanggan'}!
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola voucher dan tagihan WiFi Anda dengan mudah</p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" /> Keluar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Total Lunas</p>
              <h3 className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 mt-1">
                Rp {totalLunas.toLocaleString('id-ID')}
              </h3>
            </div>
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-rose-600 dark:text-rose-400">Total Belum Lunas (Tagihan)</p>
              <h3 className="text-2xl font-bold text-rose-900 dark:text-rose-100 mt-1">
                Rp {totalBelumLunas.toLocaleString('id-ID')}
              </h3>
            </div>
            <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/50 rounded-full flex items-center justify-center text-rose-600 dark:text-rose-400">
              <CreditCard className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-bold mt-8 mb-4">Voucher Anda ({vouchers.length})</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {vouchers.map((v: any) => (
          <Card key={v.id} className="overflow-hidden">
            <CardHeader className="bg-slate-50 dark:bg-slate-900/50 py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-mono flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-primary" />
                  {v.mikrotik_username}
                </CardTitle>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  v.status === 'Belum Digunakan' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {v.status}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1 flex items-center gap-1"><Wifi className="w-4 h-4"/> Paket</p>
                  <p className="font-medium">{v.packages?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1 flex items-center gap-1"><Activity className="w-4 h-4"/> Data Terpakai</p>
                  <p className="font-medium">{formatBytes(v.dataUsageBytes)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1 flex items-center gap-1"><Clock className="w-4 h-4"/> Dibuat</p>
                  <p className="font-medium">{new Date(v.created_at).toLocaleDateString('id-ID')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1 flex items-center gap-1"><CreditCard className="w-4 h-4"/> Pembayaran</p>
                  <p className={`font-medium ${v.payment_status === 'Lunas' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {v.payment_status}
                  </p>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full border-primary text-primary hover:bg-primary/5"
                onClick={() => openRenew(v)}
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Request Perpanjang Waktu
              </Button>
            </CardContent>
          </Card>
        ))}
        {vouchers.length === 0 && (
          <div className="col-span-full p-8 text-center border border-dashed rounded-lg text-muted-foreground">
            Tidak ada voucher yang ditemukan.
          </div>
        )}
      </div>

      <h2 className="text-xl font-bold mt-8 mb-4">Riwayat Pembayaran</h2>
      <Card>
        <div className="divide-y">
          {payments.map((p: any) => (
            <div key={p.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{new Date(p.created_at).toLocaleDateString('id-ID', { dateStyle: 'long' })}</p>
                <p className="text-sm text-muted-foreground">Metode: {p.payment_method}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-emerald-600">Rp {p.amount.toLocaleString('id-ID')}</p>
                <p className="text-xs text-muted-foreground">Catatan: {p.notes || '-'}</p>
              </div>
            </div>
          ))}
          {payments.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              Belum ada riwayat pembayaran.
            </div>
          )}
        </div>
      </Card>

      <Dialog open={isRenewOpen} onOpenChange={setIsRenewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Perpanjang Voucher</DialogTitle>
            <DialogDescription>
              Pilih paket dan jumlah untuk dikirimkan konfirmasi ke Admin via WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Pilih Paket</Label>
              <Select value={renewPkg} onValueChange={(val) => setRenewPkg(val || RENEWAL_PACKAGES[0])}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih paket" />
                </SelectTrigger>
                <SelectContent>
                  {RENEWAL_PACKAGES.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Jumlah Voucher</Label>
              <Input 
                type="number" 
                min="1" 
                value={renewQty} 
                onChange={(e) => setRenewQty(e.target.value)} 
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsRenewOpen(false)}>Batal</Button>
            <Button onClick={sendRenewWA} className="bg-[#25D366] hover:bg-[#128C7E] text-white">
              Kirim via WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
