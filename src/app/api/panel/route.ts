import { createServerClient } from '@/lib/supabase-server'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const estado = searchParams.get('estado')

    const supabase = createServerClient()
    
    // 1. Obtener usuario autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: 'No autorizado' }, { status: 401 })
    }

    // 2. Obtener rol del perfil
    const { data: perfil, error: perfilError } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (perfilError || !perfil) {
      return Response.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }

    let query = supabase
      .from('solicitudes')
      .select('*, docente:docentes(*), items:items_solicitud(*)')
      .order('created_at', { ascending: false })

    // 3. Si es docente, filtrar sólo por sus solicitudes
    if (perfil.rol === 'DOCENTE') {
      query = query.eq('docente_id', user.id)
    }

    if (estado) {
      query = query.eq('estado', estado)
    }

    const { data, error } = await query
    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ solicitudes: data })
  } catch (error) {
    console.error('Error en GET /api/panel:', error)
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}

