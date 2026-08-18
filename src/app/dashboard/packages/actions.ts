'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getPackages() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('packages')
    .select('*')
    .order('price', { ascending: true })

  if (error) {
    console.error('Error fetching packages:', error)
    return []
  }

  return data
}

export async function createPackage(formData: FormData) {
  const name = formData.get('name') as string
  const price = parseFloat(formData.get('price') as string)
  const duration_days = parseInt(formData.get('duration_days') as string, 10)

  const supabase = await createClient()
  const { error } = await supabase
    .from('packages')
    .insert([{ name, price, duration_days }])

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/dashboard/packages')
}

export async function updatePackage(id: string, formData: FormData) {
  const name = formData.get('name') as string
  const price = parseFloat(formData.get('price') as string)
  const duration_days = parseInt(formData.get('duration_days') as string, 10)

  const supabase = await createClient()
  const { error } = await supabase
    .from('packages')
    .update({ name, price, duration_days })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/dashboard/packages')
}

export async function deletePackage(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('packages')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/dashboard/packages')
}
