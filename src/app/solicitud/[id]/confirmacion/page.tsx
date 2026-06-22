'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Clock, Bell, XCircle, QrCode, KeyRound } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabaseClient } from '@/lib/supabase-client'
import QRCode from 'qrcode'

interface SolicitudEstado {
  estado: string
  codigo_entrega: string | null
  alumno: string
  asignatura: string
  observaciones: string | null
}

export default function ConfirmacionPage() {
  const params = useParams()
  const idStr = params?.id as string | undefined
  const [id, setId] = useState<string>('')
  
  useEffect(() => {
    if (idStr) {
      setId(idStr)
    }
  }, [idStr])

  const [solicitud, setSolicitud] = useState<SolicitudEstado | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)

  // Cargar estado de la solicitud y polling cada 10s
  useEffect(() => {
    if (!id) return

    let isFetching = false

    async function fetchEstado() {
      if (isFetching) return
      isFetching = true
      setFetchError(false)
      try {
        const queryPromise = supabaseClient
          .from('solicitudes')
          .select('estado, codigo_entrega, alumno, asignatura, observaciones')
          .eq('id', id)
          .maybeSingle()

        const timeoutPromise = new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout de consulta')), 15000)
        )

        const { data, error } = await Promise.race([queryPromise, timeoutPromise])

        if (error) {
          throw error
        }

        if (data) {
          setSolicitud(data)
          if (data.estado === 'APROBADA' && data.codigo_entrega) {
            QRCode.toDataURL(data.codigo_entrega, {
              width: 280,
              margin: 2,
              color: { dark: '#FFFFFF', light: '#0D1B2E' },
              errorCorrectionLevel: 'H',
            }).then(setQrDataUrl).catch(() => {})
          }
        }
      } catch (err) {
        console.error('Error fetching estado:', err)
        setFetchError(true)
      } finally {
        setLoading(false)
        isFetching = false
      }
    }

    fetchEstado()
    // Polling cada 10s para detectar cuando el docente aprueba
    const interval = setInterval(fetchEstado, 10000)
    return () => clearInterval(interval)
  }, [id])

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: 'var(--bg-primary)' }}>

      <div className="max-w-md w-full animate-fade-in">

        {/* Header INACAP */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-1 h-8 rounded-full" style={{ background: 'var(--nacap-red)' }} />
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--nacap-red)' }}>
              Área Mecánica — INACAP
            </span>
          </div>
        </div>

        {loading ? (
          <div className="card p-10 flex flex-col items-center gap-4">
            <span className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Cargando estado de tu solicitud...</p>
          </div>
        ) : fetchError && !solicitud ? (
          <div className="card p-10 flex flex-col items-center gap-4 text-center">
            <XCircle size={40} className="text-red-500 mb-2" />
            <h2 className="text-lg font-bold text-white">Error de conexión</h2>
            <p className="text-sm text-gray-400">No se pudo cargar el estado de la solicitud. Revisa tu conexión a internet o intenta de nuevo.</p>
            <button onClick={() => { setLoading(true); window.location.reload() }} className="btn-primary mt-4 w-full justify-center py-3">
              Reintentar
            </button>
            <Link href="/" className="btn-secondary mt-2 w-full justify-center py-3">
              Volver al inicio
            </Link>
          </div>
        ) : solicitud?.estado === 'APROBADA' ? (
          /* ── APROBADA: mostrar QR prominente ── */
          <>
            <div className="text-center mb-5">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
                style={{ background: 'rgba(34, 197, 94, 0.12)', border: '2px solid rgba(34, 197, 94, 0.3)' }}>
                <CheckCircle2 size={40} style={{ color: '#22C55E' }} />
              </div>
              <h1 className="text-2xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>
                ¡Solicitud Aprobada!
              </h1>
              <p className="text-sm text-gray-400">
                Preséntate en el pañol y muestra este QR al pañolero.
              </p>
            </div>

            {/* QR Code */}
            {qrDataUrl && (
              <div className="card p-6 mb-4 flex flex-col items-center"
                style={{ background: 'rgba(34,197,94,0.04)', borderColor: 'rgba(34,197,94,0.2)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <QrCode size={16} style={{ color: '#22C55E' }} />
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#22C55E' }}>
                    Código QR de Retiro
                  </p>
                </div>
                <img
                  src={qrDataUrl}
                  alt="QR de retiro"
                  className="rounded-2xl"
                  style={{ width: 240, height: 240 }}
                />
                {/* Código numérico debajo como respaldo */}
                <div className="mt-4 flex items-center gap-2">
                  <KeyRound size={13} style={{ color: 'var(--text-muted)' }} />
                  <p className="text-xs text-gray-500">Código manual:</p>
                  <span className="font-mono font-black text-lg tracking-[.3em]"
                    style={{ color: 'var(--text-primary)' }}>
                    {solicitud.codigo_entrega}
                  </span>
                </div>
              </div>
            )}

            {/* Info solicitud */}
            <div className="card p-4 mb-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-500">Alumno:</span>
                <span className="text-xs font-bold text-white">{solicitud.alumno}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Asignatura:</span>
                <span className="text-xs font-semibold text-gray-300">{solicitud.asignatura}</span>
              </div>
            </div>

            <Link href="/" className="btn-secondary w-full justify-center py-4 mb-3">
              Volver al inicio
            </Link>
          </>
        ) : solicitud?.estado === 'RECHAZADA' ? (
          /* ── RECHAZADA ── */
          <>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
                style={{ background: 'rgba(239, 68, 68, 0.12)', border: '2px solid rgba(239, 68, 68, 0.3)' }}>
                <XCircle size={40} style={{ color: '#EF4444' }} />
              </div>
              <h1 className="text-2xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>
                Solicitud Rechazada
              </h1>
              <p className="text-sm text-gray-400 mb-4">
                Tu docente rechazó esta solicitud.
              </p>
              {solicitud.observaciones && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4 text-left">
                  <p className="text-xs text-red-400 font-bold uppercase tracking-wider mb-1">Motivo del rechazo:</p>
                  <p className="text-sm text-gray-300 italic">"{solicitud.observaciones}"</p>
                </div>
              )}
            </div>
            <Link href="/" className="btn-secondary w-full justify-center py-4 mb-3">
              Volver al inicio
            </Link>
          </>
        ) : (
          /* ── PENDIENTE / default ── */
          <>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
                style={{ background: 'rgba(34, 197, 94, 0.12)', border: '2px solid rgba(34, 197, 94, 0.3)' }}>
                <CheckCircle2 size={40} style={{ color: '#22C55E' }} />
              </div>
              <h1 className="text-2xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>
                ¡Solicitud Enviada!
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Tu solicitud fue registrada exitosamente.
              </p>
            </div>

            <div className="card p-6 mb-5">
              <h2 className="text-sm font-bold uppercase tracking-wider mb-5" style={{ color: 'var(--text-secondary)' }}>
                ¿Qué sigue?
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>
                    <Bell size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Notificación al docente
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      Tu docente recibió una notificación push con los detalles. Deberá aprobar la solicitud.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(96,165,250,0.12)', color: '#60A5FA' }}>
                    <Clock size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Espera la aprobación
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      Esta página se actualiza automáticamente. Cuando el docente apruebe, verás el QR de retiro aquí.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E' }}>
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Retira en el pañol
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      Preséntate al pañol mecánico con tu RUT y el QR que aparecerá aquí al ser aprobado.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ID de referencia */}
            <div className="card p-4 mb-6">
              <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                ID de referencia
              </p>
              <p className="text-center font-mono text-sm font-bold mt-1" style={{ color: 'var(--text-secondary)' }}>
                {id.slice(0, 8).toUpperCase()}
              </p>
            </div>

            <Link href="/" className="btn-secondary w-full justify-center py-4 mb-3">
              Volver al inicio
            </Link>
          </>
        )}
      </div>
    </main>
  )
}
