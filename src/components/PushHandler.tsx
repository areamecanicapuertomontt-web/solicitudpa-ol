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

    // 1.3. Limpieza diaria de sesión (Cerrar sesión al comenzar el día si hay sesión activa)
    const todayStr = new Date().toLocaleDateString('es-CL', { timeZone: 'America/Santiago' })
    const lastSessionDate = localStorage.getItem('last_session_date')

    if (lastSessionDate && lastSessionDate !== todayStr) {
      localStorage.setItem('last_session_date', todayStr)
      supabaseBrowser.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          console.log(`[PushHandler] Cambio de día detectado (Antes: ${lastSessionDate}, Hoy: ${todayStr}). Cerrando sesión activa para limpieza diaria...`)
          supabaseBrowser.auth.signOut().catch(() => {}).then(() => {
            window.location.href = '/login'
          })
        }
      })
    } else if (!lastSessionDate) {
      localStorage.setItem('last_session_date', todayStr)
    }

    // 1.2. Limpieza de caché periódica (cada 24 horas) para evitar acumulación de recursos obsoletos
    const ONE_DAY_MS = 24 * 60 * 60 * 1000
    const now = Date.now()
    const lastCleanStr = localStorage.getItem('last_cache_clean')
    const lastClean = lastCleanStr ? parseInt(lastCleanStr, 10) : 0

    if (!lastClean || (now - lastClean > ONE_DAY_MS)) {
      console.log('[PushHandler] Limpieza de caché periódica ejecutada (cada 24h)...')
      localStorage.setItem('last_cache_clean', now.toString())
      
      if (typeof caches !== 'undefined') {
        caches.keys().then((names) => {
          return Promise.all(names.map(name => caches.delete(name)))
        }).then(() => {
          console.log('[PushHandler] ✅ Cachés periódicas limpiadas de forma silenciosa')
        }).catch((err) => {
          console.error('[PushHandler] Error al limpiar caché periódica:', err)
        })
      }
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
