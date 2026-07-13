"use client";

import React, { useState, useEffect, useTransition } from "react";
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
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [appName, setAppName] = useState("Allstar Manager");
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

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setIsLoading(true);
    setError("");
    try {
      const res = await login(formData);
      if (res?.error) {
        setError(res.error);
        setIsLoading(false);
      } else {
        startTransition(() => {
          router.push("/dashboard");
          router.refresh();
        });
      }
    } catch (e: any) {
      console.error("Login catch error:", e);
      setError("Error: " + (e.message || String(e)));
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Full Page Loader Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-sm">
          <div className="flex flex-col items-center p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-xl">
            <Loader2 className="w-10 h-10 animate-spin text-[#00A76F] mb-4" />
            <p className="font-medium text-slate-900 dark:text-white">Sedang masuk...</p>
            <p className="text-sm text-slate-500 mt-1">Mohon tunggu sebentar</p>
          </div>
        </div>
      )}

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
          <img src="/icon.png" alt="Allstar Manager Logo" className="h-28 md:h-32 mb-6 object-contain drop-shadow-2xl" />
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
          <form onSubmit={onSubmit} className="space-y-4">
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
                  disabled={isLoading}
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
                  disabled={isLoading}
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
