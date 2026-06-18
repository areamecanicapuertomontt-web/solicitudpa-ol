'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'

export default function FCMHandler() {
  const [permissionStatus, setPermissionStatus] = useState<string>('default')

  useEffect(() => {
    if (typeof window === 'undefined') return

    // 1. Verificar soporte básico en el navegador
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Este navegador no soporta notificaciones push PWA.')
      return
    }

    setPermissionStatus(Notification.permission)

    let isSubscribed = false

    // 2. Suscribirse a cambios de autenticación en Supabase
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(async (event, session) => {
      if (session?.user && !isSubscribed) {
        isSubscribed = true
        await initFCM(session.user.id)
      } else if (!session?.user) {
        isSubscribed = false
      }
    })

    // 3. Ejecutar inicialización si ya está logueado al montar
    async function checkCurrentUser() {
      const { data: { user } } = await supabaseBrowser.auth.getUser()
      if (user && !isSubscribed) {
        isSubscribed = true
        await initFCM(user.id)
      }
    }
    checkCurrentUser()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function initFCM(userId: string) {
    try {
      // Cargar Firebase dinámicamente en el cliente
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

      if (!firebaseConfig.apiKey || !firebaseConfig.messagingSenderId) {
        console.warn('FCM desactivado: faltan variables de entorno NEXT_PUBLIC_FIREBASE_*')
        return
      }

      // Inicializar app si no existe
      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
      const messaging = getMessaging(app)

      // Solicitar permiso si no está otorgado
      let permission = Notification.permission
      if (permission === 'default') {
        permission = await Notification.requestPermission()
        setPermissionStatus(permission)
      }

      if (permission !== 'granted') {
        console.log('Permiso de notificaciones denegado o cerrado.')
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
      const swRegistration = await navigator.serviceWorker.register(
        `/firebase-messaging-sw.js?${queryParams}`
      )
      console.log('Service Worker FCM registrado con éxito.')

      // Obtener el Token FCM
      const token = await getToken(messaging, {
        serviceWorkerRegistration: swRegistration,
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      })

      if (token) {
        console.log('Token FCM obtenido:', token.slice(0, 10) + '...')
        
        // Guardar/actualizar el token en la tabla fcm_tokens de Supabase
        const { error } = await supabaseBrowser
          .from('fcm_tokens')
          .upsert({
            user_id: userId,
            token: token
          }, { onConflict: 'token' })

        if (error) {
          console.error('Error al guardar token FCM en Supabase:', error.message)
        } else {
          console.log('Token FCM guardado correctamente en base de datos.')
        }
      } else {
        console.warn('No se pudo generar el token FCM. Verifica los certificados Web Push.')
      }

      // Escuchar mensajes en primer plano (foreground)
      onMessage(messaging, (payload) => {
        console.log('Notificación recibida en primer plano:', payload)

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
          
          const notification = new Notification(title, options)
          
          notification.onclick = (e) => {
            e.preventDefault()
            const redirectUrl = payload.data?.url || '/'
            window.focus()
            window.location.href = redirectUrl
            notification.close()
          }
        }
      })

    } catch (error) {
      console.error('Error inicializando notificaciones FCM:', error)
    }
  }

  return null
}
