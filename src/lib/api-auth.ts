import { createServerClient, createCookieClient } from '@/lib/supabase-server'
import { NextRequest } from 'next/server'

export type Rol = 'ADMIN' | 'DOCENTE' | 'ALUMNO' | 'PANOL'

type AuthOk = {
  ok: true
  user: { id: string; email?: string }
  perfil: { id: string; rol: Rol; nombre: string | null; email: string | null }
}
type AuthFail = { ok: false; response: Response }

/**
 * Verifica que la petición venga de un usuario autenticado y (opcionalmente)
 * con uno de los roles indicados.
 *
 * Acepta la sesión por header `Authorization: Bearer <access_token>` o, si no
 * viene, por las cookies de sesión de Supabase (fetch del mismo origen).
 *
 * El rol se lee SIEMPRE desde `public.perfiles` con service_role, nunca desde
 * `user_metadata` del JWT (el usuario puede modificar su propio metadata).
 */
export async function requireAuth(request: NextRequest, roles?: Rol[]): Promise<AuthOk | AuthFail> {
  const supabase = createServerClient()

  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

  const { data: { user } } = token
    ? await supabase.auth.getUser(token)
    : await (await createCookieClient()).auth.getUser()

  if (!user) {
    return { ok: false, response: Response.json({ error: 'Inicia sesión para realizar esta acción' }, { status: 401 }) }
  }

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('id, rol, nombre, email')
    .eq('id', user.id)
    .single()

  if (!perfil) {
    return { ok: false, response: Response.json({ error: 'Perfil no encontrado' }, { status: 403 }) }
  }

  if (roles && !roles.includes(perfil.rol)) {
    return { ok: false, response: Response.json({ error: 'No tienes permisos para esta acción' }, { status: 403 }) }
  }

  return { ok: true, user, perfil }
}
