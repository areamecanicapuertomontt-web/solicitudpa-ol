import { createServerClient } from '@/lib/supabase-server'
import { enviarCorreoDocente, enviarCorreoAlumnoConfirmacion } from '@/lib/brevo'
import { formatFecha, getJornadaLabel } from '@/lib/utils'
import { NextRequest } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { alumno, rut, alumno_email, asignatura, seccion, jornada, fecha, docente_id, items } = body

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

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const jornadaLabel = getJornadaLabel(jornada)
    const fechaLabel = formatFecha(fechaSolicitud)

    // 4. Enviar correo al DOCENTE
    try {
      await enviarCorreoDocente({
        docenteEmail: docente.email,
        docenteNombre: docente.nombre,
        alumnoNombre: alumno,
        alumnoRut: rut,
        asignatura,
        seccion,
        jornada: jornadaLabel,
        fecha: fechaLabel,
        items,
        tokenAprobacion: token,
        solicitudId: solicitud.id,
        siteUrl,
      })
    } catch (e) {
      console.error('Error enviando correo al docente:', e)
    }

    // 5. Enviar correo de CONFIRMACIÓN al ALUMNO
    if (alumno_email) {
      try {
        await enviarCorreoAlumnoConfirmacion({
          alumnoEmail: alumno_email,
          alumnoNombre: alumno,
          alumnoRut: rut,
          docenteNombre: docente.nombre,
          asignatura,
          seccion,
          jornada: jornadaLabel,
          fecha: fechaLabel,
          items,
        })
      } catch (e) {
        console.error('Error enviando correo de confirmación al alumno:', e)
      }
    }

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
