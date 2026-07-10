'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { mikrotikQuery } from '@/app/api/mikrotik/route'

export async function loginToPortal(formData: FormData) {
  const voucherCode = formData.get('voucher_code') as string
  if (!voucherCode) return { error: 'Kode voucher harus diisi' }

  const supabase = await createClient()

  // Find the voucher
  const { data: voucher, error } = await supabase
    .from('vouchers')
    .select('id, customer_id, mikrotik_username')
    .eq('mikrotik_username', voucherCode)
    .single()

  if (error || !voucher) {
    return { error: 'Kode voucher tidak ditemukan' }
  }

  // Log the login attempt
  const ip = 'Unknown' // Hard to get IP reliably in Server Actions without middleware, use placeholder
  await supabase.from('system_logs').insert([{
    action_type: 'INSERT',
    entity_type: 'PORTAL_LOGIN',
    entity_id: voucher.customer_id || voucher.id, // ID refers to customer if linked
    new_data: { 
      voucher_code: voucherCode,
      message: `Pelanggan login ke Portal dengan kode ${voucherCode}`
    }
  }])

  // Set session
  const cookieStore = await cookies()
  const sessionData = {
    voucherId: voucher.id,
    customerId: voucher.customer_id
  }
  
  cookieStore.set('portal_session', JSON.stringify(sessionData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  })

  redirect('/portal')
}

export async function getPortalData() {
  const cookieStore = await cookies()
  const sessionStr = cookieStore.get('portal_session')?.value

  if (!sessionStr) {
    redirect('/portal/login')
  }

  const session = JSON.parse(sessionStr)
  const supabase = await createClient()

  let customer = null
  let vouchers = []
  let payments = []
  let totalBelumLunas = 0
  let totalLunas = 0

  if (session.customerId) {
    // Fetch customer data
    const { data: custData } = await supabase
      .from('customers')
      .select('*')
      .eq('id', session.customerId)
      .single()
    customer = custData

    // Fetch all vouchers for customer
    const { data: vData } = await supabase
      .from('vouchers')
      .select('*, packages(name, price)')
      .eq('customer_id', session.customerId)
      .order('created_at', { ascending: false })
    
    vouchers = vData || []

    // Fetch payments
    const { data: pData } = await supabase
      .from('payments')
      .select('*')
      .eq('customer_id', session.customerId)
      .order('created_at', { ascending: false })
    
    payments = pData || []

    // Calculate totals based on payments and vouchers? Wait, we have payment_status on vouchers.
    // Or we just calculate sum(payments where status=pending vs paid).
    // Let's rely on vouchers' package price for tagihan.
    for (const v of vouchers) {
      if (v.payment_status === 'Belum Lunas' && v.packages?.price) {
        totalBelumLunas += v.packages.price
      } else if (v.payment_status === 'Lunas' && v.packages?.price) {
        totalLunas += v.packages.price
      }
    }

  } else {
    // Fetch single voucher
    const { data: vData } = await supabase
      .from('vouchers')
      .select('*, packages(name, price)')
      .eq('id', session.voucherId)
    
    vouchers = vData || []
  }

  // Enrich vouchers with Data Usage from MikroTik
  try {
    const mkUsers = await mikrotikQuery('/ip/hotspot/user/print')
    if (mkUsers) {
      for (let v of vouchers) {
        const u = mkUsers.find((user: any) => user.name === v.mikrotik_username)
        if (u) {
          const bytesIn = parseInt(u['bytes-in'] || '0')
          const bytesOut = parseInt(u['bytes-out'] || '0')
          v.dataUsageBytes = bytesIn + bytesOut
        } else {
          v.dataUsageBytes = 0
        }
      }
    }
  } catch(e) {
    console.error("Failed to fetch mikrotik users for portal", e)
  }

  return {
    customer,
    vouchers,
    payments,
    totalBelumLunas,
    totalLunas
  }
}

export async function logoutPortal() {
  const cookieStore = await cookies()
  cookieStore.delete('portal_session')
  redirect('/portal/login')
}
