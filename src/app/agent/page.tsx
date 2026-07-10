import { getAgentPortalData } from './actions'
import { AgentClient } from './agent-client'

export const dynamic = 'force-dynamic'

export default async function AgentPage() {
  const data = await getAgentPortalData()
  return <AgentClient {...data} />
}
