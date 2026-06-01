import { createServerClient } from '@/lib/supabase-server'
import { enviarCorreoPanol, enviarCorreoAlumnoResultado } from '@/lib/brevo'
import { formatFecha, getJornadaLabel } from '@/lib/utils'
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default async function AprobarPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ accion?: string }>
}) {
  const { token } = await params
  const { accion } = await searchParams

  if (!accion || !['aprobar', 'rechazar'].includes(accion)) {
    return <ErrorPage mensaje="Acción no válida. Usa el enlace del correo recibido." />
  }

  const supabase = createServerClient()

  // 1. Buscar la solicitud por token
  const { data: solicitud, error: fetchErr } = await supabase
    .from('solicitudes')
    .select('*, docente:docentes(*), items:items_solicitud(*)')
    .eq('token_aprobacion', token)
    .single()

  if (fetchErr || !solicitud) {
    return <ErrorPage mensaje="Solicitud no encontrada o token inválido." />
  }

  // 2. Verificar que no esté ya procesada
  if (solicitud.estado !== 'PENDIENTE') {
    const yaAprobada = solicitud.estado === 'APROBADA'
    return (
      <ResultPage
        tipo={yaAprobada ? 'ya-aprobada' : 'ya-rechazada'}
        alumno={solicitud.alumno}
        asignatura={solicitud.asignatura}
      />
    )
  }

  // 3. Generar código de entrega (6 dígitos) si se aprueba
  const nuevoEstado = accion === 'aprobar' ? 'APROBADA' : 'RECHAZADA'
  const codigoEntrega = accion === 'aprobar'
    ? Math.floor(100000 + Math.random() * 900000).toString()
    : null

  // 4. Actualizar estado primero (siempre funciona)
  const { error: updateErr } = await supabase
    .from('solicitudes')
    .update({ estado: nuevoEstado })
    .eq('id', solicitud.id)

  if (updateErr) {
    return <ErrorPage mensaje="Error al procesar la solicitud. Intenta nuevamente." />
  }

  // 4b. Intentar guardar código de entrega (requiere columna codigo_entrega)
  if (codigoEntrega) {
    try {
      await supabase
        .from('solicitudes')
        .update({ codigo_entrega: codigoEntrega })
        .eq('id', solicitud.id)
    } catch (e) {
      console.error('No se pudo guardar codigo_entrega (¿columna creada en Supabase?):', e)
    }
  }

  // 5. Si aprobada → enviar correo al pañol con el código
  if (accion === 'aprobar' && codigoEntrega) {
    const pañolEmail = process.env.PANOL_EMAIL || 'diegohen2005gonzales@gmail.com'
    try {
      await enviarCorreoPanol({
        pañolEmail,
        alumnoNombre: solicitud.alumno,
        alumnoRut: solicitud.rut,
        docenteNombre: solicitud.docente?.nombre || 'Docente',
        asignatura: solicitud.asignatura,
        seccion: solicitud.seccion,
        jornada: getJornadaLabel(solicitud.jornada),
        fecha: formatFecha(solicitud.fecha),
        items: solicitud.items || [],
        solicitudId: solicitud.id,
        codigoEntrega,
      })
    } catch (e) {
      console.error('Error enviando correo al pañol:', e)
    }
  }

  // 5. Notificar al ALUMNO del resultado (aprobado o rechazado)
  if (solicitud.alumno_email) {
    try {
      await enviarCorreoAlumnoResultado({
        alumnoEmail: solicitud.alumno_email,
        alumnoNombre: solicitud.alumno,
        aprobada: accion === 'aprobar',
        docenteNombre: solicitud.docente?.nombre || 'Docente',
        asignatura: solicitud.asignatura,
        items: solicitud.items || [],
      })
    } catch (e) {
      console.error('Error enviando correo de resultado al alumno:', e)
    }
  }

  return (
    <ResultPage
      tipo={accion === 'aprobar' ? 'aprobada' : 'rechazada'}
      alumno={solicitud.alumno}
      asignatura={solicitud.asignatura}
    />
  )
}

// ─── Sub-componentes ───────────────────────────────────────────────────────

function ResultPage({
  tipo,
  alumno,
  asignatura,
}: {
  tipo: 'aprobada' | 'rechazada' | 'ya-aprobada' | 'ya-rechazada'
  alumno: string
  asignatura: string
}) {
  const config = {
    aprobada: {
      icon: <CheckCircle2 size={52} style={{ color: '#22C55E' }} />,
      bg: 'rgba(34, 197, 94, 0.12)',
      border: 'rgba(34, 197, 94, 0.3)',
      title: '¡Solicitud Aprobada!',
      subtitle: 'El pañol ha sido notificado y preparará los materiales.',
      detail: `Has aprobado la solicitud de ${alumno} para la asignatura ${asignatura}.`,
    },
    rechazada: {
      icon: <XCircle size={52} style={{ color: '#EF4444' }} />,
      bg: 'rgba(239, 68, 68, 0.12)',
      border: 'rgba(239, 68, 68, 0.3)',
      title: 'Solicitud Rechazada',
      subtitle: 'El alumno fue notificado del rechazo.',
      detail: `Has rechazado la solicitud de ${alumno} para la asignatura ${asignatura}.`,
    },
    'ya-aprobada': {
      icon: <CheckCircle2 size={52} style={{ color: '#60A5FA' }} />,
      bg: 'rgba(96, 165, 250, 0.12)',
      border: 'rgba(96, 165, 250, 0.3)',
      title: 'Ya fue aprobada',
      subtitle: 'Esta solicitud ya había sido aprobada anteriormente.',
      detail: `La solicitud de ${alumno} — ${asignatura} ya está aprobada.`,
    },
    'ya-rechazada': {
      icon: <XCircle size={52} style={{ color: '#9CA3AF' }} />,
      bg: 'rgba(156, 163, 175, 0.12)',
      border: 'rgba(156, 163, 175, 0.3)',
      title: 'Ya fue rechazada',
      subtitle: 'Esta solicitud ya había sido rechazada anteriormente.',
      detail: `La solicitud de ${alumno} — ${asignatura} ya está rechazada.`,
    },
  }

  const c = config[tipo]

  return (
    <main className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-md w-full text-center animate-fade-in">

        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-6"
          style={{ background: c.bg, border: `2px solid ${c.border}` }}>
          {c.icon}
        </div>

        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-1 h-7 rounded-full" style={{ background: 'var(--nacap-red)' }} />
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--nacap-red)' }}>
            Área Mecánica — INACAP
          </span>
        </div>

        <h1 className="text-3xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>{c.title}</h1>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{c.subtitle}</p>

        <div className="card p-4 mb-8 text-left">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{c.detail}</p>
        </div>

        <Link href="/" className="btn-secondary inline-flex">
          Cerrar
        </Link>
      </div>
    </main>
  )
}

function ErrorPage({ mensaje }: { mensaje: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-md w-full text-center animate-fade-in">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6"
          style={{ background: 'rgba(239,68,68,0.12)', border: '2px solid rgba(239,68,68,0.3)' }}>
          <AlertCircle size={40} style={{ color: '#EF4444' }} />
        </div>
        <h1 className="text-2xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>Error</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>{mensaje}</p>
        <Link href="/" className="btn-secondary inline-flex">Ir al inicio</Link>
      </div>
    </main>
  )
}
