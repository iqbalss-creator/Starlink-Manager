import { getCustomers, getContacts } from './actions'
import { getPackages } from '../packages/actions'
import { CustomerList } from './customer-list'
import { getUserRole } from '@/utils/roles'
import { mikrotikQuery } from '@/lib/mikrotik'

export const dynamic = 'force-dynamic'

export default async function CustomersPage() {
  const [customers, packages, contacts] = await Promise.all([
    getCustomers(),
    getPackages(),
    getContacts()
  ])
  const role = await getUserRole()
  
  let hotspotServers: string[] = []
  try {
    const servers = await mikrotikQuery('/ip/hotspot/print')
    if (Array.isArray(servers)) {
      hotspotServers = servers.map(s => s.name)
    }
  } catch (err) {
    console.error('Gagal memuat server hotspot:', err)
  }

  return <CustomerList initialCustomers={customers as any} packages={packages} contacts={contacts} userRole={role} hotspotServers={hotspotServers} />
}
