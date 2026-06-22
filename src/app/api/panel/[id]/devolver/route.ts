import { createServerClient } from '@/lib/supabase-server'
import { enviarPushNotificacion } from '@/lib/push-server'
import { getJornadaLabel } from '@/lib/utils'
import { NextRequest } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { items } = body // Espera: { id: string, devuelto: boolean }[]

    if (!items || !Array.isArray(items)) {
      return Response.json({ error: 'Listado de items de retorno requerido' }, { status: 400 })
    }

    // 1. Obtener token de la cabecera Authorization
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

    if (!token) {
      return Response.json({ error: 'Sesión no activa' }, { status: 401 })
    }

    const supabase = createServerClient()

    // 2. Verificar sesión del pañolero / admin usando el token JWT
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return Response.json({ error: 'Sesión no activa' }, { status: 401 })
    }

    const { data: perf, error: perfErr } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (perfErr || !perf || (perf.rol !== 'ADMIN' && perf.rol !== 'PANOL')) {
      return Response.json({ error: 'No autorizado para registrar devoluciones' }, { status: 403 })
    }

    // 2. Consultar todos los items originales de esta solicitud
    const { data: allItems, error: itemsErr } = await supabase
      .from('items_solicitud')
      .select('*')
      .eq('solicitud_id', id)

    if (itemsErr || !allItems || allItems.length === 0) {
      return Response.json({ error: 'No se encontraron items para esta solicitud' }, { status: 404 })
    }

    // Clasificar ítems de acuerdo a lo recibido en el body
    const devueltosIds = new Set(
      items.filter((item: any) => item.devuelto === true).map((item: any) => item.id)
    )

    const itemsDevueltos = allItems.filter(i => devueltosIds.has(i.id))
    const itemsPendientes = allItems.filter(i => !devueltosIds.has(i.id))

    const devolucionCompleta = itemsPendientes.length === 0
    let nuevoEstado = 'DEVUELTA'

    // 3. Obtener los datos de la solicitud original
    const { data: solOriginal, error: solErr } = await supabase
      .from('solicitudes')
      .select('*, docente:docentes(*)')
      .eq('id', id)
      .single()

    if (solErr || !solOriginal) {
      console.error('Error cargando la solicitud original:', solErr)
      return Response.json({ error: 'No se pudo cargar la solicitud de préstamo original' }, { status: 500 })
    }

    // 4. Buscar ID del alumno
    let alumnoUserId: string | null = null
    const orQuery = []
    if (solOriginal.rut) orQuery.push(`rut.eq.${solOriginal.rut}`)
    if (solOriginal.alumno_email) orQuery.push(`email.eq.${solOriginal.alumno_email}`)

    if (orQuery.length > 0) {
      const { data: alumnoProfile } = await supabase
        .from('perfiles')
        .select('id')
        .or(orQuery.join(','))
        .limit(1)
        .maybeSingle()
      if (alumnoProfile) alumnoUserId = alumnoProfile.id
    }

    if (devolucionCompleta) {
      // Caso A: Devolución total. Marcamos todos los items como devueltos y la solicitud original a DEVUELTA
      const { error: itemsUpdateErr } = await supabase
        .from('items_solicitud')
        .update({ devuelto: true })
        .eq('solicitud_id', id)

      if (itemsUpdateErr) {
        console.error('Error al actualizar todos los ítems a devueltos:', itemsUpdateErr)
        return Response.json({ error: 'Error al procesar la devolución de materiales' }, { status: 500 })
      }

      const { error: solUpdateErr } = await supabase
        .from('solicitudes')
        .update({ estado: 'DEVUELTA' })
        .eq('id', id)

      if (solUpdateErr) {
        console.error('Error al actualizar estado a DEVUELTA:', solUpdateErr)
        return Response.json({ error: 'Error al actualizar la solicitud' }, { status: 500 })
      }

      // Enviar notificaciones de devolución completa
      const targetUserIdsCompleta = [solOriginal.docente_id]
      if (alumnoUserId) targetUserIdsCompleta.push(alumnoUserId)

      await enviarPushNotificacion(
        targetUserIdsCompleta,
        'Material Devuelto 📦',
        `El alumno ${solOriginal.alumno} ha devuelto todo el material correctamente al pañol.`,
        '/panel'
      ).catch(e => console.error('Error push devolución completa:', e))

    } else {
      // Caso B: Devolución parcial. Se divide la solicitud.
      nuevoEstado = 'DEVUELTA_INCOMPLETA'

      if (itemsDevueltos.length > 0) {
        // Crear una nueva solicitud clonada con estado 'DEVUELTA' (directo a Historial / Listo)
        const { data: newSol, error: newSolErr } = await supabase
          .from('solicitudes')
          .insert([{
            alumno: solOriginal.alumno,
            rut: solOriginal.rut,
            alumno_email: solOriginal.alumno_email,
            asignatura: solOriginal.asignatura,
            seccion: solOriginal.seccion,
            jornada: solOriginal.jornada,
            fecha: solOriginal.fecha,
            estado: 'DEVUELTA',
            docente_id: solOriginal.docente_id,
            token_aprobacion: solOriginal.token_aprobacion ? `${solOriginal.token_aprobacion}-clon-${Math.random().toString(36).substring(2, 7)}` : null,
            codigo_entrega: solOriginal.codigo_entrega,
            observaciones: `Devolución parcial. Original: ${id}`
          }])
          .select()
          .single()

        if (newSolErr || !newSol) {
          console.error('Error al clonar la solicitud:', newSolErr)
          return Response.json({ error: 'Error al registrar la partición de la devolución' }, { status: 500 })
        }

        // 3. Mover los ítems devueltos a la nueva solicitud
        for (const item of itemsDevueltos) {
          const { error: itemUpdateErr } = await supabase
            .from('items_solicitud')
            .update({
              solicitud_id: newSol.id,
              devuelto: true
            })
            .eq('id', item.id)

          if (itemUpdateErr) {
            console.error(`Error al mover ítem ${item.id} a la nueva solicitud:`, itemUpdateErr)
            return Response.json({ error: 'Error al redistribuir materiales en la base de datos' }, { status: 500 })
          }
        }
      }

      // 4. Actualizar el estado de la solicitud original (que ahora solo tiene ítems pendientes) a DEVUELTA_INCOMPLETA
      const { error: solUpdateErr } = await supabase
        .from('solicitudes')
        .update({ estado: 'DEVUELTA_INCOMPLETA' })
        .eq('id', id)

      if (solUpdateErr) {
        console.error('Error al actualizar estado de solicitud original:', solUpdateErr)
        return Response.json({ error: 'Error al actualizar el estado del préstamo' }, { status: 500 })
      }

      // 5. Enviar alertas push con los ítems pendientes al docente, alumno y director
      const targetUserIds = [solOriginal.docente_id]
      if (alumnoUserId) targetUserIds.push(alumnoUserId)
      
      // Buscar el perfil del director por su email
      const directorEmail = process.env.DIRECTOR_CARRERA_EMAIL
      if (directorEmail) {
        try {
          const { data: directorProfile } = await supabase
            .from('perfiles')
            .select('id')
            .eq('email', directorEmail)
            .maybeSingle()
          if (directorProfile) {
            targetUserIds.push(directorProfile.id)
          }
        } catch (err) {
          console.error('Error buscando perfil del director para push:', err)
        }
      }

      await enviarPushNotificacion(
        targetUserIds,
        '⚠️ Alerta: Material Faltante',
        `El alumno ${solOriginal.alumno} realizó una devolución parcial. Quedan herramientas pendientes de retornar al pañol.`,
        '/panel'
      ).catch(e => console.error('Error al enviar alerta de material faltante:', e))
    }

    return Response.json({ ok: true, estado: nuevoEstado, devolucionCompleta })
  } catch (error) {
    console.error('Error en POST /api/panel/[id]/devolver:', error)
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
