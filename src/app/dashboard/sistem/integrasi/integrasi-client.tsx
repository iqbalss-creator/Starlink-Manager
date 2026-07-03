'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Setting } from '@/types'
import { saveSettings } from './actions'
import { Router, Satellite, MessageSquare, Save, Loader2, CheckCircle2 } from 'lucide-react'

export function IntegrasiClient({ initialSettings }: { initialSettings: Setting[] }) {
  const [settings, setSettings] = useState<Setting[]>(initialSettings)
  const [isLoading, setIsLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const getSettingValue = (key: string) => {
    return settings.find(s => s.key === key)?.value || ''
  }

  const handleChange = (key: string, value: string, description: string) => {
    setSettings(prev => {
      const exists = prev.find(s => s.key === key)
      if (exists) {
        return prev.map(s => s.key === key ? { ...s, value, description } : s)
      }
      return [...prev, { key, value, description }]
    })
  }

  const handleSave = async () => {
    setIsLoading(true)
    setSuccessMsg('')
    try {
      await saveSettings(settings)
      setSuccessMsg('Pengaturan berhasil disimpan!')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Integrasi</h1>
          <p className="text-muted-foreground mt-1">Konfigurasi API Starlink, MikroTik, dan WhatsApp.</p>
        </div>
        <Button onClick={handleSave} disabled={isLoading} className="gap-2 bg-[#00A76F] hover:bg-[#007867] text-white">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Simpan Perubahan
        </Button>
      </div>
      
      {successMsg && (
        <div className="bg-[#C8FAD6] text-[#007867] px-4 py-3 rounded-xl flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-5 h-5" />
          {successMsg}
        </div>
      )}

      <Tabs defaultValue="mikrotik" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6 bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl">
          <TabsTrigger value="mikrotik" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
            <Router className="w-4 h-4 mr-2" /> MikroTik
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
            <MessageSquare className="w-4 h-4 mr-2" /> WhatsApp
          </TabsTrigger>
          <TabsTrigger value="starlink" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
            <Satellite className="w-4 h-4 mr-2" /> Starlink
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mikrotik" className="space-y-4">
          <Card className="shadow-sm border-border/40">
            <CardHeader>
              <CardTitle className="text-lg">Kredensial MikroTik API</CardTitle>
              <CardDescription>Pengaturan koneksi untuk membaca dan menulis data ke router MikroTik Anda.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Host / IP Address</Label>
                <Input 
                  value={getSettingValue('mikrotik_host')} 
                  onChange={(e) => handleChange('mikrotik_host', e.target.value, 'IP Address MikroTik')}
                  placeholder="Contoh: 192.168.88.1" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input 
                    value={getSettingValue('mikrotik_user')} 
                    onChange={(e) => handleChange('mikrotik_user', e.target.value, 'Username admin MikroTik')}
                    placeholder="admin" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input 
                    type="password" 
                    value={getSettingValue('mikrotik_password')} 
                    onChange={(e) => handleChange('mikrotik_password', e.target.value, 'Password MikroTik')}
                    placeholder="••••••••" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>API Port</Label>
                <Input 
                  value={getSettingValue('mikrotik_port')} 
                  onChange={(e) => handleChange('mikrotik_port', e.target.value, 'Port API MikroTik')}
                  placeholder="8728" 
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp" className="space-y-4">
          <Card className="shadow-sm border-border/40">
            <CardHeader>
              <CardTitle className="text-lg">Konfigurasi WhatsApp Gateway</CardTitle>
              <CardDescription>Atur koneksi ke layanan pihak ketiga (Watzap, Fonnte, dll) untuk pengiriman notifikasi otomatis.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>API URL (Endpoint)</Label>
                <Input 
                  value={getSettingValue('wa_api_url')} 
                  onChange={(e) => handleChange('wa_api_url', e.target.value, 'URL Endpoint WhatsApp Gateway')}
                  placeholder="https://api.watzap.id/v1/send_message" 
                />
              </div>
              <div className="space-y-2">
                <Label>API Key / Token</Label>
                <Input 
                  type="password"
                  value={getSettingValue('wa_api_key')} 
                  onChange={(e) => handleChange('wa_api_key', e.target.value, 'Token Akses WA Gateway')}
                  placeholder="Masukkan API Key Anda" 
                />
              </div>
              <div className="space-y-2">
                <Label>Template Pesan Reminder (Tagihan Jatuh Tempo)</Label>
                <textarea 
                  className="w-full min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={getSettingValue('wa_template_reminder')} 
                  onChange={(e) => handleChange('wa_template_reminder', e.target.value, 'Template pesan reminder WA')}
                  placeholder="Halo {nama}, tagihan internet Anda sebesar {tagihan} akan jatuh tempo pada {tanggal}." 
                />
                <p className="text-xs text-muted-foreground mt-1">Variabel tersedia: <code className="bg-muted px-1 rounded">{'{nama}'}</code>, <code className="bg-muted px-1 rounded">{'{tagihan}'}</code>, <code className="bg-muted px-1 rounded">{'{tanggal}'}</code></p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="starlink" className="space-y-4">
          <Card className="shadow-sm border-border/40">
            <CardHeader>
              <CardTitle className="text-lg">Starlink Dish API</CardTitle>
              <CardDescription>Integrasikan piringan Starlink Anda untuk memantau konektivitas dan metrik jaringan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Dish IP Address (gRPC/HTTP)</Label>
                <Input 
                  value={getSettingValue('starlink_ip')} 
                  onChange={(e) => handleChange('starlink_ip', e.target.value, 'IP Address Dish Starlink')}
                  placeholder="192.168.100.1" 
                />
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 p-4 rounded-xl text-sm mt-4">
                Fitur polling metrik Starlink sedang dalam pengembangan aktif dan akan memanfaatkan IP Address ini di pembaruan selanjutnya.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
