import { getPortalData } from './actions'
import { PortalClient } from './portal-client'

export const dynamic = 'force-dynamic'

export default async function PortalPage() {
  const data = await getPortalData()
  return <PortalClient {...data} />
}
