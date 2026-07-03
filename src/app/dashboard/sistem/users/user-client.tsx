'use client'

import { useState } from 'react'
import { createUser, deleteUser, updateUserRole } from './actions'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Users, Plus, Shield, ShieldCheck, Trash2, Loader2, AlertCircle } from 'lucide-react'

export function UserClient({ initialUsers }: { initialUsers: any[] }) {
  const [users, setUsers] = useState<any[]>(initialUsers)
  const [isAdding, setIsAdding] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    const formData = new FormData(e.currentTarget)
    try {
      await createUser(formData)
      window.location.reload()
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus akun ini?')) return
    try {
      await deleteUser(id)
      setUsers(users.filter(u => u.id !== id))
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleRoleChange = async (id: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'reviewer' : 'admin'
    if (!confirm(`Ubah role menjadi ${newRole.toUpperCase()}?`)) return
    try {
      await updateUserRole(id, newRole)
      setUsers(users.map(u => u.id === id ? { ...u, role: newRole } : u))
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Manajemen User</h1>
          <p className="text-muted-foreground mt-1">Atur hak akses tim lu (Admin vs Reviewer).</p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)} className="bg-[#00A76F] hover:bg-[#007867] text-white">
          <Plus className="w-4 h-4 mr-2" />
          Tambah User
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/15 text-destructive text-sm p-4 rounded-xl flex items-start gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <span className="font-semibold block">Gagal Membuat User!</span>
            {error}
          </div>
        </div>
      )}

      {isAdding && (
        <Card className="border-emerald-200 dark:border-emerald-900/50">
          <CardContent className="pt-6">
            <form onSubmit={handleCreate} className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nama Lengkap</Label>
                <Input name="full_name" placeholder="Budi Santoso" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Username</Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="text" 
                  placeholder="Misal: kasir1" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input name="password" type="password" placeholder="Minimal 6 karakter" required minLength={6} />
              </div>
              <div className="space-y-2">
                <Label>Hak Akses (Role)</Label>
                <select name="role" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                  <option value="reviewer">Reviewer (Hanya Lihat)</option>
                  <option value="admin">Admin (Akses Penuh)</option>
                </select>
              </div>
              <div className="sm:col-span-2 flex justify-end gap-2 mt-2">
                <Button type="button" variant="outline" onClick={() => setIsAdding(false)}>Batal</Button>
                <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan User'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="bg-card rounded-2xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-6 py-4 font-semibold text-muted-foreground">User</th>
              <th className="px-6 py-4 font-semibold text-muted-foreground">Username</th>
              <th className="px-6 py-4 font-semibold text-muted-foreground">Role</th>
              <th className="px-6 py-4 font-semibold text-muted-foreground text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-6 py-4 font-medium flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                    {u.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  {u.full_name || '-'}
                </td>
                <td className="px-6 py-4">{u.email}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    u.role === 'admin' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {u.role === 'admin' ? <ShieldCheck className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                    {u.role?.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleRoleChange(u.id, u.role)} className="mr-2">
                    Ubah Role
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(u.id)} className="text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
            <Users className="w-12 h-12 mb-3 text-muted-foreground/50" />
            <p>Belum ada user yang terdaftar.</p>
          </div>
        )}
      </div>
    </div>
  )
}
