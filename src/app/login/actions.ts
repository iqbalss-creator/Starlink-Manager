'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export async function login(formData: FormData) {
  try {
    const username = formData.get('username') as string
    const password = formData.get('password') as string

    if (!username || !password) {
      return { error: 'Username dan password harus diisi' }
    }

    const supabase = await createClient()

    // Cari user di tabel app_users
    const { data: user, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('username', username)
      .single()

    if (error || !user) {
      return { error: 'Username tidak ditemukan' }
    }

    if (user.password !== password) {
      return { error: 'Password salah' }
    }

    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set('starlink_session', JSON.stringify({
      id: user.id,
      username: user.username,
      role: user.role,
      full_name: user.full_name
    }), {
      httpOnly: true,
      secure: false, // Set false sementara agar bisa jalan di IP HTTP biasa
      maxAge: 60 * 60 * 24 * 7, // 1 minggu
      path: '/',
    })

    return { success: true }
  } catch (e: any) {
    return { error: "Server Action Error: " + (e.message || String(e)) }
  }
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete('starlink_session')
  redirect('/login')
}
