'use client'

import { useState, useTransition } from 'react'
import { Package } from '@/types'
import { createPackage, updatePackage, deletePackage } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Edit, Trash2 } from 'lucide-react'

export function PackageList({ initialPackages }: { initialPackages: Package[] }) {
  const [packages, setPackages] = useState(initialPackages)
  const [isPending, startTransition] = useTransition()
  
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingPackage, setEditingPackage] = useState<Package | null>(null)

  // Handle Create
  const handleCreate = async (formData: FormData) => {
    startTransition(async () => {
      try {
        await createPackage(formData)
        setIsCreateOpen(false)
        // In a real app we might re-fetch or rely on Next.js Server Action revalidatePath.
        // For simple UX, we wait for revalidatePath to refresh the server component data.
      } catch (err) {
        alert('Gagal membuat paket: ' + (err as Error).message)
      }
    })
  }

  // Handle Edit
  const handleEdit = async (formData: FormData) => {
    if (!editingPackage) return
    startTransition(async () => {
      try {
        await updatePackage(editingPackage.id, formData)
        setIsEditOpen(false)
        setEditingPackage(null)
      } catch (err) {
        alert('Gagal menyimpan paket: ' + (err as Error).message)
      }
    })
  }

  // Handle Delete
  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus paket ini?')) return
    startTransition(async () => {
      try {
        await deletePackage(id)
      } catch (err) {
        alert('Gagal menghapus paket: ' + (err as Error).message)
      }
    })
  }

  const openEditModal = (pkg: Package) => {
    setEditingPackage(pkg)
    setIsEditOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[24.5px] font-semibold text-foreground tracking-tight">Paket Layanan</h1>
          <p className="text-sm text-muted-foreground font-medium">
            Kelola pilihan paket internet untuk pelanggan Anda
          </p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 bg-[#00A76F] hover:bg-[#007867] text-white">
            <Plus className="w-4 h-4 mr-2" />
            Tambah Paket
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Tambah Paket Baru</DialogTitle>
            </DialogHeader>
            <form action={handleCreate} className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nama Paket</Label>
                <Input id="name" name="name" placeholder="Misal: 1 Bulan Premium" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="price">Harga (Rp)</Label>
                <Input id="price" name="price" type="number" placeholder="150000" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="duration_days">Durasi (Hari)</Label>
                <Input id="duration_days" name="duration_days" type="number" defaultValue="30" required />
              </div>
              <Button type="submit" disabled={isPending} className="bg-[#00A76F] hover:bg-[#007867] text-white mt-4">
                {isPending ? 'Menyimpan...' : 'Simpan Paket'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-2xl shadow-[rgba(145,158,171,0.2)_0px_0px_2px_0px,rgba(145,158,171,0.12)_0px_12px_24px_-4px] dark:shadow-none dark:border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[12px] font-semibold text-foreground bg-muted border-b border-border">
              <tr>
                <th className="px-6 py-4">NAMA PAKET</th>
                <th className="px-6 py-4">HARGA</th>
                <th className="px-6 py-4">DURASI</th>
                <th className="px-6 py-4 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody>
              {initialPackages.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                    Belum ada paket layanan.
                  </td>
                </tr>
              ) : (
                initialPackages.map((pkg) => (
                  <tr key={pkg.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{pkg.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      Rp {pkg.price.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{pkg.duration_days} Hari</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => openEditModal(pkg)}
                          disabled={isPending}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(pkg.id)}
                          disabled={isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Paket</DialogTitle>
          </DialogHeader>
          <form action={handleEdit} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nama Paket</Label>
              <Input id="edit-name" name="name" defaultValue={editingPackage?.name} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-price">Harga (Rp)</Label>
              <Input id="edit-price" name="price" type="number" defaultValue={editingPackage?.price} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-duration_days">Durasi (Hari)</Label>
              <Input id="edit-duration_days" name="duration_days" type="number" defaultValue={editingPackage?.duration_days} required />
            </div>
            <Button type="submit" disabled={isPending} className="bg-[#00A76F] hover:bg-[#007867] text-white mt-4">
              {isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
