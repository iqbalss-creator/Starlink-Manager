'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2, ShieldCheck } from 'lucide-react'
import { updatePasswordAction } from '../actions'

export function SetupPasswordClient({ agentName }: { agentName: string }) {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsPending(true)
    setError('')
    
    const formData = new FormData(e.currentTarget)
    const p1 = formData.get('password') as string
    const p2 = formData.get('confirm_password') as string

    if (p1 !== p2) {
      setError('Konfirmasi password tidak cocok!')
      setIsPending(false)
      return
    }
    
    if (p1.length < 5) {
      setError('Password minimal 5 karakter')
      setIsPending(false)
      return
    }

    try {
      const res = await updatePasswordAction(formData)
      if (res?.error) setError(res.error)
    } catch (e: any) {
      setError(e.message || 'Terjadi kesalahan')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="flex items-center justify-center py-20 px-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-emerald-500">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold">Halo, {agentName}!</CardTitle>
          <CardDescription>Demi keamanan, Anda diwajibkan untuk mengganti password bawaan sistem dengan password Anda sendiri.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-lg text-center font-medium">
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password Baru</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Masukkan password baru"
                  required
                  className="text-lg tracking-widest"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password">Ulangi Password Baru</Label>
                <Input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  placeholder="Ketik ulang password baru"
                  required
                  className="text-lg tracking-widest"
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-12 text-lg font-medium bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isPending}>
              {isPending ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Menyimpan...</>
              ) : (
                'Simpan Password & Lanjutkan'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
