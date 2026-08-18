import { getPackages } from './actions'
import { PackageList } from './package-list'

export const dynamic = 'force-dynamic'

export default async function PackagesPage() {
  const packages = await getPackages()

  return <PackageList initialPackages={packages} />
}
