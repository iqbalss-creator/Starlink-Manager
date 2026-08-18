'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2, KeyRound } from 'lucide-react'
import { verifyWaForResetAction } from '../actions'

export function ForgotPasswordClient() {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsPending(true)
    setError('')
    
    const formData = new FormData(e.currentTarget)
    try {
      const res = await verifyWaForResetAction(formData)
      if (res?.error) setError(res.error)
    } catch (e: any) {
      setError(e.message || 'Terjadi kesalahan')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="flex items-center justify-center py-20 px-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-indigo-600">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-2">
            <KeyRound className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold">Lupa Password</CardTitle>
          <CardDescription>Masukkan Nomor WhatsApp Anda yang terdaftar pada sistem.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-lg text-center font-medium">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="whatsapp_number">Nomor WhatsApp</Label>
              <Input
                id="whatsapp_number"
                name="whatsapp_number"
                type="tel"
                placeholder="Contoh: 08123456789"
                required
                className="text-center text-lg tracking-wider"
              />
            </div>
            <Button type="submit" className="w-full h-12 text-lg font-medium bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isPending}>
              {isPending ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memeriksa...</>
              ) : (
                'Verifikasi Nomor WA'
              )}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <a href="/agent/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
              &larr; Kembali ke halaman Login
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
