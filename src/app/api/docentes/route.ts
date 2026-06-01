import { createServerClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('docentes')
      .select('id, nombre, email, asignatura')
      .eq('activo', true)
      .order('nombre')

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ docentes: data })
  } catch (error) {
    console.error('Error en GET /api/docentes:', error)
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
