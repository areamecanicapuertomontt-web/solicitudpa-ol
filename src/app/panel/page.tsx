'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Package, Clock, CheckCircle2, XCircle, Truck,
  RefreshCw, Search, Settings, ChevronRight,
  User, BookOpen, Hash, Calendar, KeyRound, X, Wifi, LogOut
} from 'lucide-react'
import { formatFechaHora, getJornadaLabel } from '@/lib/utils'
import { supabaseBrowser } from '@/lib/supabase-browser'
import type { Solicitud, EstadoSolicitud } from '@/lib/types'


const ESTADOS: { value: EstadoSolicitud | 'TODAS'; label: string }[] = [
  { value: 'TODAS',    label: 'Todas' },
  { value: 'PENDIENTE', label: 'Pendientes' },
  { value: 'APROBADA',  label: 'Aprobadas' },
  { value: 'ENTREGADA', label: 'Entregadas' },
  { value: 'RECHAZADA', label: 'Rechazadas' },
]

function BadgeEstado({ estado }: { estado: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    PENDIENTE: { label: 'Pendiente', cls: 'badge-pending',   icon: <Clock size={11} /> },
    APROBADA:  { label: 'Aprobada',  cls: 'badge-approved',  icon: <CheckCircle2 size={11} /> },
    RECHAZADA: { label: 'Rechazada', cls: 'badge-rejected',  icon: <XCircle size={11} /> },
    ENTREGADA: { label: 'Entregada', cls: 'badge-delivered', icon: <Truck size={11} /> },
  }
  const cfg = map[estado] || { label: estado, cls: 'badge', icon: null }
  return <span className={cfg.cls}>{cfg.icon}{cfg.label}</span>
}

// ─── Modal código de entrega ─────────────────────────────────────────────────
function ModalCodigo({
  solicitud,
  onClose,
  onEntregado,
}: {
  solicitud: Solicitud
  onClose: () => void
  onEntregado: () => void
}) {
  const [codigo, setCodigo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirmar() {
    if (codigo.length !== 6) { setError('El código tiene 6 dígitos'); return }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/panel/${solicitud.id}/entregar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Error al confirmar'); return }
      onEntregado()
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="card p-6 w-full max-w-sm animate-fade-in">

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--nacap-red)' }}>
              Confirmar Entrega
            </p>
            <h2 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>
              Código del Pañol
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 transition-colors"
            style={{ color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Info alumno */}
        <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-1">
            <User size={13} style={{ color: 'var(--text-muted)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{solicitud.alumno}</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <Hash size={13} style={{ color: 'var(--text-muted)' }} />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{solicitud.rut}</span>
          </div>
          <div className="flex items-center gap-2">
            <BookOpen size={13} style={{ color: 'var(--text-muted)' }} />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{solicitud.asignatura}</span>
          </div>
        </div>

        {/* Materiales */}
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
            Materiales a entregar
          </p>
          <div className="space-y-1">
            {(solicitud.items || []).map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-black"
                  style={{ background: 'var(--nacap-red)', color: 'white' }}>
                  {item.cantidad}
                </span>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.descripcion}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Código */}
        <div className="mb-4">
          <label className="label flex items-center gap-2">
            <KeyRound size={13} />
            Código de entrega (del correo)
          </label>
          <input
            value={codigo}
            onChange={e => { setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(null) }}
            type="text"
            inputMode="numeric"
            maxLength={6}
            className="input-field text-center text-3xl font-black tracking-[.4em]"
            placeholder="000000"
            style={{ letterSpacing: '.4em' }}
          />
          {error && (
            <p className="text-xs mt-2 flex items-center gap-1" style={{ color: 'var(--nacap-red)' }}>
              <XCircle size={12} /> {error}
            </p>
          )}
        </div>

        <button
          onClick={confirmar}
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
    </div>
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

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabaseBrowser.auth.getUser()
      if (user) {
        let perf = null
        try {
          const { data } = await supabaseBrowser
            .from('perfiles')
            .select('*')
            .eq('id', user.id)
            .single()
          perf = data
        } catch (e) {
          console.error("Error loading profile from perfiles table:", e)
        }

        if (!perf) {
          perf = {
            id: user.id,
            email: user.email,
            nombre: user.user_metadata?.nombre || 'Pañolero Inacap',
            rol: user.user_metadata?.rol || 'PANOL',
            rut: user.user_metadata?.rut || '',
            jornada: user.user_metadata?.jornada || 'D',
            seccion: user.user_metadata?.seccion || '',
          }
        }
        setProfile(perf)
      }
    }
    loadProfile()
  }, [])

  async function handleLogout() {
    await supabaseBrowser.auth.signOut()
    window.location.href = '/login'
  }


  const fetchSolicitudes = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filtro !== 'TODAS') params.set('estado', filtro)
      const res = await fetch(`/api/panel?${params}`)
      const data = await res.json()
      setSolicitudes(data.solicitudes || [])
    } catch {
      if (!silent) setSolicitudes([])
    } finally {
      if (!silent) setLoading(false)
    }
  }, [filtro])

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

  const filtradas = solicitudes.filter(s =>
    s.alumno.toLowerCase().includes(busqueda.toLowerCase()) ||
    s.rut.toLowerCase().includes(busqueda.toLowerCase()) ||
    s.asignatura.toLowerCase().includes(busqueda.toLowerCase())
  )

  const selected = solicitudes.find(s => s.id === selectedId)

  const stats = {
    pendientes: solicitudes.filter(s => s.estado === 'PENDIENTE').length,
    aprobadas:  solicitudes.filter(s => s.estado === 'APROBADA').length,
    entregadas: solicitudes.filter(s => s.estado === 'ENTREGADA').length,
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
          <button onClick={() => fetchSolicitudes(false)} className="btn-secondary !px-3 !py-2" title="Actualizar">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <Link href="/admin" className="btn-primary !px-3 !py-2" title="Administración">
            <Settings size={15} />
            <span className="text-xs hidden sm:inline">Admin</span>
          </Link>
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
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Pendientes', value: stats.pendientes, color: '#F59E0B', icon: <Clock size={18} /> },
            { label: 'Aprobadas',  value: stats.aprobadas,  color: '#22C55E', icon: <CheckCircle2 size={18} /> },
            { label: 'Entregadas', value: stats.entregadas, color: '#60A5FA', icon: <Truck size={18} /> },
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
            ) : filtradas.map(sol => (
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
          </div>

          {/* Detalle */}
          {selected && (
            <div className="card p-5 animate-fade-in lg:sticky lg:top-24 lg:self-start">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-black text-lg" style={{ color: 'var(--text-primary)' }}>
                  Detalle
                </h2>
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
                          <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
                            {item.estado_item}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selected.estado === 'APROBADA' && (
                <button
                  onClick={() => setModalSolicitud(selected)}
                  className="btn-success w-full mt-5 py-3"
                >
                  <KeyRound size={16} />
                  Ingresar Código y Entregar
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
