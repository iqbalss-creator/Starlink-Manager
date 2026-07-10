import { getAgents, addAgent, deleteAgent } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Store, UserPlus, Phone, Trash2, ArrowRight, User } from "lucide-react"
import Link from "next/link"
import { AgentAuthDialog } from "./agent-auth-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export default async function AgentsPage() {
  const agents = await getAgents()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Agen Voucher</h1>
          <p className="text-muted-foreground mt-1">Kelola reseller, bagi hasil, dan performa penjualan voucher.</p>
        </div>
        
        <Dialog>
          <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2 bg-[#00A76F] hover:bg-[#007867] text-white">
            <UserPlus className="w-4 h-4 mr-2" />
            Tambah Agen
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Agen Baru</DialogTitle>
            </DialogHeader>
            <form action={async (formData) => {
              'use server'
              await addAgent(formData)
            }} className="space-y-4 pt-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nama Agen / Reseller</Label>
                <Input id="name" name="name" placeholder="Misal: Konter Ali" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" name="username" placeholder="Misal: konter_ali" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password Default</Label>
                <Input id="password" name="password" defaultValue="admin" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="whatsapp_number">Nomor WhatsApp</Label>
                <Input id="whatsapp_number" name="whatsapp_number" placeholder="0812..." required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="commission_rate">Komisi (%)</Label>
                <Input id="commission_rate" name="commission_rate" type="number" defaultValue="20" required />
              </div>
              <Button type="submit" className="w-full bg-[#00A76F] hover:bg-[#007867] text-white">
                Simpan Agen
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-card rounded-xl border border-dashed">
            Belum ada agen yang terdaftar.
          </div>
        ) : (
          agents.map((agent: any) => {
            // Hitung voucher
            const vouchers = agent.vouchers || []
            const unsettledVouchers = vouchers.filter((v: any) => v.settlement_status === 'Belum Setor')
            
            let totalUnsettledRupiah = 0
            unsettledVouchers.forEach((v: any) => {
              if (v.packages) {
                totalUnsettledRupiah += v.packages.price
              }
            })

            const potentialCommission = totalUnsettledRupiah * (agent.commission_rate / 100)
            const netIncome = totalUnsettledRupiah - potentialCommission

            return (
              <div key={agent.id} className="bg-card border rounded-2xl p-5 shadow-sm relative group overflow-hidden flex flex-col h-full">
                <div className="absolute top-0 right-0 p-3 flex gap-1 z-10">
                  <AgentAuthDialog agent={agent} />
                  <form action={async () => {
                    'use server'
                    await deleteAgent(agent.id)
                  }}>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" title="Hapus Agen">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </form>
                </div>
                
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[#00A76F]/10 text-[#00A76F] flex items-center justify-center shrink-0">
                    <Store className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight">{agent.name}</h3>
                    <div className="flex flex-col text-muted-foreground text-xs gap-1 mt-1">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span className="font-medium text-slate-700">{agent.username || '-'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {agent.whatsapp_number || '-'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-xl p-3 mb-4 space-y-2 text-sm flex-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Komisi Agen</span>
                    <span className="font-bold text-[#00A76F]">{agent.commission_rate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Voucher Blm Setor</span>
                    <span className="font-bold">{unsettledVouchers.length} tiket</span>
                  </div>
                  <div className="pt-2 mt-2 border-t flex justify-between items-center">
                    <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Potensi Setoran</span>
                    <span className="font-black text-lg">Rp {netIncome.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                <Link href={`/dashboard/agents/${agent.id}`}>
                  <Button className="w-full" variant="outline">
                    Kelola Setoran & Voucher <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
