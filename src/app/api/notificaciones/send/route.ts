import { enviarPushNotificacion } from '@/lib/push-server'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userIds, title, body: msgBody, url } = body

    if (!userIds || !title || !msgBody) {
      return Response.json({ error: 'Datos incompletos: userIds, title y body son obligatorios' }, { status: 400 })
    }

    enviarPushNotificacion(userIds, title, msgBody, url).catch(console.error)

    return Response.json({ ok: true, count: -1 })
  } catch (error: any) {
    console.error('Error en POST /api/notificaciones/send:', error)
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
