import { createClient } from '@/utils/supabase/server'
import { KomunikasiView } from './komunikasi-view'

export default async function KomunikasiPage() {
  const supabase = await createClient()

  const { data: customers } = await supabase
    .from('customers')
    .select(`
      id, name, whatsapp_number, created_at,
      vouchers(mikrotik_username, status, packages(name))
    `)
    .order('name', { ascending: true })

  // Fetch vouchers yang akan expire dalam 7 hari ke depan (untuk Reminder)
  const now = new Date()
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: expiringVouchers } = await supabase
    .from('vouchers')
    .select(`
      id, mikrotik_username, expiry_date, last_reminder_sent_at, status,
      packages(name, price),
      customers(id, name, whatsapp_number, vouchers(payment_status, packages(price)))
    `)
    .eq('status', 'Aktif')
    .not('expiry_date', 'is', null)
    .lte('expiry_date', sevenDaysLater)
    .order('expiry_date', { ascending: true })

  const mappedCustomers = (customers || []).map((c: any) => {
    const activeVoucher = c.vouchers?.find((v: any) => v.status === 'Aktif') || c.vouchers?.[0]
    return {
      id: c.id,
      name: c.name,
      whatsapp_number: c.whatsapp_number,
      created_at: c.created_at,
      status: activeVoucher?.status || 'Belum Digunakan',
      packages: activeVoucher?.packages || null,
      mikrotik_username: activeVoucher?.mikrotik_username || null
    }
  })

  return <KomunikasiView customers={mappedCustomers} expiringVouchers={(expiringVouchers as any) || []} />
}
