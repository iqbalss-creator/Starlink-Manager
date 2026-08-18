import { getPackages } from '../../packages/actions'
import { MassClient } from './mass-client'
import { mikrotikQuery } from '@/lib/mikrotik'

export const dynamic = 'force-dynamic'

export default async function MassPage() {
  const packages = await getPackages()
  let hotspotServers: any[] = []
  
  try {
    const servers = await mikrotikQuery('/ip/hotspot/print')
    hotspotServers = Array.isArray(servers) ? servers : []
  } catch (err) {
    console.error('Gagal memuat server hotspot:', err)
  }

  return <MassClient packages={packages} hotspotServers={hotspotServers} />
}
