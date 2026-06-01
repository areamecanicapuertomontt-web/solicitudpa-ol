'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseClient } from '@/lib/supabase-client'
import { ClipboardList, Settings, LogIn, LogOut, LayoutDashboard, User } from 'lucide-react'
import Link from 'next/link'

export default function HomeAuthButtons() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function getSession() {
      const { data: { user } } = await supabaseClient.auth.getUser()
      if (user) {
        const { data: perf } = await supabaseClient
          .from('perfiles')
          .select('*')
          .eq('id', user.id)
          .single()
        if (perf) {
          setProfile(perf)
        }
      }
      setLoading(false)
    }
    getSession()
  }, [])

  async function handleLogout() {
    await supabaseClient.auth.signOut()
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
          <Link href="/solicitud" className="btn-primary text-base w-full sm:w-auto">
            <ClipboardList size={18} />
            Nueva Solicitud
          </Link>
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
