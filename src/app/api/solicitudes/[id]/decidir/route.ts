import { createServerClient } from '@/lib/supabase-server'
import { enviarPushNotificacion } from '@/lib/push-server'
import { formatFecha, getJornadaLabel } from '@/lib/utils'
import { NextRequest } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { accion, motivoRechazo } = body

    if (!accion || !['aprobar', 'rechazar'].includes(accion)) {
      return Response.json({ error: 'Acción inválida' }, { status: 400 })
    }

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

    // 3. Obtener el perfil y verificar permisos
    const { data: perf, error: perfErr } = await supabase
      .from('perfiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (perfErr || !perf || (perf.rol !== 'ADMIN' && perf.rol !== 'DOCENTE')) {
      return Response.json({ error: 'No tienes permisos para aprobar solicitudes' }, { status: 403 })
    }

    // 3. Buscar la solicitud
    const { data: solicitud, error: fetchErr } = await supabase
      .from('solicitudes')
      .select('*, docente:docentes(*), items:items_solicitud(*)')
      .eq('id', id)
      .single()

    if (fetchErr || !solicitud) {
      return Response.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    }

    // 4. Verificar que no esté ya procesada
    if (solicitud.estado !== 'PENDIENTE') {
      return Response.json({ error: `Esta solicitud ya fue ${solicitud.estado.toLowerCase()}` }, { status: 400 })
    }

    // 5. Validar que la solicitud corresponda al docente o sea Admin
    const isDocenteAsignado = solicitud.docente_id === perf.id || (solicitud.docente && solicitud.docente.email === perf.email)
    if (perf.rol !== 'ADMIN' && !isDocenteAsignado) {
      return Response.json({ error: 'Esta solicitud no está asignada a tu asignatura' }, { status: 403 })
    }

    // 6. Definir código y nuevo estado
    const nuevoEstado = accion === 'aprobar' ? 'APROBADA' : 'RECHAZADA'
    const codigoEntrega = accion === 'aprobar'
      ? Math.floor(100000 + Math.random() * 900000).toString()
      : null

    // 7. Actualizar la solicitud en Supabase
    const { error: updateErr } = await supabase
      .from('solicitudes')
      .update({
        estado: nuevoEstado,
        codigo_entrega: codigoEntrega,
        observaciones: nuevoEstado === 'RECHAZADA' && motivoRechazo ? motivoRechazo : null,
      })
      .eq('id', id)

    if (updateErr) {
      console.error('Error actualizando solicitud:', updateErr)
      return Response.json({ error: 'Error al actualizar el estado de la solicitud' }, { status: 500 })
    }

    // 8. Enviar notificaciones push en segundo plano (FCM)
    const docenteNombre = solicitud.docente?.nombre || perf.nombre

    // Buscamos el ID del alumno en la tabla perfiles
    let alumnoUserId: string | null = null
    try {
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
    } catch (err) {
      console.error('Error buscando perfil de alumno:', err)
    }

    if (accion === 'aprobar' && codigoEntrega) {
      // 1. Notificación al Alumno
      if (alumnoUserId) {
        enviarPushNotificacion(
          alumnoUserId,
          '¡Solicitud Aprobada! ✅',
          `Tu solicitud para "${solicitud.asignatura}" fue autorizada. Preséntate en el pañol con tu RUT.`,
          `/solicitud/${solicitud.id}/confirmacion`
        ).catch(e => console.error('Error push alumno aprobado:', e))
      }

      // 2. Notificación a Pañoleros y Admins
      try {
        const { data: perfilesPanol } = await supabase
          .from('perfiles')
          .select('id')
          .in('rol', ['PANOL', 'ADMIN'])
        
        const panolUserIds = (perfilesPanol || []).map(p => p.id)
        if (panolUserIds.length > 0) {
          enviarPushNotificacion(
            panolUserIds,
            'Nuevo Préstamo Autorizado 📦',
            `Preparar materiales para el alumno ${solicitud.alumno}. Código de Entrega: ${codigoEntrega}.`,
            `/panel`
          ).catch(e => console.error('Error push pañol:', e))
        }
      } catch (err) {
        console.error('Error enviando notificaciones push a pañoleros:', err)
      }
    } else if (accion === 'rechazar') {
      // Notificación al Alumno del rechazo
      if (alumnoUserId) {
        enviarPushNotificacion(
          alumnoUserId,
          'Solicitud Rechazada ❌',
          `Tu solicitud para "${solicitud.asignatura}" fue rechazada.${motivoRechazo ? ` Motivo: "${motivoRechazo}"` : ' Revisa el detalle para más información.'}`,
          `/solicitud/${solicitud.id}/confirmacion`
        ).catch(e => console.error('Error push alumno rechazado:', e))
      }
    }

    return Response.json({ ok: true, estado: nuevoEstado })
  } catch (error: any) {
    console.error('Error en PATCH /api/solicitudes/[id]/decidir:', error)
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
