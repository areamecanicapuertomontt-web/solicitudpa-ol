import { getApps, initializeApp, cert } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'
import { createServerClient } from './supabase-server'

// Inicializar Firebase Admin SDK si no se ha hecho aún
try {
  const apps = getApps()
  if (apps.length === 0) {
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL
    // Reemplazar saltos de línea literales en la private key
    const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY)?.replace(/\\n/g, '\n')

    if (projectId && clientEmail && privateKey) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      })
      console.log('Firebase Admin SDK inicializado correctamente.')
    } else {
      console.warn('Firebase Admin SDK no inicializado: faltan variables de entorno FIREBASE_*')
    }
  }
} catch (err) {
  console.error('Error inicializando Firebase Admin SDK:', err)
}

/**
 * Envía una notificación push en segundo plano a través de Firebase Cloud Messaging (FCM).
 * @param userIds ID de usuario único o arreglo de IDs de usuarios receptores.
 * @param title Título de la notificación.
 * @param body Cuerpo/mensaje de la notificación.
 * @param url Enlace de redirección cuando el usuario haga clic.
 */
export async function enviarPushNotificacion(
  userIds: string | string[],
  title: string,
  body: string,
  url?: string
) {
  const ids = Array.isArray(userIds) ? userIds : [userIds]
  if (ids.length === 0) return { success: true, count: 0 }

  const supabase = createServerClient()

  // 1. Buscar todos los tokens FCM registrados para estos usuarios
  const { data: tokenRecords, error: dbErr } = await supabase
    .from('fcm_tokens')
    .select('token, user_id')
    .in('user_id', ids)

  if (dbErr) {
    console.error('Error consultando tokens FCM en la base de datos:', dbErr.message)
    return { success: false, error: dbErr.message }
  }

  if (!tokenRecords || tokenRecords.length === 0) {
    console.log('No hay tokens FCM activos registrados para los usuarios:', ids)
    return { success: true, count: 0 }
  }

  // 2. Construir los mensajes de notificación individuales
  const messages = tokenRecords.map((record) => ({
    token: record.token,
    notification: {
      title,
      body,
    },
    data: {
      title,
      body,
      url: url || '/',
    },
    webpush: {
      fcmOptions: {
        link: url || '/',
      },
    },
  }))

  try {
    // 3. Enviar las notificaciones usando sendEach de firebase-admin/messaging
    const response = await getMessaging().sendEach(messages)
    const tokensToDelete: string[] = []
    let successCount = 0

    response.responses.forEach((res, idx) => {
      if (res.success) {
        successCount++
      } else {
        const errCode = res.error?.code
        // Si el token es inválido o ya no está registrado, se programa para eliminarse
        if (
          errCode === 'messaging/registration-token-not-registered' ||
          errCode === 'messaging/invalid-registration-token'
        ) {
          tokensToDelete.push(tokenRecords[idx].token)
        }
        console.error(
          `Error en token ${tokenRecords[idx].token.slice(0, 10)}... para usuario ${tokenRecords[idx].user_id}:`,
          res.error
        )
      }
    })

    // 4. Autolimpiar tokens obsoletos para mantener la BD optimizada
    if (tokensToDelete.length > 0) {
      const { error: delErr } = await supabase
        .from('fcm_tokens')
        .delete()
        .in('token', tokensToDelete)

      if (delErr) {
        console.error('Error al eliminar tokens obsoletos en BD:', delErr.message)
      } else {
        console.log(`Se autolimpiaron ${tokensToDelete.length} tokens FCM obsoletos de la base de datos.`)
      }
    }

    return { success: true, count: successCount }
  } catch (err: any) {
    console.error('Error general enviando notificaciones vía FCM Admin SDK:', err)
    return { success: false, error: err.message }
  }
}
