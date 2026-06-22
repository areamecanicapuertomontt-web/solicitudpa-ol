'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { ClipboardList, Settings, LogIn, LogOut, LayoutDashboard, User, Package, Plus } from 'lucide-react'
import Link from 'next/link'

export default function HomeAuthButtons() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function getSession() {
      try {
        // Limit session fetch to 3 seconds to avoid infinite loading on offline local devices
        const userPromise = supabaseBrowser.auth.getUser()

        const autoReloadTimer = setTimeout(() => {
          const hasReloaded = sessionStorage.getItem('reloaded_home')
          if (!hasReloaded) {
            sessionStorage.setItem('reloaded_home', 'true')
            window.location.reload()
          }
        }, 4000)
        const timeoutPromise = new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 60000)
        )
        const { data: { user } } = await Promise.race([userPromise, timeoutPromise])
        clearTimeout(autoReloadTimer)
        if (user) {
          const { data: perf } = await supabaseBrowser
            .from('perfiles')
            .select('*')
            .eq('id', user.id)
            .single()
          if (perf) {
            setProfile(perf)
          }
        }
      } catch (err) {
        console.error('Error fetching session in HomeAuthButtons:', err)
      } finally {
        setLoading(false)
      }
    }
    getSession()
  }, [])

  async function handleLogout() {
    try {
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration()
        if (reg) {
          const sub = await reg.pushManager.getSubscription()
          if (sub) {
            await supabaseBrowser.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
          }
        }
      }
    } catch (e) {
      console.error('Error al limpiar suscripción push en logout:', e)
    }

    try {
      await supabaseBrowser.auth.signOut()
    } catch (err) {
      console.error('Error al cerrar sesión:', err)
    }
    setProfile(null)
    window.location.href = '/login'
  }

  if (loading) {
    return (
      <div className="h-12 w-48 rounded-xl animate-pulse bg-white/5" />
    )
  }

  // Si no está autenticado
  if (!profile) {
    return (
      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
        <Link href="/login" className="btn-primary text-base w-full sm:w-auto">
          <LogIn size={18} />
          Iniciar Sesión
        </Link>
      </div>
    )
  }

  // Si está autenticado
  return (
    <div className="space-y-4">
      {/* Indicador de sesión activa */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/5 bg-white/2">
        <User size={14} className="text-red-400" />
        <span className="text-xs font-semibold text-gray-300">
          Sesión: {profile.nombre} ({profile.rol})
        </span>
      </div>

      <div className="flex flex-wrap gap-3">
        {profile.rol === 'ALUMNO' ? (
          <>
            <Link href="/solicitud?tab=form" className="btn-primary text-base w-full sm:w-auto flex-1">
              <Plus size={18} />
              Nueva Solicitud
            </Link>
            <Link href="/solicitud?tab=mis-solicitudes" className="btn-secondary text-base w-full sm:w-auto flex-1">
              <Package size={18} />
              Mis Solicitudes
            </Link>
          </>
        ) : (
          <>
            <Link href="/panel" className="btn-success text-base w-full sm:w-auto">
              <LayoutDashboard size={18} />
              Ver Panel Pañol
            </Link>
            {(profile.rol === 'PANOL' || profile.rol === 'ADMIN') && (
              <Link href="/admin" className="btn-secondary text-base w-full sm:w-auto">
                <Settings size={18} />
                Administración
              </Link>
            )}
          </>
        )}

        <button
          onClick={handleLogout}
          className="btn-secondary text-base w-full sm:w-auto hover:!text-red-400"
        >
          <LogOut size={18} />
          Cerrar Sesión
        </button>
      </div>
    </div>
  )
}
