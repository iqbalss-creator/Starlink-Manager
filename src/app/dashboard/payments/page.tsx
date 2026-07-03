import { getPayments } from './actions'
import { getCustomers } from '../customers/actions'
import { PaymentList } from './payment-list'
import { getUserRole } from '@/utils/roles'

export const dynamic = 'force-dynamic'

export default async function PaymentsPage() {
  const payments = await getPayments()
  const customers = await getCustomers()
  const role = await getUserRole()

  return <PaymentList initialPayments={payments} customers={customers} userRole={role} />
}
