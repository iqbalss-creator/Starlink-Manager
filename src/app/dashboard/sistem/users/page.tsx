import { UserClient } from './user-client'
import { getUsers } from './actions'
import { getUserRole } from '@/utils/roles'
import { redirect } from 'next/navigation'

export default async function UsersPage() {
  const role = await getUserRole()
  
  if (role !== 'admin') {
    redirect('/dashboard') // Hanya admin yang boleh akses halaman ini
  }

  const users = await getUsers()
  
  return <UserClient initialUsers={users} />
}
