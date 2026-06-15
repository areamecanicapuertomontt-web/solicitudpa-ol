import { createServerClient } from '@/lib/supabase-server'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nombre, email, rut, seccion, jornada } = body

    if (!nombre || !email || !rut || !seccion || !jornada) {
      return Response.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    const supabase = createServerClient()
    
    // Creamos el usuario en Supabase Auth.
    // Esto disparará automáticamente el trigger public.handle_new_user()
    // el cual insertará o actualizará en public.perfiles.
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: 'AlumnoInacap2026!',
      email_confirm: true,
      user_metadata: {
        nombre,
        rol: 'ALUMNO',
        rut,
        seccion,
        jornada
      }
    })

    if (authError || !authData.user) {
      console.error('Error creando en Auth:', authError)
      return Response.json({ error: authError?.message || 'Error al crear usuario' }, { status: 500 })
    }

    // Obtenemos el perfil insertado para devolverlo
    const { data: perfil, error: perfErr } = await supabase
      .from('perfiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (perfErr) {
      console.error('Error al consultar perfil insertado:', perfErr)
    }

    return Response.json({ estudiante: perfil || authData.user }, { status: 201 })
  } catch (error) {
    console.error('Error en POST /api/admin/estudiantes:', error)
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, nombre, email, rut, seccion, jornada } = body

    if (!id || !nombre || !email || !rut || !seccion || !jornada) {
      return Response.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    const supabase = createServerClient()

    // 1. Actualizar en Supabase Auth (email y metadata)
    const { error: authError } = await supabase.auth.admin.updateUserById(id, {
      email: email,
      user_metadata: {
        nombre,
        rol: 'ALUMNO',
        rut,
        seccion,
        jornada
      }
    })

    if (authError) {
      console.error('Error al actualizar en Auth:', authError)
      return Response.json({ error: authError.message }, { status: 500 })
    }

    // 2. Actualizar en public.perfiles directamente
    const { data: perfil, error: perfError } = await supabase
      .from('perfiles')
      .update({
        nombre,
        email,
        rut,
        seccion,
        jornada
      })
      .eq('id', id)
      .select()
      .single()

    if (perfError) {
      console.error('Error al actualizar tabla perfiles:', perfError)
      return Response.json({ error: perfError.message }, { status: 500 })
    }

    return Response.json({ estudiante: perfil }, { status: 200 })
  } catch (error) {
    console.error('Error en PUT /api/admin/estudiantes:', error)
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return Response.json({ error: 'ID requerido' }, { status: 400 })
    }

    const supabase = createServerClient()

    // Borrar de auth.users usando el admin SDK.
    // Al borrar de auth.users, el registro en public.perfiles se borrará automáticamente en cascada.
    const { error } = await supabase.auth.admin.deleteUser(id)

    if (error) {
      console.error('Error al eliminar en Auth:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ ok: true }, { status: 200 })
  } catch (error) {
    console.error('Error en DELETE /api/admin/estudiantes:', error)
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
