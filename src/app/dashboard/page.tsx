import { Users, CreditCard, Activity, Package, TrendingUp, AlertTriangle, UserX, DollarSign, Wifi, CheckCircle2, ChevronRight } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from 'next/link'
import { RevenueChart } from './revenue-chart'
import { CustomerChart } from './customer-chart'
import { getUserRole } from '@/utils/roles'

export default async function DashboardPage() {
  const supabase = await createClient()

  // 1. Total Customers
  const { count: totalCustomers } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })

  // 2. Active Customers (Vouchers)
  const { count: activeCustomers } = await supabase
    .from('vouchers')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Aktif')

  // 3. Suspended Customers (Vouchers)
  const { count: suspendedCustomers } = await supabase
    .from('vouchers')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Suspended')

  // 4. Expired / Nonaktif Customers (Vouchers)
  const { count: inactiveCustomers } = await supabase
    .from('vouchers')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Nonaktif')

  // 5. Revenue This Month
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { data: paymentsThisMonth } = await supabase
    .from('payments')
    .select('amount')
    .gte('payment_date', startOfMonth.toISOString())

  const totalRevenue = paymentsThisMonth?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0

  // 6. Revenue Today
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const { data: paymentsToday } = await supabase
    .from('payments')
    .select('amount')
    .gte('payment_date', startOfDay.toISOString())

  const revenueToday = paymentsToday?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0

  // 7. Unpaid Debt (Piutang/Kasbon)
  const { data: unpaidVouchers } = await supabase
    .from('vouchers')
    .select('packages(price)')
    .eq('payment_status', 'Belum Lunas')

  const totalUnpaid = unpaidVouchers?.reduce((acc, curr) => {
    const price = curr.packages && !Array.isArray(curr.packages) ? curr.packages.price : 0
    return acc + (Number(price) || 0)
  }, 0) || 0

  // 8. New Customers this month
  const { count: newCustomers } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startOfMonth.toISOString())

  // 9. Recent Payments (latest 5)
  const { data: recentPayments } = await supabase
    .from('payments')
    .select('*, customers(name)')
    .order('payment_date', { ascending: false })
    .limit(5)

  // 10. Revenue last 6 months for chart
  const revenueChartData = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    d.setHours(0, 0, 0, 0)
    const end = new Date(d)
    end.setMonth(end.getMonth() + 1)

    const { data } = await supabase
      .from('payments')
      .select('amount')
      .gte('payment_date', d.toISOString())
      .lt('payment_date', end.toISOString())

    const total = data?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0
    revenueChartData.push({
      month: d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
      total,
    })
  }

  // 11. Customer status breakdown for pie chart
  const customerChartData = [
    { name: 'Aktif', value: activeCustomers || 0, color: '#00A76F' },
    { name: 'Suspended', value: suspendedCustomers || 0, color: '#FFAB00' },
    { name: 'Nonaktif', value: inactiveCustomers || 0, color: '#FF5630' },
  ]

  const role = await getUserRole()
  const formatMoney = (amount: number) => role === 'reviewer' ? 'Rp ***.***' : `Rp ${amount.toLocaleString('id-ID')}`

  const metrics = [
    {
      label: 'Total Customer',
      value: totalCustomers || 0,
      sub: 'Seluruh pelanggan terdaftar',
      icon: Users,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Customer Aktif',
      value: activeCustomers || 0,
      sub: 'Masa aktif masih berlaku',
      icon: Activity,
      color: 'text-[#00A76F]',
      bg: 'bg-[#00A76F]/10',
    },
    {
      label: 'Customer Suspended',
      value: suspendedCustomers || 0,
      sub: 'Akses sementara dibekukan',
      icon: AlertTriangle,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Customer Nonaktif',
      value: inactiveCustomers || 0,
      sub: 'Sudah tidak berlangganan',
      icon: UserX,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
    },
    {
      label: 'Lunas (Hari Ini)',
      value: formatMoney(revenueToday),
      sub: 'Transaksi lunas hari ini',
      icon: DollarSign,
      color: 'text-[#00A76F]',
      bg: 'bg-[#00A76F]/10',
    },
    {
      label: 'Lunas (Bulan Ini)',
      value: formatMoney(totalRevenue),
      sub: 'Total lunas bulan ini',
      icon: CreditCard,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Belum Tertagih (Kasbon)',
      value: formatMoney(totalUnpaid),
      sub: 'Total piutang pelanggan',
      icon: TrendingUp,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
    },
    {
      label: 'Customer Baru',
      value: newCustomers || 0,
      sub: 'Bergabung bulan ini',
      icon: Package,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
  ]

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-[24.5px] font-semibold text-foreground tracking-tight">Ringkasan</h1>
        <p className="text-sm text-muted-foreground font-medium">
          Performa bisnis dan statistik hari ini
        </p>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="bg-card text-card-foreground p-5 rounded-2xl flex flex-col shadow-[rgba(145,158,171,0.2)_0px_0px_2px_0px,rgba(145,158,171,0.12)_0px_12px_24px_-4px] dark:shadow-none dark:border"
          >
            <div className="flex justify-between items-start mb-3">
              <span className="text-[13px] font-semibold text-muted-foreground">{m.label}</span>
              <div className={`p-2 ${m.bg} ${m.color} rounded-full`}>
                <m.icon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-[20px] font-bold mb-1">{m.value}</div>
            <div className="text-[11px] font-medium text-muted-foreground">{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-card rounded-2xl p-6 shadow-[rgba(145,158,171,0.2)_0px_0px_2px_0px,rgba(145,158,171,0.12)_0px_12px_24px_-4px] dark:shadow-none dark:border">
          <div className="mb-4">
            <h2 className="text-[16px] font-semibold">Grafik Pendapatan</h2>
            <p className="text-xs text-muted-foreground">6 bulan terakhir</p>
          </div>
          <RevenueChart data={revenueChartData} />
        </div>

        {/* Customer Distribution */}
        <div className="bg-card rounded-2xl p-6 shadow-[rgba(145,158,171,0.2)_0px_0px_2px_0px,rgba(145,158,171,0.12)_0px_12px_24px_-4px] dark:shadow-none dark:border">
          <div className="mb-4">
            <h2 className="text-[16px] font-semibold">Status Customer</h2>
            <p className="text-xs text-muted-foreground">Distribusi saat ini</p>
          </div>
          <CustomerChart data={customerChartData} />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-card rounded-2xl p-6 shadow-[rgba(145,158,171,0.2)_0px_0px_2px_0px,rgba(145,158,171,0.12)_0px_12px_24px_-4px] dark:shadow-none dark:border">
        <h2 className="text-[16px] font-semibold mb-4">Quick Action</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Tambah Customer', href: '/dashboard/customers', icon: Users, color: 'bg-[#00A76F]/10 text-[#007867] hover:bg-[#00A76F]/20' },
            { label: 'Catat Pembayaran', href: '/dashboard/payments', icon: CreditCard, color: 'bg-primary/10 text-primary hover:bg-primary/20' },
            { label: 'Cek Tagihan', href: '/dashboard/invoices', icon: TrendingUp, color: 'bg-destructive/10 text-destructive hover:bg-destructive/20' },
            { label: 'Lihat Laporan', href: '/dashboard/laporan', icon: Activity, color: 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20' },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl transition-colors ${action.color}`}
            >
              <action.icon className="w-6 h-6" />
              <span className="text-xs font-semibold text-center">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Payments */}
      <div className="bg-card rounded-2xl shadow-[rgba(145,158,171,0.2)_0px_0px_2px_0px,rgba(145,158,171,0.12)_0px_12px_24px_-4px] dark:shadow-none dark:border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-[16px] font-semibold">Pembayaran Terkini</h2>
            <p className="text-xs text-muted-foreground">5 transaksi terbaru</p>
          </div>
          <Link href="/dashboard/payments" className="text-[#00A76F] hover:underline text-xs font-semibold">
            Lihat semua →
          </Link>
        </div>
        {(!recentPayments || recentPayments.length === 0) ? (
          <div className="p-6 text-sm text-muted-foreground">Belum ada pembayaran.</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-[12px] font-semibold text-foreground bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-3">PELANGGAN</th>
                <th className="px-6 py-3">JUMLAH</th>
                <th className="px-6 py-3">WAKTU</th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.map(pay => (
                <tr key={pay.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="px-6 py-3 font-semibold">{pay.customers?.name}</td>
                  <td className="px-6 py-3 text-[#00A76F] font-bold">{formatMoney(Number(pay.amount))}</td>
                  <td className="px-6 py-3 text-muted-foreground">
                    {new Date(pay.payment_date).toLocaleString('id-ID')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
