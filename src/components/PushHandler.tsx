'use client'
// src/components/PushHandler.tsx — Maneja la suscripción a Web Push nativo e invalidación de caché PWA

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { subscribeToPush } from '@/lib/push'
import { RefreshCw, X } from 'lucide-react'

const CURRENT_VERSION = 'v10'

export default function PushHandler() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [showIOSPrompt, setShowIOSPrompt] = useState(false)

  const applyUpdate = () => {
    if (typeof caches !== 'undefined') {
      caches.keys().then((names) => Promise.all(names.map(name => caches.delete(name))))
        .then(() => window.location.reload())
    } else {
      window.location.reload()
    }
  }

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

    // 1.2. Limpieza de caché periódica (cada 8 horas) para evitar acumulación de recursos obsoletos
    const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000
    const now = Date.now()
    const lastCleanStr = localStorage.getItem('last_cache_clean')
    const lastClean = lastCleanStr ? parseInt(lastCleanStr, 10) : 0

    if (!lastClean || (now - lastClean > EIGHT_HOURS_MS)) {
      console.log('[PushHandler] Limpieza de caché periódica ejecutada (cada 8h)...')
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
                  console.log('[PushHandler] Nueva versión de Service Worker lista. Mostrando banner de actualización...')
                  setUpdateAvailable(true)
                }
              }
            }
          }
        }
      }).catch((err) => {
        console.error('[PushHandler] Error al registrar Service Worker:', err)
      })
    }

    // 3. Detección específica de iOS (Safari) y modo Standalone (PWA)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && (navigator as any).standalone === true)

    if (isIOS && !isStandalone) {
      console.warn('[PushHandler] ⚠️ iOS en navegador normal detectado. Requiere instalación PWA para notificaciones.')
      // Mostrar banner de instrucción PWA para iOS y abortar el intento de suscripción silenciosa
      const hasDismissedIOS = sessionStorage.getItem('dismissed_ios_prompt')
      if (!hasDismissedIOS) {
        setShowIOSPrompt(true)
      }
      return
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

  if (!updateAvailable && !showIOSPrompt) return null

  return (
    <>
      {updateAvailable && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-fade-in px-4 w-full max-w-sm">
          <div className="bg-[#0D1B2E] border border-blue-500/30 shadow-2xl shadow-blue-900/20 rounded-2xl p-4 flex items-center gap-4">
            <div className="bg-blue-500/10 p-2 rounded-full">
              <RefreshCw size={20} className="text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white mb-0.5">Actualización disponible</p>
              <p className="text-xs text-gray-400">Hay una nueva versión de la aplicación lista para usarse.</p>
            </div>
            <button
              onClick={applyUpdate}
              className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors whitespace-nowrap"
            >
              Refrescar
            </button>
            <button 
              onClick={() => setUpdateAvailable(false)}
              className="text-gray-500 hover:text-white p-1"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {showIOSPrompt && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-fade-in px-4 w-full max-w-sm">
          <div className="bg-[#0D1B2E] border border-blue-500/30 shadow-2xl shadow-blue-900/20 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <p className="text-sm font-bold text-white mb-1">Activa las Notificaciones 📲</p>
              <button 
                onClick={() => {
                  setShowIOSPrompt(false)
                  sessionStorage.setItem('dismissed_ios_prompt', 'true')
                }} 
                className="text-gray-500 hover:text-white p-1 -mr-2 -mt-2"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-gray-300">
              En iPhone, las notificaciones solo funcionan si instalas la app en tu pantalla de inicio.
            </p>
            <p className="text-[11px] text-blue-400 font-medium bg-blue-500/10 p-2.5 rounded-lg border border-blue-500/20 leading-relaxed">
              Toca el botón <span className="font-bold inline-block mx-1">Compartir <span className="text-sm align-middle">📤</span></span> y luego selecciona <span className="font-bold text-white">"Agregar a pantalla de inicio"</span> para activarlas.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
