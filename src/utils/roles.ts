import { cookies } from 'next/headers'

export async function getUserRole() {
  try {
    const cookieStore = await cookies()
    const sessionStr = cookieStore.get('starlink_session')?.value
    if (!sessionStr) return null

    const session = JSON.parse(sessionStr)
    
    // Jika role tidak ada di cookie lama, anggap sebagai reviewer
    return session.role || 'reviewer'
  } catch (e) {
    console.error('Error parsing role cookie', e)
    return 'reviewer' // fallback safety
  }
}
