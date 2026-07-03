import { getCustomers, getContacts } from './actions'
import { getPackages } from '../packages/actions'
import { CustomerList } from './customer-list'
import { getUserRole } from '@/utils/roles'

export default async function CustomersPage() {
  const [customers, packages, contacts] = await Promise.all([
    getCustomers(),
    getPackages(),
    getContacts()
  ])
  const role = await getUserRole()

  return <CustomerList initialCustomers={customers} packages={packages} contacts={contacts} userRole={role} />
}
