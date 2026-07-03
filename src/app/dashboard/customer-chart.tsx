'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

type DataPoint = {
  name: string
  value: number
  color: string
}

export function CustomerChart({ data }: { data: DataPoint[] }) {
  const total = data.reduce((a, b) => a + b.value, 0)

  return (
    <div className="flex flex-col items-center gap-3">
      <ResponsiveContainer width="100%" height={170}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={75}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [value, name]}
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid hsl(var(--border))',
                background: 'hsl(var(--card))',
                color: 'hsl(var(--foreground))',
                fontSize: '12px',
              }}
            />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-col gap-1.5 w-full">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-muted-foreground">{item.name}</span>
            </div>
            <span className="font-semibold text-foreground">
              {item.value}
              <span className="text-muted-foreground font-normal ml-1">
                ({total > 0 ? Math.round((item.value / total) * 100) : 0}%)
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
