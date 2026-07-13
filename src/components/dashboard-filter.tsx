'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useState } from 'react'

const PERIOD_LABELS: Record<string, string> = {
  'this_month': 'Bulan Ini',
  'last_month': 'Bulan Lalu',
  'last_3_months': '3 Bulan Terakhir',
  'last_6_months': '6 Bulan Terakhir',
  'all_time': 'Semua Waktu',
  'custom': 'Pilih Tanggal',
}

export function DashboardFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentPeriod = searchParams.get('period') || 'this_month'
  
  const [customStart, setCustomStart] = useState(searchParams.get('start') || '')
  const [customEnd, setCustomEnd] = useState(searchParams.get('end') || '')

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('period', value)
    if (value !== 'custom') {
      params.delete('start')
      params.delete('end')
      router.push(`?${params.toString()}`)
    } else {
      router.push(`?${params.toString()}`)
    }
  }

  const handleCustomDateChange = (start: string, end: string) => {
    setCustomStart(start)
    setCustomEnd(end)
    if (start && end) {
      const params = new URLSearchParams(searchParams.toString())
      params.set('period', 'custom')
      params.set('start', start)
      params.set('end', end)
      router.push(`?${params.toString()}`)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Filter Waktu:</span>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={currentPeriod} onValueChange={handleChange}>
          <SelectTrigger className="w-[180px] bg-card h-9 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-[#00A76F]">
            <SelectValue placeholder="Pilih Waktu">{PERIOD_LABELS[currentPeriod] || 'Kustom'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="this_month">Bulan Ini</SelectItem>
            <SelectItem value="last_month">Bulan Lalu</SelectItem>
            <SelectItem value="last_3_months">3 Bulan Terakhir</SelectItem>
            <SelectItem value="last_6_months">6 Bulan Terakhir</SelectItem>
            <SelectItem value="all_time">Semua Waktu</SelectItem>
            <SelectItem value="custom">Pilih Tanggal Kustom...</SelectItem>
          </SelectContent>
        </Select>

        {currentPeriod === 'custom' && (
          <div className="flex items-center gap-2 bg-card px-2 h-9 rounded-md border border-slate-200 dark:border-slate-800">
            <input 
              type="date" 
              value={customStart}
              onChange={(e) => handleCustomDateChange(e.target.value, customEnd)}
              className="h-7 text-sm bg-transparent border-none focus:ring-0 p-0 text-foreground"
            />
            <span className="text-muted-foreground text-xs font-semibold">-</span>
            <input 
              type="date" 
              value={customEnd}
              onChange={(e) => handleCustomDateChange(customStart, e.target.value)}
              className="h-7 text-sm bg-transparent border-none focus:ring-0 p-0 text-foreground"
            />
          </div>
        )}
      </div>
    </div>
  )
}
