import { LogClient } from './log-client'
import { getSystemLogs } from './actions'

export default async function LogSistemPage() {
  const logs = await getSystemLogs()
  
  return <LogClient initialLogs={logs} />
}
