import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SetupPasswordClient } from './setup-password-client'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

export default async function SetupPasswordPage() {
  const cookieStore = await cookies()
  const sessionStr = cookieStore.get('agent_session')?.value

  if (!sessionStr) {
    redirect('/agent/login')
  }

  const session = JSON.parse(sessionStr)
  
  // Periksa ke database
  const supabase = await createClient()
  const { data: agent } = await supabase
    .from('agents')
    .select('id, name, is_first_login')
    .eq('id', session.agentId)
    .single()

  if (!agent) {
    redirect('/agent/login')
  }

  // Jika sudah tidak first login, arahkan ke dashboard agen
  if (!agent.is_first_login) {
    redirect('/agent')
  }

  return <SetupPasswordClient agentName={agent.name} />
}
