'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function loginToAgentPortal(formData: FormData) {
  const wa = formData.get('whatsapp_number') as string
  if (!wa) return { error: 'Nomor WhatsApp harus diisi' }

  // Clean the number format (ensure it starts with 0 or 62)
  let cleanWa = wa.replace(/\D/g, '')
  if (cleanWa.startsWith('62')) cleanWa = '0' + cleanWa.substring(2)

  const supabase = await createClient()

  // First try direct match
  let { data: agent, error } = await supabase
    .from('agents')
    .select('id, name')
    .eq('whatsapp_number', cleanWa)
    .single()

  // If not found, try with 62 prefix
  if (!agent) {
    let altWa = '62' + cleanWa.substring(1)
    const { data: altAgent } = await supabase
      .from('agents')
      .select('id, name')
      .eq('whatsapp_number', altWa)
      .single()
    agent = altAgent
  }

  // If still not found, try original input
  if (!agent) {
    const { data: origAgent } = await supabase
      .from('agents')
      .select('id, name')
      .eq('whatsapp_number', wa)
      .single()
    agent = origAgent
  }

  if (!agent) {
    return { error: 'Nomor WhatsApp tidak terdaftar sebagai agen.' }
  }

  // Log the login attempt
  await supabase.from('system_logs').insert([{
    action_type: 'INSERT',
    entity_type: 'AGENT_LOGIN',
    entity_id: agent.id,
    new_data: { 
      wa_number: wa,
      message: `Agen ${agent.name} login ke Portal Agen`
    }
  }])

  // Set session
  const cookieStore = await cookies()
  const sessionData = {
    agentId: agent.id
  }
  
  cookieStore.set('agent_session', JSON.stringify(sessionData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  })

  redirect('/agent')
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
