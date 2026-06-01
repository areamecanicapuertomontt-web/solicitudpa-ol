import { createServerClient } from '@/lib/supabase-server'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nombre, email, asignatura } = body

    if (!nombre || !email || !asignatura) {
      return Response.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('docentes')
      .insert({ nombre, email, asignatura, activo: true })
      .select()
      .single()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ docente: data }, { status: 201 })
  } catch (error) {
    console.error('Error en POST /api/admin/docentes:', error)
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
