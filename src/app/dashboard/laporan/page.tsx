import { createClient } from '@/utils/supabase/server'
import { LaporanView } from './laporan-view'

export default async function LaporanPage() {
  const supabase = await createClient()

  // Revenue last 12 months
  const revenueData = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    d.setHours(0, 0, 0, 0)
    const end = new Date(d)
    end.setMonth(end.getMonth() + 1)

    const { data } = await supabase
      .from('payments')
      .select('amount, method')
      .gte('payment_date', d.toISOString())
      .lt('payment_date', end.toISOString())

    const total = data?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0
    const tunai = data?.filter(p => p.method === 'Tunai').reduce((a, c) => a + Number(c.amount), 0) || 0
    const transfer = data?.filter(p => p.method === 'Transfer').reduce((a, c) => a + Number(c.amount), 0) || 0
    const qris = data?.filter(p => p.method === 'QRIS').reduce((a, c) => a + Number(c.amount), 0) || 0

    revenueData.push({
      month: d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
      total,
      tunai,
      transfer,
      qris,
      count: data?.length || 0,
    })
  }

  // Customer breakdown (via vouchers)
  const { data: vouchers } = await supabase
    .from('vouchers')
    .select('status, created_at, packages(name, price)')

  const customerStats = {
    total: vouchers?.length || 0,
    aktif: vouchers?.filter(v => v.status === 'Aktif').length || 0,
    suspended: vouchers?.filter(v => v.status === 'Suspended').length || 0,
    nonaktif: vouchers?.filter(v => v.status === 'Nonaktif').length || 0,
  }

  // All payments for payment tab
  const { data: allPayments } = await supabase
    .from('payments')
    .select('*, customers(name)')
    .order('payment_date', { ascending: false })
    .limit(100)

  return (
    <LaporanView
      revenueData={revenueData}
      customerStats={customerStats}
      payments={allPayments || []}
    />
  )
}
