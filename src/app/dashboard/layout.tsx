import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { getUserRole } from '@/utils/roles'
import { AutoLogoutTimer } from "@/components/dashboard/auto-logout-provider"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const role = await getUserRole()

  return (
    <SidebarProvider>
      <AppSidebar userRole={role} />
      <div className="flex flex-1 flex-col min-h-screen">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 w-full">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1" />
          <AutoLogoutTimer />
          {/* Tambahkan elemen header tambahan di sini seperti user profile dropdown jika diperlukan */}
        </header>
        <main className="flex-1 p-6 w-full">
          {children}
        </main>
      </div>
    </SidebarProvider>
  )
}
