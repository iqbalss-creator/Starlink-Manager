'use client'

import React, { useState } from 'react'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Store, Phone, CheckCircle, Printer, MessageCircle, ArrowLeft, Ticket, Trash2, Eye, X, RefreshCw, Palette, Settings2, Layout, Check, Sparkles } from "lucide-react"
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import { generateAgentVouchers, getAgentSettlements, deleteVoucherCloter, settleAgentVouchers, syncCloterVouchers, settlePartialVouchers } from '../actions'
import { toast } from 'sonner'

export const VOUCHER_TEMPLATES = [
  {
    id: 'mikhmon',
    name: 'Mikhmon Classic (Clean)',
    badge: 'Populer',
    description: 'Warna-warni sesuai harga, logo Allstar, nomor urut, & banner bawah',
    previewBg: 'bg-pink-500/10 border-pink-500/30 text-pink-700 dark:text-pink-400'
  },
  {
    id: 'minimalist',
    name: 'Modern Minimalist',
    badge: 'Rekomendasi',
    description: 'Desain modern rounded putih bersih, border hijau tegas, badge harga elegan',
    previewBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
  },
  {
    id: 'thermal',
    name: 'Struk Kasir Thermal (58mm/80mm)',
    badge: 'Hemat Tinta',
    description: 'Format monokrom hitam putih untuk printer struk thermal bluetooth/USB',
    previewBg: 'bg-slate-500/10 border-slate-500/30 text-slate-700 dark:text-slate-400'
  },
  {
    id: 'compact',
    name: 'Compact Grid A4',
    badge: 'Hemat Kertas',
    description: 'Desain ringkas untuk cetak massal, muat 30+ voucher per lembar kertas A4',
    previewBg: 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400'
  },
  {
    id: 'dark',
    name: 'Dark Cyber Edition',
    badge: 'Modern Dark',
    description: 'Tema gelap futuristik kontras tinggi dengan aksen cyan & text tebal',
    previewBg: 'bg-slate-900 border-sky-500/40 text-sky-400'
  }
]

export default function AgentDetailClient({ agent, unsettledVouchers, settlements, packages, allVouchers }: any) {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSettling, setIsSettling] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeletingCloter, setIsDeletingCloter] = useState<string | null>(null)
  const [isSyncingCloter, setIsSyncingCloter] = useState<string | null>(null)
  const [selectedCloterDetails, setSelectedCloterDetails] = useState<{cloter: string, paket: string, vouchers: any[]} | null>(null)
  const [partialSettleBatch, setPartialSettleBatch] = useState<any | null>(null)
  const [isPartialSettling, setIsPartialSettling] = useState(false)
  const [appendBatch, setAppendBatch] = useState<any | null>(null)
  const [isAppending, setIsAppending] = useState(false)
  const [hasAutoSynced, setHasAutoSynced] = useState(false)

  // Template Settings State
  const [selectedTemplate, setSelectedTemplate] = useState<string>('mikhmon')
  const [templateHeader, setTemplateHeader] = useState<string>('Wi-Fi ALLSTAR')
  const [templatePortal, setTemplatePortal] = useState<string>('allstar.net')
  const [templateShowAgent, setTemplateShowAgent] = useState<boolean>(true)
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState<boolean>(false)

  // Load template preferences from localStorage
  React.useEffect(() => {
    try {
      const savedTpl = localStorage.getItem('agent_voucher_tpl')
      if (savedTpl) setSelectedTemplate(savedTpl)
      const savedHdr = localStorage.getItem('agent_voucher_hdr')
      if (savedHdr) setTemplateHeader(savedHdr)
      const savedPtl = localStorage.getItem('agent_voucher_ptl')
      if (savedPtl) setTemplatePortal(savedPtl)
      const savedAg = localStorage.getItem('agent_voucher_ag')
      if (savedAg !== null) setTemplateShowAgent(savedAg === 'true')
    } catch (e) {}
  }, [])

  const saveTemplateConfig = (tpl: string, hdr: string, ptl: string, showAg: boolean) => {
    setSelectedTemplate(tpl)
    setTemplateHeader(hdr)
    setTemplatePortal(ptl)
    setTemplateShowAgent(showAg)
    try {
      localStorage.setItem('agent_voucher_tpl', tpl)
      localStorage.setItem('agent_voucher_hdr', hdr)
      localStorage.setItem('agent_voucher_ptl', ptl)
      localStorage.setItem('agent_voucher_ag', String(showAg))
    } catch (e) {}
    toast.success('Pengaturan template voucher berhasil disimpan!')
  }

  // Calculate totals for Cloter Depan
  const totalSales = unsettledVouchers.reduce((sum: number, v: any) => sum + (v.packages ? v.packages.price : 0), 0)
  const commission = (totalSales * agent.commission_rate) / 100
  const netIncome = totalSales - commission

  const getBatchId = (v: any) => {
    if (v.comment && v.comment.startsWith('vc-')) {
      const parts = v.comment.split('-')
      if (parts.length >= 2) return `Batch ${parts[1]}`
    }
    return new Date(v.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
  }

  const unsettledMap = new Map()
  unsettledVouchers.forEach((v: any) => {
    const cloterId = getBatchId(v)
    const pkgName = v.packages?.name || 'Unknown'
    const key = `${cloterId}-${pkgName}`
    
    if (!unsettledMap.has(key)) {
      unsettledMap.set(key, { cloter: cloterId, paket: pkgName, rawDate: v.created_at, count: 0, omzet: 0, terpakai: 0, belum: 0, vouchers: [] })
    }
    const item = unsettledMap.get(key)
    item.count += 1
    item.omzet += (v.packages?.price || 0)
    item.vouchers.push(v)
    if (v.status !== 'Belum Digunakan') {
      item.terpakai += 1
    } else {
      item.belum += 1
    }
  })
  const unsettledGrouped = Array.from(unsettledMap.values()).sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime())

  // Calculate Stock Grouped by Batch (Cloter) and Package
  const stockMap = new Map()
  if (allVouchers) {
    allVouchers.forEach((v: any) => {
      // Group by ID to prevent minute differences from splitting cloters
      const cloterId = getBatchId(v)
      const pkgName = v.packages?.name || 'Unknown'
      const key = `${cloterId}-${pkgName}`
      
      if (!stockMap.has(key)) {
        stockMap.set(key, { cloter: cloterId, rawDate: v.created_at, paket: pkgName, total: 0, sisa: 0, vouchers: [], rawComment: v.comment })
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

  React.useEffect(() => {
    if (hasAutoSynced) return
    let isMounted = true

    const doAutoSync = async () => {
      let changed = false
      // Hanya auto-sync cloter yang masih ada sisa (belum laku)
      const activeStock = stockData.filter(s => s.sisa > 0)
      for (const s of activeStock) {
        if (!isMounted) break
        try {
          const res = await syncCloterVouchers(agent.id, s.vouchers, s.rawComment)
          if (res && !res.error && ((res.count || 0) > 0 || (res.usedCount || 0) > 0)) {
            changed = true
          }
        } catch (e) {
          // ignore error on auto-sync
        }
      }
      if (isMounted && changed) {
        router.refresh()
      }
    }

    if (stockData.length > 0) {
      setHasAutoSynced(true)
      doAutoSync()
    }

    return () => {
      isMounted = false
    }
  }, [stockData, hasAutoSynced, agent.id, router])

  async function handleDeleteCloter(cloterKey: string, cloterData: any) {
    if (!confirm(`Yakin mau hapus ${cloterData.vouchers.length} voucher di cloter ini? Data di database dan MikroTik akan dihapus permanen.`)) return
    
    setIsDeletingCloter(cloterKey)
    try {
      const res = await deleteVoucherCloter(agent.id, cloterData.vouchers, cloterData.rawComment)
      if (res?.error) {
        toast.error(res.error)
      } else if (res?.message) {
        toast.warning(res.message)
        router.refresh()
      } else {
        toast.success("Berhasil menghapus cloter.")
        router.refresh()
      }
    } catch (e: any) {
      toast.error(e.message || "Gagal menghapus.")
    } finally {
      setIsDeletingCloter(null)
    }
  }

  async function handleSyncCloter(cloterKey: string, cloterData: any) {
    setIsSyncingCloter(cloterKey)
    try {
      const res = await syncCloterVouchers(agent.id, cloterData.vouchers, cloterData.rawComment)
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success(`Berhasil sinkronisasi. ${res.count || 0} dihapus, ${res.usedCount || 0} terpakai.`)
        router.refresh()
      }
    } catch (e: any) {
      toast.error(e.message || "Gagal sinkronisasi.")
    } finally {
      setIsSyncingCloter(null)
    }
  }

  async function handlePartialSettle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!partialSettleBatch) return
    
    const formData = new FormData(e.currentTarget)
    const quantity = parseInt(formData.get('quantity') as string)
    
    if (quantity > partialSettleBatch.count) {
      toast.error(`Jumlah tidak bisa lebih dari ${partialSettleBatch.count}`)
      return
    }

    setIsPartialSettling(true)
    
    // Sort vouchers: Terpakai first, then Belum Digunakan
    const sortedVouchers = [...partialSettleBatch.vouchers].sort((a, b) => {
      if (a.status !== 'Belum Digunakan' && b.status === 'Belum Digunakan') return -1;
      if (a.status === 'Belum Digunakan' && b.status !== 'Belum Digunakan') return 1;
      return 0;
    });

    const selectedVouchers = sortedVouchers.slice(0, quantity)
    const selectedIds = selectedVouchers.map((v: any) => v.id)
    const totalSalesAmount = selectedVouchers.reduce((sum: number, v: any) => sum + (v.packages?.price || 0), 0)

    const res = await settlePartialVouchers(agent.id, selectedIds, totalSalesAmount, agent.commission_rate)
    
    setIsPartialSettling(false)
    if (res?.error) {
      toast.error(res.error)
    } else {
      toast.success(`Berhasil menyetorkan ${quantity} voucher.`)
      setPartialSettleBatch(null)
      router.refresh()
    }
  }

  async function handleAppend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!appendBatch) return

    setIsAppending(true)
    const formData = new FormData(e.currentTarget)
    const qty = parseInt(formData.get('quantity') as string)
    
    try {
      const serverStr = appendBatch.vouchers[0]?.server || 'all'
      const prefixStr = agent.username
      const commentStr = appendBatch.vouchers[0]?.comment
      const res = await generateAgentVouchers(agent.id, appendBatch.vouchers[0].package_id, serverStr, qty, prefixStr, 'alphanumeric', commentStr)
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success(`Berhasil menambahkan ${qty} voucher ke cloter.`)
        setAppendBatch(null)
        router.refresh()
      }
    } catch (e: any) {
      toast.error(e.message || "Gagal menambah voucher.")
    } finally {
      setIsAppending(false)
    }
  }

  async function handleGenerate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsGenerating(true)
    const formData = new FormData(e.currentTarget)
    
    try {
      const packageId = formData.get('package_id') as string
      const qty = parseInt(formData.get('quantity') as string)
      const server = formData.get('server') as string
      const prefix = formData.get('prefix') as string
      const randomType = (formData.get('randomType') as 'numeric' | 'alphanumeric') || 'alphanumeric'

      const res = await generateAgentVouchers(agent.id, packageId, server, qty, prefix, randomType)
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success(`Berhasil membuat ${qty} voucher.`)
        setIsDialogOpen(false) // Auto close modal after generation
        router.refresh()
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Terjadi kesalahan tidak terduga saat membuat voucher.')
    } finally {
      setIsGenerating(false)
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

  function generateSingleVoucherHtml(v: any, index: number, config: { template: string; header: string; portal: string; showAgent: boolean; agentName: string }) {
    const price = v.packages ? v.packages.price : 0
    const username = v.mikrotik_username || v.username || '-'
    const num = String(index + 1).padStart(3, '0')
    const formatPrice = `Rp ${price.toLocaleString('id-ID')}`
    const priceParts = formatPrice.split(' ')
    const { template, header, portal, showAgent, agentName } = config

    let color = "#00ACC1"
    if(price == 2000) color = "#616161"
    else if(price == 5000) color = "#E91E63"
    else if(price == 8000) color = "#673AB7"
    else if(price == 22000) color = "#1976D2"
    else if(price == 70000) color = "#28A745"
    else if(price == 150000) color = "#FF6F00"
    else if(price == 1500000) color = "#0D47A1"

    if (template === 'minimalist') {
      return `
        <div style="display:inline-block;width:190px;margin:3px;padding:8px;border:1.5px solid #00A76F;border-radius:8px;background:#fff;page-break-inside:avoid;box-sizing:border-box;font-family:system-ui,-apple-system,sans-serif;">
          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px dashed #cbd5e1;padding-bottom:4px;margin-bottom:6px;">
            <div style="font-weight:800;font-size:10px;color:#007867;letter-spacing:0.5px;">${header}</div>
            <div style="font-weight:800;font-size:11px;color:#fff;background:#00A76F;padding:1px 6px;border-radius:4px;">${formatPrice}</div>
          </div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:6px;text-align:center;margin-bottom:6px;">
            <div style="font-size:8px;color:#64748b;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;">KODE VOUCHER</div>
            <div style="font-family:monospace;font-size:15px;font-weight:900;color:#0f172a;letter-spacing:1.5px;">${username}</div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:7.5px;color:#475569;font-weight:600;">
            <div>${showAgent ? `Agen: <b>${agentName}</b>` : `#${num}`}</div>
            <div style="color:#007867;font-weight:bold;">${portal}</div>
          </div>
        </div>
      `
    }

    if (template === 'thermal') {
      return `
        <div style="display:inline-block;width:180px;margin:2px;padding:6px;border:1px solid #000;background:#fff;page-break-inside:avoid;box-sizing:border-box;font-family:monospace;text-align:center;">
          <div style="font-size:11px;font-weight:bold;text-transform:uppercase;border-bottom:1px dashed #000;padding-bottom:3px;margin-bottom:4px;">
            ${header}
          </div>
          <div style="font-size:13px;font-weight:bold;margin-bottom:2px;">
            ${formatPrice}
          </div>
          <div style="font-size:8px;margin-bottom:3px;font-weight:bold;">KUOTA: UNLIMITED</div>
          <div style="border:1.5px solid #000;padding:4px;margin:4px 0;">
            <div style="font-size:8px;text-transform:uppercase;">KODE VOUCHER:</div>
            <div style="font-size:15px;font-weight:bold;letter-spacing:1.5px;">${username}</div>
          </div>
          <div style="font-size:7.5px;border-top:1px dashed #000;padding-top:3px;margin-top:4px;">
            ${showAgent ? `AGEN: ${agentName.toUpperCase()} • ` : ''}LOGIN: ${portal}
          </div>
        </div>
      `
    }

    if (template === 'compact') {
      return `
        <div style="display:inline-block;width:155px;margin:2px;padding:4px 6px;border:1px solid #333;background:#fff;page-break-inside:avoid;box-sizing:border-box;font-family:sans-serif;">
          <div style="display:flex;justify-content:space-between;font-size:9px;font-weight:bold;border-bottom:1px solid #ccc;padding-bottom:2px;">
            <span style="color:#007867;">${header}</span>
            <span style="color:#d97706;">${formatPrice}</span>
          </div>
          <div style="text-align:center;padding:4px 0;">
            <div style="font-family:monospace;font-size:13px;font-weight:bold;letter-spacing:1px;color:#000;">${username}</div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:7px;color:#666;border-top:1px dotted #ccc;padding-top:2px;">
            <span>${showAgent ? agentName : `#${num}`}</span>
            <span>${portal}</span>
          </div>
        </div>
      `
    }

    if (template === 'dark') {
      return `
        <div style="display:inline-block;width:190px;margin:3px;padding:8px;border:1.5px solid #334155;border-radius:8px;background:#0f172a;color:#f8fafc;page-break-inside:avoid;box-sizing:border-box;font-family:system-ui,-apple-system,sans-serif;">
          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #334155;padding-bottom:4px;margin-bottom:6px;">
            <div style="font-weight:800;font-size:10px;color:#38bdf8;letter-spacing:0.5px;">${header}</div>
            <div style="font-weight:800;font-size:11px;color:#0f172a;background:#38bdf8;padding:1px 6px;border-radius:4px;">${formatPrice}</div>
          </div>
          <div style="background:#1e293b;border:1px solid #475569;border-radius:6px;padding:6px;text-align:center;margin-bottom:6px;">
            <div style="font-size:8px;color:#94a3b8;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;">VOUCHER CODE</div>
            <div style="font-family:monospace;font-size:15px;font-weight:900;color:#38bdf8;letter-spacing:2px;">${username}</div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:7.5px;color:#94a3b8;font-weight:600;">
            <div>${showAgent ? `Agen: ${agentName}` : `#${num}`}</div>
            <div style="color:#38bdf8;">${portal}</div>
          </div>
        </div>
      `
    }

    // Default: Mikhmon Classic Clean (No Validity / No Duration)
    return `
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
      <div style="padding:3px 0;border-bottom:1px solid ${color};text-align:center;font-weight:bold;font-size:14px;color:#000;font-family:monospace;">
      ${username}
      </div>
      ${showAgent ? `<div style="text-align:center;color:#111;font-size:7px;font-weight:bold;padding:2px;">AGEN: ${agentName.toUpperCase()}</div>` : ''}
      </td>
      <td style="width:100px;text-align:right;vertical-align:middle;padding-right:5px;padding-left:2px;">
        <table style="width:100%; border:none; border-collapse:collapse;">
          <tr>
            <td style="text-align:right; font-size:8px; font-weight:bold; color:#000; line-height:1.3; padding:0; padding-right:4px;">
              <span style="color:#007867;">KUOTA: UNLIMITED</span><br>
              <span style="color:#666; font-size:7px;">Login: ${portal}</span>
            </td>
          </tr>
        </table>
      </td>
      </tr>
      <tr>
      <td colspan="2" style="background:${color};padding:0;">
      <div style="color:#fff;font-size:9px;font-weight:bold;padding:2.5px;text-align:center;">
      ${header}
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
  }

  function handlePrint(vouchersToPrint: any[], templateOverride?: string) {
    if (!vouchersToPrint || vouchersToPrint.length === 0) {
      alert("Tidak ada voucher untuk dicetak.")
      return
    }

    const currentConfig = {
      template: templateOverride || selectedTemplate,
      header: templateHeader,
      portal: templatePortal,
      showAgent: templateShowAgent,
      agentName: agent.name
    }

    let html = `
      <html>
        <head>
          <title>Print Voucher Agen - ${agent.name}</title>
          <style>
            body { 
              font-family: sans-serif; 
              background: #fff; 
              padding: 10px; 
              display: flex; 
              flex-wrap: wrap; 
              gap: 8px; 
              justify-content: center; 
              align-items: flex-start;
            }
            @media print {
              body { padding: 0; display: flex; flex-wrap: wrap; justify-content: flex-start; align-items: flex-start; gap: 8px; }
              .page-break { page-break-after: auto; }
            }
          </style>
        </head>
        <body>
    `
    
    vouchersToPrint.forEach((v: any, index: number) => {
      html += generateSingleVoucherHtml(v, index, currentConfig)
    })

    html += `</body></html>`
    
    const printWindow = window.open('', '', 'width=850,height=650')
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

        <Button
          variant="outline"
          onClick={() => setIsTemplateDialogOpen(true)}
          className="border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 font-semibold gap-2 shadow-xs"
        >
          <Palette className="w-4 h-4" />
          <span>Desain Template Voucher</span>
          <span className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
            {VOUCHER_TEMPLATES.find(t => t.id === selectedTemplate)?.name.split(' ')[0] || 'Clean'}
          </span>
        </Button>
      </div>

      {/* Stok Sisa Voucher per Cloter */}
      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden mt-8">
        <div className="p-5 border-b bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Stok Sisa Voucher per Cloter (Konsinyasi)</h2>
            <p className="text-sm text-muted-foreground">Pantau berapa total tiket yang lu kasih ke agen dan berapa yang belom laku per tarikan (cloter).</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTemplateDialogOpen(true)}
            className="text-xs font-semibold gap-1.5 border-border shrink-0"
          >
            <Palette className="w-3.5 h-3.5 text-indigo-500" />
            Ganti Template Print
          </Button>
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
                          className="text-orange-500 hover:text-orange-600 hover:bg-orange-50"
                          onClick={() => setAppendBatch(s)}
                          title="Tambah Voucher ke Cloter Ini"
                        >
                          <Ticket className="w-4 h-4" />
                        </Button>
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
                          className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50"
                          onClick={() => handleSyncCloter(key, s)}
                          disabled={isSyncingCloter === key}
                          title="Sinkronisasi Cloter"
                        >
                          <RefreshCw className={`w-4 h-4 ${isSyncingCloter === key ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteCloter(key, s)}
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
                <th className="px-5 py-3 font-semibold text-center">Status Tiket</th>
                <th className="px-5 py-3 font-semibold text-right">Omzet</th>
                <th className="px-5 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {unsettledGrouped.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">Belum ada voucher di cloter ini.</td>
                </tr>
              ) : (
                unsettledGrouped.map((s: any, idx: number) => (
                  <tr key={idx} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="px-5 py-3 font-medium">{s.cloter}</td>
                    <td className="px-5 py-3">{s.paket}</td>
                    <td className="px-5 py-3 text-center text-sm">
                      <div className="flex gap-2 justify-center items-center">
                        <span className="font-bold text-blue-600" title="Total Tiket">{s.count} total</span>
                        <span className="text-muted-foreground">|</span>
                        <span className="text-green-600 font-bold" title="Tiket Laku/Terpakai">{s.terpakai} laku</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-[#00A76F]">Rp {s.omzet.toLocaleString('id-ID')}</td>
                    <td className="px-5 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => setPartialSettleBatch(s)}>
                        Bayar Sebagian
                      </Button>
                    </td>
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
      
      <Dialog open={!!partialSettleBatch} onOpenChange={(open) => !open && setPartialSettleBatch(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Setor Sebagian: {partialSettleBatch?.cloter}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePartialSettle} className="space-y-4 pt-4">
            <div className="grid gap-2">
              <Label>Paket (Harga: Rp {partialSettleBatch?.vouchers[0]?.packages?.price?.toLocaleString('id-ID')})</Label>
              <Input value={partialSettleBatch?.paket || ''} disabled />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Total Tiket Tersedia</Label>
                <Input value={partialSettleBatch?.count || 0} disabled />
              </div>
              <div className="grid gap-2">
                <Label className="text-green-600">Sudah Laku (Terpakai)</Label>
                <Input value={partialSettleBatch?.terpakai || 0} disabled className="border-green-200 text-green-700 bg-green-50" />
              </div>
            </div>
            <div className="grid gap-2 mt-2">
              <Label htmlFor="quantity">Jumlah Tiket yang Ingin Disetor / Dibayar</Label>
              <Input 
                id="quantity" 
                name="quantity" 
                type="number" 
                min="1" 
                max={partialSettleBatch?.count || 1} 
                defaultValue={partialSettleBatch?.terpakai > 0 ? partialSettleBatch?.terpakai : 1} 
                required 
              />
              <span className="text-xs text-muted-foreground">Sistem akan memprioritaskan tiket yang sudah terpakai untuk disetor.</span>
            </div>
            <Button type="submit" disabled={isPartialSettling} className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-4">
              {isPartialSettling ? 'Memproses Setoran...' : 'Setor Sekarang'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!appendBatch} onOpenChange={(open) => !open && setAppendBatch(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Voucher ke Cloter: {appendBatch?.cloter}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAppend} className="space-y-4 pt-4">
            <div className="grid gap-2">
              <Label>Paket yang Ditambahkan</Label>
              <Input value={appendBatch?.paket || ''} disabled />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quantity">Jumlah Voucher Tambahan</Label>
              <Input id="quantity" name="quantity" type="number" min="1" max="50" defaultValue="1" required />
            </div>
            <Button type="submit" disabled={isAppending} className="w-full bg-orange-600 hover:bg-orange-700 text-white mt-4">
              {isAppending ? 'Menambahkan...' : 'Generate & Tambah ke Cloter'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Desain & Template Voucher Agen */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Palette className="w-5 h-5 text-indigo-500" />
              Panel Desain & Template Voucher Agen
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Pilih gaya tampilan cetak voucher dan sesuaikan informasi yang ingin ditampilkan.
            </p>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            {/* Pilihan Template (Grid Cards) */}
            <div className="space-y-2.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Pilih Gaya Desain Template ({VOUCHER_TEMPLATES.length} Pilihan):
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {VOUCHER_TEMPLATES.map((tpl) => {
                  const isSelected = selectedTemplate === tpl.id
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => setSelectedTemplate(tpl.id)}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all relative flex flex-col justify-between ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-500/5 shadow-sm ring-2 ring-indigo-500/20'
                          : 'border-border/60 hover:border-border hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                          {isSelected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                          <span>{tpl.name}</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tpl.previewBg}`}>
                          {tpl.badge}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                        {tpl.description}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Opsi Kustomisasi Header & Teks */}
            <div className="bg-muted/40 p-4 rounded-xl space-y-4 border border-border/50">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-foreground">
                <Settings2 className="w-4 h-4 text-primary" />
                <span>Pengaturan Teks & Informasi Voucher:</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1.5">
                  <Label htmlFor="tplHeader" className="text-xs font-semibold">Judul Banner / Brand</Label>
                  <Input
                    id="tplHeader"
                    value={templateHeader}
                    onChange={(e) => setTemplateHeader(e.target.value)}
                    placeholder="Wi-Fi ALLSTAR"
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tplPortal" className="text-xs font-semibold">Domain Login Portal</Label>
                  <Input
                    id="tplPortal"
                    value={templatePortal}
                    onChange={(e) => setTemplatePortal(e.target.value)}
                    placeholder="allstar.net"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-foreground">
                  <input
                    type="checkbox"
                    checked={templateShowAgent}
                    onChange={(e) => setTemplateShowAgent(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <span>Tampilkan Label Nama Agen (AGEN: {agent.name.toUpperCase()})</span>
                </label>
              </div>
            </div>

            {/* Live Preview Box */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Pratinjau Langsung (Live Preview):</span>
              </Label>
              <div className="p-4 bg-muted/60 border border-border/60 rounded-xl flex justify-center items-center overflow-x-auto min-h-[140px]">
                <div
                  dangerouslySetInnerHTML={{
                    __html: generateSingleVoucherHtml(
                      { mikrotik_username: '6jsxwg6f', packages: { price: 5000 } },
                      0,
                      {
                        template: selectedTemplate,
                        header: templateHeader,
                        portal: templatePortal,
                        showAgent: templateShowAgent,
                        agentName: agent.name
                      }
                    )
                  }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl font-semibold gap-2"
                onClick={() => {
                  handlePrint([{ mikrotik_username: '6jsxwg6f', packages: { price: 5000 } }], selectedTemplate)
                }}
              >
                <Printer className="w-4 h-4" />
                Cetak Contoh Voucher (Test Print)
              </Button>
              <Button
                className="flex-1 bg-[#00A76F] hover:bg-[#007867] text-white rounded-xl font-semibold gap-2 shadow-sm"
                onClick={() => {
                  saveTemplateConfig(selectedTemplate, templateHeader, templatePortal, templateShowAgent)
                  setIsTemplateDialogOpen(false)
                }}
              >
                <Check className="w-4 h-4" />
                Simpan Sebagai Template Aktif
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
