import { createClient } from '@supabase/supabase-js'
import { createServerClient } from './supabase-server'

/**
 * Envía una notificación push a uno o más usuarios usando Web Push nativo
 * a través de la Supabase Edge Function "send-push".
 */
export async function enviarPushNotificacion(
  userIds: string | string[],
  title: string,
  body: string,
  url?: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  const ids = Array.isArray(userIds) ? userIds : [userIds]
  if (ids.length === 0) return { success: true, count: 0 }

  const supabase = createServerClient()

  // Verificar que al menos existe una suscripción registrada para estos usuarios
  const { data: subs, error: subErr } = await supabase
    .from('push_subscriptions')
    .select('user_id')
    .in('user_id', ids)
    .limit(1)

  if (subErr) {
    console.error('[push-server] Error verificando suscripciones en Supabase:', subErr.message)
    return { success: false, error: subErr.message }
  }

  if (!subs || subs.length === 0) {
    console.log('[push-server] No hay suscripciones Web Push activas registradas para los usuarios:', ids)
    return { success: true, count: 0 }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[push-server] Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
    return { success: false, error: 'Variables de entorno de Supabase no configuradas' }
  }

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        user_ids: ids,
        title,
        body,
        url: url || '/',
      }),
      signal: AbortSignal.timeout(4000), // Timeout estricto de 4s
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error(`[push-server] Edge Function respondió con ${res.status}:`, errText)
      return { success: false, error: errText }
    }

    const result = await res.json()
    console.log(`[push-server] ✅ Notificaciones enviadas: ${result.enviados}/${result.total} exitosas`)

    try {
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
      await supabaseAdmin.from('historial_notificaciones').insert(
        ids.map(uid => ({
          user_id: uid,
          titulo: title,
          mensaje: body,
          url: url || '/',
          leido: false
        }))
      )
      console.log(`[push-server] ✅ Historial de notificaciones registrado para ${ids.length} usuarios`)
    } catch (dbErr) {
      console.error('[push-server] Error al guardar historial en BD:', dbErr)
    }

    return { success: true, count: result.enviados }
  } catch (err: any) {
    console.error('[push-server] Error llamando a la Edge Function send-push:', err)
    return { success: false, error: err.message }
  }
}
