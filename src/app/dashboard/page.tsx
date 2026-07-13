import { Users, CreditCard, Activity, Package, TrendingUp, AlertTriangle, UserX, DollarSign, Wifi, CheckCircle2, ChevronRight } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from 'next/link'
import { RevenueChart } from './revenue-chart'
import { CustomerChart } from './customer-chart'
import { getUserRole } from '@/utils/roles'
import { DashboardFilter } from '@/components/dashboard-filter'

export default async function DashboardPage(props: { searchParams: Promise<{ period?: string, start?: string, end?: string }> }) {
  const searchParams = await props.searchParams
  const period = searchParams.period || 'this_month'
  const customStart = searchParams.start
  const customEnd = searchParams.end
  
  const supabase = await createClient()

  // Calculate Date Range based on period
  const now = new Date()
  let startDate: Date | null = null
  let endDate: Date | null = null

  if (period === 'this_month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1)
  } else if (period === 'last_month') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    endDate = new Date(now.getFullYear(), now.getMonth(), 1)
  } else if (period === 'last_3_months') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1)
  } else if (period === 'last_6_months') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  } else if (period === 'custom' && customStart && customEnd) {
    startDate = new Date(customStart)
    endDate = new Date(customEnd)
    // Make end date inclusive by setting it to the end of the day
    endDate.setHours(23, 59, 59, 999)
  }

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

  // 5. Revenue based on period
  let paymentsPeriodQuery = supabase.from('payments').select('amount')
  if (startDate) paymentsPeriodQuery = paymentsPeriodQuery.gte('payment_date', startDate.toISOString())
  if (endDate) paymentsPeriodQuery = paymentsPeriodQuery.lt('payment_date', endDate.toISOString())

  const { data: paymentsFiltered } = await paymentsPeriodQuery
  const totalRevenue = paymentsFiltered?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0

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
    const price = curr.packages ? (Array.isArray(curr.packages) ? (curr.packages[0] as any)?.price : (curr.packages as any)?.price) : 0
    return acc + (Number(price) || 0)
  }, 0) || 0

  // 8. New Customers this month
  const { count: newCustomers } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startDate ? startDate.toISOString() : new Date(0).toISOString())

  // 9. Recent Payments (latest 5)
  const { data: recentPayments } = await supabase
    .from('payments')
    .select('*, customers(name)')
    .order('payment_date', { ascending: false })
    .limit(5)

  // 10. Revenue Chart based on period
  const revenueChartData: any[] = []
  
  if (period === 'this_month' || period === 'last_month') {
    const baseDate = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const endOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1)
    
    // Fetch all payments for this month
    const { data: monthPayments } = await supabase
      .from('payments')
      .select('amount, payment_date')
      .gte('payment_date', baseDate.toISOString())
      .lt('payment_date', endOfMonth.toISOString())

    // Group by day
    const daysInMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0).getDate()
    
    // Initialize array with 0 for all days
    for (let i = 1; i <= daysInMonth; i++) {
      revenueChartData.push({
        month: `${i}`,
        total: 0,
      })
    }

    // Fill the array
    if (monthPayments) {
      monthPayments.forEach(p => {
        const date = new Date(p.payment_date)
        const dayIndex = date.getDate() - 1 // 0-based index
        if (dayIndex >= 0 && dayIndex < daysInMonth) {
          revenueChartData[dayIndex].total += Number(p.amount) || 0
        }
      })
    }
  } else if (period === 'custom' && customStart && customEnd && startDate && endDate) {
    const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24))
    
    if (diffDays <= 35) {
      // Group by day for short ranges
      const { data: customPayments } = await supabase
        .from('payments')
        .select('amount, payment_date')
        .gte('payment_date', startDate.toISOString())
        .lt('payment_date', endDate.toISOString())
      
      for (let i = 0; i <= diffDays; i++) {
        const d = new Date(startDate)
        d.setDate(d.getDate() + i)
        revenueChartData.push({
          dateObj: d,
          month: `${d.getDate()}/${d.getMonth()+1}`,
          total: 0,
        })
      }
      
      if (customPayments) {
        customPayments.forEach(p => {
          const date = new Date(p.payment_date)
          const target = revenueChartData.find(r => r.dateObj.getDate() === date.getDate() && r.dateObj.getMonth() === date.getMonth() && r.dateObj.getFullYear() === date.getFullYear())
          if (target) {
            target.total += Number(p.amount) || 0
          }
        })
      }
    } else {
      // Group by month for longer ranges
      const startMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
      const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1)
      const diffMonths = (endMonth.getFullYear() - startMonth.getFullYear()) * 12 + (endMonth.getMonth() - startMonth.getMonth())
      
      for (let i = 0; i <= diffMonths; i++) {
        const d = new Date(startMonth)
        d.setMonth(d.getMonth() + i)
        const nextMonth = new Date(d)
        nextMonth.setMonth(nextMonth.getMonth() + 1)
        
        const { data } = await supabase
          .from('payments')
          .select('amount')
          .gte('payment_date', d.toISOString())
          .lt('payment_date', nextMonth.toISOString())
          
        const total = data?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0
        revenueChartData.push({
          month: d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
          total,
        })
      }
    }
  } else {
    const monthsToShow = period === 'last_3_months' ? 3 : period === 'all_time' ? 12 : 6
    
    for (let i = monthsToShow - 1; i >= 0; i--) {
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
  }

  // 12. Agent Settlements & Income (History)
  let agentSettlementsQuery = supabase
    .from('agent_settlements')
    .select('*, agents(name)')
    .order('settled_at', { ascending: false })

  if (startDate) agentSettlementsQuery = agentSettlementsQuery.gte('settled_at', startDate.toISOString())
  if (endDate) agentSettlementsQuery = agentSettlementsQuery.lt('settled_at', endDate.toISOString())

  const { data: agentSettlements } = await agentSettlementsQuery

  const totalAgentIncome = agentSettlements?.reduce((acc, curr) => acc + Number(curr.net_amount), 0) || 0
  const recentAgentSettlements = agentSettlements?.slice(0, 5) || []

  // 13. Pemasukan dari Agen (Berdasarkan Tiket yang Terpakai / Laku)
  let usedAgentVouchersQuery = supabase
    .from('vouchers')
    .select('packages(name, price), agents(name, commission_rate)')
    .not('agent_id', 'is', null)
    .eq('status', 'Digunakan')

  if (startDate) usedAgentVouchersQuery = usedAgentVouchersQuery.gte('created_at', startDate.toISOString())
  if (endDate) usedAgentVouchersQuery = usedAgentVouchersQuery.lt('created_at', endDate.toISOString())

  const { data: usedAgentVouchers } = await usedAgentVouchersQuery

  const totalAgentIncomeFromUsedVouchers = usedAgentVouchers?.reduce((acc, curr) => {
    const price = curr.packages ? (Array.isArray(curr.packages) ? (curr.packages[0] as any)?.price : (curr.packages as any)?.price) : 0
    const commissionRate = curr.agents ? (Array.isArray(curr.agents) ? (curr.agents[0] as any)?.commission_rate : (curr.agents as any)?.commission_rate) : 0
    const net = price - (price * (commissionRate / 100))
    return acc + (Number(net) || 0)
  }, 0) || 0

  // Group used vouchers by agent for Top Agen table
  const usedAgentIncomeMap = new Map<string, { name: string, total: number, count: number, packages: Map<string, { count: number }> }>()
  usedAgentVouchers?.forEach(v => {
    const agentName = v.agents ? (Array.isArray(v.agents) ? (v.agents[0] as any)?.name : (v.agents as any)?.name) : 'Unknown'
    const packageName = v.packages ? (Array.isArray(v.packages) ? (v.packages[0] as any)?.name : (v.packages as any)?.name) : 'Unknown'
    
    if (!usedAgentIncomeMap.has(agentName)) {
      usedAgentIncomeMap.set(agentName, { name: agentName, total: 0, count: 0, packages: new Map() })
    }
    const item = usedAgentIncomeMap.get(agentName)!
    
    const price = v.packages ? (Array.isArray(v.packages) ? (v.packages[0] as any)?.price : (v.packages as any)?.price) : 0
    const commissionRate = v.agents ? (Array.isArray(v.agents) ? (v.agents[0] as any)?.commission_rate : (v.agents as any)?.commission_rate) : 0
    const net = price - (price * (commissionRate / 100))
    
    item.total += (Number(net) || 0)
    item.count += 1

    if (!item.packages.has(packageName)) {
      item.packages.set(packageName, { count: 0 })
    }
    item.packages.get(packageName).count += 1
  })
  const agentIncomeList = Array.from(usedAgentIncomeMap.values()).sort((a, b) => b.total - a.total).slice(0, 5)

  // Group by agent for Setoran Terbanyak
  const agentSettledIncomeMap = new Map()
  agentSettlements?.forEach(s => {
    const agentName = s.agents?.name || 'Unknown'
    if (!agentSettledIncomeMap.has(agentName)) {
      agentSettledIncomeMap.set(agentName, { name: agentName, total: 0, count: 0 })
    }
    const item = agentSettledIncomeMap.get(agentName)
    item.total += Number(s.net_amount)
    item.count += 1
  })
  const agentSettledIncomeList = Array.from(agentSettledIncomeMap.values()).sort((a, b) => b.total - a.total).slice(0, 5)

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
      label: period === 'this_month' ? 'Lunas (Bulan Ini)' : 
             period === 'last_month' ? 'Lunas (Bulan Lalu)' : 
             period === 'all_time' ? 'Lunas (Semua Waktu)' : 'Lunas (Filter Waktu)',
      value: formatMoney(totalRevenue),
      sub: 'Berdasarkan waktu terpilih',
      icon: CreditCard,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Pemasukan Agen (Tiket Laku)',
      value: formatMoney(totalAgentIncomeFromUsedVouchers),
      sub: 'Estimasi uang bersih dari semua tiket yang laku (sudah dipotong komisi)',
      icon: Package,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Belum Tertagih (Kasbon)',
      value: formatMoney(totalUnpaid),
      sub: 'Total piutang pelanggan',
      icon: TrendingUp,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
    },
  ]

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-[24.5px] font-semibold text-foreground tracking-tight">Ringkasan</h1>
          <p className="text-sm text-muted-foreground font-medium">
            Performa bisnis dan statistik
          </p>
        </div>
        <DashboardFilter />
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
            <p className="text-xs text-muted-foreground">
              {period === 'this_month' ? 'Bulan ini (per tanggal)' : 
               period === 'last_month' ? 'Bulan lalu (per tanggal)' :
               period === 'last_3_months' ? '3 bulan terakhir' :
               period === 'custom' ? 'Sesuai rentang tanggal kustom' :
               period === 'all_time' ? '12 bulan terakhir' : '6 bulan terakhir'}
            </p>
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
            { label: 'Laporan Agen', href: '/dashboard/agents', icon: Package, color: 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20' },
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

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                  <th className="px-6 py-3 text-right">JUMLAH</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map(pay => (
                  <tr key={pay.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-6 py-3 font-semibold flex flex-col">
                      <span>{pay.customers?.name}</span>
                      <span className="text-[10px] text-muted-foreground font-normal">{new Date(pay.payment_date).toLocaleString('id-ID')}</span>
                    </td>
                    <td className="px-6 py-3 text-[#00A76F] font-bold text-right">{formatMoney(Number(pay.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Recent Agent Settlements */}
        <div className="bg-card rounded-2xl shadow-[rgba(145,158,171,0.2)_0px_0px_2px_0px,rgba(145,158,171,0.12)_0px_12px_24px_-4px] dark:shadow-none dark:border overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-[16px] font-semibold">Setoran Agen Terkini</h2>
              <p className="text-xs text-muted-foreground">5 setoran terbaru</p>
            </div>
            <Link href="/dashboard/agents" className="text-blue-500 hover:underline text-xs font-semibold">
              Lihat semua →
            </Link>
          </div>
          {(!recentAgentSettlements || recentAgentSettlements.length === 0) ? (
            <div className="p-6 text-sm text-muted-foreground">Belum ada setoran dari agen.</div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-[12px] font-semibold text-foreground bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3">AGEN</th>
                  <th className="px-6 py-3 text-right">SETORAN BERSIH</th>
                </tr>
              </thead>
              <tbody>
                {recentAgentSettlements.map(settle => (
                  <tr key={settle.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-6 py-3 font-semibold flex flex-col">
                      <span className="text-blue-600">{settle.agents?.name}</span>
                      <span className="text-[10px] text-muted-foreground font-normal">{new Date(settle.settled_at).toLocaleString('id-ID')}</span>
                    </td>
                    <td className="px-6 py-3 text-[#00A76F] font-bold text-right">{formatMoney(Number(settle.net_amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      
      {/* Agent Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Rincian Pemasukan Agen (Laku) */}
        <div className="bg-card rounded-2xl shadow-[rgba(145,158,171,0.2)_0px_0px_2px_0px,rgba(145,158,171,0.12)_0px_12px_24px_-4px] dark:shadow-none dark:border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-[16px] font-semibold">Rincian Agen (Tiket Laku)</h2>
            <p className="text-xs text-muted-foreground">Kontribusi omzet per agen dari tiket terjual (Net)</p>
          </div>
          {(!agentIncomeList || agentIncomeList.length === 0) ? (
            <div className="p-6 text-sm text-muted-foreground">Belum ada data tiket laku.</div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-[12px] font-semibold text-foreground bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3">NAMA AGEN</th>
                  <th className="px-6 py-3 text-center">TIKET LAKU</th>
                  <th className="px-6 py-3 text-right">NET TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {agentIncomeList.map(agent => (
                  <tr key={agent.name} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-6 py-3">
                      <div className="font-semibold">{agent.name}</div>
                      <div className="text-[11px] text-muted-foreground mt-1 flex flex-col gap-0.5">
                        {Array.from(agent.packages.entries()).map(([pkgName, pkgData]) => (
                          <span key={pkgName}>- {pkgData.count}x {pkgName}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-center font-medium align-top">{agent.count}</td>
                    <td className="px-6 py-3 text-[#00A76F] font-bold text-right align-top">{formatMoney(agent.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Top Agen (Setoran Terbanyak) */}
        <div className="bg-card rounded-2xl shadow-[rgba(145,158,171,0.2)_0px_0px_2px_0px,rgba(145,158,171,0.12)_0px_12px_24px_-4px] dark:shadow-none dark:border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-[16px] font-semibold">Top Agen (Uang Disetor)</h2>
            <p className="text-xs text-muted-foreground">Agen dengan riwayat setoran uang terbanyak</p>
          </div>
          {(!agentSettledIncomeList || agentSettledIncomeList.length === 0) ? (
            <div className="p-6 text-sm text-muted-foreground">Belum ada agen yang menyetor.</div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-[12px] font-semibold text-foreground bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3">NAMA AGEN</th>
                  <th className="px-6 py-3 text-center">JML SETOR</th>
                  <th className="px-6 py-3 text-right">UANG MASUK</th>
                </tr>
              </thead>
              <tbody>
                {agentSettledIncomeList.map(agent => (
                  <tr key={agent.name} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-6 py-3 font-semibold">{agent.name}</td>
                    <td className="px-6 py-3 text-center font-medium">{agent.count}x</td>
                    <td className="px-6 py-3 text-blue-500 font-bold text-right">{formatMoney(agent.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  )
}
