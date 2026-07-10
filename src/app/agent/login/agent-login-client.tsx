'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2, Phone } from 'lucide-react'
import { loginToAgentPortal } from '../actions'

export function AgentLoginClient() {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsPending(true)
    setError('')
    const formData = new FormData(e.currentTarget)
    try {
      const res = await loginToAgentPortal(formData)
      if (res?.error) setError(res.error)
    } catch (e: any) {
      setError(e.message || 'Terjadi kesalahan')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="flex items-center justify-center py-20">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-indigo-600">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-2">
            <Phone className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold">Portal Agen</CardTitle>
          <CardDescription>Masukkan Nomor WhatsApp Anda yang terdaftar</CardDescription>
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
                autoComplete="off"
              />
            </div>
            <Button type="submit" className="w-full h-12 text-lg font-medium bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isPending}>
              {isPending ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memproses...</>
              ) : (
                'Masuk ke Dashboard'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
