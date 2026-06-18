'use client'
// src/components/PushHandler.tsx — Maneja la suscripción a Web Push nativo (sin Firebase)

import { useEffect } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { subscribeToPush } from '@/lib/push'

export default function PushHandler() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    console.log('[PushHandler] Componente montado. Verificando soporte de notificaciones push...')

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('[PushHandler] ⚠️ Este navegador no soporta notificaciones push PWA')
      return
    }

    let isSubscribed = false

    // Suscribirse a cambios de autenticación en Supabase
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(async (event, session) => {
      console.log(`[PushHandler] Cambio de estado auth: ${event}. Sesión activa:`, !!session)
      if (session?.user && !isSubscribed) {
        console.log(`[PushHandler] Usuario autenticado (${session.user.id}). Iniciando suscripción push...`)
        isSubscribed = true
        await subscribeToPush(supabaseBrowser, session.user.id)
      } else if (!session?.user) {
        console.log('[PushHandler] Sesión cerrada.')
        isSubscribed = false
      }
    })

    // También ejecutar si ya hay sesión activa al montar el componente
    async function checkCurrentUser() {
      const { data: { user } } = await supabaseBrowser.auth.getUser()
      if (user && !isSubscribed) {
        console.log(`[PushHandler] Sesión activa encontrada (${user.id}). Suscribiendo...`)
        isSubscribed = true
        await subscribeToPush(supabaseBrowser, user.id)
      }
    }
    checkCurrentUser()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return null
}
