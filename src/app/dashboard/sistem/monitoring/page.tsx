import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function MonitoringSistemPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Monitoring Sistem</h1>
        <p className="text-muted-foreground mt-1">Pantau status server dan layanan terkait aplikasi.</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Status Layanan</CardTitle>
          <CardDescription>Halaman ini sedang dalam tahap pengembangan.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Fitur untuk melihat metrik CPU, Memory, Uptime Database Supabase, dan latensi API akan disediakan di halaman ini pada pembaruan mendatang.</p>
        </CardContent>
      </Card>
    </div>
  )
}
