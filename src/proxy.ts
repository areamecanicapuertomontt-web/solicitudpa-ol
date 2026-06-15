import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const url = request.nextUrl.clone()
  const path = url.pathname

  // Evitar interceptar llamadas a la API interna de autenticación o estáticos
  if (path.startsWith('/api/auth') || path.startsWith('/_next') || path === '/favicon.ico') {
    return response
  }

  // 1. Si no está logueado y accede a una ruta protegida
  const isProtectedPath = path.startsWith('/panel') || path.startsWith('/admin') || path.startsWith('/solicitud')
  const hasAuthCookie = request.cookies.getAll().some(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'))
  if (!user && isProtectedPath && !hasAuthCookie) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 2. Si está logueado y va a la página de login u olvidar contraseña
  const isAuthPath = path === '/login' || path === '/olvidar-contrasena' || path === '/restablecer-contrasena'
  if (user && isAuthPath) {
    // Si ya está logueado, lo redirigimos a su página de inicio según su rol
    const rol = user.user_metadata?.rol || 'ALUMNO'
    if (rol === 'ALUMNO') {
      url.pathname = '/solicitud'
    } else {
      url.pathname = '/panel'
    }
    return NextResponse.redirect(url)
  }

  // 3. Control de acceso basado en roles para rutas protegidas
  if (user) {
    const rol = user.user_metadata?.rol || 'ALUMNO'

    // Los alumnos tienen prohibido el acceso al panel del pañol y administración
    if (rol === 'ALUMNO' && (path.startsWith('/panel') || path.startsWith('/admin'))) {
      url.pathname = '/solicitud'
      return NextResponse.redirect(url)
    }

    // Los docentes y pañoleros no necesitan llenar solicitudes de alumnos, pero se les permite si desean verla
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Coincidir con todas las rutas de la app excepto:
     * - Estáticos: _next/static, _next/image, favicon.ico
     * - Imágenes/SVGs del directorio public
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
