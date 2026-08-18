'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trash2, Loader2, Printer, Ticket } from 'lucide-react'
import { deleteMassVoucherBatch } from '../../../customers/actions'

export function HistoryClient({ initialBatches }: { initialBatches: any[] }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null)

  const handleDeleteBatch = (batchId: string) => {
    if (!confirm('Hapus HANYA SELURUH voucher ini? Kode tidak akan bisa digunakan lagi.')) return
    startTransition(async () => {
      await deleteMassVoucherBatch(batchId)
    })
  }

  const handleDeleteSingle = (batchId: string, voucherId: string) => {
    if (!confirm('Hapus voucher ini?')) return
    startTransition(async () => {
      await deleteMassVoucherBatch(batchId, [voucherId])
    })
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Ticket className="w-8 h-8 text-primary" />
            Riwayat Cetak Masal
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola dan pantau voucher masal yang pernah Anda cetak</p>
        </div>
      </div>

      <div className="grid gap-6">
        {initialBatches.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground border-dashed">
            Belum ada riwayat cetak voucher masal.
          </Card>
        ) : (
          initialBatches.map((batch) => (
            <Card key={batch.batchId} className="overflow-hidden">
              <CardHeader className="bg-slate-50 dark:bg-slate-900/50 flex flex-row items-center justify-between py-4">
                <div>
                  <CardTitle className="text-lg">Batch: {new Date(batch.createdAt).toLocaleString('id-ID')}</CardTitle>
                  <CardDescription className="mt-1">
                    Paket: {batch.packageName} • {batch.vouchers.length} Kode
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const q = new URLSearchParams()
                      q.set('users', batch.vouchers.map((v: any) => v.username).join(','))
                      router.push('/dashboard/vouchers/print?' + q.toString())
                    }}
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Cetak Ulang
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteBatch(batch.batchId)}
                    disabled={isPending}
                  >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                    Hapus Batch
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedBatch(expandedBatch === batch.batchId ? null : batch.batchId)}
                  >
                    {expandedBatch === batch.batchId ? 'Tutup' : 'Lihat Kode'}
                  </Button>
                </div>
              </CardHeader>

              {expandedBatch === batch.batchId && (
                <CardContent className="p-0">
                  <div className="divide-y divide-border border-t">
                    {batch.vouchers.map((v: any) => (
                      <div key={v.id} className="flex items-center justify-between p-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                        <div className="font-mono bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded text-sm">
                          {v.username}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleDeleteSingle(batch.batchId, v.id)}
                          disabled={isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
