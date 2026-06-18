// supabase/functions/send-push/index.ts — Edge Function para enviar Web Push nativo

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@inacap.cl'

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_ids, title, body, url } = await req.json()

    if (!Array.isArray(user_ids) || user_ids.length === 0 || !title) {
      return new Response(
        JSON.stringify({ error: 'user_ids (array) y title son requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Obtener todas las suscripciones de estos usuarios
    const { data: subs, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .in('user_id', user_ids)

    if (error) throw error

    if (!subs || subs.length === 0) {
      console.log('[send-push] No hay suscripciones activas para los usuarios:', user_ids)
      return new Response(
        JSON.stringify({ enviados: 0, fallidos: 0, total: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const payload = JSON.stringify({
      title,
      body: body ?? '',
      url: url ?? '/',
    })

    const results = await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload,
          )
        } catch (err: any) {
          // Si el endpoint ya no es válido (410 = Gone, 404 = Not Found), limpiarlo de la BD
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            console.log(`[send-push] Eliminando suscripción expirada: ${sub.id}`)
            await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id)
          }
          throw err
        }
      }),
    )

    const enviados = results.filter((r) => r.status === 'fulfilled').length
    const fallidos = results.filter((r) => r.status === 'rejected').length

    console.log(`[send-push] Resultado: ${enviados} enviados, ${fallidos} fallidos de ${subs.length} total`)

    return new Response(
      JSON.stringify({ enviados, fallidos, total: subs.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[send-push] Error inesperado:', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
