'use client'

import React, { useState, useTransition, useMemo, Fragment, useEffect } from 'react'
import { Customer, Package, Contact } from '@/types'
import { createCustomer, updateCustomer, deleteCustomer, deleteVoucher, addVouchersToCustomer, syncMikrotikUsers, setVoucherExpiry, payDebt, updateVoucherPaymentStatus } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, Edit, Trash2, Search, Download, Filter, Printer, MessageCircle, RefreshCw, Phone, Ticket, Calendar, Check, X, User, MessageSquare } from 'lucide-react'
import { UpdateExpiryDialog } from '@/components/dashboard/update-expiry-dialog'

// Utility: export CSV
function exportToCSV(customers: Customer[]) {
  const headers = ['Nama', 'WhatsApp', 'Gender', 'Paket', 'Status', 'Jatuh Tempo', 'Terdaftar']
  const rows = customers.map(c => [
    c.name,
    c.whatsapp_number,
    c.gender || '-',
    c.packages?.name || '-',
    c.status,
    c.expiry_date ? new Date(c.expiry_date).toLocaleDateString('id-ID') : '-',
    new Date(c.created_at).toLocaleDateString('id-ID'),
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pelanggan-${new Date().toLocaleDateString('id-ID').replace(/\//g, '-')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const STATUS_OPTIONS = ['Semua', 'Aktif', 'Nonaktif', 'Suspended'] as const

export function CustomerList({ 
  initialCustomers, 
  packages,
  contacts = [],
  userRole,
  hotspotServers = []
}: { 
  initialCustomers: Customer[], 
  packages: Package[],
  contacts?: Contact[],
  userRole?: string,
  hotspotServers?: string[]
}) {
  const [isPending, startTransition] = useTransition()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isAddVoucherOpen, setIsAddVoucherOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [editingExpiryVoucherId, setEditingExpiryVoucherId] = useState<string | null>(null)
  const [editingExpiryValue, setEditingExpiryValue] = useState<string>('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<typeof STATUS_OPTIONS[number]>('Semua')
  const [packageFilter, setPackageFilter] = useState<string>('Semua')
  const [mtServers, setMtServers] = useState<string[]>(
    hotspotServers.length > 0 ? ['all', ...hotspotServers] : ['all', 'hotspot-allstar']
  )

  // Form states
  const [newName, setNewName] = useState('')
  const [newWhatsApp, setNewWhatsApp] = useState('')
  const [newGender, setNewGender] = useState<string>('Laki-laki')
  const [showContactSuggestions, setShowContactSuggestions] = useState(false)
  
  useEffect(() => {
    // Auto-sync setiap 2 menit (120000 ms) sesuai permintaan.
    // Interval ini cukup aman untuk CPU MikroTik.
    const interval = setInterval(() => {
      startTransition(async () => {
        try {
          await syncMikrotikUsers()
        } catch (e) {
          console.error("Auto-sync error:", e)
        }
      })
    }, 120000)

    return () => clearInterval(interval)
  }, [])

  const handleSync = async () => {
    startTransition(async () => {
      try {
        await syncMikrotikUsers()
        window.location.reload()
      } catch (err) {
        alert('Gagal sinkronisasi: ' + (err as Error).message)
      }
    })
  }

  // Client-side filter
  const filtered = useMemo(() => {
    return initialCustomers.filter(c => {
      const matchSearch =
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.whatsapp_number.includes(search) ||
        (c.vouchers && c.vouchers.some((v: any) => v.mikrotik_username?.toLowerCase().includes(search.toLowerCase()) || v.comment?.toLowerCase().includes(search.toLowerCase())))
        
      const matchStatus = statusFilter === 'Semua' || 
        c.status === statusFilter || 
        (c.vouchers && c.vouchers.some((v: any) => v.status === statusFilter))

      const matchPackage = packageFilter === 'Semua' || 
        (c.vouchers && c.vouchers.some((v: any) => v.package_id === packageFilter))

      return matchSearch && matchStatus && matchPackage
    })
  }, [initialCustomers, search, statusFilter, packageFilter])

  const handleCreate = async (formData: FormData) => {
    startTransition(async () => {
      try {
        await createCustomer(formData)
        setIsCreateOpen(false)
      } catch (err) {
        alert('Gagal menambah pelanggan: ' + (err as Error).message)
      }
    })
  }

  const handleEdit = async (formData: FormData) => {
    if (!editingCustomer) return
    startTransition(async () => {
      try {
        await updateCustomer(editingCustomer.id, formData)
        setIsEditOpen(false)
        setEditingCustomer(null)
      } catch (err) {
        alert('Gagal menyimpan pelanggan: ' + (err as Error).message)
      }
    })
  }

  const handleDelete = async (id: string) => {
    if (userRole === 'reviewer') {
      alert('Akses ditolak: Reviewer tidak dapat menghapus pelanggan.')
      return
    }
    if (!confirm('Apakah Anda yakin ingin menghapus pelanggan ini beserta seluruh vouchernya?')) return
    startTransition(async () => {
      try {
        await deleteCustomer(id)
      } catch (err) {
        alert('Gagal menghapus pelanggan: ' + (err as Error).message)
      }
    })
  }

  const handleDeleteVoucher = async (id: string) => {
    if (userRole === 'reviewer') {
      alert('Akses ditolak: Reviewer tidak dapat menghapus voucher.')
      return
    }
    if (!confirm('Apakah Anda yakin ingin menghapus voucher ini?')) return
    startTransition(async () => {
      try {
        await deleteVoucher(id)
      } catch (err) {
        alert('Gagal menghapus voucher: ' + (err as Error).message)
      }
    })
  }

  const handleAddVoucher = async (formData: FormData) => {
    if (!editingCustomer) return
    startTransition(async () => {
      try {
        await addVouchersToCustomer(editingCustomer.id, formData)
        setIsAddVoucherOpen(false)
      } catch (err) {
        alert('Gagal menambah voucher: ' + (err as Error).message)
      }
    })
  }

  const handleSaveExpiry = (voucherId: string) => {
    if (!editingExpiryValue) return
    startTransition(async () => {
      try {
        await setVoucherExpiry(voucherId, editingExpiryValue)
        setEditingExpiryVoucherId(null)
        setEditingExpiryValue('')
      } catch (err) {
        alert('Gagal simpan jatuh tempo: ' + (err as Error).message)
      }
    })
  }

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer)
    setIsEditOpen(true)
  }

  const handlePayDebt = (customerId: string) => {
    if (userRole === 'reviewer') {
      alert('Akses ditolak: Reviewer tidak dapat memproses pembayaran hutang.')
      return
    }
    if (confirm('Apakah Anda yakin pelanggan ini sudah melunasi semua hutangnya?')) {
      startTransition(async () => {
        try {
          await payDebt(customerId)
        } catch (err) {
          alert('Gagal melunasi hutang: ' + (err as Error).message)
        }
      })
    }
  }

  const handleTogglePaymentStatus = (voucherId: string, currentStatus: string) => {
    if (userRole === 'reviewer') {
      alert('Akses ditolak: Reviewer tidak dapat mengubah status pembayaran.')
      return
    }
    const newStatus = currentStatus === 'Lunas' ? 'Belum Lunas' : 'Lunas'
    const confirmMsg = newStatus === 'Lunas' 
      ? 'Ubah status pembayaran voucher ini menjadi Lunas?'
      : 'Ubah status pembayaran voucher ini menjadi Kasbon?'
    
    if (confirm(confirmMsg)) {
      startTransition(async () => {
        try {
          await updateVoucherPaymentStatus(voucherId, newStatus)
        } catch (err) {
          alert('Gagal mengubah status: ' + (err as Error).message)
        }
      })
    }
  }

  const handleWhatsApp = (cust: Customer, contactless: boolean = false) => {
    let wa = cust.whatsapp_number.replace(/\D/g, '')
    if (wa.startsWith('0')) wa = '62' + wa.substring(1)
    
    const vouchers = cust.vouchers && cust.vouchers.length > 0 ? cust.vouchers : []
    
    let text = `Halo ${cust.name.trim()}, ini detail voucher WiFi kamu:\n\n`
    
    let totalHarga = 0;
    let totalTagihan = 0;
    
    vouchers.forEach((v: any, index: number) => {
      const pkgName = v.packages ? v.packages.name : 'Paket'
      const username = v.mikrotik_username || '-'
      const harga = v.packages?.price || 0
      
      totalHarga += harga
      if (v.payment_status === 'Belum Lunas') {
        totalTagihan += harga
      }

      if (vouchers.length > 1) text += `--- Voucher ${index + 1} ---\n`
      text += `Paket: *${pkgName}*\nKode Voucher: *${username}*\nHarga: *Rp ${harga.toLocaleString('id-ID')}*\n\n`
    })
    
    text += `*Total Pembelian: Rp ${totalHarga.toLocaleString('id-ID')}*\n`
    
    if (totalTagihan > 0) {
      text += `*Total Tagihan (Belum Lunas): Rp ${totalTagihan.toLocaleString('id-ID')}*\n\n`
    } else {
      text += `\n`
    }

    text += `Selamat menikmati layanan internet kami!\n\n`
    text += `Pantau sisa voucher dan tagihan Anda di:\n`
    text += `https://${window.location.host}/portal`
    if (contactless) {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    } else {
      window.open(`https://wa.me/${wa}?text=${encodeURIComponent(text)}`, '_blank')
    }
  }

  const handlePrint = (cust: Customer) => {
    const printWindow = window.open('', '_blank', 'width=400,height=800')
    if (!printWindow) return

    const vouchers = cust.vouchers && cust.vouchers.length > 0 ? cust.vouchers : []
    
    let html = `
      <html>
        <head>
          <title>Print Voucher</title>
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
    
    vouchers.forEach((v: any, index: number) => {
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
        <!-- Ganti src logo di sini jika perlu path absolute dari domain -->
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
        <div style="text-align:center;color:#111;font-size:8px;font-weight:bold;padding:3px;">
        Wi-Fi ALLSTAR
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
        <div style="color:#fff;font-size:9px;font-weight:bold;padding:2.5px;">
        <span style="float:left;padding-left:3px;">
        CS : ${cust.whatsapp_number}
        </span>
        <div style="clear:both;"></div>
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

    html += `
          <script>
            setTimeout(() => {
              window.print();
            }, 500);
          </script>
        </body>
      </html>
    `
    printWindow.document.write(html)
    printWindow.document.close()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Aktif':
        return <span className="bg-[#C8FAD6] text-[#007867] px-3 py-1 rounded-full text-xs font-bold">Aktif</span>
      case 'Nonaktif':
        return <span className="bg-[#F9FAFB] text-[#637381] border border-border px-3 py-1 rounded-full text-xs font-bold">Nonaktif</span>
      case 'Suspended':
        return <span className="bg-[#FFE7D9] text-[#B71D18] px-3 py-1 rounded-full text-xs font-bold">Suspended</span>
      default:
        return <span className="bg-muted text-muted-foreground px-3 py-1 rounded-full text-xs font-bold">{status}</span>
    }
  }

  const getPaymentStatusBadge = (status?: string, voucherId?: string) => {
    if (status === 'Belum Lunas') {
      return (
        <button 
          type="button"
          onClick={() => voucherId && handleTogglePaymentStatus(voucherId, 'Belum Lunas')}
          disabled={isPending}
          className="mt-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-900 px-2.5 py-1 rounded text-[10px] font-bold tracking-wide uppercase hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors cursor-pointer flex items-center justify-between gap-2 min-w-[85px] shadow-sm"
          title="Klik untuk ubah status pembayaran"
        >
          <span>Kasbon</span>
          <Edit className="w-3 h-3 text-red-500 dark:text-red-400" />
        </button>
      )
    }
    return (
      <button 
        type="button"
        onClick={() => voucherId && handleTogglePaymentStatus(voucherId, 'Lunas')}
        disabled={isPending}
        className="mt-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-900 px-2.5 py-1 rounded text-[10px] font-bold tracking-wide uppercase hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors cursor-pointer flex items-center justify-between gap-2 min-w-[85px] shadow-sm"
        title="Klik untuk ubah status pembayaran"
      >
        <span>Lunas</span>
        <Edit className="w-3 h-3 text-green-500 dark:text-green-400" />
      </button>
    )
  }

  const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div>
          <h1 className="text-[24.5px] font-semibold text-foreground tracking-tight">Pelanggan</h1>
          <p className="text-sm text-muted-foreground font-medium">
            Kelola data dan status berlangganan customer Anda
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => exportToCSV(filtered)}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={handleSync}
            disabled={isPending}
            className="gap-2 text-[#00A76F] border-[#00A76F]/30 hover:bg-[#00A76F]/10"
          >
            <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
            Sync MikroTik
          </Button>
          {userRole !== 'reviewer' && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2 bg-[#00A76F] hover:bg-[#007867] text-white gap-2">
                <Plus className="w-4 h-4" />
                Pelanggan Baru
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Tambah Pelanggan Baru</DialogTitle>
              </DialogHeader>
              <form action={handleCreate} className="grid gap-4 py-4">
                <div className="grid gap-2 relative">
                  <Label htmlFor="name">Nama Lengkap</Label>
                  <Input 
                    id="name" 
                    name="name" 
                    placeholder="Misal: Budi Santoso" 
                    required 
                    value={newName}
                    onChange={(e) => {
                      setNewName(e.target.value)
                      setShowContactSuggestions(true)
                    }}
                    onFocus={() => setShowContactSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowContactSuggestions(false), 200)}
                    autoComplete="off"
                  />
                  {showContactSuggestions && newName && contacts && contacts.length > 0 && (
                    <div className="absolute z-10 top-[70px] left-0 w-full bg-background border rounded-md shadow-lg max-h-[200px] overflow-y-auto">
                      {contacts
                        .filter(c => c.name.toLowerCase().includes(newName.toLowerCase()))
                        .map(c => (
                          <div 
                            key={c.id} 
                            className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                            onClick={() => {
                              setNewName(c.name)
                              setNewWhatsApp(c.whatsapp_number || '')
                              if (c.gender) setNewGender(c.gender)
                              setShowContactSuggestions(false)
                            }}
                          >
                            <div className="font-medium">{c.name}</div>
                            <div className="text-xs text-muted-foreground">{c.whatsapp_number}</div>
                          </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="grid gap-2">
                  <Label>Gender</Label>
                  <div className="flex gap-4 items-center">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name="gender" value="Laki-laki" checked={newGender === 'Laki-laki'} onChange={(e) => setNewGender(e.target.value)} className="w-4 h-4 text-[#00A76F]" />
                      Bapak
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name="gender" value="Perempuan" checked={newGender === 'Perempuan'} onChange={(e) => setNewGender(e.target.value)} className="w-4 h-4 text-[#00A76F]" />
                      Ibu
                    </label>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="whatsapp_number">Nomor WhatsApp</Label>
                  <Input 
                    id="whatsapp_number" 
                    name="whatsapp_number" 
                    placeholder="08123456789" 
                    required 
                    value={newWhatsApp}
                    onChange={(e) => setNewWhatsApp(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="package_id">Paket Layanan</Label>
                  <select id="package_id" name="package_id" className={selectClass} required>
                    <option value="">-- Pilih Paket --</option>
                    {packages.map(pkg => (
                      <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="quantity">Jumlah Voucher</Label>
                  <Input id="quantity" name="quantity" type="number" min="1" defaultValue="1" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="server">Server MikroTik</Label>
                  <select id="server" name="server" className={selectClass} required>
                    {mtServers.filter(s => s !== 'all').map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <select id="status" name="status" defaultValue="Aktif" className={selectClass}>
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="payment_status">Status Pembayaran</Label>
                  <select id="payment_status" name="payment_status" defaultValue="Lunas" className={selectClass}>
                    <option value="Lunas">Lunas (Bayar Sekarang)</option>
                    <option value="Belum Lunas">Kasbon / Belum Lunas</option>
                  </select>
                </div>
                <Button type="submit" disabled={isPending} className="bg-[#00A76F] hover:bg-[#007867] text-white mt-4">
                  {isPending ? 'Menyimpan...' : 'Simpan Pelanggan'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </div>

      {/* Search & Filter bar */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama, WA, username, comment..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as typeof STATUS_OPTIONS[number])}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={packageFilter}
            onChange={e => setPackageFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="Semua">Semua Paket</option>
            {packages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          {filtered.length} dari {initialCustomers.length} pelanggan
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl shadow-[rgba(145,158,171,0.2)_0px_0px_2px_0px,rgba(145,158,171,0.12)_0px_12px_24px_-4px] dark:shadow-none dark:border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-[12px] font-semibold text-foreground bg-muted border-b border-border">
              <tr>
                <th className="px-6 py-4">NAMA & KONTAK</th>
                <th className="px-6 py-4">VOUCHER</th>
                <th className="px-6 py-4">PAKET</th>
                <th className="px-6 py-4">JATUH TEMPO</th>
                <th className="px-6 py-4">STATUS</th>
                <th className="px-6 py-4 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                    {search || statusFilter !== 'Semua'
                      ? 'Tidak ada pelanggan yang cocok dengan filter.'
                      : 'Belum ada data pelanggan.'}
                  </td>
                </tr>
              ) : (
                filtered.map((cust) => {
                  const vouchers = cust.vouchers && cust.vouchers.length > 0 ? cust.vouchers : [null]
                  const rowSpan = vouchers.length
                  return (
                    <Fragment key={cust.id}>
                      {vouchers.map((v: any, index: number) => (
                        <tr key={v ? v.id : `${cust.id}-empty`} className="border-b border-border hover:bg-muted/50 transition-colors">
                          {index === 0 && (
                            <td className="px-6 py-4 align-top" rowSpan={rowSpan}>
                              <div className="font-bold text-foreground text-base">{cust.name}</div>
                              <div className="flex flex-col gap-2 mt-2">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Phone className="w-3.5 h-3.5 text-[#00A76F]" />
                                  <span>{cust.whatsapp_number}</span>
                                </div>
                                {(() => {
                                  const totalDebt = (cust.vouchers || []).filter((v: any) => v.payment_status === 'Belum Lunas').reduce((acc: number, v: any) => acc + (v.packages?.price || 0), 0)
                                  if (totalDebt > 0) {
                                    return (
                                      <div className="flex flex-row items-center justify-between w-full mt-2 bg-red-50 dark:bg-red-950/40 p-2.5 rounded-lg border border-red-200 dark:border-red-900/60 shadow-sm">
                                        <div className="flex flex-col whitespace-nowrap">
                                          <span className="text-[10px] uppercase font-bold text-red-600 dark:text-red-500 tracking-wider">Total Hutang</span>
                                          <span className="text-sm font-black text-red-700 dark:text-red-400">
                                            {userRole === 'reviewer' ? 'Rp ***.***' : `Rp ${totalDebt.toLocaleString('id-ID')}`}
                                          </span>
                                        </div>
                                        {userRole !== 'reviewer' && (
                                          <Button 
                                            size="sm" 
                                            className="h-8 ml-3 text-xs font-bold bg-red-600 hover:bg-red-700 text-white border-0 dark:bg-red-700 dark:hover:bg-red-600 shadow-sm" 
                                            onClick={() => handlePayDebt(cust.id)} 
                                            disabled={isPending}
                                          >
                                            Lunasi
                                          </Button>
                                        )}
                                      </div>
                                    )
                                  }
                                  return null
                                })()}
                              </div>
                            </td>
                          )}
                          <td className="px-6 py-4 align-top">
                            {/* Voucher Badge */}
                            {v && v.mikrotik_username ? (
                              <div className="inline-flex items-center gap-2.5 bg-[#00A76F]/10 border border-[#00A76F]/20 text-[#00A76F] px-3 py-1.5 rounded-md w-fit">
                                <Ticket className="w-4 h-4" />
                                <div className="flex flex-col">
                                  <span className="text-[9px] uppercase font-bold tracking-wider opacity-80 leading-none mb-1">Kode Voucher</span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-bold text-sm leading-none">{v.mikrotik_username}</span>
                                    <span className="text-[9px] bg-[#00A76F]/20 text-[#00A76F] px-1.5 py-0.5 rounded font-semibold uppercase">{v.server || 'all'}</span>
                                  </div>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 ml-2 text-destructive hover:bg-destructive/10" 
                                  onClick={() => handleDeleteVoucher(v.id)}
                                  disabled={isPending}
                                  title="Hapus Voucher"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <span className="italic text-xs text-muted-foreground">Belum ada</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground font-medium align-top">
                            {v && v.packages ? v.packages.name : <span className="italic text-xs">Tanpa Paket</span>}
                          </td>
                          <td className="px-6 py-4 align-top">
                            {v && editingExpiryVoucherId === v.id ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="date"
                                  value={editingExpiryValue}
                                  onChange={e => setEditingExpiryValue(e.target.value)}
                                  className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-[#00A76F] hover:bg-[#00A76F]/10"
                                  onClick={() => handleSaveExpiry(v.id)}
                                  disabled={isPending}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-muted-foreground"
                                  onClick={() => { setEditingExpiryVoucherId(null); setEditingExpiryValue('') }}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 group">
                                {v && v.expiry_date ? (
                                  <div className="text-foreground text-sm font-medium">
                                    {new Date(v.expiry_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </div>
                                ) : v?.status === 'Nonaktif' ? (
                                  <span className="inline-flex items-center gap-1.5 bg-red-500/10 text-red-600 dark:text-red-500 border border-red-500/20 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                    Terhapus / Expired
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border border-yellow-500/20 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                    Belum Digunakan
                                  </span>
                                )}
                                {v && v.mikrotik_username && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-[#00A76F]"
                                    title="Set Jatuh Tempo & Buat Scheduler MikroTik"
                                    onClick={() => {
                                      setEditingExpiryVoucherId(v.id)
                                      setEditingExpiryValue(
                                        v.expiry_date
                                          ? new Date(v.expiry_date).toISOString().split('T')[0]
                                          : new Date().toISOString().split('T')[0]
                                      )
                                    }}
                                  >
                                    <Calendar className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 align-top">
                            <div className="flex flex-col gap-2 w-fit">
                              {v ? getStatusBadge(v.status) : '-'}
                              {v && v.payment_status && getPaymentStatusBadge(v.payment_status, v.id)}
                            </div>
                          </td>
                          {index === 0 && (
                            <td className="px-6 py-4 text-right align-top" rowSpan={rowSpan}>
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Print Semua Voucher"
                                  onClick={() => handlePrint(cust)}
                                  className="text-muted-foreground hover:text-blue-600 transition-colors"
                                >
                                  <Printer className="w-4 h-4" />
                                </Button>
                                <DropdownMenu>
                                  {/* @ts-ignore */}
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-[#00A76F]">
                                      <MessageCircle className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleWhatsApp(cust)}>
                                      <MessageSquare className="mr-2 h-4 w-4" />
                                      <span>Kirim WA</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleWhatsApp(cust, true)}>
                                      <MessageSquare className="mr-2 h-4 w-4" />
                                      <span>Kirim WA (Pilih Kontak)</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Edit"
                                  onClick={() => openEditModal(cust)}
                                >
                                  <Edit className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                                </Button>
                                <form action={() => startTransition(() => handleDelete(cust.id))} className="inline">
                                  <Button variant="ghost" size="icon" type="submit" disabled={isPending} title="Hapus">
                                    <Trash2 className="w-4 h-4 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950" />
                                  </Button>
                                </form>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Pelanggan</DialogTitle>
          </DialogHeader>
          <form action={handleEdit} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nama Lengkap</Label>
              <Input id="edit-name" name="name" defaultValue={editingCustomer?.name} required />
            </div>
            
            <div className="grid gap-2">
              <Label>Gender</Label>
              <div className="flex gap-4 items-center">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="gender" value="Laki-laki" defaultChecked={editingCustomer?.gender === 'Laki-laki'} className="w-4 h-4 text-[#00A76F]" />
                  Bapak
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="gender" value="Perempuan" defaultChecked={editingCustomer?.gender === 'Perempuan'} className="w-4 h-4 text-[#00A76F]" />
                  Ibu
                </label>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-whatsapp_number">Nomor WhatsApp</Label>
              <Input id="edit-whatsapp_number" name="whatsapp_number" defaultValue={editingCustomer?.whatsapp_number} required />
            </div>
            <Button type="submit" disabled={isPending} className="bg-[#00A76F] hover:bg-[#007867] text-white mt-4">
              {isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </form>
          <div className="border-t pt-4 mt-2">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-foreground">Tambah Voucher Baru</p>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setIsAddVoucherOpen(prev => !prev)}
              >
                <Plus className="w-3.5 h-3.5" />
                {isAddVoucherOpen ? 'Batal' : 'Tambah Voucher'}
              </Button>
            </div>
            {isAddVoucherOpen && (
              <form action={handleAddVoucher} className="grid gap-3">
                <input type="hidden" name="name" value={editingCustomer?.name || ''} />
                <input type="hidden" name="whatsapp_number" value={editingCustomer?.whatsapp_number || ''} />
                <div className="grid gap-1.5">
                  <Label htmlFor="add-package_id" className="text-xs">Paket Layanan</Label>
                  <select id="add-package_id" name="package_id" className={selectClass} required>
                    <option value="">-- Pilih Paket --</option>
                    {packages.map(pkg => (
                      <option key={pkg.id} value={pkg.id}>{pkg.name} - Rp {pkg.price.toLocaleString('id-ID')}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="add-quantity" className="text-xs">Jumlah Voucher</Label>
                  <Input id="add-quantity" name="quantity" type="number" min="1" defaultValue="1" required />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="add-server" className="text-xs">Server MikroTik</Label>
                  <select id="add-server" name="server" className={selectClass} required>
                    {mtServers.filter(s => s !== 'all').map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="add-payment_status" className="text-xs">Status Pembayaran</Label>
                  <select id="add-payment_status" name="payment_status" defaultValue="Lunas" className={selectClass}>
                    <option value="Lunas">Lunas (Bayar Sekarang)</option>
                    <option value="Belum Lunas">Kasbon / Belum Lunas</option>
                  </select>
                </div>
                <Button type="submit" disabled={isPending} className="bg-[#00A76F] hover:bg-[#007867] text-white w-full">
                  {isPending ? 'Membuat...' : 'Buat Voucher'}
                </Button>
              </form>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
