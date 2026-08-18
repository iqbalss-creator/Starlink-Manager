import { createClient } from '@/utils/supabase/server'
import { AnalyticsClient } from './analytics-client'

export default async function AnalyticsPage() {
  const supabase = await createClient()

  // 1. Revenue 12 Months
  const revenueChartData = []
  for (let i = 11; i >= 0; i--) {
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

  // 2. Payment Methods
  const { data: paymentsData } = await supabase.from('payments').select('method')
  const methodCounts: Record<string, number> = {}
  paymentsData?.forEach((p) => {
    const method = p.method || 'Cash'
    methodCounts[method] = (methodCounts[method] || 0) + 1
  })
  const methodData = Object.entries(methodCounts).map(([name, value]) => ({ name, value }))

  // 3. Top Packages
  const { data: vouchersData } = await supabase
    .from('vouchers')
    .select('packages(name)')
    
  const packageCounts: Record<string, number> = {}
  vouchersData?.forEach((v) => {
    if (v.packages && typeof v.packages === 'object' && 'name' in v.packages) {
      const pkg = v.packages.name as string
      packageCounts[pkg] = (packageCounts[pkg] || 0) + 1
    }
  })
  
  const packageData = Object.entries(packageCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5) // Top 5

  // 4. Debt Ratio (Lunas vs Kasbon)
  const { data: voucherStatus } = await supabase.from('vouchers').select('payment_status')
  let lunas = 0
  let kasbon = 0
  voucherStatus?.forEach((v) => {
    if (v.payment_status === 'Belum Lunas') {
      kasbon++
    } else {
      lunas++
    }
  })
  const debtData = [
    { name: 'Lunas', value: lunas, color: '#00A76F' },
    { name: 'Kasbon', value: kasbon, color: '#FF5630' },
  ]

  return (
    <AnalyticsClient 
      revenueData={revenueChartData}
      methodData={methodData.length > 0 ? methodData : [{ name: 'Belum ada data', value: 1 }]}
      packageData={packageData.length > 0 ? packageData : [{ name: 'Belum ada data', count: 0 }]}
      debtData={debtData}
    />
  )
}
