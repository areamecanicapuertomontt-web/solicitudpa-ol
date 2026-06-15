import { createServerClient } from '@/lib/supabase-server'
import { enviarCorreoPanol, enviarCorreoAlumnoResultado } from '@/lib/brevo'
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

    // 8. Enviar correos en segundo plano (no bloqueante)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const docenteNombre = solicitud.docente?.nombre || perf.nombre

    // Alumno resultado
    if (solicitud.alumno_email) {
      enviarCorreoAlumnoResultado({
        alumnoEmail: solicitud.alumno_email,
        alumnoNombre: solicitud.alumno,
        aprobada: accion === 'aprobar',
        docenteNombre,
        asignatura: solicitud.asignatura,
        items: solicitud.items || [],
        motivoRechazo: accion === 'rechazar' ? motivoRechazo : undefined,
      }).catch(e => console.error('Error correo resultado alumno:', e))
    }

    // Al Pañol si es aprobada
    if (accion === 'aprobar' && codigoEntrega) {
      try {
        // Consultar pañoleros registrados que coincidan con la jornada de la solicitud
        const { data: perfilesPanol } = await supabase
          .from('perfiles')
          .select('email, nombre, jornada')
          .in('rol', ['PANOL', 'ADMIN'])

        let targetPanoleros = (perfilesPanol || []).filter(
          p => p.jornada === solicitud.jornada
        )

        // Si no hay pañoleros específicos para esa jornada, enviar a todos los pañoleros/admins
        if (targetPanoleros.length === 0) {
          targetPanoleros = perfilesPanol || []
        }

        // Si la tabla perfiles está vacía o no hay pañoleros, usar el de respaldo de .env.local
        if (targetPanoleros.length === 0) {
          targetPanoleros = [{
            email: process.env.PANOL_EMAIL || 'diegohen2005gonzales@gmail.com',
            nombre: 'Pañol Mecánica',
            jornada: solicitud.jornada
          }]
        }

        // Enviar correos a todos los pañoleros seleccionados en paralelo
        await Promise.all(
          targetPanoleros.map(p =>
            enviarCorreoPanol({
              pañolEmail: p.email,
              alumnoNombre: solicitud.alumno,
              alumnoRut: solicitud.rut,
              docenteNombre,
              asignatura: solicitud.asignatura,
              seccion: solicitud.seccion,
              jornada: getJornadaLabel(solicitud.jornada),
              fecha: formatFecha(solicitud.fecha),
              items: solicitud.items || [],
              solicitudId: solicitud.id,
              codigoEntrega,
            })
          )
        )
      } catch (e) {
        console.error('Error al enviar correos a los pañoleros:', e)
      }
    }

    return Response.json({ ok: true, estado: nuevoEstado })
  } catch (error: any) {
    console.error('Error en PATCH /api/solicitudes/[id]/decidir:', error)
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
