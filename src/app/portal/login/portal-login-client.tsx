'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2, KeyRound } from 'lucide-react'
import { loginToPortal } from '../actions'

export function PortalLoginClient() {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsPending(true)
    setError('')
    const formData = new FormData(e.currentTarget)
    try {
      const res = await loginToPortal(formData)
      if (res?.error) setError(res.error)
    } catch (e: any) {
      setError(e.message || 'Terjadi kesalahan')
      setIsPending(false)
    }
  }

  return (
    <div className="flex items-center justify-center py-20">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-2">
            <KeyRound className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold">Portal Pelanggan</CardTitle>
          <CardDescription>Masukkan kode voucher Anda untuk masuk</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-lg text-center font-medium">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="voucher_code">Kode Voucher</Label>
              <Input
                id="voucher_code"
                name="voucher_code"
                placeholder="Contoh: VC842XX"
                required
                className="text-center text-lg tracking-widest font-mono"
                autoComplete="off"
              />
            </div>
            <Button type="submit" className="w-full h-12 text-lg font-medium" disabled={isPending}>
              {isPending ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memproses...</>
              ) : (
                'Masuk ke Portal'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
