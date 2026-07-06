// src/hooks/useAuthProfile.ts
// Hook compartido para cargar el perfil del usuario autenticado.
// Usado por panel/page.tsx y admin/page.tsx.
// solicitud/page.tsx tiene variantes específicas (rellena formulario RHF) y se mantiene independiente.

'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'

export interface AuthProfile {
  id: string
  email: string
  nombre: string
  rol: 'ADMIN' | 'DOCENTE' | 'PANOL' | 'ALUMNO' | string
  rut?: string
  jornada?: string
  seccion?: string
  [key: string]: unknown
}

interface UseAuthProfileOptions {
  /** Roles permitidos. Si se define y el perfil no coincide, redirige a /login. */
  allowedRoles?: string[]
  /** Rol por defecto para el fallback con user_metadata. Por defecto: 'PANOL' */
  fallbackRole?: string
  /** Si true, recarga la ventana silenciosamente una vez si el perfil no cargó en 4s (útil en PWA móvil). Por defecto: false */
  autoReload?: boolean
  /** Clave de sessionStorage para el auto-reload. Requerida si autoReload=true. */
  autoReloadKey?: string
  /** Timeout de seguridad en ms antes de redirigir a /login si el perfil no cargó. Por defecto: 60000 */
  safetyTimeoutMs?: number
}

interface UseAuthProfileReturn {
  profile: AuthProfile | null
  loadingProfile: boolean
}

export function useAuthProfile({
  allowedRoles,
  fallbackRole = 'PANOL',
  autoReload = false,
  autoReloadKey,
  safetyTimeoutMs = 60000,
}: UseAuthProfileOptions = {}): UseAuthProfileReturn {
  const router = useRouter()
  const [profile, setProfile] = useState<AuthProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const profileLoadedRef = useRef(false)

  useEffect(() => {
    let active = true

    async function fetchProfile(user: { id: string; email?: string; user_metadata?: Record<string, unknown> }) {
      if (!user) return

      const meta = user.user_metadata || {}
      const metaRol = (meta.rol as string) || fallbackRole

      // Gate de rol optimista con el rol del JWT (firmado por Supabase, no manipulable).
      if (allowedRoles && !allowedRoles.includes(metaRol)) {
        router.replace('/login')
        return
      }

      // Perfil INSTANTÁNEO desde metadata del JWT (sin red) → UI usable de inmediato,
      // aunque Supabase esté frío (cold start). Nunca esperamos a la BD para pintar.
      const fallbackPerf: AuthProfile = {
        id: user.id,
        email: user.email ?? '',
        nombre: (meta.nombre as string) || 'Usuario Inacap',
        rol: metaRol,
        rut: (meta.rut as string) || '',
        jornada: (meta.jornada as string) || 'D',
        seccion: (meta.seccion as string) || '',
      }
      if (!active) return
      setProfile(fallbackPerf)
      setLoadingProfile(false)
      profileLoadedRef.current = true

      // EN SEGUNDO PLANO: perfil real desde la BD; refresca si llega. No bloquea la UI.
      try {
        const { data, error } = await supabaseBrowser
          .from('perfiles')
          .select('*')
          .eq('id', user.id)
          .single()
        if (!active) return
        if (!error && data) {
          if (allowedRoles && !allowedRoles.includes(data.rol)) {
            router.replace('/login')
            return
          }
          setProfile(data)
        }
      } catch {
        // Silencioso — el perfil desde metadata ya está activo.
      }
    }

    // Suscripción a cambios de sesión (login / logout en tiempo real)
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await fetchProfile(session.user)
        } else if (event === 'SIGNED_OUT') {
          router.replace('/login')
        }
      }
    )

    // Carga inicial: getSession() es LOCAL e instantáneo (no hace red) y no compite
    // por el lock de auth como getUser(). Suficiente para resolver el usuario actual.
    supabaseBrowser.auth.getSession().then(({ data: { session } }) => {
      if (!active) return
      if (session?.user) {
        fetchProfile(session.user)
      } else {
        // Puede ser que el token aún no se haya hidratado. Esperar 1.5s y reintentar.
        setTimeout(() => {
          if (!active) return
          supabaseBrowser.auth.getSession().then(({ data: { session: session2 } }) => {
            if (session2?.user) {
              fetchProfile(session2.user)
            } else {
              router.replace('/login')
            }
          })
        }, 1500)
      }
    })

    // Auto-reload silencioso para desbloquear PWA en móviles (solo si se activa)
    let autoReloadTimer: ReturnType<typeof setTimeout> | null = null
    if (autoReload && autoReloadKey) {
      autoReloadTimer = setTimeout(() => {
        if (active && !profileLoadedRef.current) {
          const hasReloaded = sessionStorage.getItem(autoReloadKey)
          if (!hasReloaded) {
            sessionStorage.setItem(autoReloadKey, 'true')
            window.location.reload()
          }
        }
      }, 4000)
    }

    // Safety timeout: si el perfil nunca cargó, redirige a /login
    const safetyTimeout = setTimeout(() => {
      if (active && !profileLoadedRef.current) {
        router.replace('/login')
      }
    }, safetyTimeoutMs)

    return () => {
      active = false
      subscription.unsubscribe()
      clearTimeout(safetyTimeout)
      if (autoReloadTimer) clearTimeout(autoReloadTimer)
    }
  }, [router, allowedRoles, fallbackRole, autoReload, autoReloadKey, safetyTimeoutMs])

  return { profile, loadingProfile }
}
