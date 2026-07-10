import { getMassVoucherBatches } from '../../../customers/actions'
import { HistoryClient } from './history-client'

export const dynamic = 'force-dynamic'

export default async function HistoryPage() {
  const batches = await getMassVoucherBatches()
  return <HistoryClient initialBatches={batches} />
}
