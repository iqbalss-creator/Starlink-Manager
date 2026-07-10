import { getPackages } from '../../packages/actions'
import { MassClient } from './mass-client'

export const dynamic = 'force-dynamic'

export default async function MassPage() {
  const packages = await getPackages()
  return <MassClient packages={packages} />
}
