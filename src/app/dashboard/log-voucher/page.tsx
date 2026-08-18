import { getVoucherLogs } from './actions'
import { LogClient } from './log-client'

export default async function LogVoucherPage() {
  const logs = await getVoucherLogs()

  return <LogClient initialLogs={logs} />
}
