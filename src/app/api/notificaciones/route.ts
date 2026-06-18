import { createServerClient } from '@/lib/supabase-server'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

    if (!token) {
      return Response.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return Response.json({ error: 'Sesión no activa' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('historial_notificaciones')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ notifications: data })
  } catch (error) {
    console.error('Error GET /api/notificaciones:', error)
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

    if (!token) {
      return Response.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return Response.json({ error: 'Sesión no activa' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { id } = body

    if (id) {
      // Marcar una específica como leída
      const { error } = await supabase
        .from('historial_notificaciones')
        .update({ leido: true })
        .eq('id', id)
        .eq('user_id', user.id)
      if (error) return Response.json({ error: error.message }, { status: 500 })
    } else {
      // Marcar todas como leídas
      const { error } = await supabase
        .from('historial_notificaciones')
        .update({ leido: true })
        .eq('user_id', user.id)
      if (error) return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ ok: true })
  } catch (error) {
    console.error('PATCH /api/notificaciones:', error)
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
