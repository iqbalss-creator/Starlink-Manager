'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LogOut, Store, Ticket, History, CheckCircle, Clock } from 'lucide-react'
import { logoutAgent } from './actions'

export function AgentClient({ agent, vouchers, usageHistories }: any) {
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null)

  function handleLogout() {
    logoutAgent()
  }

  // Calculate Stock Grouped by Batch (Cloter) and Package
  const stockMap = new Map()
  if (vouchers) {
    vouchers.forEach((v: any) => {
      const dateStr = new Date(v.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
      const pkgName = v.packages?.name || 'Unknown'
      const key = `${dateStr}-${pkgName}`
      
      if (!stockMap.has(key)) {
        stockMap.set(key, { cloter: dateStr, rawDate: v.created_at, paket: pkgName, total: 0, sisa: 0, vouchers: [] })
      }
      
      const item = stockMap.get(key)
      item.total += 1
      
      // Get usage history for this voucher
      const vHistory = usageHistories.filter((h: any) => h.entity_id === v.id)
      
      item.vouchers.push({ 
        ...v, 
        username: v.mikrotik_username,
        usageHistory: vHistory
      })
      
      if (v.status === 'Belum Digunakan') {
        item.sisa += 1
      }
    })
  }
  
  const stockData = Array.from(stockMap.values()).sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime())

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
            Halo, {agent?.name}!
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Pantau stok dan pemakaian voucher Anda di sini.</p>
        </div>
        <Button variant="outline" onClick={handleLogout} className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">
          <LogOut className="w-4 h-4 mr-2" /> Keluar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Total Voucher</p>
              <h3 className="text-2xl font-bold text-indigo-900 dark:text-indigo-100 mt-1">
                {vouchers.length}
              </h3>
            </div>
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Ticket className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Sudah Dipakai</p>
              <h3 className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 mt-1">
                {vouchers.filter((v:any) => v.status !== 'Belum Digunakan').length}
              </h3>
            </div>
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Sisa Stok (Belum Dipakai)</p>
              <h3 className="text-2xl font-bold text-amber-900 dark:text-amber-100 mt-1">
                {vouchers.filter((v:any) => v.status === 'Belum Digunakan').length}
              </h3>
            </div>
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Store className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-bold mt-8 mb-4">Riwayat Batch Cetakan</h2>
      <div className="grid gap-6">
        {stockData.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground border-dashed">
            Belum ada voucher yang dicetak untuk Anda.
          </Card>
        ) : (
          stockData.map((batch) => {
            const used = batch.total - batch.sisa;
            return (
              <Card key={batch.cloter} className="overflow-hidden">
                <CardHeader className="bg-slate-50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 gap-4">
                  <div>
                    <CardTitle className="text-lg">Tgl Cetak: {batch.cloter}</CardTitle>
                    <CardDescription className="mt-1 font-medium">
                      Paket: {batch.paket}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
                    <div className="flex gap-4 text-sm bg-white dark:bg-slate-800 p-2 rounded-lg border">
                      <div className="text-center px-2">
                        <span className="block text-muted-foreground text-xs">Total</span>
                        <span className="font-bold">{batch.total}</span>
                      </div>
                      <div className="text-center px-2 border-l">
                        <span className="block text-emerald-600 text-xs">Dipakai</span>
                        <span className="font-bold text-emerald-600">{used}</span>
                      </div>
                      <div className="text-center px-2 border-l">
                        <span className="block text-amber-600 text-xs">Sisa</span>
                        <span className="font-bold text-amber-600">{batch.sisa}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedBatch(expandedBatch === batch.cloter ? null : batch.cloter)}
                      className="w-full sm:w-auto"
                    >
                      {expandedBatch === batch.cloter ? 'Tutup Detail' : 'Lihat Riwayat Pemakaian'}
                    </Button>
                  </div>
                </CardHeader>

                {expandedBatch === batch.cloter && (
                  <CardContent className="p-0">
                    <div className="divide-y divide-border border-t">
                      {batch.vouchers.map((v: any) => (
                        <div key={v.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors gap-4">
                          <div className="flex items-center gap-3">
                            <div className="font-mono bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded text-sm font-bold">
                              {v.username}
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              v.status === 'Belum Digunakan' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {v.status}
                            </span>
                          </div>
                          
                          <div className="flex flex-col text-sm text-muted-foreground">
                            {v.usageHistory && v.usageHistory.length > 0 ? (
                              <div className="space-y-1">
                                {v.usageHistory.map((h:any, idx:number) => (
                                  <div key={idx} className="flex items-center gap-2 text-xs">
                                    <Clock className="w-3 h-3" />
                                    <span>Digunakan pada: {new Date(h.new_data?.session_start || h.created_at).toLocaleString('id-ID')}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs italic text-slate-400">Belum ada riwayat pemakaian</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
