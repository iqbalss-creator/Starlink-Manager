import { createClient } from '@/utils/supabase/server'
import { BillReminderList } from './bill-reminder-list'

export default async function InvoicesPage() {
  const supabase = await createClient()

  // Fetch customers expiring within the next 7 days OR already expired
  const now = new Date()
  const in7days = new Date()
  in7days.setDate(now.getDate() + 7)

  // Customers that are expired OR expiring in the next 7 days
  const { data: urgentCustomers } = await supabase
    .from('customers')
    .select('*, packages(id, name, price, duration_days)')
    .or(`expiry_date.lt.${now.toISOString()},expiry_date.lte.${in7days.toISOString()}`)
    .eq('status', 'Aktif')
    .order('expiry_date', { ascending: true })

  // Also get non-active customers
  const { data: inactiveCustomers } = await supabase
    .from('customers')
    .select('*, packages(id, name, price, duration_days)')
    .neq('status', 'Aktif')
    .order('created_at', { ascending: false })

  return (
    <BillReminderList 
      urgentCustomers={urgentCustomers || []} 
      inactiveCustomers={inactiveCustomers || []} 
    />
  )
}
