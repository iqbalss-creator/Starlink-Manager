'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Printer, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function PrintClient({ vouchers }: { vouchers: any[] }) {
  const router = useRouter()

  useEffect(() => {
    // Optional: Auto print when page loads
    // window.print()
  }, [])

  return (
    <div className="min-h-screen bg-slate-100 p-4 print:p-0 print:bg-white">
      {/* Controls - Hidden in print mode */}
      <div className="mb-6 flex gap-4 print:hidden max-w-5xl mx-auto">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali
        </Button>
        <Button className="bg-[#00A76F] hover:bg-[#007867]" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-2" />
          Cetak Sekarang (Print)
        </Button>
        <div className="text-sm text-muted-foreground flex items-center ml-auto">
          Tip: Gunakan margin "None" atau minimum di setelan printer.
        </div>
      </div>

      {/* Print Layout */}
      <div className="flex flex-wrap gap-4 print:gap-2 justify-center items-start print:justify-start max-w-5xl mx-auto print:max-w-none">
        {vouchers.map((v) => (
          <div 
            key={v.mikrotik_username} 
            className="w-[200px] print:w-[58mm] border-2 border-slate-300 print:border-black p-3 bg-white text-center break-inside-avoid relative overflow-hidden flex flex-col"
            style={{ minHeight: '120px' }}
          >
            <div className="font-bold text-lg mb-1 text-slate-800 print:text-black uppercase">
              VOUCHER WIFI
            </div>
            
            <div className="text-xs text-slate-500 print:text-black mb-2 border-b border-dashed pb-1">
              {v.packages?.name || 'Paket Internet'}
            </div>
            
            <div className="bg-slate-100 print:bg-transparent print:border print:border-black p-2 my-2 rounded flex-1 flex flex-col justify-center">
              <div className="text-[10px] text-slate-500 print:text-black uppercase tracking-wider mb-1">Kode Akses</div>
              <div className="font-mono text-xl font-bold tracking-widest text-[#00A76F] print:text-black">
                {v.mikrotik_username}
              </div>
            </div>
            
            <div className="text-[9px] text-slate-400 print:text-black mt-1">
              Masukkan kode tanpa spasi
            </div>
          </div>
        ))}
      </div>

      <style jsx global>{`
        @media print {
          @page {
            margin: 0.5cm;
          }
          body {
            background: white;
            color: black;
          }
          /* This helps thermal printers which have very narrow width */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  )
}
