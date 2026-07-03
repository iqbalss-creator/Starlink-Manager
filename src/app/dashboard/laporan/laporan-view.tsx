'use client'

import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts'
import { Download, TrendingUp, Users, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'

type RevenuePoint = {
  month: string
  total: number
  tunai: number
  transfer: number
  qris: number
  count: number
}

type CustomerStats = {
  total: number
  aktif: number
  suspended: number
  nonaktif: number
}

type Payment = {
  id: string
  payment_date: string
  amount: number
  method: string
  customers?: { name: string; packages?: { name: string } | null } | null
}

const TABS = ['Pendapatan', 'Customer', 'Pembayaran'] as const

function exportCSV(data: unknown[], filename: string) {
  if (!data.length) return
  const headers = Object.keys(data[0] as object)
  const rows = data.map(row => headers.map(h => `"${(row as Record<string, unknown>)[h] ?? ''}"`).join(','))
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function LaporanView({
  revenueData,
  customerStats,
  payments,
}: {
  revenueData: RevenuePoint[]
  customerStats: CustomerStats
  payments: Payment[]
}) {
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Pendapatan')
  const [showMonths, setShowMonths] = useState<6 | 12>(6)

  const visibleRevenue = useMemo(() => revenueData.slice(-showMonths), [revenueData, showMonths])

  const totalRevenue = visibleRevenue.reduce((a, b) => a + b.total, 0)
  const totalTransactions = visibleRevenue.reduce((a, b) => a + b.count, 0)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-[24.5px] font-semibold text-foreground tracking-tight">Laporan</h1>
          <p className="text-sm text-muted-foreground font-medium">
            Ringkasan operasional dan keuangan bisnis Anda
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab: Pendapatan */}
      {activeTab === 'Pendapatan' && (
        <div className="flex flex-col gap-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Total Pendapatan', value: `Rp ${totalRevenue.toLocaleString('id-ID')}`, icon: TrendingUp, color: 'text-[#00A76F]', bg: 'bg-[#00A76F]/10' },
              { label: 'Total Transaksi', value: totalTransactions, icon: CreditCard, color: 'text-primary', bg: 'bg-primary/10' },
              { label: 'Rata-rata/Bulan', value: `Rp ${Math.round(totalRevenue / showMonths).toLocaleString('id-ID')}`, icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-500/10' },
            ].map(m => (
              <div key={m.label} className="bg-card p-5 rounded-2xl shadow-[rgba(145,158,171,0.2)_0px_0px_2px_0px,rgba(145,158,171,0.12)_0px_12px_24px_-4px] dark:shadow-none dark:border">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[13px] font-semibold text-muted-foreground">{m.label}</span>
                  <div className={`p-2 ${m.bg} ${m.color} rounded-full`}>
                    <m.icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-[20px] font-bold">{m.value}</div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="bg-card rounded-2xl p-6 shadow-[rgba(145,158,171,0.2)_0px_0px_2px_0px,rgba(145,158,171,0.12)_0px_12px_24px_-4px] dark:shadow-none dark:border">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <div>
                <h2 className="text-[16px] font-semibold">Grafik Pendapatan</h2>
                <p className="text-xs text-muted-foreground">Breakdown per metode pembayaran</p>
              </div>
              <div className="flex gap-2">
                <div className="flex gap-1 bg-muted p-1 rounded-lg">
                  {([6, 12] as const).map(n => (
                    <button
                      key={n}
                      onClick={() => setShowMonths(n)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${showMonths === n ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
                    >
                      {n} Bulan
                    </button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => exportCSV(visibleRevenue, 'laporan-pendapatan.csv')}
                >
                  <Download className="w-3.5 h-3.5" />
                  Export
                </Button>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={visibleRevenue} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#888888' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#888888' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  formatter={(v: any, n: string) => [`Rp ${Number(v).toLocaleString('id-ID')}`, n === 'total' ? 'Omzet Kotor' : 'Laba Bersih']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', fontSize: '12px', color: 'hsl(var(--foreground))' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', color: '#888888' }} />
                <Bar dataKey="tunai" name="Tunai" fill="#00A76F" radius={[4, 4, 0, 0]} maxBarSize={20} stackId="a" />
                <Bar dataKey="transfer" name="Transfer" fill="#FFAB00" radius={[4, 4, 0, 0]} maxBarSize={20} stackId="a" />
                <Bar dataKey="qris" name="QRIS" fill="#00B8D9" radius={[4, 4, 0, 0]} maxBarSize={20} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tab: Customer */}
      {activeTab === 'Customer' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Customer', value: customerStats.total, color: 'text-primary', bg: 'bg-primary/10' },
              { label: 'Aktif', value: customerStats.aktif, color: 'text-[#00A76F]', bg: 'bg-[#00A76F]/10' },
              { label: 'Suspended', value: customerStats.suspended, color: 'text-amber-500', bg: 'bg-amber-500/10' },
              { label: 'Nonaktif', value: customerStats.nonaktif, color: 'text-destructive', bg: 'bg-destructive/10' },
            ].map(m => (
              <div key={m.label} className="bg-card p-5 rounded-2xl shadow-[rgba(145,158,171,0.2)_0px_0px_2px_0px,rgba(145,158,171,0.12)_0px_12px_24px_-4px] dark:shadow-none dark:border">
                <div className={`text-[28px] font-bold ${m.color}`}>{m.value}</div>
                <div className="text-xs text-muted-foreground mt-1 font-medium">{m.label}</div>
              </div>
            ))}
          </div>
          <div className="bg-card rounded-2xl p-6 shadow-[rgba(145,158,171,0.2)_0px_0px_2px_0px,rgba(145,158,171,0.12)_0px_12px_24px_-4px] dark:shadow-none dark:border">
            <h2 className="text-[16px] font-semibold mb-4">Distribusi Status Customer</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={[
                  { name: 'Aktif', value: customerStats.aktif, fill: '#00A76F' },
                  { name: 'Suspended', value: customerStats.suspended, fill: '#FFAB00' },
                  { name: 'Nonaktif', value: customerStats.nonaktif, fill: '#FF5630' },
                ]}
                layout="vertical"
                margin={{ left: 20, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#888888' }} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#888888' }} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', fontSize: '12px', color: 'hsl(var(--foreground))' }} 
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Bar dataKey="value" name="Customer" radius={[0, 4, 4, 0]}>
                  <Cell fill="#00A76F" />
                  <Cell fill="#FFAB00" />
                  <Cell fill="#FF5630" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tab: Pembayaran */}
      {activeTab === 'Pembayaran' && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => exportCSV(
                payments.map(p => ({
                  Tanggal: new Date(p.payment_date).toLocaleDateString('id-ID'),
                  Pelanggan: p.customers?.name || '-',
                  Paket: p.customers?.packages?.name || '-',
                  Jumlah: p.amount,
                  Metode: p.method,
                })),
                'laporan-pembayaran.csv'
              )}
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </Button>
          </div>
          <div className="bg-card rounded-2xl shadow-[rgba(145,158,171,0.2)_0px_0px_2px_0px,rgba(145,158,171,0.12)_0px_12px_24px_-4px] dark:shadow-none dark:border overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="text-[12px] font-semibold bg-muted border-b border-border">
                <tr>
                  <th className="px-6 py-4">TANGGAL</th>
                  <th className="px-6 py-4">PELANGGAN</th>
                  <th className="px-6 py-4">JUMLAH</th>
                  <th className="px-6 py-4">METODE</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-10 text-center text-muted-foreground">Belum ada data.</td></tr>
                ) : payments.map(p => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-6 py-3 text-muted-foreground">
                      {new Date(p.payment_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-3 font-semibold">{p.customers?.name}</td>
                    <td className="px-6 py-3 font-semibold text-[#00A76F]">Rp {Number(p.amount).toLocaleString('id-ID')}</td>
                    <td className="px-6 py-3 text-muted-foreground">{p.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
