import { AgentLoginClient } from './agent-login-client'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AgentLoginPage() {
  const cookieStore = await cookies()
  if (cookieStore.get('agent_session')) {
    redirect('/agent')
  }
  return <AgentLoginClient />
}
