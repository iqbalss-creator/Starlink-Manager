'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SystemLog } from '@/types'
import { undoAction } from './actions'
import { RotateCcw, ShieldAlert, Trash2, Edit, PlusCircle, CheckCircle2 } from 'lucide-react'

export function LogClient({ initialLogs }: { initialLogs: SystemLog[] }) {
  const [logs, setLogs] = useState<SystemLog[]>(initialLogs)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState('')

  const handleUndo = async (logId: string) => {
    if (!confirm('Anda yakin ingin membatalkan aksi ini? Data akan dikembalikan ke kondisi sebelumnya.')) return
    
    setLoadingId(logId)
    try {
      await undoAction(logId)
      setSuccessMsg('Aksi berhasil dibatalkan (Undo).')
      setLogs(prev => prev.filter(l => l.id !== logId))
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setLoadingId(null)
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'DELETE': return <Trash2 className="w-4 h-4 text-destructive" />
      case 'UPDATE': return <Edit className="w-4 h-4 text-amber-500" />
      case 'INSERT': return <PlusCircle className="w-4 h-4 text-[#00A76F]" />
      default: return <ShieldAlert className="w-4 h-4 text-muted-foreground" />
    }
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'DELETE': return <span className="bg-[#FFE7D9] text-[#B71D18] px-2 py-0.5 rounded-full text-[10px] font-bold">HAPUS</span>
      case 'UPDATE': return <span className="bg-[#FFF7CD] text-[#B76E00] px-2 py-0.5 rounded-full text-[10px] font-bold">UBAH</span>
      case 'INSERT': return <span className="bg-[#C8FAD6] text-[#007867] px-2 py-0.5 rounded-full text-[10px] font-bold">TAMBAH</span>
      default: return null
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Log Aktivitas & Undo</h1>
        <p className="text-muted-foreground mt-1">Riwayat perubahan data penting dengan kemampuan membatalkan (Undo) kesalahan.</p>
      </div>

      {successMsg && (
        <div className="bg-[#C8FAD6] text-[#007867] px-4 py-3 rounded-xl flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-5 h-5" />
          {successMsg}
        </div>
      )}
      
      <Card className="shadow-sm border-border/40">
        <CardHeader>
          <CardTitle>Riwayat Sistem</CardTitle>
          <CardDescription>Menampilkan daftar aktivitas terbaru. Hanya aksi-aksi kritikal (seperti hapus voucher) yang mendukung fitur Undo secara penuh.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-semibold">Waktu</th>
                  <th className="px-4 py-3 font-semibold">Aksi</th>
                  <th className="px-4 py-3 font-semibold">Target / Tabel</th>
                  <th className="px-4 py-3 font-semibold text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                      Tidak ada histori log aktivitas yang direkam.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const date = new Date(log.created_at)
                    return (
                      <tr key={log.id} className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {date.toLocaleString('id-ID')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {getActionIcon(log.action_type)}
                            {getActionBadge(log.action_type)}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {log.entity_type} <span className="text-muted-foreground">(ID: {log.entity_id?.substring(0,8)}...)</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleUndo(log.id)}
                            disabled={loadingId === log.id}
                            className="h-8 gap-1 border-dashed hover:border-solid hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <RotateCcw className={`w-3 h-3 ${loadingId === log.id ? 'animate-spin' : ''}`} />
                            <span className="text-xs font-semibold">Undo</span>
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
