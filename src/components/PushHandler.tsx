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

    let lastSubscribedUserId: string | null = null

    // Suscribirse a cambios de autenticación en Supabase
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(async (event, session) => {
      console.log(`[PushHandler] Cambio de estado auth: ${event}. Sesión activa:`, !!session)
      const currentId = session?.user?.id
      if (currentId && currentId !== lastSubscribedUserId) {
        console.log(`[PushHandler] Usuario autenticado (${currentId}). Iniciando suscripción push...`)
        lastSubscribedUserId = currentId
        await subscribeToPush(supabaseBrowser, currentId)
      } else if (!currentId) {
        console.log('[PushHandler] Sesión cerrada.')
        lastSubscribedUserId = null
      }
    })

    // También ejecutar si ya hay sesión activa al montar el componente
    async function checkCurrentUser() {
      const { data: { user } } = await supabaseBrowser.auth.getUser()
      if (user && user.id !== lastSubscribedUserId) {
        console.log(`[PushHandler] Sesión activa encontrada (${user.id}). Suscribiendo...`)
        lastSubscribedUserId = user.id
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
