'use client'

import React, { useState } from 'react'
import { generateAgentVouchers, settleAgentVouchers, deleteVoucherCloter } from '../actions'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Store, Phone, CheckCircle, Printer, MessageCircle, ArrowLeft, Ticket, Trash2, Eye, X } from "lucide-react"
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export default function AgentDetailClient({ agent, unsettledVouchers, settlements, packages, allVouchers }: any) {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSettling, setIsSettling] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeletingCloter, setIsDeletingCloter] = useState<string | null>(null)
  const [selectedCloterDetails, setSelectedCloterDetails] = useState<{cloter: string, paket: string, vouchers: any[]} | null>(null)

  // Calculate totals for Cloter Depan
  const totalSales = unsettledVouchers.reduce((sum: number, v: any) => sum + (v.packages ? v.packages.price : 0), 0)
  const commission = (totalSales * agent.commission_rate) / 100
  const netIncome = totalSales - commission

  const unsettledMap = new Map()
  unsettledVouchers.forEach((v: any) => {
    const dateStr = new Date(v.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
    const pkgName = v.packages?.name || 'Unknown'
    const key = `${dateStr}-${pkgName}`
    
    if (!unsettledMap.has(key)) {
      unsettledMap.set(key, { cloter: dateStr, paket: pkgName, rawDate: v.created_at, count: 0, omzet: 0 })
    }
    const item = unsettledMap.get(key)
    item.count += 1
    item.omzet += (v.packages?.price || 0)
  })
  const unsettledGrouped = Array.from(unsettledMap.values()).sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime())

  // Calculate Stock Grouped by Batch (Cloter) and Package
  const stockMap = new Map()
  if (allVouchers) {
    allVouchers.forEach((v: any) => {
      // Format to minute level for batching
      const dateStr = new Date(v.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
      const pkgName = v.packages?.name || 'Unknown'
      const key = `${dateStr}-${pkgName}`
      
      if (!stockMap.has(key)) {
        stockMap.set(key, { cloter: dateStr, rawDate: v.created_at, paket: pkgName, total: 0, sisa: 0, vouchers: [] })
      }
      
      const item = stockMap.get(key)
      item.total += 1
      item.vouchers.push({ ...v, id: v.id, username: v.mikrotik_username })
      if (v.status === 'Belum Digunakan') {
        item.sisa += 1
      }
    })
  }
  
  // Sort stock data by date descending
  const stockData = Array.from(stockMap.values()).sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime())

  async function handleDeleteCloter(cloterKey: string, vouchers: {id: string, username: string}[]) {
    if (!confirm(`Yakin mau hapus ${vouchers.length} voucher di cloter ini? Data di database dan MikroTik akan dihapus permanen.`)) return
    
    setIsDeletingCloter(cloterKey)
    const res = await deleteVoucherCloter(agent.id, vouchers)
    setIsDeletingCloter(null)
    
    if (res?.error) {
      alert(res.error)
    } else if (res?.message) {
      alert(res.message)
      router.refresh()
    } else {
      router.refresh()
    }
  }

  async function handleGenerate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsGenerating(true)
    const formData = new FormData(e.currentTarget)
    const pkgId = formData.get('package_id') as string
    const qty = parseInt(formData.get('quantity') as string)
    const prefix = formData.get('prefix') as string
    const server = formData.get('server') as string
    const randomType = formData.get('randomType') as 'numeric' | 'alphanumeric'
    
    const res = await generateAgentVouchers(agent.id, pkgId, server, qty, prefix, randomType)
    setIsGenerating(false)
    if (res?.error) {
      alert(res.error)
    } else {
      setIsDialogOpen(false) // Auto close modal after generation
      router.refresh()
    }
  }

  async function handleSettle() {
    if (unsettledVouchers.length === 0) return
    setIsSettling(true)
    const ids = unsettledVouchers.map((v: any) => v.id)
    await settleAgentVouchers(agent.id, ids, totalSales, agent.commission_rate)
    setIsSettling(false)
    router.refresh()
  }

  function handlePrint(vouchersToPrint: any[]) {
    if (!vouchersToPrint || vouchersToPrint.length === 0) {
      alert("Tidak ada voucher untuk dicetak.")
      return
    }

    let html = `
      <html>
        <head>
          <title>Print Voucher Agen</title>
          <style>
            body { 
              font-family: sans-serif; 
              background: #fff; 
              padding: 10px; 
              display: flex; 
              flex-wrap: wrap; 
              gap: 10px; 
              justify-content: center; 
              align-items: flex-start;
            }
            @media print {
              body { padding: 0; display: flex; flex-wrap: wrap; justify-content: flex-start; align-items: flex-start; gap: 10px; }
              .page-break { page-break-after: auto; }
            }
          </style>
        </head>
        <body>
    `
    
    vouchersToPrint.forEach((v: any, index: number) => {
      const price = v.packages ? v.packages.price : 0
      const duration = v.packages ? v.packages.duration_days : 0
      const username = v.mikrotik_username || '-'
      const num = String(index + 1).padStart(3, '0')
      
      let color = "#00ACC1"
      if(price == 2000) color = "#616161"
      else if(price == 5000) color = "#E91E63"
      else if(price == 8000) color = "#673AB7"
      else if(price == 22000) color = "#1976D2"
      else if(price == 70000) color = "#28A745"
      else if(price == 150000) color = "#FF6F00"
      else if(price == 1500000) color = "#0D47A1"

      const validityStr = `MASA AKTIF : ${duration} HARI`
      const timeLimitStr = `DURASI : ${duration} HARI`
      const dataLimitStr = `UNLIMITED`
      
      const formatPrice = `Rp ${price.toLocaleString('id-ID')}`
      const priceParts = formatPrice.split(" ")

      html += `
        <table style="display:inline-block;border-collapse:collapse;border:1px solid #000;width:190px;overflow:hidden;margin:2px; page-break-inside: avoid;">
        <tbody>
        <tr>
        <td valign="top">
        <table style="width:100%;border-collapse:collapse;">
        <tbody>
        <tr>
        <td style="width:85px;vertical-align:middle;padding:5px;">
        <div style="position:relative;z-index:-1;padding:0;float:left;">
        <div style="position:absolute;top:0;display:inline;margin-top:-100px;width:0;height:0;border-top:230px solid transparent;border-left:50px solid transparent;border-right:140px solid #DCDCDC;"></div>
        </div>
        <img style="width:100%;height:30px;object-fit:cover;object-position:left;" src="/logo-allstar.png" alt="logo" onerror="this.style.display='none'">
        </td>
        <td style="width:105px;vertical-align:middle;">
        <div style="text-align:right;font-size:8px;font-weight:bold;color:#666;padding-right:5px;margin-bottom:2px;">
        #${num}
        </div>
        <div style="text-align:right;font-weight:bold;font-family:Tahoma,sans-serif;font-size:16px;padding-right:5px;color:${color}">
        <span style="font-size:10px;">${priceParts[0]}</span> ${priceParts[1] || ''}
        </div>
        </td>
        </tr>
        </tbody>
        </table>
        </td>
        </tr>
        <tr>
        <td valign="top">
        <table style="width:100%;border-collapse:collapse;">
        <tbody>
        <tr>
        <td style="width:90px;" valign="top">
        <div style="padding:2px 0;border-bottom:1px solid ${color};text-align:center;font-weight:bold;font-size:10px;">
        VOUCHER
        </div>
        <div style="padding:2px 0;border-bottom:1px solid ${color};text-align:center;font-weight:bold;font-size:14px;color:#000;">
        ${username}
        </div>
        <div style="text-align:center;color:#111;font-size:7px;font-weight:bold;padding:2px;">
        AGEN: ${agent.name.toUpperCase()}
        </div>
        </td>
        <td style="width:100px;text-align:right;vertical-align:middle;padding-right:5px;padding-left:2px;">
          <table style="width:100%; border:none; border-collapse:collapse;">
            <tr>
              <td style="text-align:right; font-size:7px; font-weight:bold; color:#000; line-height:1.2; padding:0; padding-right:4px;">
                ${validityStr}<br>${timeLimitStr}<br>${dataLimitStr}
              </td>
            </tr>
          </table>
        </td>
        </tr>
        <tr>
        <td colspan="2" style="background:${color};padding:0;">
        <div style="color:#fff;font-size:9px;font-weight:bold;padding:2.5px;text-align:center;">
        Wi-Fi ALLSTAR
        </div>
        </td>
        </tr>
        </tbody>
        </table>
        </td>
        </tr>
        </tbody>
        </table>
      `
    })

    html += `</body></html>`
    
    const printWindow = window.open('', '', 'width=800,height=600')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
      }, 500)
    }
  }

  function sendWhatsAppReport() {
    const text = `Halo ${agent.name},
Ini laporan setoran voucher (Cloter Depan):
- Total Voucher Terjual: ${unsettledVouchers.length} tiket
- Total Omzet: Rp ${totalSales.toLocaleString('id-ID')}
- Komisi Agen (${agent.commission_rate}%): Rp ${commission.toLocaleString('id-ID')}
- *Setoran Bersih*: *Rp ${netIncome.toLocaleString('id-ID')}*

Mohon bantuannya untuk melakukan setoran ya. Terima kasih! 🙏`

    const waLink = `https://wa.me/${agent.whatsapp_number}?text=${encodeURIComponent(text)}`
    window.open(waLink, '_blank')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/agents">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Store className="w-5 h-5 text-[#00A76F]" />
            Agen: {agent.name}
          </h1>
          <p className="text-muted-foreground text-sm flex items-center gap-1">
            <Phone className="w-3 h-3" /> {agent.whatsapp_number || 'Tidak ada nomor'} | Komisi: {agent.commission_rate}%
          </p>
        </div>
      </div>

      {/* Stok Sisa Voucher per Cloter */}
      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden mt-8">
        <div className="p-5 border-b bg-muted/20">
          <h2 className="text-lg font-bold text-foreground">Stok Sisa Voucher per Cloter (Konsinyasi)</h2>
          <p className="text-sm text-muted-foreground">Pantau berapa total tiket yang lu kasih ke agen dan berapa yang belom laku per tarikan (cloter).</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] uppercase bg-muted text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-semibold">Cloter (Waktu Generate)</th>
                <th className="px-5 py-3 font-semibold">Paket / Profil</th>
                <th className="px-5 py-3 font-semibold text-center">Total Diberikan</th>
                <th className="px-5 py-3 font-semibold text-center text-[#00A76F]">Sisa (Belum Terpakai)</th>
                <th className="px-5 py-3 font-semibold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {stockData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">Belum ada data stok voucher untuk agen ini.</td>
                </tr>
              ) : (
                stockData.map((s: any, idx: number) => {
                  const key = `${s.cloter}-${s.paket}`
                  return (
                    <tr key={idx} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="px-5 py-3 font-medium">{s.cloter}</td>
                      <td className="px-5 py-3">{s.paket}</td>
                      <td className="px-5 py-3 text-center font-bold">{s.total} tiket</td>
                      <td className="px-5 py-3 text-center font-bold text-[#00A76F]">{s.sisa} tiket</td>
                      <td className="px-5 py-3 text-center flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50"
                          onClick={() => setSelectedCloterDetails({cloter: s.cloter, paket: s.paket, vouchers: s.vouchers})}
                          title="Lihat Detail Voucher"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                          onClick={() => handlePrint(s.vouchers)}
                          title="Print Cloter"
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteCloter(key, s.vouchers)}
                          disabled={isDeletingCloter === key}
                          title="Hapus Cloter"
                        >
                          {isDeletingCloter === key ? 'Menghapus...' : <Trash2 className="w-4 h-4" />}
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cloter Depan (Unsettled) */}
      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden mt-8">
        <div className="p-5 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/20">
          <div>
            <h2 className="text-lg font-bold text-foreground">Cloter Depan (Belum Setor)</h2>
            <p className="text-sm text-muted-foreground">Voucher yang sudah direquest/dijual tapi duitnya belum disetor.</p>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm" onClick={() => setIsDialogOpen(true)}>
              <Ticket className="w-4 h-4 mr-2" />
              Generate Voucher Massal
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Buat Voucher untuk Agen</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleGenerate} className="space-y-4 pt-4">
                  <div className="grid gap-2">
                    <Label htmlFor="package_id">Pilih Paket</Label>
                    <select id="package_id" name="package_id" required className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="">-- Pilih Paket --</option>
                      {packages.map((pkg: any) => (
                        <option key={pkg.id} value={pkg.id}>{pkg.name} (Rp {pkg.price.toLocaleString('id-ID')})</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="quantity">Jumlah Lembar</Label>
                    <Input id="quantity" name="quantity" type="number" min="1" max="500" defaultValue="10" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="server">Pilih Server (MikroTik)</Label>
                    <select id="server" name="server" required className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="all">all (Default Semua Server)</option>
                      <option value="hotspot-allstar">hotspot-allstar</option>
                    </select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label>Format Acak (Ekor Voucher)</Label>
                    <div className="flex gap-4 items-center">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" name="randomType" value="numeric" className="w-4 h-4 text-[#00A76F]" />
                        Angka Saja (cth: vc12345)
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" name="randomType" value="alphanumeric" defaultChecked className="w-4 h-4 text-[#00A76F]" />
                        Huruf & Angka (cth: vc1a2b3)
                      </label>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="prefix">Prefix (Awalan Kode)</Label>
                    <Input id="prefix" name="prefix" placeholder="Misal: ag" defaultValue="ag" />
                    <span className="text-xs text-muted-foreground">Otomatis buat password & username sama persis.</span>
                  </div>
                  <Button type="submit" disabled={isGenerating} className="w-full bg-[#00A76F] hover:bg-[#007867] text-white">
                    {isGenerating ? 'Membuat Voucher...' : 'Generate & Simpan ke Cloter'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

          </div>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-4 gap-4 bg-muted/10 border-b">
          <div className="bg-background border rounded-xl p-4">
            <p className="text-xs text-muted-foreground font-semibold uppercase">Total Tiket</p>
            <p className="text-2xl font-black">{unsettledVouchers.length}</p>
          </div>
          <div className="bg-background border rounded-xl p-4">
            <p className="text-xs text-muted-foreground font-semibold uppercase">Total Omzet</p>
            <p className="text-xl font-bold">Rp {totalSales.toLocaleString('id-ID')}</p>
          </div>
          <div className="bg-background border rounded-xl p-4 border-l-4 border-l-blue-500">
            <p className="text-xs text-muted-foreground font-semibold uppercase">Komisi ({agent.commission_rate}%)</p>
            <p className="text-xl font-bold text-blue-600">Rp {commission.toLocaleString('id-ID')}</p>
          </div>
          <div className="bg-[#00A76F]/10 border border-[#00A76F]/20 rounded-xl p-4">
            <p className="text-xs text-[#00A76F] font-semibold uppercase">Net Setoran</p>
            <p className="text-2xl font-black text-[#00A76F]">Rp {netIncome.toLocaleString('id-ID')}</p>
          </div>
        </div>

        <div className="p-5 flex flex-col sm:flex-row gap-3 justify-end bg-muted/20 border-b">
          <Button variant="outline" className="border-green-600 text-green-700 hover:bg-green-50" onClick={sendWhatsAppReport}>
            <MessageCircle className="w-4 h-4 mr-2" /> Tagih / Kirim Laporan via WA
          </Button>
          <Button 
            className="bg-[#00A76F] hover:bg-[#007867] text-white font-bold px-8 shadow-md" 
            onClick={handleSettle}
            disabled={unsettledVouchers.length === 0 || isSettling}
          >
            <CheckCircle className="w-5 h-5 mr-2" /> 
            {isSettling ? 'Memproses...' : 'SUDAH BAYAR KE GW'}
          </Button>
        </div>

        <div className="max-h-64 overflow-y-auto p-0">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] uppercase bg-muted text-muted-foreground sticky top-0">
              <tr>
                <th className="px-5 py-3 font-semibold">Cloter (Waktu Generate)</th>
                <th className="px-5 py-3 font-semibold">Paket</th>
                <th className="px-5 py-3 font-semibold text-center">Terjual (Belum Setor)</th>
                <th className="px-5 py-3 font-semibold text-right">Omzet</th>
              </tr>
            </thead>
            <tbody>
              {unsettledGrouped.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">Belum ada voucher di cloter ini.</td>
                </tr>
              ) : (
                unsettledGrouped.map((s: any, idx: number) => (
                  <tr key={idx} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="px-5 py-3 font-medium">{s.cloter}</td>
                    <td className="px-5 py-3">{s.paket}</td>
                    <td className="px-5 py-3 text-center font-bold text-blue-600">{s.count} tiket</td>
                    <td className="px-5 py-3 text-right font-bold text-[#00A76F]">Rp {s.omzet.toLocaleString('id-ID')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* History Setoran (Settled) */}
      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden mt-8">
        <div className="p-5 border-b bg-muted/20">
          <h2 className="text-lg font-bold text-foreground">History Setoran Lunas</h2>
          <p className="text-sm text-muted-foreground">Riwayat pembayaran cloter yang sudah disetorkan ke lu.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] uppercase bg-muted text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-semibold">Tanggal Setor</th>
                <th className="px-5 py-3 font-semibold text-center">Jumlah Tiket</th>
                <th className="px-5 py-3 font-semibold text-right">Total Omzet</th>
                <th className="px-5 py-3 font-semibold text-right">Komisi Agen</th>
                <th className="px-5 py-3 font-semibold text-right text-[#00A76F]">Net Diterima</th>
              </tr>
            </thead>
            <tbody>
              {settlements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">Belum ada riwayat setoran.</td>
                </tr>
              ) : (
                settlements.map((s: any) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="px-5 py-3 font-medium">{new Date(s.settled_at).toLocaleString('id-ID')}</td>
                    <td className="px-5 py-3 text-center">{s.total_vouchers}</td>
                    <td className="px-5 py-3 text-right text-muted-foreground">Rp {s.total_sales_amount.toLocaleString('id-ID')}</td>
                    <td className="px-5 py-3 text-right text-muted-foreground border-r border-dashed">Rp {s.commission_amount.toLocaleString('id-ID')}</td>
                    <td className="px-5 py-3 text-right font-bold text-[#00A76F]">Rp {s.net_amount.toLocaleString('id-ID')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog Detail Cloter */}
      <Dialog open={!!selectedCloterDetails} onOpenChange={(open) => !open && setSelectedCloterDetails(null)}>
        <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <div className="p-5 border-b pr-12 bg-muted/30">
            <DialogTitle className="text-xl">Detail Voucher Cloter</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Waktu Generate: <span className="font-medium text-foreground">{selectedCloterDetails?.cloter}</span> | Paket: <span className="font-medium text-foreground">{selectedCloterDetails?.paket}</span>
            </p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-0">
            <table className="w-full text-sm text-left relative">
              <thead className="text-[11px] uppercase bg-muted text-muted-foreground sticky top-0 shadow-sm z-10">
                <tr>
                  <th className="px-5 py-3 font-semibold w-16 text-center">No.</th>
                  <th className="px-5 py-3 font-semibold">Username / Kode Voucher</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const sortedVouchers = [...(selectedCloterDetails?.vouchers || [])]
                    .map((v, i) => ({ ...v, printNo: i + 1 }))
                    .sort((a, b) => {
                      // Sudah Digunakan di atas
                      if (a.status !== 'Belum Digunakan' && b.status === 'Belum Digunakan') return -1;
                      if (a.status === 'Belum Digunakan' && b.status !== 'Belum Digunakan') return 1;
                      // Urutkan berdasarkan nomor print asli
                      return a.printNo - b.printNo;
                    });
                    
                  return sortedVouchers.map((v: any) => (
                    <tr key={v.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-5 py-3 text-center text-muted-foreground">{v.printNo}</td>
                      <td className="px-5 py-3 font-mono font-bold">{v.username}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          v.status === 'Belum Digunakan' 
                            ? 'bg-green-100 text-green-700 border border-green-200' 
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {v.status}
                        </span>
                      </td>
                    </tr>
                  ))
                })()}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
