'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Calendar as CalendarIcon, Ticket, LogIn } from 'lucide-react'

type LogEntry = {
  id: string
  payment_date: string
  notes: string
  amount: number
}

export function LogClient({ initialLogs }: { initialLogs: LogEntry[] }) {
  const [search, setSearch] = useState('')
  const [selectedDate, setSelectedDate] = useState<string>('all')
  const [selectedMonth, setSelectedMonth] = useState<string>('all')
  const [selectedYear, setSelectedYear] = useState<string>('all')

  const months = [
    { value: 'all', label: 'Semua Bulan' },
    { value: '0', label: 'Januari' },
    { value: '1', label: 'Februari' },
    { value: '2', label: 'Maret' },
    { value: '3', label: 'April' },
    { value: '4', label: 'Mei' },
    { value: '5', label: 'Juni' },
    { value: '6', label: 'Juli' },
    { value: '7', label: 'Agustus' },
    { value: '8', label: 'September' },
    { value: '9', label: 'Oktober' },
    { value: '10', label: 'November' },
    { value: '11', label: 'Desember' }
  ]

  const dates = ['all', ...Array.from({length: 31}, (_, i) => (i + 1).toString())]
  const currentYear = new Date().getFullYear()
  const years = ['all', currentYear.toString(), (currentYear - 1).toString()]

  const filtered = useMemo(() => {
    return initialLogs.filter(log => {
      // Filter text (username)
      if (search && !log.notes.toLowerCase().includes(search.toLowerCase())) return false

      const date = new Date(log.payment_date)
      
      // Filter date
      if (selectedDate !== 'all' && date.getDate().toString() !== selectedDate) return false
      
      // Filter month
      if (selectedMonth !== 'all' && date.getMonth().toString() !== selectedMonth) return false
      
      // Filter year
      if (selectedYear !== 'all' && date.getFullYear().toString() !== selectedYear) return false

      return true
    })
  }, [initialLogs, search, selectedDate, selectedMonth, selectedYear])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Log Aktivitas Voucher</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Pantau history login semua voucher (Web & Mikhmon)</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 space-y-2">
            <Label>Cari Username</Label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Cari voucher..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="w-full md:w-[120px] space-y-2">
            <Label>Tanggal</Label>
            <Select value={selectedDate} onValueChange={(v) => v && setSelectedDate(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Semua" />
              </SelectTrigger>
              <SelectContent>
                {dates.map(d => (
                  <SelectItem key={d} value={d}>{d === 'all' ? 'Semua' : d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-[160px] space-y-2">
            <Label>Bulan</Label>
            <Select value={selectedMonth} onValueChange={(v) => v && setSelectedMonth(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Semua Bulan" />
              </SelectTrigger>
              <SelectContent>
                {months.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-[140px] space-y-2">
            <Label>Tahun</Label>
            <Select value={selectedYear} onValueChange={(v) => v && setSelectedYear(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Semua Tahun" />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => (
                  <SelectItem key={y} value={y}>{y === 'all' ? 'Semua Tahun' : y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4 font-semibold">Tanggal & Jam</th>
                <th className="px-6 py-4 font-semibold">Username Voucher</th>
                <th className="px-6 py-4 font-semibold">Sumber</th>
                <th className="px-6 py-4 font-semibold text-right">Harga Paket</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    Tidak ada history login ditemukan
                  </td>
                </tr>
              ) : (
                filtered.map((log) => {
                  const date = new Date(log.payment_date)
                  const isMikhmon = log.notes.includes('Dari Mikhmon')
                  const username = log.notes.split(': ')[1] || '-'
                  
                  return (
                    <tr key={log.id} className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4 text-slate-400" />
                          <div>
                            <div className="font-medium">{date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                            <div className="text-xs text-slate-500">{date.toLocaleTimeString('id-ID')} WIB</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {username}
                      </td>
                      <td className="px-6 py-4">
                        {isMikhmon ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                            <LogIn className="w-3.5 h-3.5" />
                            Mikhmon
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                            <Ticket className="w-3.5 h-3.5" />
                            Web App
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-medium">
                        Rp {log.amount.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
