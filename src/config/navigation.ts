import {
  LayoutDashboard,
  Users,
  Wallet,
  Network,
  BarChart3,
  MessageSquare,
  Settings,
  FileText,
  Bell,
  CreditCard,
  Router,
  Satellite,
  Activity,
  UserCog,
  Shield,
  Sliders,
  Plug,
  HardDrive,
  ClipboardList,
  Monitor,
  Info,
  Send,
  Mail,
  BookTemplate,
  TrendingUp,
  Package,
  Store,
  Ticket,
} from "lucide-react"

export type NavSubItem = {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  comingSoon?: boolean
  adminOnly?: boolean
}

export type NavItem = {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  children?: NavSubItem[]
  adminOnly?: boolean
}

export const sidebarNavigation: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Customer",
    href: "/dashboard/customers",
    icon: Users,
    children: [
      { title: "Daftar Customer", href: "/dashboard/customers", icon: Users },
      { title: "Agen Voucher", href: "/dashboard/agents", icon: Store },
      { title: "Paket Customer", href: "/dashboard/packages", icon: Package },
      { title: "Cetak Masal", href: "/dashboard/vouchers/mass", icon: Ticket },
    ],
  },
  {
    title: "Keuangan",
    href: "/dashboard/payments",
    icon: Wallet,
    children: [
      { title: "Pembayaran", href: "/dashboard/payments", icon: CreditCard },
      { title: "Invoice", href: "/dashboard/invoices", icon: FileText },
    ],
  },
  {
    title: "Jaringan",
    href: "/dashboard/jaringan",
    icon: Network,
    children: [
      { title: "MikroTik", href: "/dashboard/jaringan/mikrotik", icon: Router },
      { title: "Starlink", href: "/dashboard/jaringan/starlink", icon: Satellite },
    ],
  },
  {
    title: "Laporan",
    href: "/dashboard/laporan",
    icon: BarChart3,
    children: [
      { title: "Pendapatan", href: "/dashboard/laporan", icon: TrendingUp },
      { title: "Log Voucher", href: "/dashboard/log-voucher", icon: ClipboardList },
    ],
  },
  {
    title: "Komunikasi",
    href: "/dashboard/komunikasi",
    icon: MessageSquare,
  },
  {
    title: "Sistem",
    href: "/dashboard/sistem",
    icon: Settings,
    children: [
      { title: "Pengaturan", href: "/dashboard/sistem/pengaturan", icon: Sliders },
      { title: "Log Aktivitas", href: "/dashboard/sistem/log", icon: ClipboardList, adminOnly: true },
      { title: "Manajemen User", href: "/dashboard/sistem/users", icon: UserCog, adminOnly: true },
    ],
  },
]
