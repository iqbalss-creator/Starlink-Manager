"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { login } from "./actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, User, AlertCircle, Satellite } from "lucide-react";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [appName, setAppName] = useState("Starlink Manager");
  const [appLogo, setAppLogo] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("starlink_app_settings");
      if (stored) {
        const settings = JSON.parse(stored);
        if (settings.appName) setAppName(settings.appName);
        if (settings.appLogo) setAppLogo(settings.appLogo);
      }
    } catch {}
  }, []);

  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError("");
    try {
      const res = await login(formData);
      if (res?.error) {
        setError(res.error);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (e: any) {
      console.error("Login catch error:", e);
      setError("Error: " + (e.message || String(e)));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Ornaments */}
      {appLogo && (
        <div 
          className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: `url(${appLogo})`,
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            transform: 'scale(1.5)'
          }}
        />
      )}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#00A76F]/20 blur-[100px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/20 blur-[100px] pointer-events-none z-0" />

      <div className="mb-8 text-center relative z-10 flex flex-col items-center">
        {appLogo ? (
          <img src={appLogo} alt="Logo" className="h-28 md:h-32 mb-6 object-contain drop-shadow-2xl" />
        ) : (
          <div className="w-16 h-16 bg-[#00A76F] rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-[#00A76F]/20">
            <Satellite className="w-8 h-8 text-white" />
          </div>
        )}
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
          {appName}
        </h1>
        <p className="text-muted-foreground">
          Silakan login untuk masuk ke Dashboard
        </p>
      </div>

      <Card className="w-full max-w-md shadow-2xl border-slate-200 dark:border-slate-800 relative z-10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Login</CardTitle>
          <CardDescription className="text-center">
            Masukkan username dan password Anda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="admin"
                  required
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  className="pl-9"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#00A76F] hover:bg-[#007867] text-white mt-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {isLoading ? "Masuk..." : "Masuk"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground mt-8">
        Gunakan akun bawaan (admin / admin) jika belum pernah mengubah.
      </p>
    </div>
  );
}
