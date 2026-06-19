import { createServerClient } from '@/lib/supabase-server'
import { enviarPushNotificacion } from '@/lib/push-server'
import { NextRequest } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // 1. Obtener token de la cabecera Authorization
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

    if (!token) {
      return Response.json({ error: 'Inicia sesión para realizar esta acción' }, { status: 401 })
    }

    const supabase = createServerClient()

    // 2. Verificar autenticación del usuario usando el token JWT
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return Response.json({ error: 'Inicia sesión para realizar esta acción' }, { status: 401 })
    }

    // 3. Obtener el perfil y verificar permisos (ADMIN, PANOL o DOCENTE)
    const { data: perf, error: perfErr } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (perfErr || !perf || !['ADMIN', 'PANOL', 'DOCENTE'].includes(perf.rol)) {
      return Response.json({ error: 'No tienes permisos para realizar esta acción' }, { status: 403 })
    }

    // 4. Buscar la solicitud
    const { data: solicitud, error: fetchErr } = await supabase
      .from('solicitudes')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchErr || !solicitud) {
      return Response.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    }

    if (solicitud.estado !== 'APROBADA' || !solicitud.codigo_entrega) {
      return Response.json({ error: 'La solicitud no está aprobada o no cuenta con código de entrega' }, { status: 400 })
    }

    // 5. Buscar el ID del alumno en la tabla perfiles
    let alumnoUserId: string | null = null
    const orQuery = []
    if (solicitud.alumno_email) orQuery.push(`email.eq.${solicitud.alumno_email}`)
    if (solicitud.rut) orQuery.push(`rut.eq.${solicitud.rut}`)
    
    if (orQuery.length > 0) {
      const { data: alumnoProfile } = await supabase
        .from('perfiles')
        .select('id')
        .or(orQuery.join(','))
        .limit(1)
        .maybeSingle()
      if (alumnoProfile) {
        alumnoUserId = alumnoProfile.id
      }
    }

    if (!alumnoUserId) {
      return Response.json({ error: 'El alumno no tiene una cuenta o suscripción activa registrada' }, { status: 404 })
    }

    // 6. Enviar la notificación push en background — responder de inmediato
    enviarPushNotificacion(
      alumnoUserId,
      '🔑 Código de Entrega',
      `Tu código para retirar materiales de "${solicitud.asignatura}" es: ${solicitud.codigo_entrega}`,
      `/solicitud/${solicitud.id}/confirmacion`
    ).catch(e => console.error('[reenviar-codigo] Error en push:', e))

    return Response.json({ ok: true })
  } catch (error: any) {
    console.error('Error en POST /api/solicitudes/[id]/reenviar-codigo:', error)
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
