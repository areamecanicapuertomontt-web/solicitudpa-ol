'use client'

import { useState, useEffect, use } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  CheckCircle2, XCircle, AlertCircle, User, Hash,
  BookOpen, Calendar, Shield, Clock, Loader2, ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import { formatFechaHora, getJornadaLabel } from '@/lib/utils'

export default function AprobarPage() {
  const router = useRouter()
  const params = useParams()
  const token = params.token as string

  const [profile, setProfile] = useState<any>(null)
  const [solicitud, setSolicitud] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<'aprobada' | 'rechazada' | 'ya-procesada' | null>(null)
  const [resultState, setResultState] = useState<string>('')
  const [showRechazoInput, setShowRechazoInput] = useState(false)
  const [motivoRechazo, setMotivoRechazo] = useState('')

  useEffect(() => {
    if (!token) return

    async function checkAuthAndLoad() {
      setLoading(true)
      try {
        // 1. Verificar sesión
        const { data: { user } } = await supabaseBrowser.auth.getUser()
        if (!user) {
          // Redirigir a login indicando a dónde volver
          router.replace(`/login?next=/aprobar/${token}`)
          return
        }

        // 2. Cargar perfil
        const { data: perf, error: perfErr } = await supabaseBrowser
          .from('perfiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (perfErr || !perf) {
          setError('No se pudo verificar tu cuenta de usuario.')
          setLoading(false)
          return
        }

        if (perf.rol !== 'ADMIN' && perf.rol !== 'DOCENTE') {
          setError('Acceso denegado. Esta página es exclusiva para docentes autorizados.')
          setLoading(false)
          return
        }

        setProfile(perf)

        // 3. Cargar solicitud
        const { data: sol, error: solErr } = await supabaseBrowser
          .from('solicitudes')
          .select('*, docente:docentes(*), items:items_solicitud(*)')
          .eq('token_aprobacion', token)
          .single()

        if (solErr || !sol) {
          setError('Solicitud no encontrada o enlace de token no válido.')
          setLoading(false)
          return
        }

        // 4. Verificar si ya fue procesada
        if (sol.estado !== 'PENDIENTE') {
          setResult('ya-procesada')
          setResultState(sol.estado)
          setSolicitud(sol)
          setLoading(false)
          return
        }

        // 5. Validar si el docente es el asignado (o Admin)
        const isDocenteAsignado = sol.docente_id === perf.id || (sol.docente && sol.docente.email === perf.email)
        if (perf.rol !== 'ADMIN' && !isDocenteAsignado) {
          setError('Esta solicitud está asignada a otra asignatura. No tienes autorización para decidir sobre ella.')
          setLoading(false)
          return
        }

        setSolicitud(sol)
      } catch (err: any) {
        console.error(err)
        setError('Ocurrió un error inesperado al cargar la solicitud.')
      } finally {
        setLoading(false)
      }
    }

    checkAuthAndLoad()
  }, [token, router])

  const handleDecision = async (accion: 'aprobar' | 'rechazar') => {
    if (!solicitud || processing) return
    setProcessing(true)
    setError(null)

    try {
      // Obtener el token de sesión del navegador
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      const token = session?.access_token

      const res = await fetch(`/api/solicitudes/${solicitud.id}/decidir`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ accion, motivoRechazo: accion === 'rechazar' ? motivoRechazo : undefined }),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Ocurrió un error al procesar tu decisión.')
      }

      setResult(accion === 'aprobar' ? 'aprobada' : 'rechazada')
    } catch (err: any) {
      setError(err.message || 'Error de conexión con el servidor.')
    } finally {
      setProcessing(false)
    }
  }

  // ──── Estados de Carga y Error ────

  if (loading || (!solicitud && !error && !result)) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
          <p className="text-sm text-gray-400">Verificando credenciales y cargando solicitud...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4"
        style={{ background: 'var(--bg-primary)' }}>
        <div className="max-w-md w-full text-center animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6"
            style={{ background: 'rgba(239,68,68,0.12)', border: '2px solid rgba(239,68,68,0.3)' }}>
            <AlertCircle size={40} style={{ color: '#EF4444' }} />
          </div>
          <h1 className="text-2xl font-black mb-2 text-white">No se puede acceder</h1>
          <p className="text-sm mb-6 text-gray-400 leading-relaxed">{error}</p>
          <Link href="/" className="btn-secondary inline-flex">Ir al inicio</Link>
        </div>
      </main>
    )
  }

  // ──── Pantallas de Resultado ────

  if (result === 'ya-procesada') {
    const yaAprobada = ['APROBADA', 'ENTREGADA', 'DEVUELTA', 'DEVUELTA_INCOMPLETA'].includes(resultState)
    return (
      <main className="min-h-screen flex items-center justify-center px-4"
        style={{ background: 'var(--bg-primary)' }}>
        <div className="max-w-md w-full text-center animate-fade-in">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-6"
            style={{ 
              background: yaAprobada ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)', 
              border: `2px solid ${yaAprobada ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}` 
            }}>
            {yaAprobada ? <CheckCircle2 size={52} className="text-green-500" /> : <XCircle size={52} className="text-red-500" />}
          </div>

          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-1 h-7 rounded-full" style={{ background: 'var(--nacap-red)' }} />
            <span className="text-xs font-bold tracking-widest uppercase text-red-500">
              Área Mecánica — INACAP
            </span>
          </div>

          <h1 className="text-3xl font-black mb-2 text-white">
            {yaAprobada ? 'Solicitud Aprobada' : 'Solicitud Rechazada'}
          </h1>
          <p className="text-sm mb-4 text-gray-400">
            Esta solicitud ya fue procesada anteriormente con estado **{resultState}**.
          </p>

          <div className="card p-4 mb-8 text-left">
            <p className="text-sm text-gray-300">
              El alumno **{solicitud?.alumno}** solicitó materiales para la asignatura **{solicitud?.asignatura}**.
            </p>
          </div>

          <Link href="/" className="btn-secondary inline-flex">
            Cerrar Ventana
          </Link>
        </div>
      </main>
    )
  }

  if (result === 'aprobada' || result === 'rechazada') {
    const aprobada = result === 'aprobada'
    return (
      <main className="min-h-screen flex items-center justify-center px-4"
        style={{ background: 'var(--bg-primary)' }}>
        <div className="max-w-md w-full text-center animate-fade-in">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-6"
            style={{ 
              background: aprobada ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)', 
              border: `2px solid ${aprobada ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}` 
            }}>
            {aprobada ? <CheckCircle2 size={52} className="text-green-500" /> : <XCircle size={52} className="text-red-500" />}
          </div>

          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-1 h-7 rounded-full" style={{ background: 'var(--nacap-red)' }} />
            <span className="text-xs font-bold tracking-widest uppercase text-red-500">
              Área Mecánica — INACAP
            </span>
          </div>

          <h1 className="text-3xl font-black mb-2 text-white">
            {aprobada ? '¡Solicitud Aprobada!' : 'Solicitud Rechazada'}
          </h1>
          <p className="text-sm mb-6 text-gray-400">
            {aprobada 
              ? 'El pañolero ha sido notificado y el alumno ya puede retirar las herramientas presentando su RUT.' 
              : 'El estudiante recibirá un correo notificándole tu rechazo.'}
          </p>

          <div className="card p-4 mb-8 text-left">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Resumen:</p>
            <p className="text-sm text-gray-300">
              Has {aprobada ? 'aprobado' : 'rechazado'} el préstamo de materiales para el alumno **{solicitud?.alumno}** en la asignatura **{solicitud?.asignatura}**.
            </p>
          </div>

          <Link href="/" className="btn-secondary inline-flex">
            Finalizar
          </Link>
        </div>
      </main>
    )
  }

  // ──── Vista Principal del Docente ────

  return (
    <main className="min-h-screen py-8 px-4 sm:px-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-2xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 animate-fade-in">
          <div className="w-1.5 h-10 rounded-full" style={{ background: 'var(--nacap-red)' }} />
          <div>
            <p className="text-[10px] font-extrabold tracking-widest uppercase text-red-500">
              Revisión de Solicitud de Material
            </p>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Aprobación Docente
            </h1>
          </div>
        </div>

        {/* Welcome Card */}
        {profile && (
          <div className="card p-5 mb-5 bg-gradient-to-r from-red-600/10 to-red-900/5 border-red-500/20 relative overflow-hidden animate-fade-in">
            <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none translate-x-4 translate-y-4">
              <Shield size={140} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-bold tracking-wider uppercase text-red-400">Sesión Activa como Docente</p>
              <h2 className="text-lg font-black text-white mt-1">
                ¡Hola, {profile.nombre}! 👋
              </h2>
              <p className="text-xs mt-1 text-gray-400">
                Como docente de esta asignatura, debes validar si el alumno está autorizado para retirar estos materiales para su clase práctica.
              </p>
            </div>
          </div>
        )}

        {/* Form Details */}
        <div className="space-y-4 animate-fade-in" style={{ animationDelay: '80ms' }}>
          
          <div className="card p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-white/5 pb-2">
              Datos de la Solicitud
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <User size={16} className="text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-500">Alumno Solicitante</p>
                  <p className="text-sm font-bold text-white">{solicitud.alumno}</p>
                  <p className="text-xs text-gray-400">RUT: {solicitud.rut}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <BookOpen size={16} className="text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-500">Asignatura / Sección</p>
                  <p className="text-sm font-bold text-white">{solicitud.asignatura}</p>
                  <p className="text-xs text-gray-400">Sección: {solicitud.seccion} ({getJornadaLabel(solicitud.jornada)})</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar size={16} className="text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-500">Fecha Programada</p>
                  <p className="text-sm font-bold text-white">{formatFechaHora(solicitud.created_at)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock size={16} className="text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-500">Estado Actual</p>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-ping" />
                    PENDIENTE DE APROBACIÓN
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Requested Items Table */}
          <div className="card p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-white/5 pb-2">
              Lista de Herramientas y Materiales
            </h3>

            <div className="rounded-xl overflow-hidden border border-white/5">
              <table className="nacap-table">
                <thead>
                  <tr>
                    <th className="w-16 text-center">Cant.</th>
                    <th>Descripción del Material</th>
                    <th className="w-24">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {(solicitud.items || []).map((item: any, i: number) => (
                    <tr key={i}>
                      <td className="text-center font-black text-red-500 text-base">{item.cantidad}</td>
                      <td className="font-semibold text-white">{item.descripcion}</td>
                      <td>
                        <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-white/5 text-gray-300">
                          {item.estado_item}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Buttons */}
          {!showRechazoInput ? (
            <div className="flex flex-col sm:flex-row gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowRechazoInput(true)}
                disabled={processing}
                className="btn-secondary !py-3.5 flex-1 flex justify-center items-center gap-2 hover:!bg-red-500/10 hover:!text-red-500 hover:!border-red-500/30 transition-all font-bold text-sm cursor-pointer"
              >
                <XCircle size={18} />
                Rechazar Solicitud
              </button>
              <button
                type="button"
                onClick={() => handleDecision('aprobar')}
                disabled={processing}
                className="btn-primary flex-1 !py-3.5 !bg-green-600 hover:!bg-green-700 flex justify-center items-center gap-2 font-bold text-sm cursor-pointer"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    Aprobar Solicitud
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="card p-4 border-red-500/20 bg-red-500/5 space-y-3 animate-fade-in text-left mt-3">
              <label className="label text-xs font-bold uppercase tracking-wider text-red-400">
                Motivo del Rechazo
              </label>
              <textarea
                value={motivoRechazo}
                onChange={e => setMotivoRechazo(e.target.value)}
                placeholder="Escribe aquí el motivo del rechazo. El alumno lo recibirá en su correo electrónico..."
                className="input-field min-h-[80px] text-xs resize-none"
                maxLength={250}
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => { setShowRechazoInput(false); setMotivoRechazo('') }}
                  className="btn-secondary !py-1.5 !px-3 text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleDecision('rechazar')}
                  disabled={processing || !motivoRechazo.trim()}
                  className="btn-primary !py-1.5 !px-3 !bg-red-600 hover:!bg-red-700 text-xs text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? 'Rechazando...' : 'Confirmar Rechazo'}
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </main>
  )
}
