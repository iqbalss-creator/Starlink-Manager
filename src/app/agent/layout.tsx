import { cookies } from 'next/headers'

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      <header className="bg-indigo-600 dark:bg-indigo-900 shadow-sm sticky top-0 z-10 text-white">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="font-bold text-xl flex items-center gap-2">
            🤝 Allstar Mitra/Agen
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
