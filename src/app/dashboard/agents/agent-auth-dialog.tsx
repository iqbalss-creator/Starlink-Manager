'use client'

import { useState } from 'react'
import { updateAgentAuth } from './actions'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { KeyRound, Loader2 } from "lucide-react"

export function AgentAuthDialog({ agent }: { agent: any }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsPending(true)
    setError('')
    const formData = new FormData(e.currentTarget)
    try {
      const res = await updateAgentAuth(agent.id, formData)
      if (res?.error) {
        setError(res.error)
      } else {
        setIsOpen(false)
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger className="h-8 w-8 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-indigo-50 text-indigo-600" title="Ubah Akun (Username/Password)">
        <KeyRound className="w-4 h-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ubah Akun Agen ({agent.name})</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {error && (
            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-lg font-medium">
              {error}
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" name="username" defaultValue={agent.username} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="whatsapp_number">Nomor WhatsApp</Label>
            <Input id="whatsapp_number" name="whatsapp_number" defaultValue={agent.whatsapp_number} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password Baru (Opsional)</Label>
            <Input id="password" name="password" type="password" placeholder="Kosongkan jika tidak ingin mengubah" />
            <p className="text-xs text-muted-foreground">Jika diisi, password agen akan di-reset.</p>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="reset_first_login" name="reset_first_login" className="rounded text-indigo-600 focus:ring-indigo-600" />
            <Label htmlFor="reset_first_login" className="font-normal text-sm">Paksa ganti password saat login berikutnya</Label>
          </div>
          <Button type="submit" className="w-full bg-[#00A76F] hover:bg-[#007867] text-white" disabled={isPending}>
            {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</> : 'Simpan Perubahan'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
