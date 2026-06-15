'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  ChevronLeft, LayoutDashboard, Wrench, Calendar, Users,
  Plus, Pencil, Trash2, Save, X, Search, RefreshCw,
  CheckCircle2, XCircle, AlertTriangle, Info,
  Activity, BarChart3, Shield, ClipboardList
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import type {
  Equipo, SeccionMantencion, PlanMantencion, ActividadPlanificacion
} from '@/lib/types'

// ─── Local types ──────────────────────────────────────────────────────────────

interface Perfil {
  id: string
  nombre: string
  email: string
  rol: string
  activo: boolean
}

type Tab = 'dashboard' | 'equipos' | 'planificacion' | 'usuarios'

const EMPTY_EQUIPO_FORM = {
  seccion_id: '',
  nombre: '',
  codigo_inventario: '',
  nivel_uso: 'USO MAYOR' as 'USO MAYOR' | 'USO MENOR',
  nivel_costo: 'COSTO MAYOR' as 'COSTO MAYOR' | 'COSTO MENOR',
  frecuencia: 'ANUAL' as 'ANUAL' | 'SEMESTRAL' | 'MENSUAL' | 'TRIMESTRAL',
  mes_programado: '',
  estado_programado: 'P' as 'P' | 'R' | 'C',
  cantidad: 1,
  requiere_calibracion: false,
  tiene_informe_tecnico: false,
  tiene_cert_calibracion: false,
  activo: true,
  observaciones: '',
  numero_item: 1,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function BoolIcon({ val }: { val: boolean | null }) {
  return val
    ? <CheckCircle2 size={13} className="text-green-500 mx-auto" />
    : <XCircle size={13} className="text-gray-600 mx-auto" />
}

function Toggle({
  checked, onChange, label
}: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 transition-colors duration-200 ${
          checked ? 'bg-green-500 border-green-500' : 'bg-white/10 border-white/15'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
      {label && <span className="text-xs font-bold text-gray-300 uppercase">{label}</span>}
    </label>
  )
}

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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminMantencionPage() {
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // ── Data ──
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [secciones, setSecciones] = useState<SeccionMantencion[]>([])
  const [plan, setPlan] = useState<PlanMantencion | null>(null)
  const [actividades, setActividades] = useState<ActividadPlanificacion[]>([])
  const [perfiles, setPerfiles] = useState<Perfil[]>([])

  // ── Equipos CRUD ──
  const [showEquipoModal, setShowEquipoModal] = useState(false)
  const [editingEquipo, setEditingEquipo] = useState<Equipo | null>(null)
  const [equipoForm, setEquipoForm] = useState({ ...EMPTY_EQUIPO_FORM })
  const [savingEquipo, setSavingEquipo] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // ── Equipos Filters ──
  const [searchEquipo, setSearchEquipo] = useState('')
  const [filtroSeccion, setFiltroSeccion] = useState('')
  const [filtroActivo, setFiltroActivo] = useState<'TODOS' | 'true' | 'false'>('TODOS')
  const [filtroFrecuencia, setFiltroFrecuencia] = useState('')

  // ── Plan editing ──
  const [planForm, setPlanForm] = useState({
    titulo: '', fecha: '', version: '', actualizado_segun: '', objetivo_general: ''
  })
  const [savingPlan, setSavingPlan] = useState(false)
  const [editingActividad, setEditingActividad] = useState<{ [id: string]: ActividadPlanificacion }>({})
  const [savingActividad, setSavingActividad] = useState<string | null>(null)

  // ── Usuarios Filters ──
  const [searchUsuario, setSearchUsuario] = useState('')
  const [filtroRol, setFiltroRol] = useState<'TODOS' | string>('TODOS')

  // ── Pagination States ──
  const itemsPerPage = 10
  const [pageEquipos, setPageEquipos] = useState(1)
  const [pageUsuarios, setPageUsuarios] = useState(1)

  // Reset pages on search/filters change
  useEffect(() => {
    setPageEquipos(1)
  }, [searchEquipo, filtroSeccion, filtroActivo, filtroFrecuencia])

  useEffect(() => {
    setPageUsuarios(1)
  }, [searchUsuario, filtroRol])

  // ─── Auth Check ───────────────────────────────────────────────────────────

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabaseBrowser.auth.getUser()
      if (!user) { router.replace('/login'); return }
      const { data: perf } = await supabaseBrowser
        .from('perfiles').select('*').eq('id', user.id).single()
      if (!perf || (perf.rol !== 'ADMIN' && perf.rol !== 'PANOL')) { router.replace('/login'); return }
      setProfile(perf)
    }
    checkAuth()
  }, [router])

  // ─── Notification helper ──────────────────────────────────────────────────

  const notify = useCallback((type: 'ok' | 'err', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4500)
  }, [])

  // ─── Fetch all data ───────────────────────────────────────────────────────

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const [
        { data: eqData },
        { data: secData },
        { data: planData },
        { data: actData },
        { data: perfData },
      ] = await Promise.all([
        supabaseBrowser
          .from('equipos')
          .select('*, secciones_mantencion(*)')
          .order('numero_item'),
        supabaseBrowser
          .from('secciones_mantencion')
          .select('*')
          .order('numero'),
        supabaseBrowser
          .from('planes_mantencion')
          .select('*')
          .eq('activo', true)
          .limit(1)
          .maybeSingle(),
        supabaseBrowser
          .from('actividades_planificacion')
          .select('*')
          .order('numero'),
        supabaseBrowser
          .from('perfiles')
          .select('id, nombre, email, rol, activo')
          .order('nombre'),
      ])

      setEquipos(eqData || [])
      setSecciones(secData || [])
      setPlan(planData || null)
      setActividades(actData || [])
      setPerfiles(perfData || [])

      if (planData) {
        setPlanForm({
          titulo: planData.titulo || '',
          fecha: planData.fecha || '',
          version: planData.version || '',
          actualizado_segun: planData.actualizado_segun || '',
          objetivo_general: planData.objetivo_general || '',
        })
      }

      // Init actividades edit map
      const actMap: { [id: string]: ActividadPlanificacion } = {}
      for (const a of (actData || [])) actMap[a.id] = { ...a }
      setEditingActividad(actMap)

    } catch (e: any) {
      console.error(e)
      notify('err', 'Error al cargar datos. Verifica las políticas RLS.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [notify])

  useEffect(() => {
    if (profile) fetchData()
  }, [profile, fetchData])

  // ─── Dashboard KPIs ───────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    const now = new Date()
    const monthStr = String(now.getMonth() + 1).padStart(2, '0')
    return {
      total: equipos.length,
      activos: equipos.filter(e => e.activo === true).length,
      inactivos: equipos.filter(e => !e.activo).length,
      pendientes: equipos.filter(e => e.estado_programado === 'P').length,
      calibracion: equipos.filter(e => e.requiere_calibracion === true).length,
      informe: equipos.filter(e => e.tiene_informe_tecnico).length,
    }
  }, [equipos])

  const bySeccion = useMemo(() => {
    return secciones.map(sec => ({
      ...sec,
      count: equipos.filter(e => e.seccion_id === sec.id).length,
      activos: equipos.filter(e => e.seccion_id === sec.id && e.activo).length,
    }))
  }, [equipos, secciones])

  // ─── Filtered Equipos ─────────────────────────────────────────────────────

  const filteredEquipos = useMemo(() => {
    return equipos.filter(e => {
      const q = searchEquipo.toLowerCase()
      const matchSearch = !q ||
        e.nombre.toLowerCase().includes(q) ||
        (e.codigo_inventario || '').toLowerCase().includes(q)
      const matchSeccion = !filtroSeccion || e.seccion_id === filtroSeccion
      const matchActivo =
        filtroActivo === 'TODOS' ? true :
        filtroActivo === 'true' ? e.activo === true : !e.activo
      const matchFrecuencia = !filtroFrecuencia || e.frecuencia === filtroFrecuencia
      return matchSearch && matchSeccion && matchActivo && matchFrecuencia
    })
  }, [equipos, searchEquipo, filtroSeccion, filtroActivo, filtroFrecuencia])

  const paginatedEquipos = useMemo(() => {
    const startIndex = (pageEquipos - 1) * itemsPerPage
    return filteredEquipos.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredEquipos, pageEquipos])

  // ─── Filtered Perfiles ────────────────────────────────────────────────────

  const filteredPerfiles = useMemo(() => {
    const q = searchUsuario.toLowerCase()
    return perfiles.filter(p => {
      const matchSearch = !q ||
        p.nombre.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q)
      const matchRol = filtroRol === 'TODOS' || p.rol === filtroRol
      return matchSearch && matchRol
    })
  }, [perfiles, searchUsuario, filtroRol])

  const paginatedPerfiles = useMemo(() => {
    const startIndex = (pageUsuarios - 1) * itemsPerPage
    return filteredPerfiles.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredPerfiles, pageUsuarios])

  // ─── Equipos CRUD Handlers ────────────────────────────────────────────────

  const openAddEquipo = () => {
    const maxNum = equipos.length > 0 ? Math.max(...equipos.map(e => e.numero_item || 0)) : 0
    setEditingEquipo(null)
    setEquipoForm({
      ...EMPTY_EQUIPO_FORM,
      numero_item: maxNum + 1
    })
    setShowEquipoModal(true)
  }

  const openEditEquipo = (eq: Equipo) => {
    setEditingEquipo(eq)
    setEquipoForm({
      seccion_id: eq.seccion_id || '',
      nombre: eq.nombre,
      codigo_inventario: eq.codigo_inventario || '',
      nivel_uso: eq.nivel_uso || 'USO MAYOR',
      nivel_costo: eq.nivel_costo || 'COSTO MAYOR',
      frecuencia: eq.frecuencia,
      mes_programado: eq.mes_programado || '',
      estado_programado: eq.estado_programado,
      cantidad: eq.cantidad || 1,
      requiere_calibracion: eq.requiere_calibracion || false,
      tiene_informe_tecnico: eq.tiene_informe_tecnico,
      tiene_cert_calibracion: eq.tiene_cert_calibracion,
      activo: eq.activo ?? true,
      observaciones: eq.observaciones || '',
      numero_item: eq.numero_item || 1,
    })
    setShowEquipoModal(true)
  }

  const closeEquipoModal = () => {
    setShowEquipoModal(false)
    setEditingEquipo(null)
    setEquipoForm({ ...EMPTY_EQUIPO_FORM })
  }

  const handleSaveEquipo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!equipoForm.nombre.trim()) {
      notify('err', 'El nombre del equipo es obligatorio.')
      return
    }
    setSavingEquipo(true)
    try {
      const payload = {
        seccion_id: equipoForm.seccion_id || null,
        nombre: equipoForm.nombre.trim(),
        codigo_inventario: equipoForm.codigo_inventario.trim() || null,
        nivel_uso: equipoForm.nivel_uso,
        nivel_costo: equipoForm.nivel_costo,
        frecuencia: equipoForm.frecuencia,
        mes_programado: equipoForm.mes_programado.trim() || null,
        estado_programado: equipoForm.estado_programado,
        cantidad: equipoForm.cantidad,
        requiere_calibracion: equipoForm.requiere_calibracion,
        tiene_informe_tecnico: equipoForm.tiene_informe_tecnico,
        tiene_cert_calibracion: equipoForm.tiene_cert_calibracion,
        activo: equipoForm.activo,
        observaciones: equipoForm.observaciones.trim() || null,
        numero_item: equipoForm.numero_item || 1,
      }
      if (editingEquipo) {
        const { error } = await supabaseBrowser
          .from('equipos').update(payload).eq('id', editingEquipo.id)
        if (error) throw error
        notify('ok', 'Equipo actualizado correctamente.')
      } else {
        const { error } = await supabaseBrowser.from('equipos').insert(payload)
        if (error) throw error
        notify('ok', 'Equipo registrado exitosamente.')
      }
      closeEquipoModal()
      fetchData(true)
    } catch (err: any) {
      notify('err', 'Error al guardar equipo: ' + (err.message || 'Verifica permisos RLS.'))
    } finally {
      setSavingEquipo(false)
    }
  }

  const handleDeleteEquipo = async (id: string) => {
    if (!confirm('¿Eliminar este equipo del plan de mantención? Esta acción no se puede deshacer.')) return
    setDeletingId(id)
    try {
      const { error } = await supabaseBrowser.from('equipos').delete().eq('id', id)
      if (error) throw error
      notify('ok', 'Equipo eliminado correctamente.')
      fetchData(true)
    } catch (err: any) {
      notify('err', 'No se pudo eliminar el equipo. Puede tener registros asociados.')
    } finally {
      setDeletingId(null)
    }
  }

  // ─── Plan Handlers ────────────────────────────────────────────────────────

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!plan) return
    setSavingPlan(true)
    try {
      const { error } = await supabaseBrowser
        .from('planes_mantencion')
        .update({
          titulo: planForm.titulo,
          fecha: planForm.fecha,
          version: planForm.version,
          actualizado_segun: planForm.actualizado_segun || null,
          objetivo_general: planForm.objetivo_general || null,
        })
        .eq('id', plan.id)
      if (error) throw error
      notify('ok', 'Plan de mantención actualizado.')
      fetchData(true)
    } catch (err: any) {
      notify('err', 'Error al guardar plan: ' + (err.message || ''))
    } finally {
      setSavingPlan(false)
    }
  }

  const handleSaveActividad = async (id: string) => {
    const act = editingActividad[id]
    if (!act) return
    setSavingActividad(id)
    try {
      const { error } = await supabaseBrowser
        .from('actividades_planificacion')
        .update({
          actividad: act.actividad,
          responsable: act.responsable || null,
          frecuencia: act.frecuencia || null,
          detalle_meses: act.detalle_meses || null,
        })
        .eq('id', id)
      if (error) throw error
      notify('ok', 'Actividad actualizada.')
      fetchData(true)
    } catch (err: any) {
      notify('err', 'Error al guardar actividad.')
    } finally {
      setSavingActividad(null)
    }
  }

  // ─── Usuarios Handlers ────────────────────────────────────────────────────

  const togglePerfilActivo = async (perf: Perfil) => {
    try {
      const { error } = await supabaseBrowser
        .from('perfiles').update({ activo: !perf.activo }).eq('id', perf.id)
      if (error) throw error
      notify('ok', `Usuario ${!perf.activo ? 'activado' : 'desactivado'}.`)
      setPerfiles(prev => prev.map(p => p.id === perf.id ? { ...p, activo: !p.activo } : p))
    } catch {
      notify('err', 'Error al cambiar estado del usuario.')
    }
  }

  const changePerfilRol = async (id: string, newRol: string) => {
    try {
      const { error } = await supabaseBrowser
        .from('perfiles').update({ rol: newRol }).eq('id', id)
      if (error) throw error
      notify('ok', 'Rol actualizado correctamente.')
      setPerfiles(prev => prev.map(p => p.id === id ? { ...p, rol: newRol } : p))
    } catch {
      notify('err', 'Error al actualizar el rol.')
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (!profile || loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Cargando panel de mantención...</p>
        </div>
      </main>
    )
  }

  const tabItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard',     label: 'Dashboard',      icon: <LayoutDashboard size={14} /> },
    { id: 'equipos',       label: 'Equipos',         icon: <Wrench size={14} /> },
    { id: 'planificacion', label: 'Planificación',   icon: <Calendar size={14} /> },
    { id: 'usuarios',      label: 'Usuarios',        icon: <Users size={14} /> },
  ]

  return (
    <main className="min-h-screen py-8 px-4 sm:px-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="btn-secondary !px-3 !py-2" title="Volver al Panel Admin">
              <ChevronLeft size={16} />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-10 rounded-full" style={{ background: 'var(--nacap-red)' }} />
              <div>
                <p className="text-[10px] font-extrabold tracking-widest uppercase text-red-500">
                  INACAP Área Mecánica
                </p>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  Gestión de Mantención
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <button
              onClick={() => fetchData(true)}
              className="btn-secondary !py-2 !px-3"
              title="Sincronizar datos"
              disabled={refreshing}
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            </button>
            {profile && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/5 bg-white/2">
                <div className="text-right">
                  <p className="text-xs font-bold leading-none">{profile.nombre}</p>
                  <span className="text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-red-600 text-white mt-1 inline-block">
                    {profile.rol}
                  </span>
                </div>
                <Shield size={14} className="text-red-400" />
              </div>
            )}
          </div>
        </div>

        {/* ── Notification ── */}
        {msg && (
          <div
            className="card p-3.5 mb-6 text-center animate-fade-in border-l-4"
            style={{
              borderColor: msg.type === 'ok' ? 'var(--success)' : 'var(--danger)',
              background: msg.type === 'ok' ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
            }}
          >
            <p className="text-sm font-semibold flex items-center justify-center gap-2"
              style={{ color: msg.type === 'ok' ? 'var(--success)' : 'var(--danger)' }}>
              {msg.type === 'ok' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              {msg.text}
            </p>
          </div>
        )}

        {/* ── Tab Navigation ── */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl bg-white/2 border border-white/5 overflow-x-auto no-scrollbar select-none">
          {tabItems.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 whitespace-nowrap cursor-pointer"
              style={activeTab === tab.id
                ? { background: 'var(--nacap-red)', color: 'white' }
                : { color: 'var(--text-secondary)', background: 'transparent' }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB: DASHBOARD
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">

            {/* KPI Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 stagger-children">
              {[
                { label: 'Total Equipos', value: kpis.total,      color: 'var(--nacap-red)', icon: <Wrench size={18} /> },
                { label: 'Activos',        value: kpis.activos,    color: 'var(--success)',   icon: <CheckCircle2 size={18} /> },
                { label: 'Inactivos',      value: kpis.inactivos,  color: 'var(--danger)',    icon: <XCircle size={18} /> },
                { label: 'Pendientes/Mes', value: kpis.pendientes, color: 'var(--warning)',   icon: <Activity size={18} /> },
                { label: 'Req. Calibración', value: kpis.calibracion, color: '#A78BFA', icon: <BarChart3 size={18} /> },
                { label: 'Con Informe',    value: kpis.informe,    color: 'var(--accent-blue)', icon: <ClipboardList size={18} /> },
              ].map((kpi, i) => (
                <div key={i} className="card p-4 relative overflow-hidden bg-gradient-to-br from-white/2 to-white/0">
                  <div className="absolute right-3 top-3 opacity-15" style={{ color: kpi.color }}>
                    {kpi.icon}
                  </div>
                  <p className="text-2xl sm:text-3xl font-black mt-1" style={{ color: 'var(--text-primary)' }}>
                    {kpi.value}
                  </p>
                  <p className="text-[10px] font-bold mt-1 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                    {kpi.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Plan Info + Area Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Plan Info Card */}
              <div className="card p-5 space-y-3">
                <h2 className="font-extrabold text-sm uppercase tracking-wider flex items-center gap-2"
                  style={{ color: 'var(--text-secondary)' }}>
                  <ClipboardList size={16} className="text-red-500" />
                  Información del Plan Vigente
                </h2>
                {plan ? (
                  <div className="space-y-2.5 text-xs">
                    {[
                      { label: 'Título', val: plan.titulo },
                      { label: 'Versión', val: plan.version },
                      { label: 'Fecha', val: plan.fecha },
                      { label: 'Actualizado según', val: plan.actualizado_segun || '—' },
                    ].map((row, i) => (
                      <div key={i} className="flex justify-between py-1.5 border-b border-white/5">
                        <span className="text-gray-400 font-bold">{row.label}:</span>
                        <span className="font-semibold text-white">{row.val}</span>
                      </div>
                    ))}
                    {plan.objetivo_general && (
                      <div className="mt-3 p-3 rounded-xl bg-white/3 border border-white/5">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Objetivo General</p>
                        <p className="text-gray-200 leading-relaxed">{plan.objetivo_general}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 py-4 text-center">No hay plan activo registrado.</p>
                )}
              </div>

              {/* Area Breakdown */}
              <div className="card p-5 space-y-3">
                <h2 className="font-extrabold text-sm uppercase tracking-wider flex items-center gap-2"
                  style={{ color: 'var(--text-secondary)' }}>
                  <BarChart3 size={16} className="text-red-500" />
                  Distribución por Área
                </h2>
                {bySeccion.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">Sin secciones registradas.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="nacap-table">
                      <thead>
                        <tr>
                          <th>Área / Sección</th>
                          <th className="text-center">Total</th>
                          <th className="text-center">Activos</th>
                          <th className="text-center">Inactivos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bySeccion.map(sec => (
                          <tr key={sec.id}>
                            <td className="font-semibold">
                              <span className="inline-flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-red-500/60 inline-block" />
                                {sec.nombre}
                              </span>
                            </td>
                            <td className="text-center font-bold text-white">{sec.count}</td>
                            <td className="text-center">
                              <span className="text-green-500 font-bold">{sec.activos}</span>
                            </td>
                            <td className="text-center">
                              <span className="text-red-400 font-bold">{sec.count - sec.activos}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB: EQUIPOS
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'equipos' && (
          <div className="space-y-4 animate-fade-in">

            {/* Filters bar */}
            <div className="card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-white/1">
              <div className="relative lg:col-span-2">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  className="input-field !pl-9 text-xs"
                  placeholder="Buscar por nombre o código de inventario..."
                  value={searchEquipo}
                  onChange={e => setSearchEquipo(e.target.value)}
                />
              </div>
              <select
                className="input-field text-xs"
                value={filtroSeccion}
                onChange={e => setFiltroSeccion(e.target.value)}
              >
                <option value="">Todas las áreas</option>
                {secciones.map(s => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
              <select
                className="input-field text-xs"
                value={filtroActivo}
                onChange={e => setFiltroActivo(e.target.value as any)}
              >
                <option value="TODOS">Todos los estados</option>
                <option value="true">Solo Activos</option>
                <option value="false">Solo Inactivos</option>
              </select>
              <select
                className="input-field text-xs"
                value={filtroFrecuencia}
                onChange={e => setFiltroFrecuencia(e.target.value)}
              >
                <option value="">Toda frecuencia</option>
                <option value="ANUAL">Anual</option>
                <option value="SEMESTRAL">Semestral</option>
                <option value="MENSUAL">Mensual</option>
                <option value="TRIMESTRAL">Trimestral</option>
              </select>
            </div>

            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-400 font-semibold">
                {filteredEquipos.length} equipo{filteredEquipos.length !== 1 ? 's' : ''} encontrado{filteredEquipos.length !== 1 ? 's' : ''}
              </p>
              <button onClick={openAddEquipo} className="btn-primary !py-2 !px-4 text-xs">
                <Plus size={14} /> Agregar Equipo
              </button>
            </div>

            {/* Table */}
            <div className="card p-0 overflow-hidden">
              {filteredEquipos.length === 0 ? (
                <div className="py-16 text-center text-gray-500">
                  <Wrench size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No se encontraron equipos con los filtros aplicados.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="nacap-table">
                    <thead>
                      <tr>
                        <th>N°</th>
                        <th>Nombre</th>
                        <th>Cód. Inv</th>
                        <th>Área</th>
                        <th>Uso / Costo</th>
                        <th>Frecuencia</th>
                        <th>Mes</th>
                        <th className="text-center">Cal</th>
                        <th className="text-center">Inf</th>
                        <th className="text-center">Cert</th>
                        <th className="text-center">Activo</th>
                        <th className="text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedEquipos.map(eq => (
                        <tr key={eq.id} className="group">
                          <td className="font-bold text-gray-400">{eq.numero_item}</td>
                          <td className="font-semibold max-w-[180px] truncate" title={eq.nombre}>{eq.nombre}</td>
                          <td className="font-mono text-xs text-gray-300">{eq.codigo_inventario || '—'}</td>
                          <td>
                            {eq.secciones_mantencion ? (
                              <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-gray-300 font-bold uppercase tracking-wide">
                                {eq.secciones_mantencion.nombre}
                              </span>
                            ) : <span className="text-gray-600">—</span>}
                          </td>
                          <td className="text-xs text-gray-400">
                            <span>{eq.nivel_uso?.replace('USO ', '') || '—'}</span>
                            <span className="text-gray-600 mx-1">/</span>
                            <span>{eq.nivel_costo?.replace('COSTO ', '') || '—'}</span>
                          </td>
                          <td>
                            <span className="badge" style={{
                              color: eq.frecuencia === 'ANUAL' ? '#60A5FA' : '#A78BFA',
                              background: eq.frecuencia === 'ANUAL' ? 'rgba(96,165,250,0.1)' : 'rgba(167,139,250,0.1)',
                              borderColor: eq.frecuencia === 'ANUAL' ? 'rgba(96,165,250,0.3)' : 'rgba(167,139,250,0.3)',
                            }}>
                              {eq.frecuencia}
                            </span>
                          </td>
                          <td className="text-xs text-gray-300">{eq.mes_programado || '—'}</td>
                          <td className="text-center"><BoolIcon val={eq.requiere_calibracion} /></td>
                          <td className="text-center"><BoolIcon val={eq.tiene_informe_tecnico} /></td>
                          <td className="text-center"><BoolIcon val={eq.tiene_cert_calibracion} /></td>
                          <td className="text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              eq.activo
                                ? 'bg-green-500/10 border-green-500/30 text-green-500'
                                : 'bg-red-500/10 border-red-500/30 text-red-500'
                            }`}>
                              {eq.activo ? 'SÍ' : 'NO'}
                            </span>
                          </td>
                          <td className="text-right">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => openEditEquipo(eq)}
                                className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                                title="Editar equipo"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteEquipo(eq.id)}
                                disabled={deletingId === eq.id}
                                className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
                                title="Eliminar equipo"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Pagination
                    currentPage={pageEquipos}
                    totalPages={Math.ceil(filteredEquipos.length / itemsPerPage)}
                    onPageChange={setPageEquipos}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB: PLANIFICACIÓN
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'planificacion' && (
          <div className="space-y-6 animate-fade-in">

            {/* Plan Info Form */}
            <div className="card p-5 space-y-4">
              <h2 className="font-extrabold text-sm uppercase tracking-wider text-red-500 border-b border-white/5 pb-2 flex items-center gap-2">
                <ClipboardList size={16} /> Datos del Plan de Mantención
              </h2>
              {!plan ? (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/15">
                  <AlertTriangle size={15} className="text-yellow-500 shrink-0" />
                  <p className="text-xs text-yellow-400">No hay un plan activo. Crea uno en la base de datos primero.</p>
                </div>
              ) : (
                <form onSubmit={handleSavePlan} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="lg:col-span-2">
                      <label className="label">Título del Plan</label>
                      <input
                        type="text"
                        className="input-field"
                        value={planForm.titulo}
                        onChange={e => setPlanForm(p => ({ ...p, titulo: e.target.value }))}
                        placeholder="Plan de Mantención Preventiva..."
                      />
                    </div>
                    <div>
                      <label className="label">Fecha</label>
                      <input
                        type="text"
                        className="input-field"
                        value={planForm.fecha}
                        onChange={e => setPlanForm(p => ({ ...p, fecha: e.target.value }))}
                        placeholder="Ej: Enero 2026"
                      />
                    </div>
                    <div>
                      <label className="label">Versión</label>
                      <input
                        type="text"
                        className="input-field"
                        value={planForm.version}
                        onChange={e => setPlanForm(p => ({ ...p, version: e.target.value }))}
                        placeholder="Ej: v1.0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label">Actualizado según</label>
                    <input
                      type="text"
                      className="input-field"
                      value={planForm.actualizado_segun}
                      onChange={e => setPlanForm(p => ({ ...p, actualizado_segun: e.target.value }))}
                      placeholder="Documento de referencia o normativa..."
                    />
                  </div>
                  <div>
                    <label className="label">Objetivo General</label>
                    <textarea
                      rows={3}
                      className="input-field resize-none"
                      value={planForm.objetivo_general}
                      onChange={e => setPlanForm(p => ({ ...p, objetivo_general: e.target.value }))}
                      placeholder="Describir el objetivo general del plan de mantención..."
                    />
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" className="btn-success !py-2 !px-5 text-sm" disabled={savingPlan}>
                      <Save size={14} /> {savingPlan ? 'Guardando...' : 'Guardar Plan'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Actividades de Planificación */}
            <div className="card p-5 space-y-4">
              <h2 className="font-extrabold text-sm uppercase tracking-wider text-red-500 border-b border-white/5 pb-2 flex items-center gap-2">
                <Activity size={16} /> Actividades de Planificación (Sección I)
              </h2>
              {actividades.length === 0 ? (
                <p className="text-sm text-gray-500 py-6 text-center">No hay actividades registradas.</p>
              ) : (
                <div className="space-y-4">
                  {actividades.map((act, idx) => {
                    const draft = editingActividad[act.id] || act
                    const saving = savingActividad === act.id
                    return (
                      <div key={act.id} className="rounded-xl border border-white/5 bg-white/1 p-4 space-y-3">
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500">
                          Actividad {act.numero}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="md:col-span-2">
                            <label className="label">Descripción de la Actividad</label>
                            <input
                              type="text"
                              className="input-field text-sm"
                              value={draft.actividad}
                              onChange={e => setEditingActividad(prev => ({
                                ...prev,
                                [act.id]: { ...draft, actividad: e.target.value }
                              }))}
                            />
                          </div>
                          <div>
                            <label className="label">Responsable</label>
                            <input
                              type="text"
                              className="input-field text-sm"
                              value={draft.responsable || ''}
                              onChange={e => setEditingActividad(prev => ({
                                ...prev,
                                [act.id]: { ...draft, responsable: e.target.value }
                              }))}
                              placeholder="Nombre del responsable..."
                            />
                          </div>
                          <div>
                            <label className="label">Frecuencia</label>
                            <input
                              type="text"
                              className="input-field text-sm"
                              value={draft.frecuencia || ''}
                              onChange={e => setEditingActividad(prev => ({
                                ...prev,
                                [act.id]: { ...draft, frecuencia: e.target.value }
                              }))}
                              placeholder="Ej: Semestral / Anual..."
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="label">Detalle de Meses</label>
                            <input
                              type="text"
                              className="input-field text-sm"
                              value={draft.detalle_meses || ''}
                              onChange={e => setEditingActividad(prev => ({
                                ...prev,
                                [act.id]: { ...draft, detalle_meses: e.target.value }
                              }))}
                              placeholder="Ej: Enero, Julio..."
                            />
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <button
                            onClick={() => handleSaveActividad(act.id)}
                            className="btn-success !py-1.5 !px-4 text-xs"
                            disabled={saving}
                          >
                            <Save size={13} />
                            {saving ? 'Guardando...' : 'Guardar Actividad'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB: USUARIOS
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'usuarios' && (
          <div className="space-y-4 animate-fade-in">

            {/* Filters */}
            <div className="card p-4 flex flex-col sm:flex-row gap-3 bg-white/1">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  className="input-field !pl-9 text-xs"
                  placeholder="Buscar por nombre o email..."
                  value={searchUsuario}
                  onChange={e => setSearchUsuario(e.target.value)}
                />
              </div>
              <select
                className="input-field text-xs sm:w-44"
                value={filtroRol}
                onChange={e => setFiltroRol(e.target.value)}
              >
                <option value="TODOS">Todos los roles</option>
                <option value="ADMIN">ADMIN</option>
                <option value="DOCENTE">DOCENTE</option>
                <option value="ALUMNO">ALUMNO</option>
                <option value="PANOL">PAÑOL</option>
              </select>
            </div>

            <p className="text-xs text-gray-500">
              <Info size={12} className="inline mr-1" />
              Aquí puedes activar/desactivar usuarios y cambiar roles. La creación/eliminación de cuentas se gestiona desde Supabase Auth.
            </p>

            <div className="card overflow-hidden">
              {filteredPerfiles.length === 0 ? (
                <div className="py-16 text-center text-gray-500">
                  <Users size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No se encontraron usuarios con los filtros aplicados.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="nacap-table">
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Email</th>
                        <th>Rol</th>
                        <th className="text-center">Estado</th>
                        <th className="text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedPerfiles.map(perf => (
                        <tr key={perf.id} className="group">
                          <td className="font-semibold flex items-center gap-2.5 py-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black uppercase text-red-500 bg-red-500/10 shrink-0">
                              {perf.nombre?.charAt(0) || '?'}
                            </div>
                            <span className="truncate max-w-[160px]" title={perf.nombre}>{perf.nombre}</span>
                          </td>
                          <td className="text-gray-300 text-xs">{perf.email}</td>
                          <td>
                            <select
                              className="input-field !py-1 !px-2 text-xs w-auto bg-transparent"
                              value={perf.rol}
                              onChange={e => changePerfilRol(perf.id, e.target.value)}
                            >
                              <option value="ADMIN">ADMIN</option>
                              <option value="DOCENTE">DOCENTE</option>
                              <option value="ALUMNO">ALUMNO</option>
                              <option value="PANOL">PAÑOL</option>
                            </select>
                          </td>
                          <td className="text-center">
                            <button
                              onClick={() => togglePerfilActivo(perf)}
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                                perf.activo
                                  ? 'bg-green-500/10 border-green-500/30 text-green-500 hover:bg-green-500/20'
                                  : 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20'
                              }`}
                              title="Haz clic para alternar estado"
                            >
                              {perf.activo ? 'ACTIVO' : 'INACTIVO'}
                            </button>
                          </td>
                          <td className="text-right">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => togglePerfilActivo(perf)}
                                className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                                title={perf.activo ? 'Desactivar usuario' : 'Activar usuario'}
                              >
                                {perf.activo ? <XCircle size={13} /> : <CheckCircle2 size={13} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Pagination
                    currentPage={pageUsuarios}
                    totalPages={Math.ceil(filteredPerfiles.length / itemsPerPage)}
                    onPageChange={setPageUsuarios}
                  />
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: ADD / EDIT EQUIPO
      ══════════════════════════════════════════════════════════════════════ */}
      {showEquipoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          onClick={e => { if (e.target === e.currentTarget) closeEquipoModal() }}
        >
          <div
            className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in"
            style={{ background: 'var(--bg-card)' }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/5 sticky top-0 z-10"
              style={{ background: 'var(--bg-card)' }}>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-red-500">
                  {editingEquipo ? 'Editar Equipo' : 'Nuevo Equipo'}
                </p>
                <h3 className="font-black text-lg text-white mt-0.5">
                  {editingEquipo ? editingEquipo.nombre : 'Registrar en Plan de Mantención'}
                </h3>
              </div>
              <button
                onClick={closeEquipoModal}
                className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEquipo} className="p-5 space-y-5">

              {/* N° Item + Nombre */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-1">
                  <label className="label">N° Item *</label>
                  <input
                    required
                    type="number"
                    min={1}
                    className="input-field"
                    placeholder="Ej: 1"
                    value={equipoForm.numero_item}
                    onChange={e => setEquipoForm(p => ({ ...p, numero_item: Number(e.target.value) }))}
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="label">Nombre del Equipo *</label>
                  <input
                    required
                    type="text"
                    className="input-field"
                    placeholder="Ej: Torno CNC Paralelo"
                    value={equipoForm.nombre}
                    onChange={e => setEquipoForm(p => ({ ...p, nombre: e.target.value }))}
                  />
                </div>
              </div>

              {/* Código + Área + Estado */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="label">Código de Inventario</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Ej: INV-0042"
                    value={equipoForm.codigo_inventario}
                    onChange={e => setEquipoForm(p => ({ ...p, codigo_inventario: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Área / Sección</label>
                  <select
                    className="input-field"
                    value={equipoForm.seccion_id}
                    onChange={e => setEquipoForm(p => ({ ...p, seccion_id: e.target.value }))}
                  >
                    <option value="">Sin área asignada</option>
                    {secciones.map(s => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                  {(() => {
                    const selectedSec = secciones.find(s => s.id === equipoForm.seccion_id)
                    if (selectedSec && selectedSec.responsable) {
                      return (
                        <p className="text-[10px] text-gray-400 mt-1 font-medium">
                          Responsable: <span className="text-white font-bold">{selectedSec.responsable}</span>
                        </p>
                      )
                    }
                    return null
                  })()}
                </div>
                <div>
                  <label className="label">Estado Programado</label>
                  <select
                    className="input-field"
                    value={equipoForm.estado_programado}
                    onChange={e => setEquipoForm(p => ({ ...p, estado_programado: e.target.value as 'P' | 'R' | 'C' }))}
                  >
                    <option value="P">P — Pendiente</option>
                    <option value="R">R — Realizado</option>
                    <option value="C">C — Correctiva</option>
                  </select>
                </div>
              </div>

              {/* Nivel Uso + Nivel Costo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Nivel de Uso</label>
                  <select
                    className="input-field"
                    value={equipoForm.nivel_uso}
                    onChange={e => setEquipoForm(p => ({ ...p, nivel_uso: e.target.value as any }))}
                  >
                    <option value="USO MAYOR">USO MAYOR</option>
                    <option value="USO MENOR">USO MENOR</option>
                  </select>
                </div>
                <div>
                  <label className="label">Nivel de Costo</label>
                  <select
                    className="input-field"
                    value={equipoForm.nivel_costo}
                    onChange={e => setEquipoForm(p => ({ ...p, nivel_costo: e.target.value as any }))}
                  >
                    <option value="COSTO MAYOR">COSTO MAYOR</option>
                    <option value="COSTO MENOR">COSTO MENOR</option>
                  </select>
                </div>
              </div>

              {/* Frecuencia + Mes + Cantidad */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="label">Frecuencia</label>
                  <select
                    className="input-field"
                    value={equipoForm.frecuencia}
                    onChange={e => setEquipoForm(p => ({ ...p, frecuencia: e.target.value as any }))}
                  >
                    <option value="ANUAL">ANUAL</option>
                    <option value="SEMESTRAL">SEMESTRAL</option>
                    <option value="TRIMESTRAL">TRIMESTRAL</option>
                    <option value="MENSUAL">MENSUAL</option>
                  </select>
                </div>
                <div>
                  <label className="label">Mes Programado</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Ej: Enero / Marzo–Abril"
                    value={equipoForm.mes_programado}
                    onChange={e => setEquipoForm(p => ({ ...p, mes_programado: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Cantidad</label>
                  <input
                    type="number"
                    min={1}
                    className="input-field"
                    value={equipoForm.cantidad}
                    onChange={e => setEquipoForm(p => ({ ...p, cantidad: Number(e.target.value) }))}
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="rounded-xl border border-white/5 bg-white/2 p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Toggle
                  checked={equipoForm.requiere_calibracion}
                  onChange={v => setEquipoForm(p => ({ ...p, requiere_calibracion: v }))}
                  label="Calibración"
                />
                <Toggle
                  checked={equipoForm.tiene_informe_tecnico}
                  onChange={v => setEquipoForm(p => ({ ...p, tiene_informe_tecnico: v }))}
                  label="Informe Téc."
                />
                <Toggle
                  checked={equipoForm.tiene_cert_calibracion}
                  onChange={v => setEquipoForm(p => ({ ...p, tiene_cert_calibracion: v }))}
                  label="Cert. Calib."
                />
                <Toggle
                  checked={equipoForm.activo}
                  onChange={v => setEquipoForm(p => ({ ...p, activo: v }))}
                  label="Activo"
                />
              </div>

              {/* Observaciones */}
              <div>
                <label className="label">Observaciones</label>
                <textarea
                  rows={3}
                  className="input-field resize-none"
                  placeholder="Notas adicionales, estado actual, historial relevante..."
                  value={equipoForm.observaciones}
                  onChange={e => setEquipoForm(p => ({ ...p, observaciones: e.target.value }))}
                />
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 pt-2 border-t border-white/5">
                <button type="button" onClick={closeEquipoModal} className="btn-secondary !py-2 !px-5 text-sm">
                  Cancelar
                </button>
                <button type="submit" className="btn-success !py-2 !px-5 text-sm" disabled={savingEquipo}>
                  <Save size={14} />
                  {savingEquipo ? 'Guardando...' : editingEquipo ? 'Actualizar Equipo' : 'Registrar Equipo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
