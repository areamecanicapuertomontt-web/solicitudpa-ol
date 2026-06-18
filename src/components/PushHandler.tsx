'use client'
// src/components/PushHandler.tsx — Maneja la suscripción a Web Push nativo (sin Firebase) e invalidación de caché PWA

import { useEffect } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { subscribeToPush } from '@/lib/push'

const CURRENT_VERSION = '1.2.0'

export default function PushHandler() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    console.log('[PushHandler] Componente montado. Verificando versión y soporte PWA...')

    // 1. Detección e invalidación de caché por versión (limpieza proactiva sin cerrar sesión)
    const storedVersion = localStorage.getItem('app_version')
    if (storedVersion && storedVersion !== CURRENT_VERSION) {
      console.log(`[PushHandler] Nueva versión detectada (${CURRENT_VERSION}). Limpiando caches y reiniciando SW...`)
      localStorage.setItem('app_version', CURRENT_VERSION)
      
      if (typeof caches !== 'undefined') {
        caches.keys().then((names) => {
          return Promise.all(names.map(name => caches.delete(name)))
        }).then(() => {
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then((regs) => {
              return Promise.all(regs.map(r => r.unregister()))
            }).then(() => {
              window.location.reload()
            })
          } else {
            window.location.reload()
          }
        })
      } else {
        window.location.reload()
      }
      return
    } else if (!storedVersion) {
      localStorage.setItem('app_version', CURRENT_VERSION)
    }

    // 2. Registro incondicional de Service Worker para soporte PWA completo
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('[PushHandler] Service Worker registrado para PWA con éxito:', reg.scope)
        
        // Escuchar si hay actualizaciones disponibles en el SW
        reg.onupdatefound = () => {
          const installingWorker = reg.installing
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  console.log('[PushHandler] Nueva versión de Service Worker lista. Actualizando caché...')
                  if (typeof caches !== 'undefined') {
                    caches.keys().then((names) => {
                      return Promise.all(names.map(name => caches.delete(name)))
                    }).then(() => {
                      window.location.reload()
                    })
                  } else {
                    window.location.reload()
                  }
                }
              }
            }
          }
        }
      }).catch((err) => {
        console.error('[PushHandler] Error al registrar Service Worker:', err)
      })
    }

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
