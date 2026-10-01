import { createServerClient } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/api-auth'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const estado = searchParams.get('estado')

    // 1. Usuario autenticado con rol de personal (el rol se lee desde perfiles)
    const auth = await requireAuth(request, ['ADMIN', 'PANOL', 'DOCENTE'])
    if (!auth.ok) return auth.response

    const supabase = createServerClient()

    let query = supabase
      .from('solicitudes')
      .select('*, docente:docentes(*), items:items_solicitud(*)')
      .order('created_at', { ascending: false })

    // 2. Si es docente, filtrar sólo por sus solicitudes. El registro en `docentes`
    //    puede tener el mismo id que el usuario de Auth o sólo coincidir por email.
    if (auth.perfil.rol === 'DOCENTE') {
      const email = (auth.perfil.email || auth.user.email || '').toLowerCase()
      const { data: docentesPropios } = await supabase
        .from('docentes')
        .select('id')
        .or(`id.eq.${auth.user.id}${email ? `,email.ilike.${email}` : ''}`)
      const ids = (docentesPropios || []).map(d => d.id)
      if (ids.length === 0) return Response.json({ solicitudes: [] })
      query = query.in('docente_id', ids)
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

