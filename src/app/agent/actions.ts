'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function loginToAgentPortal(formData: FormData) {
  const username = formData.get('username') as string
  const password = formData.get('password') as string

  if (!username || !password) return { error: 'Username dan Password harus diisi' }

  const supabase = await createClient()

  let { data: agent, error } = await supabase
    .from('agents')
    .select('id, name, is_first_login')
    .eq('username', username)
    .eq('password', password)
    .single()

  if (error || !agent) {
    return { error: 'Username atau Password salah.' }
  }

  // Log the login attempt
  await supabase.from('system_logs').insert([{
    action_type: 'INSERT',
    entity_type: 'AGENT_LOGIN',
    entity_id: agent.id,
    new_data: { 
      username: username,
      message: `Agen ${agent.name} login ke Portal Agen`
    }
  }])

  // Set session
  const cookieStore = await cookies()
  const sessionData = {
    agentId: agent.id,
    is_first_login: agent.is_first_login
  }
  
  cookieStore.set('agent_session', JSON.stringify(sessionData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  })

  if (agent.is_first_login) {
    redirect('/agent/setup-password')
  } else {
    redirect('/agent')
  }
}

export async function getAgentPortalData() {
  const cookieStore = await cookies()
  const sessionStr = cookieStore.get('agent_session')?.value

  if (!sessionStr) {
    redirect('/agent/login')
  }

  const session = JSON.parse(sessionStr)
  const supabase = await createClient()

  const { data: agentData } = await supabase
    .from('agents')
    .select('*')
    .eq('id', session.agentId)
    .single()

  if (!agentData) {
    redirect('/agent/login')
  }

  if (agentData.is_first_login) {
    redirect('/agent/setup-password')
  }

  // Fetch all vouchers for agent
  const { data: allVouchers } = await supabase
    .from('vouchers')
    .select('*, packages(*)')
    .eq('agent_id', session.agentId)
    .order('created_at', { ascending: false })

  const vouchers = allVouchers || []

  // Fetch all login histories for all these vouchers to determine usage info (time of login)
  const voucherIds = vouchers.map(v => v.id)
  let usageHistories: any[] = []
  
  if (voucherIds.length > 0) {
    // Split into chunks if there are too many, but Supabase can handle a few thousand in an 'in' clause easily
    const { data: logs } = await supabase
      .from('system_logs')
      .select('entity_id, created_at, new_data')
      .eq('entity_type', 'LOGIN_HISTORY')
      .in('entity_id', voucherIds)
      
    usageHistories = logs || []
  }

  return {
    agent: agentData,
    vouchers,
    usageHistories
  }
}

export async function logoutAgent() {
  const cookieStore = await cookies()
  cookieStore.delete('agent_session')
  redirect('/agent/login')
}

export async function updatePasswordAction(formData: FormData) {
  const cookieStore = await cookies()
  const sessionStr = cookieStore.get('agent_session')?.value
  
  if (!sessionStr) return { error: 'Sesi tidak valid' }
  const session = JSON.parse(sessionStr)
  
  const password = formData.get('password') as string
  if (!password || password.length < 5) return { error: 'Password minimal 5 karakter' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('agents')
    .update({ 
      password: password,
      is_first_login: false 
    })
    .eq('id', session.agentId)

  if (error) {
    return { error: 'Gagal memperbarui password' }
  }

  // Update session
  session.is_first_login = false
  cookieStore.set('agent_session', JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
    path: '/'
  })

  redirect('/agent')
}

export async function verifyWaForResetAction(formData: FormData) {
  const wa = formData.get('whatsapp_number') as string
  if (!wa) return { error: 'Nomor WhatsApp harus diisi' }

  let cleanWa = wa.replace(/\D/g, '')
  if (cleanWa.startsWith('62')) cleanWa = '0' + cleanWa.substring(2)

  const supabase = await createClient()

  let { data: agent, error } = await supabase
    .from('agents')
    .select('id, name')
    .eq('whatsapp_number', cleanWa)
    .single()

  if (!agent) {
    let altWa = '62' + cleanWa.substring(1)
    const { data: altAgent } = await supabase
      .from('agents')
      .select('id, name')
      .eq('whatsapp_number', altWa)
      .single()
    agent = altAgent
  }

  if (!agent) {
    const { data: origAgent } = await supabase
      .from('agents')
      .select('id, name')
      .eq('whatsapp_number', wa)
      .single()
    agent = origAgent
  }

  if (!agent) {
    return { error: 'Nomor WhatsApp tidak terdaftar dalam sistem.' }
  }

  // Set session and force them to setup password
  const cookieStore = await cookies()
  const sessionData = {
    agentId: agent.id,
    is_first_login: true
  }
  
  cookieStore.set('agent_session', JSON.stringify(sessionData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 15, // 15 menit saja untuk reset password
    path: '/'
  })

  // Set is_first_login to true in DB to force it
  await supabase.from('agents').update({ is_first_login: true }).eq('id', agent.id)

  redirect('/agent/setup-password')
}
