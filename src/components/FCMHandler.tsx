'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'

export default function FCMHandler() {
  const [permissionStatus, setPermissionStatus] = useState<string>('default')

  useEffect(() => {
    if (typeof window === 'undefined') return

    console.log('🔔 [FCMHandler] Componente montado. Verificando soporte de notificaciones push...')

    // 1. Verificar soporte básico en el navegador
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('⚠️ [FCMHandler] Este navegador NO soporta notificaciones push PWA.')
      return
    }

    console.log('🔔 [FCMHandler] Navegador soporta ServiceWorker y PushManager. Estado de permiso actual:', Notification.permission)
    setPermissionStatus(Notification.permission)

    let isSubscribed = false

    // 2. Suscribirse a cambios de autenticación en Supabase
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(async (event, session) => {
      console.log(`🔔 [FCMHandler] Cambio de estado auth detectado: ${event}. Sesión activa:`, !!session)
      if (session?.user && !isSubscribed) {
        console.log(`🔔 [FCMHandler] Usuario autenticado (ID: ${session.user.id}). Iniciando inicialización FCM...`)
        isSubscribed = true
        await initFCM(session.user.id)
      } else if (!session?.user) {
        console.log('🔔 [FCMHandler] Sesión inactiva o cerrada. Reiniciando bandera de suscripción.')
        isSubscribed = false
      }
    })

    // 3. Ejecutar inicialización si ya está logueado al montar
    async function checkCurrentUser() {
      console.log('🔔 [FCMHandler] Verificando si el usuario ya tiene sesión activa al montar...')
      const { data: { user } } = await supabaseBrowser.auth.getUser()
      if (user && !isSubscribed) {
        console.log(`🔔 [FCMHandler] Sesión activa encontrada para usuario: ${user.id}. Inicializando FCM...`)
        isSubscribed = true
        await initFCM(user.id)
      } else if (!user) {
        console.log('🔔 [FCMHandler] No hay sesión activa al montar.')
      }
    }
    checkCurrentUser()

    return () => {
      console.log('🔔 [FCMHandler] Desmontando componente y desuscribiendo listener de autenticación.')
      subscription.unsubscribe()
    }
  }, [])

  async function initFCM(userId: string) {
    console.log(`🚀 [FCMHandler:initFCM] Iniciando flujo FCM para el usuario: ${userId}`)
    try {
      // Cargar Firebase dinámicamente en el cliente
      console.log('🔔 [FCMHandler:initFCM] Importando librerías de Firebase dinámicamente...')
      const { initializeApp, getApps } = await import('firebase/app')
      const { getMessaging, getToken, onMessage } = await import('firebase/messaging')

      const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      }

      console.log('🔔 [FCMHandler:initFCM] Configuración de Firebase leída:', {
        apiKey: firebaseConfig.apiKey ? 'Configurado (OK)' : 'FALTANTE ❌',
        projectId: firebaseConfig.projectId ? 'Configurado (OK)' : 'FALTANTE ❌',
        messagingSenderId: firebaseConfig.messagingSenderId ? 'Configurado (OK)' : 'FALTANTE ❌',
        appId: firebaseConfig.appId ? 'Configurado (OK)' : 'FALTANTE ❌',
      })

      if (!firebaseConfig.apiKey || !firebaseConfig.messagingSenderId) {
        console.warn('⚠️ [FCMHandler:initFCM] FCM desactivado: faltan variables de entorno NEXT_PUBLIC_FIREBASE_* en el cliente.')
        return
      }

      // Inicializar app si no existe
      console.log('🔔 [FCMHandler:initFCM] Inicializando app Firebase...')
      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
      const messaging = getMessaging(app)
      console.log('🔔 [FCMHandler:initFCM] App Firebase y Messaging inicializados correctamente.')

      // Solicitar permiso si no está otorgado
      let permission = Notification.permission
      console.log(`🔔 [FCMHandler:initFCM] Permiso de notificaciones actual: ${permission}`)
      if (permission === 'default') {
        console.log('🔔 [FCMHandler:initFCM] Solicitando permiso de notificaciones al usuario...')
        permission = await Notification.requestPermission()
        console.log(`🔔 [FCMHandler:initFCM] El usuario respondió a la solicitud de permiso: ${permission}`)
        setPermissionStatus(permission)
      }

      if (permission !== 'granted') {
        console.warn(`⚠️ [FCMHandler:initFCM] Permiso de notificaciones NO otorgado (${permission}). Abortando registro de token.`)
        return
      }

      // Configurar parámetros para pasar al Service Worker de manera dinámica
      const queryParams = new URLSearchParams({
        apiKey: firebaseConfig.apiKey || '',
        authDomain: firebaseConfig.authDomain || '',
        projectId: firebaseConfig.projectId || '',
        storageBucket: firebaseConfig.storageBucket || '',
        messagingSenderId: firebaseConfig.messagingSenderId || '',
        appId: firebaseConfig.appId || '',
      }).toString()

      // Registrar el Service Worker pasándole la configuración
      console.log('🔔 [FCMHandler:initFCM] Registrando Service Worker `/firebase-messaging-sw.js`...')
      const swRegistration = await navigator.serviceWorker.register(
        `/firebase-messaging-sw.js?${queryParams}`
      )
      console.log('🔔 [FCMHandler:initFCM] Service Worker registrado. Esperando a que esté listo y activo...')

      // Esperar explícitamente a que el Service Worker esté activo y listo
      await navigator.serviceWorker.ready
      console.log('✅ [FCMHandler:initFCM] Service Worker está activo y listo!')

      // Obtener el Token FCM
      console.log('🔔 [FCMHandler:initFCM] Obteniendo Token FCM de Firebase Cloud Messaging...')
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
      console.log(`🔔 [FCMHandler:initFCM] VAPID Key configurada:`, vapidKey ? 'Sí (OK)' : 'No configurada ⚠️')
      
      const token = await getToken(messaging, {
        serviceWorkerRegistration: swRegistration,
        vapidKey: vapidKey,
      })

      if (token) {
        console.log('✅ [FCMHandler:initFCM] Token FCM obtenido con éxito:', token)
        
        // Guardar/actualizar el token en la tabla fcm_tokens de Supabase
        console.log('🔔 [FCMHandler:initFCM] Guardando/actualizando token en la tabla fcm_tokens de Supabase...')
        const { data, error } = await supabaseBrowser
          .from('fcm_tokens')
          .upsert({
            user_id: userId,
            token: token
          }, { onConflict: 'token' })
          .select()

        if (error) {
          console.error('❌ [FCMHandler:initFCM] ERROR al guardar el token FCM en Supabase:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
          })
        } else {
          console.log('✅ [FCMHandler:initFCM] Token FCM guardado correctamente en la base de datos de Supabase. Registro guardado:', data)
        }
      } else {
        console.warn('⚠️ [FCMHandler:initFCM] No se pudo generar el token FCM. El token es nulo o indefinido.')
      }

      // Escuchar mensajes en primer plano (foreground)
      console.log('🔔 [FCMHandler:initFCM] Configurando listener para recibir mensajes en primer plano (foreground)...')
      onMessage(messaging, (payload) => {
        console.log('🔔 [FCMHandler:onMessage] Notificación recibida en primer plano (foreground):', payload)

        // Mostrar notificación del navegador
        if (Notification.permission === 'granted') {
          const title = payload.data?.title || payload.notification?.title || "Área Mecánica INACAP"
          const options = {
            body: payload.data?.body || payload.notification?.body || "",
            icon: '/next.svg',
            badge: '/next.svg',
            data: {
              url: payload.data?.url || '/'
            }
          }
          
          console.log('🔔 [FCMHandler:onMessage] Mostrando notificación nativa en primer plano:', title, options)
          const notification = new Notification(title, options)
          
          notification.onclick = (e) => {
            e.preventDefault()
            const redirectUrl = payload.data?.url || '/'
            console.log('🔔 [FCMHandler:onMessage] Click en notificación en primer plano. Redirigiendo a:', redirectUrl)
            window.focus()
            window.location.href = redirectUrl
            notification.close()
          }
        } else {
          console.warn('⚠️ [FCMHandler:onMessage] Se recibió un mensaje pero el permiso de notificaciones no es granted.')
        }
      })

    } catch (error: any) {
      console.error('❌ [FCMHandler:initFCM] EXCEPCIÓN al inicializar notificaciones FCM:', {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
        errorRaw: error
      })
      
      try {
        console.error('❌ [FCMHandler:initFCM] Error completo (JSON.stringify):', JSON.stringify(error))
      } catch (jsonErr) {
        console.error('❌ [FCMHandler:initFCM] No se pudo hacer JSON.stringify del error:', jsonErr)
      }

      // Los objetos Error nativos y de Firebase a veces devuelven {} en JSON.stringify.
      // Extraemos todas las propiedades del objeto (incluyendo no enumerables) para asegurar visualización:
      try {
        const errorDetails: Record<string, any> = {}
        Object.getOwnPropertyNames(error).forEach((key) => {
          errorDetails[key] = error[key]
        })
        console.error('📋 [FCMHandler:initFCM] Detalles y propiedades del error (completo):', errorDetails)
      } catch (propErr) {
        console.error('❌ [FCMHandler:initFCM] Falló extracción de propiedades del error:', propErr)
      }
    }
  }

  return null
}
