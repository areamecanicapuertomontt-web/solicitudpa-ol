// src/lib/push.ts — Helper cliente para suscribirse a Web Push nativo (sin Firebase)

import type { SupabaseClient } from '@supabase/supabase-js'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

export async function subscribeToPush(
  supabase: SupabaseClient,
  userId: string
): Promise<PushSubscription | null> {
  if (typeof window === 'undefined') return null

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[push] Este navegador no soporta notificaciones push')
    return null
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidPublicKey) {
    console.warn('[push] NEXT_PUBLIC_VAPID_PUBLIC_KEY no configurada — notificaciones push desactivadas')
    return null
  }

  console.log('[push] Solicitando permiso de notificaciones...')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    console.warn('[push] Permiso de notificaciones no concedido:', permission)
    return null
  }

  console.log('[push] Registrando Service Worker /sw.js...')
  const registration = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready
  console.log('[push] ✅ Service Worker activo y listo')

  let subscription = await registration.pushManager.getSubscription()

  if (!subscription) {
    console.log('[push] Creando nueva suscripción Push...')
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
    })
    console.log('[push] ✅ Suscripción Push creada')
  } else {
    console.log('[push] ✅ Suscripción Push ya existente reutilizada')
  }

  const sub = subscription.toJSON()
  if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    console.error('[push] ❌ La suscripción Push generada es inválida o incompleta', sub)
    return null
  }

  // Limpiar suscripciones antiguas del mismo usuario con endpoint distinto al actual.
  // Esto previene que el usuario reciba notificaciones duplicadas si se suscribió
  // en múltiples sesiones o dispositivos de prueba anteriores.
  const { error: deleteErr } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .neq('endpoint', sub.endpoint)

  if (deleteErr) {
    // No es crítico — continuamos igual
    console.warn('[push] No se pudieron limpiar suscripciones antiguas:', deleteErr.message)
  } else {
    console.log('[push] ✅ Suscripciones antiguas del usuario limpiadas')
  }

  console.log('[push] Guardando suscripción en Supabase (tabla push_subscriptions)...')
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
    { onConflict: 'endpoint' }
  )

  if (error) {
    console.error('[push] ❌ Error guardando suscripción en Supabase:', error)
    return null
  }

  console.log('[push] ✅ Suscripción guardada correctamente en Supabase')
  return subscription
}
