'use server'

import { createClient } from '@/utils/supabase/server'
import { mikrotikQuery } from '@/app/api/mikrotik/route'

export async function getVoucherLogs() {
  const supabase = await createClient()

  // Ambil history login dari system_logs (yang dicatat oleh auto-sync tiap 2 menit)
  const { data: historyLogs, error } = await supabase
    .from('system_logs')
    .select('*')
    .eq('entity_type', 'LOGIN_HISTORY')
    .order('created_at', { ascending: false })
    .limit(1000)

  let logs: any[] = []
  
  if (historyLogs) {
    logs = historyLogs.map(log => {
      const nd = log.new_data || {}
      const loginTime = nd.session_start ? new Date(nd.session_start) : new Date(log.created_at)
      return {
        id: log.id,
        payment_date: loginTime.toISOString(),
        notes: `Login: ${nd.username || '-'} (${nd.source || 'Sistem'})`,
        amount: nd.price || 0
      }
    })
  }

  // Ambil juga pembayaran voucher aktif dari database (jika ada sisa)
  // sebagai fallback untuk history pembelian lama
  const { data: paymentLogs } = await supabase
    .from('payments')
    .select('id, payment_date, notes, amount')
    .ilike('notes', 'Voucher Aktif%')
    .order('payment_date', { ascending: false })
    .limit(100)

  if (paymentLogs) {
    logs = [...logs, ...paymentLogs]
  }
  
  logs.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())

  return logs
}
