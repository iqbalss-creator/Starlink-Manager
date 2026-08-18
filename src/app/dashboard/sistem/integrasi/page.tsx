import { IntegrasiClient } from './integrasi-client'
import { getSettings } from './actions'

export default async function IntegrasiPage() {
  const dbSettings = await getSettings()
  
  // Kalau di DB belum ada, kita kasih nilai default dari .env.local biar user tinggal klik Simpan
  const settings = [...dbSettings]
  
  const injectEnv = (key: string, envVal: string | undefined, desc: string) => {
    if (envVal && !settings.find(s => s.key === key)) {
      settings.push({ key, value: envVal, description: desc })
    }
  }

  injectEnv('mikrotik_host', process.env.MIKROTIK_HOST, 'IP Address MikroTik')
  injectEnv('mikrotik_user', process.env.MIKROTIK_USER, 'Username admin MikroTik')
  injectEnv('mikrotik_password', process.env.MIKROTIK_PASS, 'Password MikroTik')
  injectEnv('mikrotik_port', process.env.MIKROTIK_PORT, 'Port API MikroTik')

  return <IntegrasiClient initialSettings={settings} />
}
