'use client'

import { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus,
  Trash2,
  ChevronLeft,
  Send,
  AlertCircle,
  LogOut,
  Search,
  Package,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Wrench,
  Calendar,
  User,
  Activity,
  Gauge,
  FileText,
  Award,
  CheckCircle,
  XCircle,
  BarChart3,
  Check,
  HelpCircle,
  ClipboardList,
  QrCode,
  KeyRound,
  Clock,
  Truck,
  RotateCcw,
  ChevronRight
} from 'lucide-react'
import { BadgeEstado } from '@/components/BadgeEstado'
import type { Docente } from '@/lib/types'
import { supabaseClient } from '@/lib/supabase-client'
import QRCode from 'qrcode'


const schema = z.object({
  alumno: z.string().min(3, 'Ingresa tu nombre completo'),
  rut: z.string().min(8, 'RUT inválido'),
  alumno_email: z.string().email('Correo inválido'),
  asignatura: z.string().min(2, 'Ingresa la asignatura'),
  seccion: z.string().min(1, 'Ingresa la sección'),
  jornada: z.enum(['D', 'V']),
  fecha: z.string().min(1, 'Selecciona la fecha'),
  docente_id: z.string().uuid('Selecciona un docente'),
  items: z.array(z.object({
    cantidad: z.number().min(1, 'Mínimo 1'),
    descripcion: z.string().min(2, 'Describe el material'),
    estado_item: z.enum(['NUEVO', 'USADO', 'CUALQUIERA']),
  })).min(1, 'Agrega al menos un material'),
})

type FormData = z.infer<typeof schema>

// ─── TabInitializer — aislado en Suspense para compatibilidad con Next.js SSG ──
function TabInitializer({
  onInit,
}: {
  onInit: (tab: 'form' | 'mis-solicitudes', id: string | null) => void
}) {
  const searchParams = useSearchParams()
  useEffect(() => {
    const tab = searchParams.get('tab') === 'mis-solicitudes' ? 'mis-solicitudes' : 'form'
    const id = searchParams.get('id') ?? null
    onInit(tab, id)
  }, [searchParams, onInit])
  return null
}

// ─── Mis Solicitudes ─────────────────────────────────────────────────────────
function MisSolicitudes({ profile, openId, profileLoaded }: { profile: any; openId: string | null; profileLoaded: boolean }) {
  const [solicitudes, setSolicitudes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openSolicitudId, setOpenSolicitudId] = useState<string | null>(openId)
  const [qrMap, setQrMap] = useState<Record<string, string>>({})

  useEffect(() => {
    if (openId) setOpenSolicitudId(openId)
  }, [openId])

  useEffect(() => {
    if (!profile) return
    let isInitial = true

    async function fetchMisSolicitudes() {
      if (isInitial) setLoading(true)
      try {
        const orParts: string[] = []
        if (profile.email) orParts.push(`alumno_email.eq.${profile.email}`)
        if (profile.rut)   orParts.push(`rut.eq.${profile.rut}`)
        if (!orParts.length) { setLoading(false); return }
        const { data } = await supabaseClient
          .from('solicitudes')
          .select('*, items:items_solicitud(*)')
          .or(orParts.join(','))
          .order('created_at', { ascending: false })
          .limit(30)
        setSolicitudes(data || [])

        // Pre-generar QRs para las APROBADAS
        const aprobadas = (data || []).filter((s: any) => s.estado === 'APROBADA' && s.codigo_entrega)
        const qrs: Record<string, string> = {}
        await Promise.all(aprobadas.map(async (s: any) => {
          try {
            qrs[s.id] = await QRCode.toDataURL(s.codigo_entrega, {
              width: 220, margin: 2,
              color: { dark: '#FFFFFF', light: '#0D1B2E' },
              errorCorrectionLevel: 'H',
            })
          } catch {}
        }))
        setQrMap(qrs)
      } finally {
        isInitial = false
        setLoading(false)
      }
    }
    fetchMisSolicitudes()

    // Refresco en tiempo real (polling cada 15s silencioso sin parpadeo)
    const interval = setInterval(fetchMisSolicitudes, 15000)
    return () => clearInterval(interval)
  }, [profile])



  if (!profileLoaded) return (
    <div className="space-y-4 animate-pulse pt-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-32 bg-gray-800/30 rounded-2xl border border-gray-800" />
      ))}
    </div>
  )

  if (profileLoaded && !profile) return (
    <div className="text-center py-16 px-4">
      <User size={40} className="mx-auto mb-3 text-gray-600" />
      <p className="text-sm font-semibold text-gray-400">Debes iniciar sesión</p>
      <p className="text-xs text-gray-600 mt-1 mb-4">Para ver tu historial y tus códigos de retiro, necesitas iniciar sesión.</p>
      <Link href="/login" className="btn-primary px-6 py-2 text-sm rounded-xl inline-flex">Ir a Iniciar Sesión</Link>
    </div>
  )

  if (loading) return (
    <div className="space-y-4 animate-pulse pt-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-32 bg-gray-800/30 rounded-2xl border border-gray-800" />
      ))}
    </div>
  )

  if (!solicitudes.length) return (
    <div className="text-center py-16">
      <ClipboardList size={40} className="mx-auto mb-3 text-gray-600" />
      <p className="text-sm font-semibold text-gray-400">No tienes solicitudes aún</p>
      <p className="text-xs text-gray-600 mt-1">Crea tu primera solicitud con el formulario.</p>
    </div>
  )

  return (
    <div className="space-y-3 animate-fade-in">
      {solicitudes.map((s) => {
        const isOpen = openSolicitudId === s.id
        const qr = qrMap[s.id]

        return (
          <div key={s.id} className="card overflow-hidden">
            {/* Cabecera de la solicitud */}
            <button
              type="button"
              onClick={() => setOpenSolicitudId(isOpen ? null : s.id)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <BadgeEstado estado={s.estado} />
                  <span className="text-[10px] text-gray-500">
                    {new Date(s.created_at).toLocaleDateString('es-CL', { day:'2-digit', month:'short', year:'numeric' })}
                  </span>
                </div>
                <p className="text-sm font-bold line-clamp-2 break-words" style={{ color: 'var(--text-primary)' }}>{s.asignatura}</p>
                <p className="text-xs text-gray-500 mt-0.5">{(s.items || []).length} material(es)</p>
              </div>
              <ChevronRight
                size={16}
                className={`flex-shrink-0 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
              />
            </button>

            {/* Detalle expandido */}
            {isOpen && (
              <div className="border-t border-white/5 px-4 pb-4 pt-3 space-y-4">

                {/* Materiales */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Materiales solicitados</p>
                  <div className="space-y-1">
                    {(s.items || []).map((item: any, i: number) => (
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

                {/* Estado PENDIENTE */}
                {s.estado === 'PENDIENTE' && (
                  <div className="rounded-xl p-3 flex items-center gap-2"
                    style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <Clock size={14} style={{ color: '#F59E0B', flexShrink: 0 }} />
                    <p className="text-xs text-amber-300">Esperando confirmación del docente. Esta página se actualiza automáticamente.</p>
                  </div>
                )}

                {/* Estado APROBADA: QR prominente */}
                {s.estado === 'APROBADA' && (
                  <div className="rounded-xl p-4 flex flex-col items-center"
                    style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.25)' }}>
                    <div className="flex items-center gap-1.5 mb-3">
                      <QrCode size={14} style={{ color: '#22C55E' }} />
                      <p className="text-xs font-bold" style={{ color: '#22C55E' }}>QR de Retiro — Muéstraselo al pañolero</p>
                    </div>
                    {qr ? (
                      <img src={qr} alt="QR de retiro" className="rounded-xl mb-3" style={{ width: 200, height: 200 }} />
                    ) : (
                      <div className="w-[200px] h-[200px] rounded-xl bg-white/5 flex items-center justify-center mb-3">
                        <span className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <KeyRound size={12} className="text-gray-500" />
                      <span className="text-xs text-gray-500">Código manual:</span>
                      <span className="font-mono font-black text-base tracking-[.25em]" style={{ color: 'var(--text-primary)' }}>
                        {s.codigo_entrega}
                      </span>
                    </div>
                  </div>
                )}

                {/* Estado RECHAZADA */}
                {s.estado === 'RECHAZADA' && (
                  <div className="rounded-xl p-3"
                    style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <p className="text-xs text-red-400 font-semibold mb-1">Solicitud rechazada</p>
                    {s.observaciones && (
                      <p className="text-xs text-gray-400">Motivo: {s.observaciones}</p>
                    )}
                  </div>
                )}

                {/* Estado ENTREGADA */}
                {s.estado === 'ENTREGADA' && (
                  <div className="rounded-xl p-3"
                    style={{ background: 'rgba(96,165,250,0.05)', border: '1px solid rgba(96,165,250,0.2)' }}>
                    <p className="text-xs text-blue-400">✅ Materiales entregados. Recuerda devolverlos al pañol al finalizar la clase.</p>
                  </div>
                )}

                {/* Estado DEVUELTA / DEVUELTA_INCOMPLETA */}
                {(s.estado === 'DEVUELTA' || s.estado === 'DEVUELTA_INCOMPLETA') && (
                  <div className="rounded-xl p-3"
                    style={{ background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.2)' }}>
                    <p className="text-xs" style={{ color: '#A78BFA' }}>
                      {s.estado === 'DEVUELTA' ? '✅ Materiales devueltos correctamente.' : '⚠️ Devolución registrada con materiales pendientes.'}
                    </p>
                  </div>
                )}

              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function SolicitudPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'form' | 'mis-solicitudes'>('form')
  const [openIdFromUrl, setOpenIdFromUrl] = useState<string | null>(null)
  const handleTabInit = useCallback((tab: 'form' | 'mis-solicitudes', id: string | null) => {
    setActiveTab(tab)
    setOpenIdFromUrl(id)
  }, [])
  const [docentes, setDocentes] = useState<Docente[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [asignaturas, setAsignaturas] = useState<any[]>([])
  const [selectedCarrera, setSelectedCarrera] = useState<string>('ALL')
  const [activeAutocomplete, setActiveAutocomplete] = useState<number | null>(null)
  const [autocompleteSearch, setAutocompleteSearch] = useState<Record<number,string>>({})
  const autocompleteRef = useRef<HTMLDivElement>(null)

  // ─── Catálogo de Equipos para Autocompletar ───
  const [equiposCatalog, setEquiposCatalog] = useState<{id:string; nombre:string; codigo_inventario:string|null; frecuencia?:string; seccion_nombre:string|null}[]>([])
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [catalogSearch, setCatalogSearch] = useState('')
  const [filtroArea, setFiltroArea] = useState<string>('Todos')
  const [filtroFrecuencia, setFiltroFrecuencia] = useState<string>('Todos')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [addedEquipos, setAddedEquipos] = useState<Record<string, boolean>>({})
  const [activePanoleros, setActivePanoleros] = useState<any[]>([])
  const [loadingPanoleros, setLoadingPanoleros] = useState(true)

  const { register, control, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      jornada: 'D',
      fecha: new Date().toISOString().split('T')[0],
      items: [{ cantidad: 1, descripcion: '', estado_item: 'CUALQUIERA' }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  useEffect(() => {
    fetch('/api/docentes')
      .then(r => r.json())
      .then(data => setDocentes(data.docentes || []))
      .catch(() => setDocentes([]))
  }, [])



  // Cerrar autocomplete al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
        setActiveAutocomplete(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cargar catálogo de equipos del Plan de Mantención para autocompletar
  useEffect(() => {
    async function loadEquipos() {
      const { data } = await supabaseClient
        .from('equipos')
        .select('id, nombre, codigo_inventario, frecuencia, secciones_mantencion(nombre)')
        .eq('activo', true)
        .order('nombre')
      if (data) {
        setEquiposCatalog(data.map((e: any) => ({
          id: e.id,
          nombre: e.nombre,
          codigo_inventario: e.codigo_inventario,
          frecuencia: e.frecuencia,
          seccion_nombre: e.secciones_mantencion?.nombre || null
        })))
      }
    }
    loadEquipos()
  }, [])

  const handleAddEquipoToSolicitud = (id: string, nombre: string) => {
    const currentItems = control._formValues.items || []
    if (currentItems.length === 1 && currentItems[0].descripcion.trim() === '') {
      setValue('items.0.descripcion', nombre)
    } else {
      append({ cantidad: 1, descripcion: nombre, estado_item: 'CUALQUIERA' })
    }
    
    setAddedEquipos(prev => ({ ...prev, [id]: true }))
    setTimeout(() => {
      setAddedEquipos(prev => ({ ...prev, [id]: false }))
    }, 1500)
  }

  const getAreaFromSeccion = (nombre: string | undefined): string | null => {
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

  const filteredEquipos = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase()
    return equiposCatalog.filter(e => {
      if (q) {
        const matchNombre = e.nombre.toLowerCase().includes(q)
        const matchCodigo = e.codigo_inventario?.toLowerCase().includes(q) ?? false
        if (!matchNombre && !matchCodigo) return false
      }
      if (filtroArea !== 'Todos') {
        const area = getAreaFromSeccion(e.seccion_nombre || '')
        if (area !== filtroArea) return false
      }
      if (filtroFrecuencia !== 'Todos') {
        if (e.frecuencia !== filtroFrecuencia) return false
      }
      return true
    })
  }, [equiposCatalog, catalogSearch, filtroArea, filtroFrecuencia])

  useEffect(() => {
    async function loadAsignaturas() {
      const { data, error } = await supabaseClient
        .from('asignaturas')
        .select('*')
        .order('nivel', { ascending: true })
        .order('nombre', { ascending: true })
      
      if (error) {
        console.error('[loadAsignaturas] Error al consultar tabla "asignaturas" en Supabase:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        })
        return
      }
      if (data) {
        setAsignaturas(data)
      } else {
        console.warn('[loadAsignaturas] La consulta no devolvió error pero tampoco datos.')
      }
    }
    loadAsignaturas()
  }, [])

  // Cargar pañoleros activos
  useEffect(() => {
    async function loadActivePanoleros() {
      try {
        const { data, error } = await supabaseClient
          .from('perfiles')
          .select('nombre, rol, last_seen')
          .in('rol', ['PANOL', 'ADMIN'])
        
        if (error) {
          console.warn("Error al cargar perfiles activos (posiblemente falta ejecutar SQL en Supabase):", error.message)
          setLoadingPanoleros(false)
          return
        }

        if (data) {
          const now = new Date()
          const active = data.filter((p: any) => {
            if (!p.last_seen) return false
            const lastSeenDate = new Date(p.last_seen)
            const diffMs = now.getTime() - lastSeenDate.getTime()
            // Considerar activo si reportó en los últimos 90 segundos (90000 ms)
            // Tolerancia de desfase de reloj cliente-servidor de hasta 30 segundos en el futuro (diffMs >= -30000)
            return diffMs >= -30000 && diffMs < 90000
          })
          setActivePanoleros(active)
        }
      } catch (err) {
        console.error("Error al verificar presencia de pañoleros:", err)
      } finally {
        setLoadingPanoleros(false)
      }
    }

    loadActivePanoleros()
    const interval = setInterval(loadActivePanoleros, 20000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    async function loadProfile() {
      try {
        const userPromise = supabaseClient.auth.getUser()
        const timeoutPromise = new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 10000)
        )
        const { data: { user } } = await Promise.race([userPromise, timeoutPromise])
        if (user) {
          let perf = null
          try {
            const { data } = await supabaseClient
              .from('perfiles')
              .select('*')
              .eq('id', user.id)
              .single()
            perf = data
          } catch (e) {
            console.error("Error cargando perfil desde tabla perfiles:", e)
          }

          // Fallback: Si no existe en la tabla perfiles, usamos metadatos de auth
          if (!perf) {
            perf = {
              id: user.id,
              email: user.email,
              nombre: user.user_metadata?.nombre || 'Usuario Inacap',
              rol: user.user_metadata?.rol || 'ALUMNO',
              rut: user.user_metadata?.rut || '',
              jornada: user.user_metadata?.jornada || 'D',
              seccion: user.user_metadata?.seccion || '',
            }
          }

          setProfile(perf)
          setValue('alumno', perf.nombre || '')
          setValue('rut', perf.rut || '')
          setValue('alumno_email', perf.email || '')
          if (perf.jornada) setValue('jornada', perf.jornada as 'D' | 'V')

          // Carrera: primero desde columna carrera, luego detección por sección (compatibilidad)
          const carreraFromProfile = perf.carrera || null
          const seccionVal = perf.seccion || ''

          let detected = carreraFromProfile
          if (!detected) {
            // fallback: detectar por nombre de sección
            detected = seccionVal.toLowerCase().includes('mantenimiento') || seccionVal.toLowerCase().includes('imi')
              ? 'IMI'
              : seccionVal.toLowerCase().includes('automotriz') || seccionVal.toLowerCase().includes('mi')
              ? 'MI'
              : 'ALL'
          }

          setSelectedCarrera(detected || 'ALL')

          // Sección: siempre guardamos el valor de sección (aunque sea largo, o fallback a 'N/A')
          setValue('seccion', seccionVal || 'N/A')
        }
        setProfileLoaded(true)
      } catch (err) {
        // Un solo reintento silencioso después de 3 segundos
        console.warn("loadProfile falló en frío, reintentando en 3s...", err)
        setTimeout(async () => {
          try {
            const userPromise = supabaseClient.auth.getUser()
            const retryTimeoutPromise = new Promise<any>((_, reject) =>
              setTimeout(() => reject(new Error('Timeout de reintento')), 10000)
            )
            const { data: { user } } = await Promise.race([userPromise, retryTimeoutPromise])
            if (!user) {
              setProfileLoaded(true)
              return
            }
            let perf = null
            try {
              const { data } = await supabaseClient
                .from('perfiles')
                .select('*')
                .eq('id', user.id)
                .single()
              perf = data
            } catch (_) {}
            if (!perf) {
              perf = {
                id: user.id,
                email: user.email,
                nombre: user.user_metadata?.nombre || 'Usuario Inacap',
                rol: user.user_metadata?.rol || 'ALUMNO',
                rut: user.user_metadata?.rut || '',
                jornada: user.user_metadata?.jornada || 'D',
                seccion: user.user_metadata?.seccion || '',
              }
            }
            setProfile(perf)
            setValue('alumno', perf.nombre || '')
            setValue('rut', perf.rut || '')
            setValue('alumno_email', perf.email || '')
            if (perf.jornada) setValue('jornada', perf.jornada as 'D' | 'V')
            const seccionVal = perf.seccion || ''
            const detected = perf.carrera
              || (seccionVal.toLowerCase().includes('mantenimiento') || seccionVal.toLowerCase().includes('imi') ? 'IMI'
              : seccionVal.toLowerCase().includes('automotriz') || seccionVal.toLowerCase().includes('mi') ? 'MI'
              : 'ALL')
            setSelectedCarrera(detected)
            setValue('seccion', seccionVal || 'N/A')
          } catch (retryErr) {
            console.error("Error loading profile (reintento fallido):", retryErr)
          } finally {
            setProfileLoaded(true)
          }
        }, 3000)
      }
    }
    loadProfile()
  }, [setValue])

  // Mapa de código a nombre completo de carrera
  const CARRERA_NOMBRES: Record<string, string> = {
    MI:  'Ingeniería en Mecánica y Electromovilidad Automotriz',
    IMI: 'Ingeniería en Mantenimiento Industrial',
    IMC: 'Ingeniería en Mecatrónica',
    FME: 'Técnico en Mecánica y Electromovilidad Automotriz',
    FMI: 'Técnico en Mantenimiento Industrial',
    FMC: 'Técnico en Mecatrónica',
    N3:  'Ingeniería Mecánica en Mantenimiento Industrial',
    F05: 'Electromecánica',
    FE2: 'Mantenimiento Industrial',
  }

  // Mapeo de la carrera del alumno al grupo de la asignatura en BD ('MI' o 'IMI')
  const mapCarreraToAsignaturaGroup = (carreraCode: string): string => {
    if (!carreraCode) return 'ALL'
    const code = carreraCode.toUpperCase()
    if (['MI', 'FME', 'FMC', 'IMC', 'F05'].includes(code)) return 'MI'
    if (['IMI', 'FMI', 'N3', 'FE2'].includes(code)) return 'IMI'
    return 'ALL'
  }

  const filteredAsignaturas = asignaturas.filter(a => {
    const targetGroup = mapCarreraToAsignaturaGroup(selectedCarrera)
    if (targetGroup === 'ALL') return true
    return a.carrera === targetGroup
  })

  async function handleLogout() {
    await supabaseClient.auth.signOut()
    window.location.href = '/login'
  }

  async function onSubmit(data: FormData) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/solicitudes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          carrera: profile?.carrera || selectedCarrera !== 'ALL' ? selectedCarrera : null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error al enviar la solicitud')
      router.push(`/solicitud/${json.id}/confirmacion`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      setLoading(false)
    }
  }



  return (
    <main className="min-h-screen py-8 px-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 animate-fade-in">
          <div className="flex items-center gap-3">
            <Link href="/" className="btn-secondary !px-3 !py-2">
              <ChevronLeft size={18} />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-1 h-10 rounded-full" style={{ background: 'var(--nacap-red)' }} />
              <div>
                <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--nacap-red)' }}>
                  Área Mecánica — INACAP
                </p>
                <h1 className="text-lg sm:text-xl font-black" style={{ color: 'var(--text-primary)' }}>
                  Solicitud de Material
                </h1>
              </div>
            </div>
          </div>

          {profile && (
            <div className="flex items-center justify-between sm:justify-end gap-3 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
              <div className="text-left">
                <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                  {profile.nombre}
                </p>
                <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                  {profile.email}
                </p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-red-400 transition-colors"
                title="Cerrar Sesión"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>

        {/* ── Tabs: Nueva Solicitud / Mis Solicitudes ── */}
        <div className="flex rounded-2xl overflow-hidden mb-6 p-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 ${
              activeTab === 'form' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
            style={activeTab === 'form' ? { background: 'var(--nacap-red)' } : {}}
          >
            <Send size={13} /> Nueva Solicitud
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mis-solicitudes')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 ${
              activeTab === 'mis-solicitudes' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
            style={activeTab === 'mis-solicitudes' ? { background: 'rgba(255,255,255,0.10)' } : {}}
          >
            <ClipboardList size={13} /> Mis Solicitudes
          </button>
        </div>

        <Suspense fallback={null}>
          <TabInitializer onInit={handleTabInit} />
        </Suspense>

        {!profileLoaded ? (
          <div className="animate-pulse space-y-6">
            <div className="h-14 bg-gray-800/30 rounded-2xl border border-gray-800"></div>
            <div className="h-14 bg-gray-800/30 rounded-2xl border border-gray-800"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-14 bg-gray-800/30 rounded-2xl border border-gray-800"></div>
              <div className="h-14 bg-gray-800/30 rounded-2xl border border-gray-800"></div>
            </div>
            <div className="h-32 bg-gray-800/30 rounded-2xl border border-gray-800"></div>
            <div className="h-14 bg-red-900/30 rounded-2xl border border-red-900/50"></div>
          </div>
        ) : activeTab === 'mis-solicitudes' ? (
          <MisSolicitudes profile={profile} openId={openIdFromUrl} profileLoaded={profileLoaded} />
        ) : (
        <>

        {/* Indicador de Pañol Activo (Presencia en tiempo real) */}
        {!loadingPanoleros && (
          <div className="mb-5 animate-fade-in" style={{ animationDelay: '40ms' }}>
            {activePanoleros.length > 0 ? (
              <div className="flex items-center gap-3.5 px-4.5 py-3.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-md relative overflow-hidden">
                {/* Micro-animación de gradiente en el borde */}
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/5 opacity-40 pointer-events-none" />
                <span className="relative flex h-3.5 w-3.5 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                </span>
                <div className="flex-1 min-w-0 z-10">
                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest leading-none mb-1">
                    🟢 Pañol Activo en Aula
                  </p>
                  <p className="text-sm font-extrabold text-white leading-tight">
                    Atendido por: {activePanoleros.map(p => p.nombre.split(' ')[0]).join(', ')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3.5 px-4.5 py-3.5 rounded-2xl border border-amber-500/15 bg-amber-500/[0.02] backdrop-blur-sm relative overflow-hidden">
                <span className="h-3 w-3 rounded-full bg-amber-500/40 flex-shrink-0"></span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-amber-500/80 uppercase tracking-widest leading-none mb-1">
                    ⚠️ Sin Personal de Pañol en Línea
                  </p>
                  <p className="text-xs text-gray-400 leading-normal">
                    No se detecta pañolero conectado. Puedes enviar tu solicitud, pero se procesará cuando el pañol abra.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 animate-fade-in" style={{ animationDelay: '80ms' }}>

          {/* Welcome Card & Identity Confirmation */}
          {profile && (
            <div className="card p-5 bg-gradient-to-r from-red-600/10 to-red-900/5 border-red-500/20 relative overflow-hidden animate-fade-in">
              <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none translate-x-4 translate-y-4">
                <div className="w-40 h-40 rounded-full bg-white" />
              </div>
              <div>
                <p className="text-xs font-bold tracking-wider uppercase text-red-400">Identidad Confirmada</p>
                <h2 className="text-xl font-black mt-1" style={{ color: 'var(--text-primary)' }}>
                  ¡Hola, {(profile.nombre || 'Usuario').split(' ')[0]}! 👋
                </h2>
                <p className="text-xs mt-2 text-gray-400">
                  Bienvenido al sistema. Tus datos institucionales se vincularán automáticamente a esta solicitud:
                </p>
                <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3 text-xs text-gray-300 font-medium">
                  <div>RUT: <span className="text-white font-bold">{profile.rut || 'N/A'}</span></div>
                  <div>Correo: <span className="text-white font-bold">{profile.email}</span></div>
                  {profile.carrera && (
                    <div>Carrera: <span className="text-white font-bold">{CARRERA_NOMBRES[profile.carrera] || profile.carrera}</span></div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* Hidden fields — se envían automáticamente desde el perfil */}
          <input type="hidden" {...register('alumno')} />
          <input type="hidden" {...register('rut')} />
          <input type="hidden" {...register('alumno_email')} />
          <input type="hidden" {...register('jornada')} />
          <input type="hidden" {...register('seccion')} />

          {/* ── Datos de la Solicitud ── */}
          <div className="card p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-secondary)' }}>
              Datos de la Solicitud
            </h2>
            <div className="space-y-4">

              {/* Asignatura — ocupa ancho completo */}
              <div>
                <label className="label">Asignatura</label>
                <select
                  {...register('asignatura')}
                  className="input-field text-sm"
                  defaultValue=""
                >
                  <option value="" disabled>— Selecciona tu Asignatura —</option>
                  {filteredAsignaturas.length === 0 && asignaturas.length === 0 && (
                    <option value="" disabled>Cargando asignaturas...</option>
                  )}
                  {filteredAsignaturas.map(a => (
                    <option key={`${a.codigo}-${a.carrera}`} value={a.nombre}>
                      Sem. {a.nivel} — [{a.codigo}] {a.nombre}
                    </option>
                  ))}
                </select>
                {errors.asignatura && <p className="text-xs mt-1" style={{ color: 'var(--nacap-red)' }}>{errors.asignatura.message}</p>}
              </div>

              {/* Fecha y Docente */}
              <div>
                <label className="label">Fecha de uso</label>
                <input
                  {...register('fecha')}
                  type="date"
                  className="input-field"
                />
                {errors.fecha && <p className="text-xs mt-1" style={{ color: 'var(--nacap-red)' }}>{errors.fecha.message}</p>}
              </div>

              <div>
                <label className="label">Docente</label>
                <select {...register('docente_id')} className="input-field" defaultValue="">
                  <option value="" disabled>— Selecciona tu docente —</option>
                  {docentes.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.nombre} — {d.asignatura}
                    </option>
                  ))}
                </select>
                {errors.docente_id && <p className="text-xs mt-1" style={{ color: 'var(--nacap-red)' }}>{errors.docente_id.message}</p>}
              </div>

            </div>
          </div>

          {/* ── Materiales ── */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Materiales
              </h2>
              <button
                type="button"
                onClick={() => append({ cantidad: 1, descripcion: '', estado_item: 'CUALQUIERA' })}
                className="btn-secondary !px-3 !py-1.5 text-xs"
              >
                <Plus size={14} />
                Agregar
              </button>
            </div>

            <div className="space-y-3">
              {fields.map((field, idx) => (
                <div key={field.id} className="rounded-xl p-3 animate-slide-in"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                  <div className="flex items-start gap-2">
                    {/* Cantidad */}
                    <div className="w-16 flex-shrink-0">
                      <label className="label">Cant.</label>
                      <input
                        {...register(`items.${idx}.cantidad`, { valueAsNumber: true })}
                        type="number"
                        min="1"
                        className="input-field !px-2 text-center"
                      />
                    </div>
                    {/* Descripción con autocompletado del catálogo */}
                    <div className="flex-1 relative" ref={activeAutocomplete === idx ? autocompleteRef : undefined}>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <label className="label !mb-0">Descripción</label>
                        <div className="group relative cursor-help text-gray-400 hover:text-gray-200">
                          <HelpCircle size={13} />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 bg-gray-900 border border-white/10 text-[10px] text-gray-300 rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 leading-relaxed text-center">
                            Escribe lo que necesitas y te sugerirá equipos del catálogo del Plan de Mantención.
                          </div>
                        </div>
                      </div>
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                          style={{ color: 'var(--text-muted)' }} />
                        <input
                          {...register(`items.${idx}.descripcion`)}
                          className="input-field !pl-8"
                          placeholder="Ej: Llave inglesa 12 pulgadas"
                          autoComplete="off"
                          onChange={e => {
                            register(`items.${idx}.descripcion`).onChange(e)
                            setAutocompleteSearch(prev => ({ ...prev, [idx]: e.target.value }))
                            setActiveAutocomplete(idx)
                          }}
                          onFocus={() => {
                            setActiveAutocomplete(idx)
                          }}
                        />
                      </div>
                      {/* Dropdown de sugerencias */}
                      {activeAutocomplete === idx && (() => {
                        const q = (autocompleteSearch[idx] || '').toLowerCase().trim()
                        
                        const equiposMatches = q.length === 0
                          ? equiposCatalog.slice(0, 5)
                          : equiposCatalog.filter(e =>
                              e.nombre.toLowerCase().includes(q) ||
                              (e.codigo_inventario?.toLowerCase().includes(q) ?? false) ||
                              (e.seccion_nombre?.toLowerCase().includes(q) ?? false)
                            ).slice(0, 5)

                        if (equiposMatches.length === 0) return null

                        return (
                          <div
                            className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden shadow-2xl border text-left"
                            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
                          >
                            {/* Sección Equipos de Mantención */}
                            {equiposMatches.length > 0 && (
                              <div>
                                <div className="px-3 py-1.5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)', background: 'rgba(30,136,229,0.04)' }}>
                                  <p className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5"
                                    style={{ color: '#1E88E5' }}>
                                    <Wrench size={10} /> {q.length === 0 ? 'Equipos Disponibles (Plan)' : 'Equipos Coincidentes'}
                                  </p>
                                </div>
                                {equiposMatches.map(e => (
                                  <button
                                    key={`eq-${e.id}`}
                                    type="button"
                                    className="w-full text-left px-4 py-2 hover:bg-white/5 transition-colors flex items-center justify-between gap-3 border-b border-white/[0.02]"
                                    onMouseDown={ev => {
                                      ev.preventDefault()
                                      setValue(`items.${idx}.descripcion`, e.nombre)
                                      setAutocompleteSearch(prev => ({ ...prev, [idx]: e.nombre }))
                                      setActiveAutocomplete(null)
                                    }}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold line-clamp-2 whitespace-normal break-words text-white">
                                        {e.nombre}
                                      </p>
                                      {e.seccion_nombre && (
                                        <p className="text-[10px] text-gray-400">
                                          {e.seccion_nombre}
                                        </p>
                                      )}
                                    </div>
                                    {e.codigo_inventario && (
                                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                        Inv: {e.codigo_inventario}
                                      </span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}

                            <div className="px-3 py-1.5 border-t" style={{ borderColor: 'var(--border)', background: 'rgba(0,0,0,0.1)' }}>
                              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                Escribe para buscar en el catálogo o ingresa un nombre libremente
                              </p>
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                    {/* Eliminar */}
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(idx)}
                        className="mt-6 p-2 rounded-lg transition-colors hover:bg-red-500/10"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                  {/* Estado del item */}
                  <div className="mt-2">
                    <label className="label">Estado requerido</label>
                    <select {...register(`items.${idx}.estado_item`)} className="input-field text-xs">
                      <option value="CUALQUIERA">Cualquiera</option>
                      <option value="NUEVO">Nuevo</option>
                      <option value="USADO">Usado</option>
                    </select>
                  </div>
                  {errors.items?.[idx]?.descripcion && (
                    <p className="text-xs mt-1" style={{ color: 'var(--nacap-red)' }}>
                      {errors.items[idx]?.descripcion?.message}
                    </p>
                  )}
                </div>
              ))}
            </div>
            {errors.items?.root && (
              <p className="text-xs mt-2" style={{ color: 'var(--nacap-red)' }}>{errors.items.root.message}</p>
            )}

            {/* Nota de material libre/manual */}
            <div className="mt-4 p-3 rounded-xl border border-blue-500/10 bg-blue-500/5 text-[11px] text-gray-400 leading-relaxed text-left">
              💡 <strong>¿No está el material que quieres?</strong> Escríbelo de forma manual en la descripción y espera la confirmación del pañol y del profesor al aprobar tu solicitud.
            </div>
          </div>

          {/* Collapsible Catálogo de Equipos */}
          <div className="card p-5">
            <button
              type="button"
              onClick={() => setCatalogOpen(!catalogOpen)}
              className="w-full flex items-center justify-between font-bold text-xs text-left uppercase tracking-wider text-gray-300"
            >
              <div className="flex items-center gap-2">
                <Search size={14} className="text-blue-400" />
                <span>Ver Catálogo Completo de Equipos ({equiposCatalog.length})</span>
              </div>
              {catalogOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {catalogOpen && (
              <div className="mt-4 pt-4 border-t border-white/5 space-y-4 animate-fade-in">
                {/* Search & Filters */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      value={catalogSearch}
                      onChange={e => setCatalogSearch(e.target.value)}
                      placeholder="Buscar por nombre o código..."
                      className="input-field !pl-8 text-xs !py-1.5"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setFiltersOpen(!filtersOpen)}
                    className="btn-secondary !px-2.5 gap-1 flex-shrink-0 text-xs"
                  >
                    <SlidersHorizontal size={12} />
                    <span>Filtros</span>
                    {filtersOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                  </button>
                </div>

                {/* Filters Panel */}
                {filtersOpen && (
                  <div className="p-3 rounded-xl space-y-2 text-left" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="label text-[9px] !mb-1">Área</label>
                        <select
                          value={filtroArea}
                          onChange={e => setFiltroArea(e.target.value)}
                          className="input-field !py-1 text-xs select"
                        >
                          <option value="Todos">Todos</option>
                          <option value="MECÁNICA Y ELECTROMOVILIDAD AUTOMOTRIZ">Mecánica</option>
                          <option value="MANTENIMIENTO INDUSTRIAL">Industrial</option>
                        </select>
                      </div>
                      <div>
                        <label className="label text-[9px] !mb-1">Frecuencia</label>
                        <select
                          value={filtroFrecuencia}
                          onChange={e => setFiltroFrecuencia(e.target.value)}
                          className="input-field !py-1 text-xs select"
                        >
                          <option value="Todos">Todos</option>
                          <option value="ANUAL">Anual</option>
                          <option value="SEMESTRAL">Semestral</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* List of equipments */}
                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 text-left">
                  {filteredEquipos.map(e => (
                    <div
                      key={`list-eq-${e.id}`}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-white/[0.03] hover:border-blue-500/20 transition-all text-xs text-left"
                      style={{ background: 'rgba(255,255,255,0.01)' }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-white line-clamp-2 whitespace-normal break-words">{e.nombre}</p>
                        <p className="text-[10px] text-gray-500 line-clamp-1 whitespace-normal break-words">
                          {e.seccion_nombre} {e.codigo_inventario ? `· Inv: ${e.codigo_inventario}` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddEquipoToSolicitud(e.id, e.nombre)}
                        className="btn-secondary !px-2.5 !py-1 text-[10px] flex items-center gap-1 hover:!bg-blue-600/20 hover:!text-blue-400"
                        style={addedEquipos[e.id] ? { borderColor: 'var(--success)', color: 'var(--success)', background: 'rgba(34,197,94,0.1)' } : {}}
                      >
                        {addedEquipos[e.id] ? <Check size={10} /> : <Plus size={10} />}
                        <span>{addedEquipos[e.id] ? 'Agregado' : 'Agregar'}</span>
                      </button>
                    </div>
                  ))}
                  {filteredEquipos.length === 0 && (
                    <p className="text-xs text-gray-500 py-4 text-center">No se encontraron equipos</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Error global */}
          {error && (
            <div className="flex items-center gap-2 p-4 rounded-xl"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
              <AlertCircle size={16} style={{ color: '#EF4444', flexShrink: 0 }} />
              <p className="text-sm" style={{ color: '#EF4444' }}>{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-4 text-base"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send size={18} />
                Enviar Solicitud
              </>
            )}
          </button>

          <p className="text-xs text-center pb-4" style={{ color: 'var(--text-muted)' }}>
            Al enviar, se notificará al docente por correo electrónico para su aprobación.
          </p>
        </form>
        </>
        )}
      </div>
    </main>
  )
}
