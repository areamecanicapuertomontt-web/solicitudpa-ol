'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import NotificationBell from '@/components/NotificationBell'
import HelpButton from '@/components/HelpButton'
import {
  Package, Clock, CheckCircle2, XCircle, Truck,
  RefreshCw, Search, Settings, ChevronRight,
  User, BookOpen, Hash, Calendar, KeyRound, X, Wifi, LogOut,
  AlertCircle, Loader2, Check, AlertTriangle, Wrench, Bell, History, GraduationCap, QrCode
} from 'lucide-react'
import { formatFechaHora, getJornadaLabel } from '@/lib/utils'
import { supabaseBrowser } from '@/lib/supabase-browser'
import type { Solicitud, EstadoSolicitud } from '@/lib/types'

function Pagination({
  currentPage,
  totalPages,
  onPageChange
}: {
  currentPage: number
  totalPages: number
  onPageChange: (p: number) => void
}) {
  if (totalPages <= 1) return null

  const range = []
  const maxPagesToShow = 5
  let start = Math.max(1, currentPage - 2)
  let end = Math.min(totalPages, start + maxPagesToShow - 1)

  if (end - start < maxPagesToShow - 1) {
    start = Math.max(1, end - maxPagesToShow + 1)
  }

  for (let i = start; i <= end; i++) {
    range.push(i)
  }

  return (
    <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-4 select-none">
      <p className="text-xs text-gray-400">
        Página <span className="text-white font-bold">{currentPage}</span> de <span className="text-white font-bold">{totalPages}</span>
      </p>
      <div className="flex items-center gap-1.5 font-medium">
        <button
          type="button"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="btn-secondary !px-2.5 !py-1 text-xs disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          Anterior
        </button>
        
        {start > 1 && (
          <>
            <button type="button" onClick={() => onPageChange(1)} className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer ${currentPage === 1 ? 'bg-red-600 text-white' : 'hover:bg-white/5 text-gray-400'}`}>1</button>
            {start > 2 && <span className="text-gray-600 text-xs px-1">...</span>}
          </>
        )}

        {range.map(p => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer ${
              currentPage === p 
                ? 'bg-red-600 text-white' 
                : 'hover:bg-white/5 text-gray-400 hover:text-white'
            }`}
            style={currentPage === p ? { background: 'var(--nacap-red)' } : {}}
          >
            {p}
          </button>
        ))}

        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="text-gray-600 text-xs px-1">...</span>}
            <button type="button" onClick={() => onPageChange(totalPages)} className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer ${currentPage === totalPages ? 'bg-red-600 text-white' : 'hover:bg-white/5 text-gray-400'}`}>{totalPages}</button>
          </>
        )}

        <button
          type="button"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="btn-secondary !px-2.5 !py-1 text-xs disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          Siguiente
        </button>
      </div>
    </div>
  )
}


const ESTADOS: { value: EstadoSolicitud | 'TODAS'; label: string }[] = [
  { value: 'TODAS',    label: 'Todas' },
  { value: 'PENDIENTE', label: 'Pendientes' },
  { value: 'APROBADA',  label: 'Aprobadas' },
  { value: 'ENTREGADA', label: 'Entregadas' },
  { value: 'DEVUELTA',  label: 'Devueltas' },
  { value: 'RECHAZADA', label: 'Rechazadas' },
]

function BadgeEstado({ estado }: { estado: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    PENDIENTE: { label: 'Pendiente', cls: 'badge-pending',   icon: <Clock size={11} /> },
    APROBADA:  { label: 'Aprobada',  cls: 'badge-approved',  icon: <CheckCircle2 size={11} /> },
    RECHAZADA: { label: 'Rechazada', cls: 'badge-rejected',  icon: <XCircle size={11} /> },
    ENTREGADA: { label: 'Entregada', cls: 'badge-delivered', icon: <Truck size={11} /> },
    DEVUELTA:  { label: 'Devuelta',  cls: 'badge-approved',  icon: <CheckCircle2 size={11} /> },
    DEVUELTA_INCOMPLETA: { label: 'Falta Material ⚠️', cls: 'badge-pending', icon: <Clock size={11} /> },
  }
  const cfg = map[estado] || { label: estado, cls: 'badge', icon: null }
  return <span className={cfg.cls}>{cfg.icon}{cfg.label}</span>
}

// ─── Modal código de entrega con escáner QR ──────────────────────────────────
function ModalCodigo({
  solicitud,
  onClose,
  onEntregado,
}: {
  solicitud: Solicitud
  onClose: () => void
  onEntregado: () => void
}) {
  const [tab, setTab] = useState<'qr' | 'manual'>('qr')
  const [codigo, setCodigo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'detected' | 'error'>('idle')
  const [scanMsg, setScanMsg] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)

  // Detener cámara al desmontar o cambiar de tab
  useEffect(() => {
    return () => stopCamera()
  }, [])

  function stopCamera() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  async function startScanner() {
    setScanStatus('scanning')
    setScanMsg('Apuntando cámara al QR del alumno...')
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      scanFrame()
    } catch {
      setScanStatus('error')
      setScanMsg('No se pudo acceder a la cámara. Usa el código manual.')
    }
  }

  async function scanFrame() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(scanFrame)
      return
    }
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    let detectedCode: string | null = null

    // Intento 1: BarcodeDetector nativo (Android Chrome)
    if ('BarcodeDetector' in window) {
      try {
        // @ts-ignore
        const detector = new BarcodeDetector({ formats: ['qr_code'] })
        const codes = await detector.detect(canvas)
        if (codes.length > 0) detectedCode = codes[0].rawValue
      } catch {}
    }

    // Intento 2: jsQR como fallback (iOS Safari, Firefox, etc.)
    if (!detectedCode) {
      try {
        const jsQR = (await import('jsqr')).default
        const result = jsQR(imageData.data, imageData.width, imageData.height)
        if (result) detectedCode = result.data
      } catch {}
    }

    if (detectedCode) {
      stopCamera()
      const clean = detectedCode.replace(/\D/g, '').slice(0, 6)
      setCodigo(clean)
      setScanStatus('detected')
      setScanMsg(`✅ QR detectado — código: ${clean}`)
      // Confirmar automáticamente si el código es válido
      if (clean.length === 6) {
        await confirmarCodigo(clean)
      }
    } else {
      rafRef.current = requestAnimationFrame(scanFrame)
    }
  }

  async function confirmarCodigo(c: string) {
    if (c.length !== 6) { setError('El código tiene 6 dígitos'); return }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/panel/${solicitud.id}/entregar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: c }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Error al confirmar'); setScanStatus('idle'); return }
      onEntregado()
    } catch {
      setError('Error de conexión')
      setScanStatus('idle')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="card w-full max-w-sm animate-fade-in overflow-hidden">

        {/* Header */}
        <div className="p-5 pb-0">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--nacap-red)' }}>
                Confirmar Entrega
              </p>
              <h2 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>
                {solicitud.alumno}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{solicitud.asignatura}</p>
            </div>
            <button onClick={() => { stopCamera(); onClose() }}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors"
              style={{ color: 'var(--text-muted)' }}>
              <X size={18} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex rounded-xl overflow-hidden mb-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <button
              onClick={() => { stopCamera(); setTab('qr'); setScanStatus('idle') }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold transition-all ${
                tab === 'qr' ? 'rounded-xl' : 'text-gray-500'
              }`}
              style={tab === 'qr' ? { background: 'var(--nacap-red)', color: 'white' } : {}}
            >
              <QrCode size={13} /> Escanear QR
            </button>
            <button
              onClick={() => { stopCamera(); setTab('manual'); setScanStatus('idle') }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold transition-all ${
                tab === 'manual' ? 'rounded-xl' : 'text-gray-500'
              }`}
              style={tab === 'manual' ? { background: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)' } : {}}
            >
              <KeyRound size={13} /> Código Manual
            </button>
          </div>
        </div>

        <div className="px-5 pb-5">
          {/* Materiales */}
          <div className="mb-4 rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Materiales</p>
            <div className="space-y-1">
              {(solicitud.items || []).map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-black"
                    style={{ background: 'var(--nacap-red)', color: 'white' }}>
                    {item.cantidad}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{item.descripcion}</span>
                </div>
              ))}
            </div>
          </div>

          {/* TAB: Escanear QR */}
          {tab === 'qr' && (
            <div>
              {scanStatus === 'idle' && (
                <button
                  onClick={startScanner}
                  className="btn-primary w-full py-3 mb-3"
                >
                  <QrCode size={16} /> Activar Cámara y Escanear
                </button>
              )}

              {scanStatus === 'scanning' && (
                <div className="mb-3">
                  <div className="relative rounded-xl overflow-hidden bg-black" style={{ aspectRatio: '4/3' }}>
                    <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                    {/* Guía de encuadre */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-44 h-44 border-2 border-white/60 rounded-2xl" />
                    </div>
                  </div>
                  <p className="text-xs text-center text-gray-400 mt-2">{scanMsg}</p>
                </div>
              )}

              {scanStatus === 'detected' && (
                <div className="text-center py-4">
                  <p className="text-sm font-bold text-green-400 mb-1">{scanMsg}</p>
                  {loading && <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin inline-block" />}
                </div>
              )}

              {scanStatus === 'error' && (
                <div className="mb-3">
                  <p className="text-xs text-center text-amber-400 mb-3">{scanMsg}</p>
                  <button onClick={() => setTab('manual')} className="btn-secondary w-full py-2 text-xs">
                    Usar código manual
                  </button>
                </div>
              )}

              {/* Canvas oculto para análisis de frames */}
              <canvas ref={canvasRef} className="hidden" />
            </div>
          )}

          {/* TAB: Código Manual */}
          {tab === 'manual' && (
            <div>
              <label className="label flex items-center gap-2">
                <KeyRound size={13} />
                Código de 6 dígitos
              </label>
              <input
                value={codigo}
                onChange={e => { setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(null) }}
                type="text"
                inputMode="numeric"
                maxLength={6}
                className="input-field text-center text-3xl font-black tracking-[.4em] mb-4"
                placeholder="000000"
                style={{ letterSpacing: '.4em' }}
                autoFocus
              />
              <button
                onClick={() => confirmarCodigo(codigo)}
                disabled={loading || codigo.length !== 6}
                className="btn-success w-full py-3"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <><Truck size={16} /> Confirmar Entrega</>
                )}
              </button>
            </div>
          )}

          {error && (
            <p className="text-xs mt-3 flex items-center gap-1" style={{ color: 'var(--nacap-red)' }}>
              <XCircle size={12} /> {error}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Vista dedicada para el ROL DOCENTE ─────────────────────────────────────
function DocenteView({
  profile,
  onLogout,
}: {
  profile: any
  onLogout: () => void
}) {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'pendientes' | 'historial'>('pendientes')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [deciding, setDeciding] = useState(false)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [showRechazoForm, setShowRechazoForm] = useState(false)
  const [decisionError, setDecisionError] = useState<string | null>(null)
  const [isLive, setIsLive] = useState(false)

  const fetchSolicitudes = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await fetch('/api/panel')
      const data = await res.json()
      setSolicitudes(data.solicitudes || [])
    } catch {
      if (!silent) setSolicitudes([])
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSolicitudes() }, [fetchSolicitudes])

  // Realtime
  useEffect(() => {
    const channel = supabaseBrowser
      .channel('docente-solicitudes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitudes' }, () => fetchSolicitudes(true))
      .subscribe(status => setIsLive(status === 'SUBSCRIBED'))
    return () => { supabaseBrowser.removeChannel(channel) }
  }, [fetchSolicitudes])

  const pendientes = solicitudes.filter(s => s.estado === 'PENDIENTE')
  const historial  = solicitudes.filter(s => s.estado !== 'PENDIENTE')
  const lista = tab === 'pendientes' ? pendientes : historial
  const selected = solicitudes.find(s => s.id === selectedId)

  async function handleDecidir(accion: 'aprobar' | 'rechazar') {
    if (!selected) return
    setDeciding(true)
    setDecisionError(null)
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session) { setDecisionError('Sesión expirada'); return }
      const res = await fetch(`/api/solicitudes/${selected.id}/decidir`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ accion, motivoRechazo: accion === 'rechazar' ? motivoRechazo : undefined }),
      })
      const json = await res.json()
      if (!res.ok) { setDecisionError(json.error || 'Error'); return }
      setSelectedId(null)
      setShowRechazoForm(false)
      setMotivoRechazo('')
      fetchSolicitudes(true)
    } catch { setDecisionError('Error de conexión') }
    finally { setDeciding(false) }
  }

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header className="glass sticky top-0 z-30 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 rounded-full" style={{ background: 'var(--nacap-red)' }} />
          <div>
            <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--nacap-red)' }}>Área Mecánica</p>
            <h1 className="text-base font-black leading-none" style={{ color: 'var(--text-primary)' }}>Portal Docente</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Nombre */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/5" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <GraduationCap size={14} style={{ color: 'var(--nacap-red)' }} />
            <span className="text-xs font-bold">{profile.nombre}</span>
          </div>
          {/* En vivo */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: isLive ? 'rgba(34,197,94,0.12)' : 'rgba(96,165,250,0.10)' }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: isLive ? '#22C55E' : '#60A5FA' }} />
            <span className="text-xs font-semibold hidden sm:inline" style={{ color: isLive ? '#22C55E' : '#60A5FA' }}>{isLive ? 'En vivo' : 'Auto'}</span>
          </div>
          <NotificationBell />
          <HelpButton rol="DOCENTE" />
          <button onClick={() => fetchSolicitudes(false)} className="btn-secondary !px-3 !py-2" title="Actualizar">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={onLogout} className="btn-secondary !px-3 !py-2 hover:!text-red-400" title="Cerrar Sesión">
            <LogOut size={15} />
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Bienvenida */}
        <div className="card p-5 mb-6 relative overflow-hidden animate-fade-in" style={{ background: 'linear-gradient(135deg, rgba(230,57,70,0.12) 0%, rgba(17,34,64,0.6) 100%)', borderColor: 'rgba(230,57,70,0.2)' }}>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
            <GraduationCap size={96} />
          </div>
          <p className="text-xs font-bold tracking-wider uppercase text-red-400 mb-1">Panel Docente</p>
          <h2 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>¡Hola, {profile.nombre.split(' ')[0]}! 👋</h2>
          <p className="text-xs mt-1.5 text-gray-400">
            {pendientes.length > 0
              ? <><span className="text-white font-bold">{pendientes.length} solicitud{pendientes.length > 1 ? 'es' : ''}</span> esperan tu decisión de aprobación.</>  
              : 'No tienes solicitudes pendientes de decisión. ¡Todo al día! ✅'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => { setTab('pendientes'); setSelectedId(null) }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
            style={tab === 'pendientes'
              ? { background: 'var(--nacap-red)', color: 'white' }
              : { background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}
          >
            <Bell size={14} />
            Por decidir
            {pendientes.length > 0 && (
              <span className="w-5 h-5 rounded-full text-xs font-black flex items-center justify-center" style={{ background: tab === 'pendientes' ? 'rgba(255,255,255,0.3)' : 'var(--nacap-red)', color: 'white' }}>
                {pendientes.length}
              </span>
            )}
          </button>
          <button
            onClick={() => { setTab('historial'); setSelectedId(null) }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
            style={tab === 'historial'
              ? { background: 'var(--nacap-red)', color: 'white' }
              : { background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}
          >
            <History size={14} />
            Historial
            <span className="text-xs opacity-60">({historial.length})</span>
          </button>
        </div>

        {/* Lista + Detalle */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Lista */}
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <div key={i} className="card h-28 animate-pulse" />)
            ) : lista.length === 0 ? (
              <div className="card p-10 text-center">
                {tab === 'pendientes' ? (
                  <>
                    <CheckCircle2 size={36} className="mx-auto mb-3 text-green-500" />
                    <p className="font-bold" style={{ color: 'var(--text-primary)' }}>Sin solicitudes pendientes</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>No hay solicitudes esperando tu aprobación.</p>
                  </>
                ) : (
                  <>
                    <History size={36} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                    <p style={{ color: 'var(--text-secondary)' }}>Sin historial aún</p>
                  </>
                )}
              </div>
            ) : (
              lista.map(sol => (
                <div
                  key={sol.id}
                  onClick={() => setSelectedId(sol.id === selectedId ? null : sol.id)}
                  className="card p-4 cursor-pointer transition-all duration-200 hover:scale-[1.01]"
                  style={selectedId === sol.id ? { outline: '2px solid var(--nacap-red)', outlineOffset: '0px' } : {}}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <User size={13} style={{ color: 'var(--text-muted)' }} />
                        <p className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{sol.alumno}</p>
                        {sol.carrera && <span className="text-[9px] font-bold px-1 py-0.5 rounded flex-shrink-0" style={{ background: 'rgba(220,38,38,0.2)', color: '#f87171' }}>{sol.carrera}</span>}
                      </div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <Hash size={12} style={{ color: 'var(--text-muted)' }} />
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{sol.rut}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <BookOpen size={12} style={{ color: 'var(--text-muted)' }} />
                        <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{sol.asignatura} — {sol.seccion} ({getJornadaLabel(sol.jornada)})</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <BadgeEstado estado={sol.estado} />
                      <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-2">
                    {(sol.items || []).slice(0, 3).map((item, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
                        {item.cantidad}× {item.descripcion}
                      </span>
                    ))}
                    {(sol.items?.length || 0) > 3 && (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>+{(sol.items?.length || 0) - 3} más</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Calendar size={11} style={{ color: 'var(--text-muted)' }} />
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatFechaHora(sol.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Detalle */}
          {selected && (
            <div className="card p-5 animate-fade-in lg:sticky lg:top-24 lg:self-start">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setSelectedId(null)} className="p-1 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all">
                    <X size={16} />
                  </button>
                  <h2 className="font-black text-lg" style={{ color: 'var(--text-primary)' }}>Detalle</h2>
                </div>
                <BadgeEstado estado={selected.estado} />
              </div>

              <div className="space-y-3 mb-5">
                {[
                  { icon: <User size={14} />,     label: 'Alumno',    value: selected.alumno },
                  { icon: <Hash size={14} />,     label: 'RUT',       value: selected.rut },
                  { icon: <BookOpen size={14} />, label: 'Asignatura',value: selected.asignatura },
                  { icon: <BookOpen size={14} />, label: 'Sección',   value: `${selected.seccion} — ${getJornadaLabel(selected.jornada)}` },
                  { icon: <Calendar size={14} />, label: 'Fecha',     value: formatFechaHora(selected.created_at) },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{item.icon}</span>
                    <span className="text-xs w-24 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{item.value}</span>
                  </div>
                ))}
              </div>

              <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>Materiales solicitados</h3>
              <div className="rounded-xl overflow-hidden mb-5" style={{ border: '1px solid var(--border)' }}>
                <table className="nacap-table">
                  <thead><tr><th>Cant.</th><th>Descripción</th><th>Estado</th></tr></thead>
                  <tbody>
                    {(selected.items || []).map((item, i) => (
                      <tr key={i}>
                        <td className="text-center font-black" style={{ color: 'var(--nacap-red)' }}>{item.cantidad}</td>
                        <td className="font-medium">{item.descripcion}</td>
                        <td><span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>{item.estado_item}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Acciones solo en PENDIENTE */}
              {selected.estado === 'PENDIENTE' && (
                <div className="pt-4 border-t border-white/10">
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--nacap-red)' }}>Tu Decisión</h3>

                  {decisionError && (
                    <div className="p-3 mb-3 rounded-xl flex items-center gap-2 text-xs" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>
                      <AlertCircle size={14} /><span>{decisionError}</span>
                    </div>
                  )}

                  {!showRechazoForm ? (
                    <div className="flex gap-2">
                      <button type="button" onClick={() => handleDecidir('aprobar')} disabled={deciding}
                        className="btn-success flex-1 py-3 flex items-center justify-center gap-1.5 cursor-pointer">
                        {deciding ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                        Aprobar ✅
                      </button>
                      <button type="button" onClick={() => setShowRechazoForm(true)} disabled={deciding}
                        className="btn-danger flex-1 py-3 flex items-center justify-center gap-1.5 cursor-pointer">
                        <X size={15} /> Rechazar
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="label mb-1 text-[11px]">Motivo del rechazo (opcional)</label>
                        <textarea rows={2} value={motivoRechazo} onChange={e => setMotivoRechazo(e.target.value)}
                          placeholder="Ej: Materiales no corresponden, sección incorrecta..."
                          className="input-field text-xs resize-none" />
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => handleDecidir('rechazar')} disabled={deciding}
                          className="btn-danger flex-1 py-2 text-xs flex items-center justify-center gap-1 cursor-pointer">
                          {deciding && <Loader2 size={12} className="animate-spin" />} Confirmar Rechazo
                        </button>
                        <button type="button" onClick={() => { setShowRechazoForm(false); setMotivoRechazo('') }} disabled={deciding}
                          className="btn-secondary px-3 py-2 text-xs cursor-pointer">Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Estado final (historial) */}
              {selected.estado !== 'PENDIENTE' && (
                <div className="mt-4 p-4 rounded-xl text-center"
                  style={{
                    background: selected.estado === 'RECHAZADA' ? 'rgba(239,68,68,0.05)' : 'rgba(34,197,94,0.05)',
                    border: `1px solid ${selected.estado === 'RECHAZADA' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)'}`
                  }}>
                  {selected.estado === 'RECHAZADA'
                    ? <XCircle size={24} className="mx-auto mb-2 text-red-500" />
                    : <CheckCircle2 size={24} className="mx-auto mb-2 text-green-500" />}
                  <p className="text-sm font-bold text-white">
                    {selected.estado === 'APROBADA' ? 'Aprobada por ti' :
                     selected.estado === 'ENTREGADA' ? 'Entregada al alumno' :
                     selected.estado === 'DEVUELTA' ? 'Material devuelto' :
                     selected.estado === 'RECHAZADA' ? 'Rechazada por ti' : selected.estado}
                  </p>
                  {selected.observaciones && (
                    <p className="text-[11px] text-gray-400 mt-1 italic">"{selected.observaciones}"</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function PanelPage() {
  const router = useRouter()
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [filtro, setFiltro] = useState<EstadoSolicitud | 'TODAS'>('TODAS')
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [modalSolicitud, setModalSolicitud] = useState<Solicitud | null>(null)
  const [isLive, setIsLive] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [reenviando, setReenviando] = useState<string | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  // ── Pagination States ──
  const itemsPerPage = 10
  const [page, setPage] = useState(1)

  const profileLoadedRef = useRef(false)

  // Reset page and selection when search or filters change
  useEffect(() => {
    setPage(1)
    setSelectedId(null)
  }, [busqueda, filtro])

  // ── Devolution Checklist States ──
  const [returnCheck, setReturnCheck] = useState<{ [itemId: string]: boolean }>({})
  const [submittingReturn, setSubmittingReturn] = useState(false)
  const [devolucionError, setDevolucionError] = useState<string | null>(null)

  // ── Docente Decision States ──
  const [deciding, setDeciding] = useState(false)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [showRechazoForm, setShowRechazoForm] = useState(false)
  const [decisionError, setDecisionError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function fetchProfile(user: any) {
      if (!user) return
      
      let profileData = null
      let profileError = null
      
      try {
        // Promesa para la consulta a perfiles
        const queryPromise = supabaseBrowser
          .from('perfiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        // Promesa de timeout para evitar cuelgues de red infinitos
        const timeoutPromise = new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout de consulta perfiles')), 3000)
        )
        
        // Competir: el primero que responda
        const res = await Promise.race([queryPromise, timeoutPromise])
        profileData = res.data
        profileError = res.error
      } catch (err: any) {
        profileError = err
      }
      
      if (active) {
        if (!profileError && profileData) {
          setProfile(profileData)
          setLoadingProfile(false)
          profileLoadedRef.current = true
        } else {
          console.warn("Error o timeout al cargar perfil, usando fallback temporal:", profileError)
          // Fallback temporal usando metadata de auth
          const fallbackPerf = {
            id: user.id,
            email: user.email,
            nombre: user.user_metadata?.nombre || 'Usuario Inacap',
            rol: user.user_metadata?.rol || 'PANOL',
            rut: user.user_metadata?.rut || '',
            jornada: user.user_metadata?.jornada || 'D',
            seccion: user.user_metadata?.seccion || '',
          }
          setProfile(fallbackPerf)
          setLoadingProfile(false) // Quitar loading inmediatamente
          profileLoadedRef.current = true
          
          // Reintentar en 1.5 segundos por si RLS estaba esperando la sincronización del token
          setTimeout(async () => {
            if (!active) return
            console.log("Reintentando cargar perfil desde la tabla perfiles...")
            try {
              const queryPromise = supabaseBrowser
                .from('perfiles')
                .select('*')
                .eq('id', user.id)
                .single()
              
              const timeoutPromise = new Promise<any>((_, reject) =>
                setTimeout(() => reject(new Error('Timeout de reintento')), 3000)
              )
              
              const retryRes = await Promise.race([queryPromise, timeoutPromise])
              if (!retryRes.error && retryRes.data) {
                console.log("✅ Perfil cargado exitosamente en reintento.")
                setProfile(retryRes.data)
              }
            } catch (retryErr) {
              console.warn("Reintento de carga de perfil falló o expiró:", retryErr)
            }
          }, 1500)
        }
      }
    }

    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(async (event, session) => {
      console.log(`[PanelPage] Evento Auth: ${event}`)
      if (session?.user) {
        await fetchProfile(session.user)
      } else if (event === 'SIGNED_OUT') {
        router.replace('/login')
      }
    })

    // Chequeo inicial
    supabaseBrowser.auth.getUser().then(({ data: { user } }) => {
      if (active) {
        if (user) {
          fetchProfile(user)
        } else {
          // Esperar un momento breve para ver si se restaura la sesión
          setTimeout(() => {
            if (active) {
              supabaseBrowser.auth.getSession().then(({ data: { session } }) => {
                if (session?.user) {
                  fetchProfile(session.user)
                } else if (!session) {
                  router.replace('/login')
                }
              })
            }
          }, 1500)
        }
      }
    })

    // Timeout de seguridad global de 5 segundos
    const safetyTimeout = setTimeout(() => {
      if (active && !profileLoadedRef.current) {
        console.warn("[PanelPage] Timeout global de 5s expiró sin perfil. Redirigiendo a /login...");
        router.replace('/login')
      }
    }, 5000)

    return () => {
      active = false
      subscription.unsubscribe()
      clearTimeout(safetyTimeout)
    }
  }, [router])

  async function handleLogout() {
    try {
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration()
        if (reg) {
          const sub = await reg.pushManager.getSubscription()
          if (sub) {
            await supabaseBrowser.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
          }
        }
      }
    } catch (e) {
      console.error('Error al limpiar suscripción push en logout:', e)
    }

    try {
      await supabaseBrowser.auth.signOut()
    } catch (err) {
      console.error('Error al cerrar sesión:', err)
    }
    window.location.href = '/login'
  }

  async function handleReenviarCodigo(id: string) {
    setReenviando(id)
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session) {
        alert('Sesión expirada. Por favor inicia sesión nuevamente.')
        return  // finally sí se ejecuta después de este return en JS/TS
      }

      const res = await fetch(`/api/solicitudes/${id}/reenviar-codigo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const data = await res.json()
      if (res.ok && data.ok) {
        alert('🔔 Código de entrega re-enviado correctamente al alumno.')
      } else {
        alert(`❌ Error al re-enviar: ${data.error || 'Intenta nuevamente'}`)
      }
    } catch (err) {
      console.error(err)
      alert('❌ Error de red al re-enviar el código.')
    } finally {
      setReenviando(null)  // siempre se ejecuta, incluso con return o throw
    }
  }


  const fetchSolicitudes = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await fetch(`/api/panel`)
      const data = await res.json()
      setSolicitudes(data.solicitudes || [])
    } catch {
      if (!silent) setSolicitudes([])
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSolicitudes() }, [fetchSolicitudes])

  // ── Supabase Realtime (WebSocket instantáneo) ─────────────────────────────
  useEffect(() => {
    const channel = supabaseBrowser
      .channel('panel-solicitudes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'solicitudes' },
        () => { fetchSolicitudes(true) }
      )
      .subscribe(status => {
        setIsLive(status === 'SUBSCRIBED')
      })

    return () => { supabaseBrowser.removeChannel(channel) }
  }, [fetchSolicitudes])

  // ── Polling cada 4 segundos silencioso (sin parpadeo) ────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSolicitudes(true)
    }, 4000)
    return () => clearInterval(interval)
  }, [fetchSolicitudes])

  const filtradas = solicitudes.filter(s => {
    // 1. Filter by status tab selection
    if (filtro !== 'TODAS') {
      if (filtro === 'ENTREGADA') {
        // "Entregadas" includes both active entregas and partial returns
        if (s.estado !== 'ENTREGADA' && s.estado !== 'DEVUELTA_INCOMPLETA') return false
      } else {
        if (s.estado !== filtro) return false
      }
    } else {
      // Under "Todas", exclude fully completed requests (DEVUELTA) so they don't clutter the active queue
      if (s.estado === 'DEVUELTA') return false
    }

    // 2. Search query filter
    const q = busqueda.trim().toLowerCase()
    return !q ||
      s.alumno.toLowerCase().includes(q) ||
      s.rut.toLowerCase().includes(q) ||
      s.asignatura.toLowerCase().includes(q)
  })

  const paginatedFiltradas = filtradas.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  const selected = solicitudes.find(s => s.id === selectedId)

  // Populate return check state & reset decision state
  useEffect(() => {
    if (selected && selected.items) {
      const initial: { [itemId: string]: boolean } = {}
      selected.items.forEach(item => {
        if (item.id) {
          initial[item.id] = !!item.devuelto
        }
      })
      setReturnCheck(initial)
      setDevolucionError(null)
    } else {
      setReturnCheck({})
      setDevolucionError(null)
    }
    setMotivoRechazo('')
    setShowRechazoForm(false)
    setDecisionError(null)
  }, [selectedId, selected?.estado])

  async function handleRegistrarDevolucion() {
    if (!selected) return
    setSubmittingReturn(true)
    setDevolucionError(null)
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session) {
        setDevolucionError('Sesión expirada. Por favor inicia sesión nuevamente.')
        return
      }

      const itemsPayload = Object.entries(returnCheck).map(([id, devuelto]) => ({
        id,
        devuelto
      }))

      const res = await fetch(`/api/panel/${selected.id}/devolver`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ items: itemsPayload })
      })

      const json = await res.json()
      if (!res.ok) {
        setDevolucionError(json.error || 'Error al registrar la devolución')
        return
      }

      setSelectedId(null)
      fetchSolicitudes(true)
    } catch (err: any) {
      setDevolucionError('Error de conexión o del servidor')
    } finally {
      setSubmittingReturn(false)
    }
  }

  async function handleDecidirDocente(accion: 'aprobar' | 'rechazar') {
    if (!selected) return
    setDeciding(true)
    setDecisionError(null)
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session) {
        setDecisionError('Sesión expirada. Por favor inicia sesión nuevamente.')
        return
      }

      const res = await fetch(`/api/solicitudes/${selected.id}/decidir`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          accion,
          motivoRechazo: accion === 'rechazar' ? motivoRechazo : undefined
        })
      })

      const json = await res.json()
      if (!res.ok) {
        setDecisionError(json.error || 'Error al procesar la decisión')
        return
      }

      // Éxito: recargar solicitudes y limpiar
      setShowRechazoForm(false)
      setMotivoRechazo('')
      fetchSolicitudes(true)
    } catch (err: any) {
      setDecisionError('Error de conexión o del servidor')
    } finally {
      setDeciding(false)
    }
  }

  const stats = {
    pendientes: solicitudes.filter(s => s.estado === 'PENDIENTE').length,
    aprobadas:  solicitudes.filter(s => s.estado === 'APROBADA').length,
    entregadas: solicitudes.filter(s => s.estado === 'ENTREGADA' || s.estado === 'DEVUELTA_INCOMPLETA').length,
    devueltas:  solicitudes.filter(s => s.estado === 'DEVUELTA').length,
  }

  if (loadingProfile) {
    return (
      <main className="min-h-screen py-8 px-4 flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="max-w-md w-full text-center space-y-4">
          <div className="flex justify-center">
            <span className="w-10 h-10 border-4 border-white/20 border-t-red-600 rounded-full animate-spin" />
          </div>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest animate-pulse">Cargando tu perfil...</p>
        </div>
      </main>
    )
  }

  // ── Si el usuario es DOCENTE, mostrar su vista dedicada ──────────────────
  if (profile?.rol === 'DOCENTE') {
    return <DocenteView profile={profile} onLogout={handleLogout} />
  }

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>

      {/* Modal código */}
      {modalSolicitud && (
        <ModalCodigo
          solicitud={modalSolicitud}
          onClose={() => setModalSolicitud(null)}
          onEntregado={() => {
            setModalSolicitud(null)
            setSelectedId(null)
            fetchSolicitudes()
          }}
        />
      )}

      <header className="glass sticky top-0 z-30 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 rounded-full" style={{ background: 'var(--nacap-red)' }} />
          <div>
            <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--nacap-red)' }}>
              Área Mecánica
            </p>
            <h1 className="text-base font-black leading-none" style={{ color: 'var(--text-primary)' }}>
              Panel Pañol
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Perfil del usuario */}
          {profile && (
            <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-white/5" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div className="text-right">
                <p className="text-xs font-bold leading-none">{profile.nombre}</p>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider inline-block mt-0.5"
                  style={profile.rol === 'ADMIN' ? { background: 'var(--nacap-red)', color: 'white' } : { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                  {profile.rol}
                </span>
              </div>
            </div>
          )}

          {/* Indicador en vivo */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
            style={{ background: isLive ? 'rgba(34,197,94,0.12)' : 'rgba(96,165,250,0.10)' }}>
            <span className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: isLive ? '#22C55E' : '#60A5FA' }} />
            <span className="text-xs font-semibold hidden sm:inline"
              style={{ color: isLive ? '#22C55E' : '#60A5FA' }}>
              {isLive ? 'En vivo' : 'Auto ~4s'}
            </span>
            <Wifi size={12} style={{ color: isLive ? '#22C55E' : '#60A5FA' }} />
          </div>
          <NotificationBell />
          <HelpButton rol={profile?.rol} />
          <button onClick={() => fetchSolicitudes(false)} className="btn-secondary !px-3 !py-2" title="Actualizar">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          {profile && (profile.rol === 'ADMIN' || profile.rol === 'PANOL') && (
            <Link href="/admin" className="btn-primary !px-3 !py-2" title="Administración">
              <Settings size={15} />
              <span className="text-xs hidden sm:inline">Admin</span>
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="btn-secondary !px-3 !py-2 hover:!text-red-400"
            title="Cerrar Sesión"
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>


      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* Welcome Banner */}
        {profile && (
          <div className="card p-5 mb-6 bg-gradient-to-r from-red-600/10 to-red-900/5 border-red-500/20 relative overflow-hidden animate-fade-in">
            <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none translate-x-4 translate-y-4">
              <div className="w-40 h-40 rounded-full bg-white" />
            </div>
            <div>
              <p className="text-xs font-bold tracking-wider uppercase text-red-400">Panel de Control</p>
              <h2 className="text-xl font-black mt-1" style={{ color: 'var(--text-primary)' }}>
                ¡Hola, {profile.nombre.split(' ')[0]}! 🛠️
              </h2>
              <p className="text-xs mt-1.5 text-gray-400">
                Bienvenido al centro de administración del pañol. {stats.pendientes > 0 ? (
                  <>Tienes <span className="text-white font-bold">{stats.pendientes} solicitudes pendientes</span> de entrega de herramientas hoy.</>
                ) : (
                  <>No hay solicitudes pendientes de entrega en este momento. ¡Buen trabajo!</>
                )}
              </p>
            </div>
          </div>
        )}

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Pendientes', value: stats.pendientes, color: '#F59E0B', icon: <Clock size={18} /> },
            { label: 'Aprobadas',  value: stats.aprobadas,  color: '#22C55E', icon: <CheckCircle2 size={18} /> },
            { label: 'Entregadas', value: stats.entregadas, color: '#60A5FA', icon: <Truck size={18} /> },
            { label: 'Devueltas',  value: stats.devueltas,  color: '#A855F7', icon: <CheckCircle2 size={18} /> },
          ].map(stat => (
            <div key={stat.label} className="card p-4 animate-fade-in">
              <div className="flex items-center gap-2 mb-1" style={{ color: stat.color }}>
                {stat.icon}
              </div>
              <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{stat.value}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ── Filtros ── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="input-field !pl-9"
              placeholder="Buscar por alumno, RUT o asignatura..."
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {ESTADOS.map(e => (
              <button
                key={e.value}
                onClick={() => setFiltro(e.value)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 border"
                style={filtro === e.value
                  ? { background: 'var(--nacap-red)', color: 'white', border: 'transparent' }
                  : { color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.04)', border: 'transparent' }}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Layout principal ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Lista */}
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card h-28 animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
              ))
            ) : filtradas.length === 0 ? (
              <div className="card p-10 text-center">
                <Package size={36} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                <p style={{ color: 'var(--text-secondary)' }}>No hay solicitudes</p>
              </div>
            ) : (
              <>
                {paginatedFiltradas.map(sol => (
                  <div
                    key={sol.id}
                    onClick={() => setSelectedId(sol.id === selectedId ? null : sol.id)}
                    className="card p-4 cursor-pointer transition-all duration-200 hover:scale-[1.01]"
                    style={selectedId === sol.id
                      ? { outline: '2px solid var(--nacap-red)', outlineOffset: '0px' }
                      : {}}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <User size={13} style={{ color: 'var(--text-muted)' }} />
                          <p className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                            {sol.alumno}
                          </p>
                          {sol.carrera && (
                            <span className="text-[9px] font-bold px-1 py-0.5 rounded flex-shrink-0" style={{ background: 'rgba(220,38,38,0.2)', color: '#f87171' }}>{sol.carrera}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <Hash size={12} style={{ color: 'var(--text-muted)' }} />
                          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{sol.rut}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <BookOpen size={12} style={{ color: 'var(--text-muted)' }} />
                          <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                            {sol.asignatura} — {sol.seccion} ({getJornadaLabel(sol.jornada)})
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <BadgeEstado estado={sol.estado} />
                        <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                      </div>
                    </div>

                    {/* Items preview */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {(sol.items || []).slice(0, 3).map((item, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
                          {item.cantidad}× {item.descripcion}
                        </span>
                      ))}
                      {(sol.items?.length || 0) > 3 && (
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
                          +{(sol.items?.length || 0) - 3} más
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Calendar size={11} style={{ color: 'var(--text-muted)' }} />
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {formatFechaHora(sol.created_at)}
                        </p>
                      </div>
                      {sol.estado === 'APROBADA' && (
                        <button
                          onClick={e => { e.stopPropagation(); setModalSolicitud(sol) }}
                          className="btn-success !px-3 !py-1.5 !text-xs"
                        >
                          <KeyRound size={12} />
                          Ingresar código
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <Pagination
                  currentPage={page}
                  totalPages={Math.ceil(filtradas.length / itemsPerPage)}
                  onPageChange={setPage}
                />
              </>
            )}
          </div>

          {/* Detalle */}
          {selected && (
            <div className="card p-5 animate-fade-in lg:sticky lg:top-24 lg:self-start">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="p-1 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all"
                    title="Cerrar detalle"
                  >
                    <X size={16} />
                  </button>
                  <h2 className="font-black text-lg" style={{ color: 'var(--text-primary)' }}>
                    Detalle
                  </h2>
                </div>
                <BadgeEstado estado={selected.estado} />
              </div>

              <div className="space-y-3 mb-5">
                {[
                  { icon: <User size={14} />,     label: 'Alumno',    value: selected.alumno },
                  { icon: <Hash size={14} />,     label: 'RUT',       value: selected.rut },
                  { icon: <BookOpen size={14} />, label: 'Docente',   value: selected.docente?.nombre || '—' },
                  { icon: <BookOpen size={14} />, label: 'Asignatura',value: selected.asignatura },
                  { icon: <BookOpen size={14} />, label: 'Sección',   value: `${selected.seccion} — ${getJornadaLabel(selected.jornada)}` },
                  { icon: <Calendar size={14} />, label: 'Fecha',     value: formatFechaHora(selected.created_at) },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3 py-2"
                    style={{ borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{item.icon}</span>
                    <span className="text-xs w-24 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{item.value}</span>
                  </div>
                ))}
              </div>

              <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
                Materiales solicitados
              </h3>
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <table className="nacap-table">
                  <thead>
                    <tr>
                      <th>Cant.</th>
                      <th>Descripción</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selected.items || []).map((item, i) => (
                      <tr key={i}>
                        <td className="text-center font-black"
                          style={{ color: 'var(--nacap-red)' }}>{item.cantidad}</td>
                        <td className="font-medium">{item.descripcion}</td>
                        <td>
                          <span className="text-xs px-2 py-0.5 rounded-full mr-1.5"
                            style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
                            {item.estado_item}
                          </span>
                          {item.devuelto && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-green-500/10 text-green-400 border border-green-500/20">
                              ✓ Devuelto
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ACCIONES DE LA SOLICITUD SEGÚN ROL Y ESTADO */}

              {/* 1. Estado PENDIENTE */}
              {selected.estado === 'PENDIENTE' && (
                <>
                  {(profile?.rol === 'DOCENTE' || profile?.rol === 'ADMIN') ? (
                    <div className="mt-5 pt-5 border-t border-white/10">
                      <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--nacap-red)' }}>
                        Decidir sobre Solicitud
                      </h3>
                      
                      {decisionError && (
                        <div className="p-3 mb-3 rounded-xl flex items-center gap-2 text-xs"
                          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>
                          <AlertCircle size={14} />
                          <span>{decisionError}</span>
                        </div>
                      )}

                      {!showRechazoForm ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleDecidirDocente('aprobar')}
                            disabled={deciding}
                            className="btn-success flex-1 py-3 flex items-center justify-center gap-1.5 cursor-pointer text-sm"
                          >
                            {deciding ? (
                              <Loader2 size={15} className="animate-spin" />
                            ) : (
                              <Check size={15} />
                            )}
                            Aprobar
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowRechazoForm(true)}
                            disabled={deciding}
                            className="btn-danger flex-1 py-3 flex items-center justify-center gap-1.5 cursor-pointer text-sm"
                          >
                            <X size={15} />
                            Rechazar
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <label className="label mb-1 text-[11px]">Motivo del rechazo (opcional)</label>
                            <textarea
                              rows={2}
                              value={motivoRechazo}
                              onChange={(e) => setMotivoRechazo(e.target.value)}
                              placeholder="Ej: Materiales no corresponden, sección incorrecta..."
                              className="input-field text-xs resize-none"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleDecidirDocente('rechazar')}
                              disabled={deciding}
                              className="btn-danger flex-1 py-2 text-xs flex items-center justify-center gap-1 cursor-pointer"
                            >
                              {deciding && <Loader2 size={12} className="animate-spin" />}
                              Confirmar Rechazo
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowRechazoForm(false)
                                setMotivoRechazo('')
                              }}
                              disabled={deciding}
                              className="btn-secondary px-3 py-2 text-xs cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-5 p-4 rounded-xl text-center border bg-yellow-500/5 border-yellow-500/10">
                      <Clock size={24} className="mx-auto mb-1.5 text-yellow-500 animate-pulse" />
                      <p className="text-xs font-bold text-white">Pendiente de Aprobación</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">El docente debe aprobar esta solicitud antes de poder entregarla.</p>
                    </div>
                  )}
                </>
              )}

              {/* 2. Estado APROBADA */}
              {selected.estado === 'APROBADA' && (
                <>
                  {profile?.rol !== 'DOCENTE' ? (
                    <div className="flex flex-col gap-2 mt-5">
                      <button
                        onClick={() => setModalSolicitud(selected)}
                        className="btn-success w-full py-3"
                      >
                        <KeyRound size={16} />
                        Ingresar Código y Entregar
                      </button>
                      <button
                        onClick={() => handleReenviarCodigo(selected.id)}
                        disabled={reenviando === selected.id}
                        className="btn-secondary w-full py-2.5 text-xs flex items-center justify-center gap-1.5 hover:!text-white"
                      >
                        {reenviando === selected.id ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />
                            Re-enviando código...
                          </>
                        ) : (
                          <>
                            <Bell size={13} />
                            Re-enviar código al Alumno 🔑
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-5 p-4 rounded-xl text-center border bg-yellow-500/5 border-yellow-500/10">
                      <Clock size={24} className="mx-auto mb-1.5 text-yellow-500 animate-pulse" />
                      <p className="text-xs font-bold text-white">Solicitud Aprobada</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Esperando que el alumno retire las herramientas en el pañol.</p>
                    </div>
                  )}
                </>
              )}

              {/* 3. Estado ENTREGADA o DEVUELTA_INCOMPLETA */}
              {(selected.estado === 'ENTREGADA' || selected.estado === 'DEVUELTA_INCOMPLETA') && (
                <>
                  {profile?.rol !== 'DOCENTE' ? (
                    <div className="mt-5 pt-5 border-t border-white/10 text-xs">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--nacap-red)' }}>
                          Control de Devolución
                        </h3>
                        <span className="text-[10px] text-gray-400">Marcar artículos devueltos</span>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        {(selected.items || []).map((item) => (
                          <div
                            key={item.id}
                            onClick={() => {
                              if (item.id && !item.devuelto) {
                                setReturnCheck(prev => ({ ...prev, [item.id!]: !prev[item.id!] }))
                              }
                            }}
                            className={`flex items-center justify-between p-3 rounded-xl cursor-pointer hover:bg-white/5 transition-all duration-150 border ${item.devuelto ? 'pointer-events-none opacity-60' : ''}`}
                            style={{
                              background: returnCheck[item.id || ''] ? 'rgba(34,197,94,0.04)' : 'rgba(255,255,255,0.02)',
                              borderColor: returnCheck[item.id || ''] ? 'rgba(34,197,94,0.2)' : 'var(--border)'
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={!!returnCheck[item.id || ''] || !!item.devuelto}
                                disabled={!!item.devuelto}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  if (item.id) {
                                    setReturnCheck(prev => ({ ...prev, [item.id!]: e.target.checked }))
                                  }
                                }}
                                className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 accent-red-600 cursor-pointer"
                              />
                              <div>
                                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{item.descripcion}</p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Cantidad: {item.cantidad}</p>
                              </div>
                            </div>
                            {item.devuelto ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-green-500/10 text-green-400 border border-green-500/20">
                                Devuelto
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                                Pendiente
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      {devolucionError && (
                        <div className="p-3 mb-4 rounded-xl flex items-center gap-2 text-xs"
                          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>
                          <AlertCircle size={14} />
                          <span>{devolucionError}</span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleRegistrarDevolucion}
                        disabled={submittingReturn}
                        className="btn-primary w-full py-3 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {submittingReturn ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Procesando Devolución...
                          </>
                        ) : (
                          <>Confirmar Devolución</>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-5 p-4 rounded-xl text-center border bg-blue-500/5 border-blue-500/10">
                      <Wrench size={24} className="mx-auto mb-1.5 text-blue-400" />
                      <p className="text-xs font-bold text-white">{selected.estado === 'ENTREGADA' ? 'Materiales en Uso' : 'Devolución Incompleta'}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {selected.estado === 'ENTREGADA'
                          ? 'El alumno tiene las herramientas en su posesión.'
                          : 'El alumno no ha devuelto la totalidad de las herramientas.'}
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* 4. Estado DEVUELTA */}
              {selected.estado === 'DEVUELTA' && (
                <div className="mt-5 pt-5 border-t border-white/10 text-center p-4 rounded-xl"
                  style={{ background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.1)' }}>
                  <CheckCircle2 size={32} className="mx-auto mb-2 text-green-500" />
                  <p className="text-sm font-bold text-white">Devolución Completada</p>
                  <p className="text-xs text-gray-400 mt-1">Todos los materiales han sido devueltos en su totalidad.</p>
                </div>
              )}

              {/* 5. Estado RECHAZADA */}
              {selected.estado === 'RECHAZADA' && (
                <div className="mt-5 p-4 rounded-xl text-center border bg-red-500/5 border-red-500/10">
                  <XCircle size={24} className="mx-auto mb-2 text-red-500" />
                  <p className="text-sm font-bold text-white">Solicitud Rechazada</p>
                  {selected.observaciones && (
                    <p className="text-[11px] text-gray-400 mt-1 italic">"{selected.observaciones}"</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
