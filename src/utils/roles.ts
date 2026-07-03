import { cookies } from 'next/headers'

export async function getUserRole() {
  try {
    const cookieStore = await cookies()
    const sessionStr = cookieStore.get('starlink_session')?.value
    if (!sessionStr) return null

    const session = JSON.parse(sessionStr)
    
    // Jika role tidak ada di cookie lama, anggap sebagai admin utama
    return session.role || 'admin'
  } catch (e) {
    console.error('Error parsing role cookie', e)
    return 'admin' // fallback safety for the owner
  }
}
