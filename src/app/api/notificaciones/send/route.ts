import { enviarPushNotificacion } from '@/lib/fcm-server'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userIds, title, body: msgBody, url } = body

    if (!userIds || !title || !msgBody) {
      return Response.json({ error: 'Datos incompletos: userIds, title y body son obligatorios' }, { status: 400 })
    }

    const result = await enviarPushNotificacion(userIds, title, msgBody, url)

    if (!result.success) {
      return Response.json({ error: result.error }, { status: 500 })
    }

    return Response.json({ ok: true, count: result.count })
  } catch (error: any) {
    console.error('Error en POST /api/notificaciones/send:', error)
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
