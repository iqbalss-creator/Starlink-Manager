'use client'

import { useState, useTransition } from 'react'
import { Customer } from '@/types'
import { updateExpiryDate } from '@/app/dashboard/customers/actions'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { CalendarClock } from 'lucide-react'

interface UpdateExpiryDialogProps {
  customer: Customer
  size?: 'sm' | 'default'
}

export function UpdateExpiryDialog({ customer, size = 'sm' }: UpdateExpiryDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  
  // Format current expiry date for the input default value (YYYY-MM-DD)
  const currentExpiry = customer.expiry_date
    ? new Date(customer.expiry_date).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0]

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const expiryDate = (form.elements.namedItem('expiry_date') as HTMLInputElement).value

    startTransition(async () => {
      try {
        await updateExpiryDate(customer.id, expiryDate)
        setOpen(false)
      } catch (err) {
        alert('Gagal mengubah tanggal: ' + (err as Error).message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
          className={
            size === 'sm'
              ? 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent h-8 w-8 text-muted-foreground hover:text-foreground'
              : 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent h-9 px-4 py-2 gap-2 text-muted-foreground hover:text-foreground'
          }
          title="Ubah Tanggal Jatuh Tempo"
        >
          <CalendarClock className="h-4 w-4" />
          {size !== 'sm' && 'Ubah Tanggal'}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle>Ubah Tanggal Jatuh Tempo</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground mb-1">
          Pelanggan: <span className="font-semibold text-foreground">{customer.name}</span>
        </div>
        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="expiry_date">Tanggal Jatuh Tempo Baru</Label>
            <input
              id="expiry_date"
              name="expiry_date"
              type="date"
              defaultValue={currentExpiry}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            {customer.expiry_date && (
              <p className="text-xs text-muted-foreground">
                Saat ini: {new Date(customer.expiry_date).toLocaleDateString('id-ID', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                })}
              </p>
            )}
          </div>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-[#00A76F] hover:bg-[#007867] text-white mt-2"
          >
            {isPending ? 'Menyimpan...' : 'Simpan Tanggal'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
