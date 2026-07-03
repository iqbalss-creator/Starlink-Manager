'use client'

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatBytes } from '@/utils/format'

type RevenueData = { month: string; total: number }
type MethodData = { name: string; value: number }
type PackageData = { name: string; count: number }
type DebtData = { name: string; value: number; color: string }

const COLORS = ['#00A76F', '#FFAB00', '#00B8D9', '#FF5630', '#8E33FF']

export function AnalyticsClient({
  revenueData,
  methodData,
  packageData,
  debtData
}: {
  revenueData: RevenueData[]
  methodData: MethodData[]
  packageData: PackageData[]
  debtData: DebtData[]
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-[24.5px] font-semibold text-foreground tracking-tight">Analytics Lanjutan</h1>
        <p className="text-sm text-muted-foreground font-medium">
          Wawasan mendalam tentang performa bisnis Anda.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Pendapatan (Area Chart) */}
        <Card className="shadow-sm border-border/40 lg:col-span-2">
          <CardHeader>
            <CardTitle>Trend Pendapatan (12 Bulan)</CardTitle>
            <CardDescription>Pergerakan omzet kotor setiap bulannya.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00A76F" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00A76F" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12, fill: '#ffffff' }}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: '#ffffff' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    dx={-10}
                  />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                  <Tooltip 
                    cursor={{ fill: 'transparent', stroke: 'var(--border)' }}
                    formatter={(value: any) => [`Rp ${Number(value).toLocaleString('id-ID')}`, 'Pendapatan']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', color: '#ffffff' }}
                    itemStyle={{ color: '#00A76F' }}
                  />
                  <Area type="monotone" dataKey="total" stroke="#00A76F" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Paket Terlaris (Bar Chart Horizontal) */}
        <Card className="shadow-sm border-border/40">
          <CardHeader>
            <CardTitle>Paket Layanan Terlaris</CardTitle>
            <CardDescription>Berdasarkan jumlah pelanggan saat ini.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={packageData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12, fill: '#ffffff' }} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    formatter={(value: any) => [`${value} Pelanggan`, 'Jumlah']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #ffffff', background: '#ffffff', color: '#ffffff' }}
                    itemStyle={{ color: '#FFAB00' }}
                  />
                  <Bar dataKey="count" fill="#FFAB00" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Metode Pembayaran (Pie Chart) */}
        <Card className="shadow-sm border-border/40">
          <CardHeader>
            <CardTitle>Metode Pembayaran</CardTitle>
            <CardDescription>Preferensi cara bayar pelanggan (Cash, Transfer, dll).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={methodData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {methodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => [`${value} Transaksi`, 'Jumlah']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', color: '#ffffff' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#ffffff' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Piutang (Donut Chart) */}
        <Card className="shadow-sm border-border/40 lg:col-span-2 max-w-2xl mx-auto w-full">
          <CardHeader className="text-center">
            <CardTitle>Rasio Lunas vs Kasbon</CardTitle>
            <CardDescription>Berdasarkan total transaksi yang tercatat.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={debtData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {debtData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => [`${value} Transaksi`, 'Status']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', color: '#ffffff' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#ffffff' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
