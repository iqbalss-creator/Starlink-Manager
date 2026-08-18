'use client'

import { useState, useTransition, useMemo } from 'react'
import { Payment, Customer } from '@/types'
import { createPayment, deletePayment, markAsPaid } from './actions'
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
import { Plus, Trash2, Search, Download, CheckCircle } from 'lucide-react'

function exportToCSV(payments: Payment[]) {
  const headers = ['Tanggal', 'Pelanggan', 'Paket', 'Jumlah', 'Metode', 'Catatan']
  const rows = payments.map(p => [
    new Date(p.payment_date).toLocaleDateString('id-ID'),
    p.customers?.name || '-',
    '-', // Paket is removed since payments map to customers directly now
    p.amount,
    p.method,
    p.notes || '-',
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pembayaran-${new Date().toLocaleDateString('id-ID').replace(/\//g, '-')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function PaymentList({
  initialPayments,
  customers
}: {
  initialPayments: Payment[]
  customers: Customer[]
  userRole?: string
}) {
  const [isPending, startTransition] = useTransition()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [search, setSearch] = useState('')

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId)
  const suggestedAmount = selectedCustomer?.packages?.price || ''

  const filtered = useMemo(() => {
    if (!search) return initialPayments
    return initialPayments.filter(p =>
      p.customers?.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.method.toLowerCase().includes(search.toLowerCase())
    )
  }, [initialPayments, search])

  const handleCreate = async (formData: FormData) => {
    startTransition(async () => {
      try {
        await createPayment(formData)
        setIsCreateOpen(false)
        setSelectedCustomerId('')
      } catch (err) {
        alert('Gagal memproses pembayaran: ' + (err as Error).message)
      }
    })
  }

  const handleMarkPaid = async (id: string) => {
    if (!confirm('Tandai pembayaran ini sebagai Lunas?')) return
    startTransition(async () => {
      try {
        await markAsPaid(id)
      } catch (err) {
        alert('Gagal mengupdate status: ' + (err as Error).message)
      }
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus rekam pembayaran ini?')) return
    startTransition(async () => {
      try {
        await deletePayment(id)
      } catch (err) {
        alert('Gagal menghapus pembayaran: ' + (err as Error).message)
      }
    })
  }

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'Tunai':
        return <span className="bg-[#C8FAD6] text-[#007867] px-3 py-1 rounded-full text-xs font-bold">Tunai</span>
      case 'Transfer':
        return <span className="bg-[#FFF7CD] text-[#B76E00] px-3 py-1 rounded-full text-xs font-bold">Transfer</span>
      case 'QRIS':
        return <span className="bg-[#D0F2FF] text-[#006C9C] px-3 py-1 rounded-full text-xs font-bold">QRIS</span>
      default:
        return <span className="bg-muted text-muted-foreground px-3 py-1 rounded-full text-xs font-bold">{method}</span>
    }
  }

  const getStatusBadge = (status?: 'Lunas' | 'Hutang') => {
    if (status === 'Hutang') {
      return <span className="bg-[#FFE7D9] text-[#B71D18] px-3 py-1 rounded-full text-xs font-bold">Hutang</span>
    }
    return <span className="bg-[#C8FAD6] text-[#007867] px-3 py-1 rounded-full text-xs font-bold">Lunas</span>
  }

  const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

  // Total revenue from filtered
  const totalFiltered = filtered.reduce((a, p) => a + Number(p.amount), 0)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div>
          <h1 className="text-[24.5px] font-semibold text-foreground tracking-tight">Pembayaran</h1>
          <p className="text-sm text-muted-foreground font-medium">
            Riwayat transaksi dan perpanjangan masa aktif pelanggan
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => exportToCSV(filtered)} className="gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-8 px-3 py-2 bg-[#00A76F] hover:bg-[#007867] text-white gap-2">
              <Plus className="w-4 h-4" />
              Catat Pembayaran
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Catat Pembayaran Baru</DialogTitle>
              </DialogHeader>
              <form action={handleCreate} className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="customer_id">Pilih Pelanggan</Label>
                  <select
                    id="customer_id"
                    name="customer_id"
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    required
                    className={selectClass}
                  >
                    <option value="" disabled>-- Pilih Pelanggan --</option>
                    {customers.map(cust => (
                      <option key={cust.id} value={cust.id}>
                        {cust.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="amount">Jumlah Bayar (Rp)</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    defaultValue={suggestedAmount}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="method">Metode Pembayaran</Label>
                  <select id="method" name="method" defaultValue="Transfer" className={selectClass}>
                    <option value="Tunai">Tunai</option>
                    <option value="Transfer">Transfer Bank</option>
                    <option value="QRIS">QRIS</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="status">Status Pembayaran</Label>
                  <select id="status" name="status" defaultValue="Lunas" className={selectClass}>
                    <option value="Lunas">Lunas (Langsung Bayar)</option>
                    <option value="Hutang">Hutang (Bayar Nanti, Tetap Aktif)</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Catatan (Opsional)</Label>
                  <Input id="notes" name="notes" placeholder="Contoh: Lunas via BCA" />
                </div>
                <Button type="submit" disabled={isPending} className="bg-[#00A76F] hover:bg-[#007867] text-white mt-4">
                  {isPending ? 'Memproses...' : 'Konfirmasi Pembayaran'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search + Summary */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama pelanggan atau metode..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {filtered.length} transaksi •{' '}
          <span className="font-semibold text-[#00A76F]">
            Rp {totalFiltered.toLocaleString('id-ID')}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl shadow-[rgba(145,158,171,0.2)_0px_0px_2px_0px,rgba(145,158,171,0.12)_0px_12px_24px_-4px] dark:shadow-none dark:border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[12px] font-semibold text-foreground bg-muted border-b border-border">
              <tr>
                <th className="px-6 py-4">TANGGAL</th>
                <th className="px-6 py-4">PELANGGAN</th>
                <th className="px-6 py-4">JUMLAH</th>
                <th className="px-6 py-4">METODE</th>
                <th className="px-6 py-4">STATUS</th>
                <th className="px-6 py-4 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">
                    {search ? 'Tidak ada pembayaran yang cocok.' : 'Belum ada riwayat pembayaran.'}
                  </td>
                </tr>
              ) : (
                filtered.map((pay) => (
                  <tr key={pay.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(pay.payment_date).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-foreground">{pay.customers?.name}</div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-foreground">
                      Rp {pay.amount.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4">{getMethodBadge(pay.method)}</td>
                    <td className="px-6 py-4">{getStatusBadge(pay.status)}</td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      {pay.status === 'Hutang' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Tandai Lunas"
                          className="h-8 w-8 text-[#00A76F] hover:bg-[#00A76F]/10"
                          onClick={() => handleMarkPaid(pay.id)}
                          disabled={isPending}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(pay.id)}
                        disabled={isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
