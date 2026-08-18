import { PortalLoginClient } from './portal-login-client'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function PortalLoginPage() {
  const cookieStore = await cookies()
  if (cookieStore.get('portal_session')) {
    redirect('/portal')
  }
  return <PortalLoginClient />
}
