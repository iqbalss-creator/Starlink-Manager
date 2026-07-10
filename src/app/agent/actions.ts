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
