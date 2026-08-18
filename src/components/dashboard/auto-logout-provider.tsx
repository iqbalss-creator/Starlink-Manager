'use client'

import { useEffect, useRef, useState } from 'react'
import { logout } from '@/app/login/actions'

import { Clock } from 'lucide-react'

export function AutoLogoutTimer() {
  const [timeoutMinutes, setTimeoutMinutes] = useState<number>(0)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const lastActivityRef = useRef<number>(Date.now())

  // Load setting on mount and when settings change
  useEffect(() => {
    const loadSetting = () => {
      try {
        const stored = localStorage.getItem('starlink_app_settings')
        if (stored) {
          const settings = JSON.parse(stored)
          setTimeoutMinutes(settings.autoLogout !== undefined ? settings.autoLogout : 0)
        }
      } catch {}
    }

    loadSetting()
    window.addEventListener('storage', loadSetting)
    window.addEventListener('appSettingsChanged', loadSetting)
    
    return () => {
      window.removeEventListener('storage', loadSetting)
      window.removeEventListener('appSettingsChanged', loadSetting)
    }
  }, [])

  // Setup idle timer
  useEffect(() => {
    if (timeoutMinutes <= 0) {
      setTimeLeft(null)
      return
    }

    const maxIdleMs = timeoutMinutes * 60 * 1000
    lastActivityRef.current = Date.now()

    const checkIdle = async () => {
      const idleTime = Date.now() - lastActivityRef.current
      const remaining = maxIdleMs - idleTime

      if (remaining <= 0) {
        // Idle time exceeded
        clearInterval(interval) // Stop checking
        try {
          await logout()
        } catch (e) {
          // ignore Next.js redirect error
        }
        window.location.href = '/login'
      } else {
        setTimeLeft(Math.ceil(remaining / 1000))
      }
    }

    const interval = setInterval(checkIdle, 1000)
    checkIdle() // check immediately

    // Listeners for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    const handleUserActivity = () => {
      lastActivityRef.current = Date.now()
    }

    events.forEach(event => document.addEventListener(event, handleUserActivity, { passive: true }))

    return () => {
      clearInterval(interval)
      events.forEach(event => document.removeEventListener(event, handleUserActivity))
    }
  }, [timeoutMinutes])

  if (timeoutMinutes <= 0 || timeLeft === null) return null

  // Format timeLeft (seconds) into MM:SS
  const m = Math.floor(timeLeft / 60)
  const s = timeLeft % 60
  const timeString = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  
  // Show red warning if less than 60 seconds
  const isWarning = timeLeft <= 60

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border shadow-sm transition-colors ${isWarning ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/50 dark:border-red-900' : 'bg-white text-slate-600 border-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300'}`}>
      <Clock className="w-4 h-4" />
      <span>{timeString}</span>
    </div>
  )
}
