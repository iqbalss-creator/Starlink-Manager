'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createMassVouchers } from '../../customers/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Printer, Ticket } from 'lucide-react'

export function MassClient({ packages }: { packages: any[] }) {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function onSubmit(formData: FormData) {
    setIsPending(true)
    setError('')
    try {
      const generated = await createMassVouchers(formData)
      if (generated && generated.length > 0) {
        // Build query string for the print page
        const q = new URLSearchParams()
        q.set('users', generated.join(','))
        router.push('/dashboard/vouchers/print?' + q.toString())
      } else {
        setError('Tidak ada voucher yang berhasil digenerate.')
      }
    } catch (e: any) {
      setError(e.message || String(e))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Ticket className="w-8 h-8 text-primary" />
          Cetak Voucher Masal
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Generate voucher fisik acak untuk dijual secara offline</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parameter Cetak</CardTitle>
          <CardDescription>Pilih paket dan jumlah voucher yang ingin dicetak</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={onSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-lg">
                {error}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Jumlah Voucher</Label>
                <Input id="quantity" name="quantity" type="number" min="1" max="100" defaultValue="10" required />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="length">Panjang Kode (Karakter)</Label>
                <Input id="length" name="length" type="number" min="4" max="10" defaultValue="5" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="package_id">Paket Layanan</Label>
              <Select name="package_id" required>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih paket" />
                </SelectTrigger>
                <SelectContent>
                  {packages.map(pkg => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name} - Rp {pkg.price.toLocaleString('id-ID')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="server">Server Hotspot (MikroTik)</Label>
              <Input id="server" name="server" defaultValue="all" required />
            </div>

            <div className="pt-4">
              <Button type="submit" className="w-full bg-[#00A76F] hover:bg-[#007867] text-white" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <Printer className="mr-2 h-4 w-4" />
                    Generate & Buka Halaman Cetak
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
