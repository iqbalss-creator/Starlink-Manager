'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getPayments() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payments')
    .select('*, customers(id, name, whatsapp_number)')
    .order('payment_date', { ascending: false })

  if (error) {
    console.error('Error fetching payments:', error)
    return []
  }

  return data
}

import { mikrotikQuery } from '@/lib/mikrotik'

function formatMikrotikDate(date: Date) {
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
  const d = date.getDate().toString().padStart(2, '0')
  const m = months[date.getMonth()]
  const y = date.getFullYear()
  return `${m}/${d}/${y}`
}

function formatMikrotikTime(date: Date) {
  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  const s = date.getSeconds().toString().padStart(2, '0')
  return `${h}:${m}:${s}`
}

export async function createPayment(formData: FormData) {
  const customer_id = formData.get('customer_id') as string
  const amount = parseFloat(formData.get('amount') as string)
  const method = formData.get('method') as string
  const notes = formData.get('notes') as string | null
  const status = (formData.get('status') as string) || 'Lunas'

  const supabase = await createClient()

  // 1. Fetch customer and their vouchers to calculate new expiry date
  const { data: customerData, error: custError } = await supabase
    .from('customers')
    .select('*, vouchers(packages(duration_days))')
    .eq('id', customer_id)
    .single()

  if (custError) {
    throw new Error('Gagal mengambil data pelanggan: ' + custError.message)
  }

  // Find the first valid duration_days from their vouchers, fallback to 30
  let durationDays = 30
  if (customerData?.vouchers && customerData.vouchers.length > 0) {
    for (const v of customerData.vouchers) {
      const p = v.packages
      const days = Array.isArray(p) ? p[0]?.duration_days : p?.duration_days
      if (days) {
        durationDays = days
        break
      }
    }
  }

  // 2. Calculate new expiry date
  let newExpiryDate = new Date()
  const currentExpiryDate = customerData.expiry_date ? new Date(customerData.expiry_date) : null

  // If expiry date is in the future, add to it. Otherwise, add to today.
  if (currentExpiryDate && currentExpiryDate > new Date()) {
    newExpiryDate = new Date(currentExpiryDate)
  }
  newExpiryDate.setDate(newExpiryDate.getDate() + durationDays)

  // 3. Insert Payment
  const { error: paymentError } = await supabase
    .from('payments')
    .insert([{ customer_id, amount, method, notes, status }])

  if (paymentError) {
    throw new Error('Gagal menyimpan pembayaran: ' + paymentError.message)
  }

  // 4. Update Customer expiry date and set status to Aktif
  const { error: updateError } = await supabase
    .from('customers')
    .update({ 
      expiry_date: newExpiryDate.toISOString(),
      status: 'Aktif'
    })
    .eq('id', customer_id)

  if (updateError) {
    throw new Error('Pembayaran berhasil, tapi gagal mengupdate masa aktif: ' + updateError.message)
  }

  // 5. Sync to MikroTik (Enable User & Update Scheduler)
  const mkUser = customerData.mikrotik_username
  if (mkUser) {
    try {
      // Enable user
      await mikrotikQuery('/ip/hotspot/user/set', [`=numbers=${mkUser}`, '=disabled=no'])
      
      // Update scheduler
      const schedulerName = `suspend-${mkUser}`
      const mDate = formatMikrotikDate(newExpiryDate)
      const mTime = formatMikrotikTime(newExpiryDate)

      try {
        await mikrotikQuery('/system/scheduler/remove', [`=numbers=${schedulerName}`])
      } catch(e) {}
      
      await mikrotikQuery('/system/scheduler/add', [
        `=name=${schedulerName}`,
        `=start-date=${mDate}`,
        `=start-time=${mTime}`,
        `=on-event=/ip hotspot user disable [find name="${mkUser}"]`
      ])
    } catch (err) {
      console.error('MikroTik Sync Error:', err)
    }
  }

  revalidatePath('/dashboard/payments')
  revalidatePath('/dashboard/customers')
  revalidatePath('/dashboard')
}

export async function markAsPaid(payment_id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('payments')
    .update({ status: 'Lunas' })
    .eq('id', payment_id)

  if (error) {
    throw new Error(error.message)
  }
  revalidatePath('/dashboard/payments')
  revalidatePath('/dashboard')
}

export async function deletePayment(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('payments')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/dashboard/payments')
  revalidatePath('/dashboard')
}
