'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getUsers() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('app_users')
    .select('id, username, role, full_name, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching users:', error)
    return []
  }

  return data.map((u: any) => ({
    id: u.id,
    email: u.username,
    role: u.role,
    full_name: u.full_name,
    created_at: u.created_at
  }))
}

export async function createUser(formData: FormData) {
  const supabase = await createClient()
  
  const username = formData.get('email') as string
  const password = formData.get('password') as string
  const role = formData.get('role') as string
  const full_name = formData.get('full_name') as string

  if (!username || !password || !role) {
    throw new Error('Username, password, dan role harus diisi')
  }

  const { error: insertError } = await supabase
    .from('app_users')
    .insert({
      username: username,
      password: password,
      role: role,
      full_name: full_name
    })

  if (insertError) {
    console.error('Error inserting app user:', insertError)
    if (insertError.code === '23505') {
      throw new Error('Username sudah terdaftar')
    }
    throw new Error(insertError.message)
  }

  revalidatePath('/dashboard/sistem/users')
  return { success: true }
}

export async function deleteUser(id: string) {
  const supabase = await createClient()
  
  const { error } = await supabase.from('app_users').delete().eq('id', id)
  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/dashboard/sistem/users')
  return { success: true }
}

export async function updateUserRole(id: string, role: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('app_users').update({ role }).eq('id', id)
  if (error) {
    throw new Error(error.message)
  }
  revalidatePath('/dashboard/sistem/users')
  return { success: true }
}
