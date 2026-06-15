'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  ChevronLeft,
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Wrench,
  Calendar,
  User,
  Hash,
  Package,
  Activity,
  Gauge,
  FileText,
  Award,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Layers,
  TrendingUp,
  TrendingDown,
  ClipboardList,
  BarChart3,
} from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import type { Equipo, SeccionMantencion } from '@/lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type EquipoConSeccion = Equipo & {
  secciones_mantencion?: Pick<SeccionMantencion, 'id' | 'nombre' | 'responsable'>
}

type FiltroArea = 'Todos' | 'MECÁNICA Y ELECTROMOVILIDAD AUTOMOTRIZ' | 'MANTENIMIENTO INDUSTRIAL'
type FiltroBoolean = 'Todos' | 'SI' | 'NO'
type FiltroFrecuencia = 'Todos' | 'ANUAL' | 'SEMESTRAL'
type FiltroCostoUso =
  | 'Todos'
  | 'USO MAYOR-COSTO MAYOR'
  | 'USO MAYOR-COSTO MENOR'
  | 'USO MENOR-COSTO MAYOR'
  | 'USO MENOR-COSTO MENOR'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAreaFromSeccion(nombre: string | undefined): FiltroArea | null {
  if (!nombre) return null
  const n = nombre.toUpperCase()
  if (n.includes('AUTOMOTRIZ') || n.includes('ELECTROMOVILIDAD') || n.includes('MECÁNICA') || n.includes('MECANICA')) {
    return 'MECÁNICA Y ELECTROMOVILIDAD AUTOMOTRIZ'
  }
  if (n.includes('INDUSTRIAL') || n.includes('MANTENIMIENTO')) {
    return 'MANTENIMIENTO INDUSTRIAL'
  }
  return null
}

function estadoLabel(e: string): string {
  if (e === 'P') return 'Pendiente'
  if (e === 'R') return 'Realizado'
  if (e === 'C') return 'Correctiva'
  return e
}

function estadoColor(e: string): string {
  if (e === 'P') return '#F59E0B'
  if (e === 'R') return '#22C55E'
  if (e === 'C') return '#E63946'
  return '#8B9BB4'
}

// ─── Skeleton Card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      className="card p-5 animate-pulse"
      style={{ minHeight: 260 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 w-32 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="h-5 w-16 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>
      <div className="h-6 w-3/4 rounded mb-2" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="h-4 w-1/2 rounded mb-5" style={{ background: 'rgba(255,255,255,0.04)' }} />
      <div className="grid grid-cols-2 gap-2 mb-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-9 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }} />
        ))}
      </div>
      <div className="flex gap-2 mt-3">
        <div className="h-6 w-16 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="h-6 w-20 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>
    </div>
  )
}

// ─── Info Item ─────────────────────────────────────────────────────────────────

function InfoItem({
  icon: Icon,
  label,
  value,
  iconColor,
}: {
  icon: React.ElementType
  label: string
  value: string | number | null | undefined
  iconColor?: string
}) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <Icon size={14} style={{ color: iconColor ?? 'var(--text-secondary)', flexShrink: 0 }} />
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          {label}
        </p>
        <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
          {value ?? '—'}
        </p>
      </div>
    </div>
  )
}

// ─── Equipment Card ─────────────────────────────────────────────────────────────

function EquipoCard({ equipo, delay }: { equipo: EquipoConSeccion; delay: number }) {
  const seccionNombre = equipo.secciones_mantencion?.nombre
  const area = getAreaFromSeccion(seccionNombre)
  const isAutomotriz = area === 'MECÁNICA Y ELECTROMOVILIDAD AUTOMOTRIZ'
  const areaColor = isAutomotriz ? '#1E88E5' : '#F59E0B'
  const areaLabel = isAutomotriz ? 'Mecánica / Electro.' : 'Mant. Industrial'

  const costoUso =
    equipo.nivel_uso && equipo.nivel_costo
      ? `${equipo.nivel_uso}-${equipo.nivel_costo}`
      : null

  return (
    <div
      className="card animate-fade-in flex flex-col"
      style={{
        animationDelay: `${delay}ms`,
        padding: '0',
        overflow: 'hidden',
      }}
    >
      {/* Card header stripe */}
      <div
        style={{
          height: 4,
          background: `linear-gradient(90deg, ${areaColor}cc 0%, ${areaColor}22 100%)`,
        }}
      />

      <div className="flex flex-col flex-1 p-5">
        {/* Top row: área badge + item number */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <span
            className="badge text-xs"
            style={{
              color: areaColor,
              background: `${areaColor}18`,
              borderColor: `${areaColor}40`,
              fontSize: 11,
            }}
          >
            {area ? areaLabel : (seccionNombre ?? 'Sin sección')}
          </span>
          <span
            className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}
          >
            #{equipo.numero_item}
          </span>
        </div>

        {/* Equipment name */}
        <h3
          className="font-bold leading-snug mb-1"
          style={{ color: 'var(--text-primary)', fontSize: 15 }}
        >
          {equipo.nombre}
        </h3>

        {/* Inventory code */}
        {equipo.codigo_inventario && (
          <p className="text-xs mb-4 font-mono" style={{ color: 'var(--text-secondary)' }}>
            Inv. {equipo.codigo_inventario}
          </p>
        )}
        {!equipo.codigo_inventario && <div className="mb-4" />}

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <InfoItem
            icon={Activity}
            label="Frecuencia"
            value={equipo.frecuencia}
            iconColor="#1E88E5"
          />
          <InfoItem
            icon={Calendar}
            label="Mes Prog."
            value={equipo.mes_programado}
            iconColor="#7C3AED"
          />
          <InfoItem
            icon={User}
            label="Responsable"
            value={equipo.secciones_mantencion?.responsable}
            iconColor="#0EA5E9"
          />
          <InfoItem
            icon={Package}
            label="Cantidad"
            value={equipo.cantidad}
            iconColor="#F59E0B"
          />
        </div>

        {/* Estado programado */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl mb-4"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: estadoColor(equipo.estado_programado) }}
          />
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Estado:
          </span>
          <span className="text-xs font-semibold" style={{ color: estadoColor(equipo.estado_programado) }}>
            {estadoLabel(equipo.estado_programado)}
          </span>
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {/* Activo */}
          {equipo.activo ? (
            <span
              className="badge"
              style={{
                color: '#22C55E',
                background: 'rgba(34,197,94,0.12)',
                borderColor: 'rgba(34,197,94,0.30)',
                fontSize: 11,
              }}
            >
              <CheckCircle size={11} />
              Activo
            </span>
          ) : (
            <span
              className="badge"
              style={{
                color: '#EF4444',
                background: 'rgba(239,68,68,0.12)',
                borderColor: 'rgba(239,68,68,0.30)',
                fontSize: 11,
              }}
            >
              <XCircle size={11} />
              Inactivo
            </span>
          )}

          {/* Requiere Calibración */}
          {equipo.requiere_calibracion && (
            <span
              className="badge"
              style={{
                color: '#F59E0B',
                background: 'rgba(245,158,11,0.12)',
                borderColor: 'rgba(245,158,11,0.30)',
                fontSize: 11,
              }}
            >
              <Gauge size={11} />
              Req. Calibración
            </span>
          )}

          {/* Informe Técnico */}
          {equipo.tiene_informe_tecnico && (
            <span
              className="badge"
              style={{
                color: '#60A5FA',
                background: 'rgba(96,165,250,0.12)',
                borderColor: 'rgba(96,165,250,0.30)',
                fontSize: 11,
              }}
            >
              <FileText size={11} />
              Informe
            </span>
          )}

          {/* Certificado de Calibración */}
          {equipo.tiene_cert_calibracion && (
            <span
              className="badge"
              style={{
                color: '#A78BFA',
                background: 'rgba(167,139,250,0.12)',
                borderColor: 'rgba(167,139,250,0.30)',
                fontSize: 11,
              }}
            >
              <Award size={11} />
              Certificado
            </span>
          )}
        </div>

        {/* Costo / Uso chips */}
        {costoUso && (
          <div className="flex flex-wrap gap-1.5 mt-auto pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <span
              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}
            >
              {equipo.nivel_uso?.includes('MAYOR') ? (
                <TrendingUp size={11} style={{ color: '#F59E0B' }} />
              ) : (
                <TrendingDown size={11} style={{ color: '#8B9BB4' }} />
              )}
              {equipo.nivel_uso}
            </span>
            <span
              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}
            >
              {equipo.nivel_costo?.includes('MAYOR') ? (
                <TrendingUp size={11} style={{ color: '#E63946' }} />
              ) : (
                <TrendingDown size={11} style={{ color: '#8B9BB4' }} />
              )}
              {equipo.nivel_costo}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Stat Badge ────────────────────────────────────────────────────────────────

function StatBadge({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType
  label: string
  value: number | string
  color: string
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-2xl"
      style={{
        background: `${color}10`,
        border: `1px solid ${color}28`,
      }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}20` }}
      >
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <p className="text-xl font-black leading-none" style={{ color }}>
          {value}
        </p>
        <p className="text-[11px] font-bold uppercase tracking-wider mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </p>
      </div>
    </div>
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
    <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-4 select-none col-span-full">
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

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function EquiposPage() {
  const [equipos, setEquipos] = useState<EquipoConSeccion[]>([])
  const [loading, setLoading] = useState(true)
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [filtroArea, setFiltroArea] = useState<FiltroArea>('Todos')
  const [filtroActivo, setFiltroActivo] = useState<FiltroBoolean>('Todos')
  const [filtroCalib, setFiltroCalib] = useState<FiltroBoolean>('Todos')
  const [filtroFrecuencia, setFiltroFrecuencia] = useState<FiltroFrecuencia>('Todos')
  const [filtroCostoUso, setFiltroCostoUso] = useState<FiltroCostoUso>('Todos')

  // ── Pagination States ──
  const itemsPerPage = 12
  const [page, setPage] = useState(1)

  // Reset page when search or filters change
  useEffect(() => {
    setPage(1)
  }, [search, filtroArea, filtroActivo, filtroCalib, filtroFrecuencia, filtroCostoUso])

  // ─── Load data ───────────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabaseBrowser
        .from('equipos')
        .select('*, secciones_mantencion(id, nombre, responsable)')
        .order('numero_item')
      setEquipos((data as EquipoConSeccion[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  // ─── Derived stats ───────────────────────────────────────────────────────────

  const totalEquipos = equipos.length
  const totalActivos = equipos.filter(e => e.activo).length
  const totalCalib = equipos.filter(e => e.requiere_calibracion).length

  // ─── Filtered list ────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return equipos.filter(e => {
      // Search
      if (q) {
        const matchNombre = e.nombre.toLowerCase().includes(q)
        const matchCodigo = e.codigo_inventario?.toLowerCase().includes(q) ?? false
        if (!matchNombre && !matchCodigo) return false
      }
      // Area
      if (filtroArea !== 'Todos') {
        const area = getAreaFromSeccion(e.secciones_mantencion?.nombre)
        if (area !== filtroArea) return false
      }
      // Activo
      if (filtroActivo !== 'Todos') {
        const expected = filtroActivo === 'SI'
        if (Boolean(e.activo) !== expected) return false
      }
      // Calibración
      if (filtroCalib !== 'Todos') {
        const expected = filtroCalib === 'SI'
        if (Boolean(e.requiere_calibracion) !== expected) return false
      }
      // Frecuencia
      if (filtroFrecuencia !== 'Todos') {
        if (e.frecuencia !== filtroFrecuencia) return false
      }
      // Costo/Uso
      if (filtroCostoUso !== 'Todos') {
        const [uso, costo] = filtroCostoUso.split('-')
        if (e.nivel_uso !== uso || e.nivel_costo !== costo) return false
      }
      return true
    })
  }, [
    equipos,
    search,
    filtroArea,
    filtroActivo,
    filtroCalib,
    filtroFrecuencia,
    filtroCostoUso,
  ])

  const paginatedFiltered = useMemo(() => {
    const startIndex = (page - 1) * itemsPerPage
    return filtered.slice(startIndex, startIndex + itemsPerPage)
  }, [filtered, page])

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <main
      className="min-h-screen"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* ── Hero Header ── */}
      <div
        className="glass sticky top-0 z-30"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/solicitud" className="btn-secondary !px-3 !py-2 flex-shrink-0">
              <ChevronLeft size={18} />
            </Link>
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div
                className="w-1 h-10 rounded-full flex-shrink-0"
                style={{ background: 'var(--nacap-red)' }}
              />
              <div className="min-w-0">
                <p
                  className="text-[11px] font-black tracking-widest uppercase"
                  style={{ color: 'var(--nacap-red)' }}
                >
                  Área Mecánica — INACAP
                </p>
                <h1
                  className="text-lg sm:text-xl font-black leading-tight truncate"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Catálogo de Equipos
                </h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 animate-fade-in">
          <StatBadge icon={Layers} label="Total equipos" value={loading ? '…' : totalEquipos} color="#1E88E5" />
          <StatBadge icon={CheckCircle} label="Activos" value={loading ? '…' : totalActivos} color="#22C55E" />
          <StatBadge icon={Gauge} label="Req. calibración" value={loading ? '…' : totalCalib} color="#F59E0B" />
        </div>

        {/* ── Search + Filter Toggle ── */}
        <div className="flex gap-3 mb-4 animate-fade-in" style={{ animationDelay: '60ms' }}>
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre o código de inventario…"
              className="input-field !pl-9"
            />
          </div>
          <button
            onClick={() => setFiltersOpen(v => !v)}
            className="btn-secondary !px-4 gap-2 flex-shrink-0"
          >
            <SlidersHorizontal size={16} />
            <span className="hidden sm:inline">Filtros</span>
            {filtersOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* ── Filters Panel ── */}
        {filtersOpen && (
          <div
            className="card p-5 mb-5 animate-fade-in"
            style={{ animationDelay: '0ms' }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

              {/* Área */}
              <div>
                <label className="label">Área</label>
                <select
                  value={filtroArea}
                  onChange={e => setFiltroArea(e.target.value as FiltroArea)}
                  className="input-field select"
                >
                  <option value="Todos">Todos</option>
                  <option value="MECÁNICA Y ELECTROMOVILIDAD AUTOMOTRIZ">
                    Mecánica y Electromovilidad
                  </option>
                  <option value="MANTENIMIENTO INDUSTRIAL">Mantenimiento Industrial</option>
                </select>
              </div>

              {/* Activo */}
              <div>
                <label className="label">Activo</label>
                <select
                  value={filtroActivo}
                  onChange={e => setFiltroActivo(e.target.value as FiltroBoolean)}
                  className="input-field select"
                >
                  <option value="Todos">Todos</option>
                  <option value="SI">Sí</option>
                  <option value="NO">No</option>
                </select>
              </div>

              {/* Requiere Calibración */}
              <div>
                <label className="label">Requiere Calibración</label>
                <select
                  value={filtroCalib}
                  onChange={e => setFiltroCalib(e.target.value as FiltroBoolean)}
                  className="input-field select"
                >
                  <option value="Todos">Todos</option>
                  <option value="SI">Sí</option>
                  <option value="NO">No</option>
                </select>
              </div>

              {/* Frecuencia */}
              <div>
                <label className="label">Frecuencia</label>
                <select
                  value={filtroFrecuencia}
                  onChange={e => setFiltroFrecuencia(e.target.value as FiltroFrecuencia)}
                  className="input-field select"
                >
                  <option value="Todos">Todos</option>
                  <option value="ANUAL">Anual</option>
                  <option value="SEMESTRAL">Semestral</option>
                </select>
              </div>

              {/* Costo / Uso */}
              <div className="sm:col-span-2 lg:col-span-2">
                <label className="label">Costo / Uso</label>
                <select
                  value={filtroCostoUso}
                  onChange={e => setFiltroCostoUso(e.target.value as FiltroCostoUso)}
                  className="input-field select"
                >
                  <option value="Todos">Todos</option>
                  <option value="USO MAYOR-COSTO MAYOR">Uso Mayor · Costo Mayor</option>
                  <option value="USO MAYOR-COSTO MENOR">Uso Mayor · Costo Menor</option>
                  <option value="USO MENOR-COSTO MAYOR">Uso Menor · Costo Mayor</option>
                  <option value="USO MENOR-COSTO MENOR">Uso Menor · Costo Menor</option>
                </select>
              </div>

            </div>

            {/* Reset filters */}
            <div className="mt-4 flex justify-end">
              <button
                className="btn-secondary !px-4 !py-2 text-xs"
                onClick={() => {
                  setSearch('')
                  setFiltroArea('Todos')
                  setFiltroActivo('Todos')
                  setFiltroCalib('Todos')
                  setFiltroFrecuencia('Todos')
                  setFiltroCostoUso('Todos')
                }}
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        )}

        {/* ── Result count ── */}
        {!loading && (
          <div
            className="flex items-center gap-2 mb-5 animate-fade-in"
            style={{ animationDelay: '80ms' }}
          >
            <BarChart3 size={14} style={{ color: 'var(--text-secondary)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--text-primary)' }} className="font-bold">
                {filtered.length}
              </span>{' '}
              {filtered.length === 1 ? 'equipo encontrado' : 'equipos encontrados'}
              {filtered.length !== totalEquipos && (
                <span className="ml-1">
                  de <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{totalEquipos}</span>
                </span>
              )}
            </p>
          </div>
        )}

        {/* ── Loading Skeletons ── */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* ── Empty State ── */}
        {!loading && filtered.length === 0 && (
          <div
            className="card flex flex-col items-center justify-center text-center py-20 animate-fade-in"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <Wrench size={32} style={{ color: 'var(--text-muted)' }} />
            </div>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Sin resultados
            </h3>
            <p className="text-sm max-w-xs" style={{ color: 'var(--text-secondary)' }}>
              No se encontraron equipos que coincidan con los filtros aplicados. Intenta ampliar la búsqueda.
            </p>
            {(search || filtroArea !== 'Todos' || filtroActivo !== 'Todos' || filtroCalib !== 'Todos' || filtroFrecuencia !== 'Todos' || filtroCostoUso !== 'Todos') && (
              <button
                className="btn-secondary mt-6 !px-5 !py-2.5 text-sm"
                onClick={() => {
                  setSearch('')
                  setFiltroArea('Todos')
                  setFiltroActivo('Todos')
                  setFiltroCalib('Todos')
                  setFiltroFrecuencia('Todos')
                  setFiltroCostoUso('Todos')
                }}
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}

        {/* ── Equipment Grid ── */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
            {paginatedFiltered.map((equipo, i) => (
              <EquipoCard
                key={equipo.id}
                equipo={equipo}
                delay={Math.min(i * 40, 400)}
              />
            ))}
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(filtered.length / itemsPerPage)}
              onPageChange={setPage}
            />
          </div>
        )}

        {/* ── Footer note ── */}
        {!loading && filtered.length > 0 && (
          <p
            className="text-center text-xs mt-10 pb-4 animate-fade-in"
            style={{ color: 'var(--text-muted)', animationDelay: '300ms' }}
          >
            Catálogo de solo lectura · Área Mecánica INACAP Puerto Montt
          </p>
        )}

      </div>
    </main>
  )
}
