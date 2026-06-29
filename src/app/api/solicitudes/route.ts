import { createServerClient } from '@/lib/supabase-server'
import { enviarPushNotificacion } from '@/lib/push-server'
import { formatFecha, getJornadaLabel } from '@/lib/utils'
import { NextRequest } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { alumno, rut, alumno_email, asignatura, seccion, jornada, carrera, fecha, docente_id, items } = body

    // Validación básica
    if (!alumno || !rut || !asignatura || !seccion || !jornada || !docente_id || !items?.length) {
      return Response.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    const supabase = createServerClient()

    // 1. Obtener datos del docente
    const { data: docente, error: docenteErr } = await supabase
      .from('docentes')
      .select('*')
      .eq('id', docente_id)
      .single()

    if (docenteErr || !docente) {
      return Response.json({ error: 'Docente no encontrado' }, { status: 404 })
    }

    // 2. Crear la solicitud
    const token = uuidv4()
    const fechaSolicitud = fecha || new Date().toISOString().split('T')[0]

    const { data: solicitud, error: solicitudErr } = await supabase
      .from('solicitudes')
      .insert({
        alumno,
        rut,
        alumno_email: alumno_email || null,
        asignatura,
        seccion,
        jornada,
        carrera: carrera || null,
        docente_id,
        fecha: fechaSolicitud,
        token_aprobacion: token,
        estado: 'PENDIENTE',
      })
      .select()
      .single()

    if (solicitudErr || !solicitud) {
      console.error('Error creando solicitud:', solicitudErr)
      return Response.json({ error: 'Error al crear la solicitud' }, { status: 500 })
    }

    // 3. Insertar los items
    const itemsToInsert = items.map((item: { cantidad: number; descripcion: string; estado_item: string }) => ({
      solicitud_id: solicitud.id,
      cantidad: item.cantidad,
      descripcion: item.descripcion,
      estado_item: item.estado_item || 'CUALQUIERA',
    }))

    const { error: itemsErr } = await supabase
      .from('items_solicitud')
      .insert(itemsToInsert)

    if (itemsErr) {
      console.error('Error insertando items:', itemsErr)
    }

    // 4. Enviar notificación push al DOCENTE asignado y al ALUMNO (si tiene cuenta)
    // IMPORTANTE: docente_id es el ID de la tabla 'docentes', NO el user_id de auth/perfiles.
    // Debemos resolver el user_id real del docente buscando por email en la tabla 'perfiles'.
    ;(async () => {
      try {
        // 4a. Resolver el user_id del docente desde la tabla perfiles usando su email
        let docenteUserId: string | null = null
        if (docente?.email) {
          const { data: docenteProfile, error: docenteProfileErr } = await supabase
            .from('perfiles')
            .select('id')
            .eq('email', docente.email)
            .maybeSingle()
          if (docenteProfileErr) {
            console.error('[solicitudes/route] Error buscando perfil del docente por email:', docenteProfileErr.message, '| email:', docente.email)
          } else if (docenteProfile) {
            docenteUserId = docenteProfile.id
            console.log('[solicitudes/route] ✅ Docente user_id resuelto:', docenteUserId, 'para email:', docente.email)
          } else {
            console.warn('[solicitudes/route] ⚠️ No se encontró perfil en tabla perfiles para el docente con email:', docente.email, '— el docente puede no tener cuenta en el sistema.')
          }
        } else {
          console.warn('[solicitudes/route] ⚠️ El registro del docente no tiene email — imposible resolver user_id para push.')
        }

        // 4b. Enviar push al docente (con su user_id real)
        if (docenteUserId) {
          enviarPushNotificacion(
            docenteUserId,
            'Nueva Solicitud Pendiente 📋',
            `El alumno ${alumno} ha solicitado herramientas para "${asignatura}". Revisa el panel para decidir.`,
            `/panel`
          ).catch(e => console.error('[solicitudes/route] Error push docente:', e))
        }

        // 4c. Resolver el user_id del alumno y enviarle confirmación
        let alumnoUserId: string | null = null
        const orQuery: string[] = []
        if (alumno_email) orQuery.push(`email.eq.${alumno_email}`)
        if (rut) orQuery.push(`rut.eq.${rut}`)

        if (orQuery.length > 0) {
          const { data: alumnoProfile, error: alumnoProfileErr } = await supabase
            .from('perfiles')
            .select('id')
            .or(orQuery.join(','))
            .limit(1)
            .maybeSingle()
          if (alumnoProfileErr) {
            console.error('[solicitudes/route] Error buscando perfil del alumno:', alumnoProfileErr.message)
          } else if (alumnoProfile) {
            alumnoUserId = alumnoProfile.id
          }
        }

        if (alumnoUserId) {
          enviarPushNotificacion(
            alumnoUserId,
            'Solicitud Recibida 🛠️',
            `Hola ${alumno.split(' ')[0]}, tu solicitud para "${asignatura}" fue ingresada. Te avisaremos cuando el docente responda.`,
            `/solicitud/${solicitud.id}/confirmacion`
          ).catch(e => console.error('[solicitudes/route] Error push alumno:', e))
        }
      } catch (e) {
        console.error('[solicitudes/route] Error inesperado en bloque de notificaciones push:', e)
      }
    })()

    return Response.json({ id: solicitud.id, token }, { status: 201 })
  } catch (error) {
    console.error('Error en POST /api/solicitudes:', error)
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const estado = searchParams.get('estado')

    const supabase = createServerClient()
    let query = supabase
      .from('solicitudes')
      .select('*, docente:docentes(*), items:items_solicitud(*)')
      .order('created_at', { ascending: false })

    if (estado) {
      query = query.eq('estado', estado)
    }

    const { data, error } = await query
    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ solicitudes: data })
  } catch (error) {
    console.error('Error en GET /api/solicitudes:', error)
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
