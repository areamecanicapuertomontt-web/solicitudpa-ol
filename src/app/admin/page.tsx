'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Plus, Trash2, Save, Users, Package, LogOut,
  LayoutDashboard, Wrench, FileText, Database, ShieldAlert,
  Check, X, Pencil, Search, RefreshCw, Eye, Calendar,
  Clock, ChevronLeft, Info, AlertTriangle, ChevronRight,
  Sparkles, CheckCircle2, XCircle, Truck
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatFechaHora, getJornadaLabel } from '@/lib/utils'
import { supabaseBrowser } from '@/lib/supabase-browser'
import type { Docente, Solicitud, Jornada, EstadoSolicitud } from '@/lib/types'
import NotificationBell from '@/components/NotificationBell'
import HelpButton from '@/components/HelpButton'

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

type Tab = 'dashboard' | 'docentes' | 'alumnos' | 'solicitudes' | 'listo' | 'diagnostico'

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

export default function AdminPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [profile, setProfile] = useState<any>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const profileLoadedRef = useRef(false)
  
  // Data lists
  const [docentes, setDocentes] = useState<Docente[]>([])
  const [alumnos, setAlumnos] = useState<any[]>([])
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [correosFallidos, setCorreosFallidos] = useState<any[]>([])
  
  // Counts / Database Diagnostics
  const [stats, setStats] = useState({
    alumnosDiurno: 0,
    alumnosVespertino: 0,
    asignaturasIMI: 0,
    asignaturasMI: 0,
  })

  // Loading & Action states
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  
  // Search and Filters
  const [searchDocente, setSearchDocente] = useState('')
  const [searchAlumno, setSearchAlumno] = useState('')
  const [searchSolicitud, setSearchSolicitud] = useState('')
  const [filtroSolicitudEstado, setFiltroSolicitudEstado] = useState<EstadoSolicitud | 'TODAS'>('TODAS')
  const [filtroSolicitudJornada, setFiltroSolicitudJornada] = useState<Jornada | 'TODAS'>('TODAS')
  
  // Sub-tabs Alumnos
  const [subTabAlumnos, setSubTabAlumnos] = useState<'diurno' | 'vespertino'>('diurno')

  // Selected item detail modals
  const [selectedSolicitud, setSelectedSolicitud] = useState<Solicitud | null>(null)

  // Docente Form
  const [showDocenteForm, setShowDocenteForm] = useState(false)
  const [editingDocente, setEditingDocente] = useState<Docente | null>(null)
  const [docenteForm, setDocenteForm] = useState({
    nombre: '',
    email: '',
    asignatura: '',
    activo: true
  })

  // Alumno Form
  const [showAlumnoModal, setShowAlumnoModal] = useState(false)
  const [editingAlumno, setEditingAlumno] = useState<any | null>(null)
  const [verAlumno, setVerAlumno] = useState<any | null>(null)
  const [alumnoForm, setAlumnoForm] = useState({
    nombre: '',
    email: '',
    rut: '',
    seccion: '',
    carrera: '',
    jornada: 'D' as 'D' | 'V'
  })
  const [savingAlumno, setSavingAlumno] = useState(false)

  // Pagination states
  const itemsPerPage = 10
  const [pageDocentes, setPageDocentes] = useState(1)
  const [pageAlumnosDiurno, setPageAlumnosDiurno] = useState(1)
  const [pageAlumnosVespertino, setPageAlumnosVespertino] = useState(1)
  const [pageSolicitudesActivas, setPageSolicitudesActivas] = useState(1)
  const [pageSolicitudesListo, setPageSolicitudesListo] = useState(1)

  // Reset page numbers on filter changes
  useEffect(() => {
    setPageDocentes(1)
  }, [searchDocente])

  useEffect(() => {
    setPageAlumnosDiurno(1)
    setPageAlumnosVespertino(1)
  }, [searchAlumno])

  useEffect(() => {
    setPageSolicitudesActivas(1)
    setPageSolicitudesListo(1)
  }, [searchSolicitud, filtroSolicitudEstado, filtroSolicitudJornada])
  


  // Load User Profile
  useEffect(() => {
    let active = true

    async function fetchProfile(user: any) {
      if (!user) return
      
      let profileData = null
      let profileError = null
      
      try {
        const queryPromise = supabaseBrowser
          .from('perfiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        const timeoutPromise = new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout de consulta perfiles')), 3000)
        )
        
        const res = await Promise.race([queryPromise, timeoutPromise])
        profileData = res.data
        profileError = res.error
      } catch (err: any) {
        profileError = err
      }
      
      if (active) {
        if (!profileError && profileData) {
          if (profileData.rol !== 'ADMIN' && profileData.rol !== 'PANOL') {
            router.replace('/login')
          } else {
            setProfile(profileData)
            setLoadingProfile(false)
            profileLoadedRef.current = true
          }
        } else {
          console.warn("Error al cargar perfil admin en primer intento, usando fallback temporal:", profileError)
          // Fallback temporal usando metadata de auth
          const fallbackPerf = {
            id: user.id,
            email: user.email,
            nombre: user.user_metadata?.nombre || 'Usuario Inacap',
            rol: user.user_metadata?.rol || 'PANOL',
            rut: user.user_metadata?.rut || '',
          }
          
          if (fallbackPerf.rol !== 'ADMIN' && fallbackPerf.rol !== 'PANOL') {
            router.replace('/login')
          } else {
            setProfile(fallbackPerf)
            setLoadingProfile(false) // Quitar loading inmediatamente
            profileLoadedRef.current = true
            
            // Reintentar en 1.5 segundos por si RLS estaba esperando la sincronización del token
            setTimeout(async () => {
              if (!active) return
              console.log("Reintentando cargar perfil admin desde perfiles...")
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
                  if (retryRes.data.rol !== 'ADMIN' && retryRes.data.rol !== 'PANOL') {
                    router.replace('/login')
                  } else {
                    console.log("✅ Perfil admin cargado exitosamente en reintento.")
                    setProfile(retryRes.data)
                  }
                }
              } catch (retryErr) {
                console.warn("Reintento admin falló o expiró:", retryErr)
              }
            }, 1500)
          }
        }
      }
    }

    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(async (event, session) => {
      console.log(`[AdminPage] Evento Auth: ${event}`)
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
        console.warn("[AdminPage] Timeout global de 5s expiró sin perfil. Redirigiendo a /login...");
        router.replace('/login')
      }
    }, 5000)

    return () => {
      active = false
      subscription.unsubscribe()
      clearTimeout(safetyTimeout)
    }
  }, [router])

  // Main fetch function
  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)

    try {
      // 1. Fetch Docentes
      const { data: docData, error: docErr } = await supabaseBrowser
        .from('docentes')
        .select('*')
        .order('nombre')
      if (docErr) throw docErr
      setDocentes(docData || [])

      // 2. Fetch Alumnos (public.perfiles where rol = 'ALUMNO')
      const { data: alData, error: alErr } = await supabaseBrowser
        .from('perfiles')
        .select('*')
        .eq('rol', 'ALUMNO')
        .order('nombre')
      if (alErr) throw alErr
      setAlumnos(alData || [])

      // 3. Fetch Solicitudes (with teacher relations)
      const { data: solData, error: solErr } = await supabaseBrowser
        .from('solicitudes')
        .select('*, docente:docentes(nombre), items:items_solicitud(*)')
        .order('created_at', { ascending: false })
      if (solErr) throw solErr
      setSolicitudes(solData || [])

      // 4. Fetch Diagnostics statistics
      // Alumnos count
      const { count: countDiurno } = await supabaseBrowser
        .from('perfiles')
        .select('*', { count: 'exact', head: true })
        .eq('rol', 'ALUMNO')
        .eq('jornada', 'D')

      const { count: countVespertino } = await supabaseBrowser
        .from('perfiles')
        .select('*', { count: 'exact', head: true })
        .eq('rol', 'ALUMNO')
        .eq('jornada', 'V')

      // Asignaturas count
      const { count: countIMI } = await supabaseBrowser
        .from('asignaturas')
        .select('*', { count: 'exact', head: true })
        .eq('carrera', 'IMI')

      const { count: countMI } = await supabaseBrowser
        .from('asignaturas')
        .select('*', { count: 'exact', head: true })
        .eq('carrera', 'MI')

      setStats({
        alumnosDiurno: countDiurno || 0,
        alumnosVespertino: countVespertino || 0,
        asignaturasIMI: countIMI || 0,
        asignaturasMI: countMI || 0,
      })

      // 5. Fetch failed email logs (correos_fallidos)
      const { data: failEmails, error: failEmailsErr } = await supabaseBrowser
        .from('correos_fallidos')
        .select('*')
        .order('fecha', { ascending: false })
      
      if (!failEmailsErr) {
        setCorreosFallidos(failEmails || [])
      } else {
        console.warn("Tabla correos_fallidos no disponible o sin políticas RLS:", failEmailsErr.message)
        setCorreosFallidos([])
      }

    } catch (e: any) {
      console.error("Error fetching data in Admin Dashboard:", e)
      showNotification('err', 'Error al cargar datos de Supabase. Revisa las políticas RLS.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Auto-refresh when tab changes
  useEffect(() => {
    fetchData(true)
  }, [activeTab])

  // Custom notification utility
  const showNotification = (type: 'ok' | 'err', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }

  const handleLogout = async () => {
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

  // ─── CRUD Docentes ─────────────────────────────────────────────────────────
  const startEditDocente = (doc: Docente) => {
    setEditingDocente(doc)
    setDocenteForm({
      nombre: doc.nombre,
      email: doc.email,
      asignatura: doc.asignatura,
      activo: doc.activo
    })
    setShowDocenteForm(true)
  }

  const cancelDocenteForm = () => {
    setShowDocenteForm(false)
    setEditingDocente(null)
    setDocenteForm({ nombre: '', email: '', asignatura: '', activo: true })
  }

  const handleSaveDocente = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!docenteForm.nombre || !docenteForm.email || !docenteForm.asignatura) {
      showNotification('err', 'Por favor completa todos los campos')
      return
    }

    try {
      if (editingDocente) {
        // Update Docente
        const { error } = await supabaseBrowser
          .from('docentes')
          .update({
            nombre: docenteForm.nombre,
            email: docenteForm.email,
            asignatura: docenteForm.asignatura,
            activo: docenteForm.activo
          })
          .eq('id', editingDocente.id)
        
        if (error) throw error
        showNotification('ok', 'Docente actualizado correctamente')
      } else {
        // Insert Docente (via client or fallback to API if needed)
        // Client direct insertion using authorized RLS role
        const { error } = await supabaseBrowser
          .from('docentes')
          .insert({
            nombre: docenteForm.nombre,
            email: docenteForm.email,
            asignatura: docenteForm.asignatura,
            activo: docenteForm.activo
          })
        
        if (error) {
          // If public client insert is blocked, fallback to API
          const res = await fetch('/api/admin/docentes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(docenteForm),
          })
          if (!res.ok) throw new Error('Error al registrar a través del servidor')
        }
        showNotification('ok', 'Docente registrado exitosamente')
      }

      cancelDocenteForm()
      fetchData(true)
    } catch (err: any) {
      console.error(err)
      showNotification('err', 'Error al guardar docente: ' + (err.message || 'Verifica permisos.'))
    }
  }

  const toggleDocenteActivo = async (doc: Docente) => {
    try {
      const { error } = await supabaseBrowser
        .from('docentes')
        .update({ activo: !doc.activo })
        .eq('id', doc.id)

      if (error) throw error
      showNotification('ok', `Docente ${!doc.activo ? 'activado' : 'desactivado'} correctamente`)
      fetchData(true)
    } catch (err: any) {
      showNotification('err', 'No se pudo cambiar el estado del docente.')
    }
  }

  const handleDeleteDocente = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este docente? Se desvinculará de las asignaturas.')) return
    setIsDeleting(id)
    try {
      const { error } = await supabaseBrowser
        .from('docentes')
        .delete()
        .eq('id', id)

      if (error) throw error
      showNotification('ok', 'Docente eliminado correctamente')
      fetchData(true)
    } catch (err: any) {
      showNotification('err', 'No se pudo eliminar: el docente puede tener solicitudes asociadas.')
    } finally {
      setIsDeleting(null)
    }
  }

  // ─── CRUD Alumnos (Estudiantes) ───────────────────────────────────────────
  const startEditAlumno = (al: any) => {
    setEditingAlumno(al)
    setAlumnoForm({
      nombre: al.nombre,
      email: al.email,
      rut: al.rut || '',
      seccion: al.seccion || '',
      carrera: al.carrera || '',
      jornada: al.jornada || 'D'
    })
    setShowAlumnoModal(true)
  }

  const cancelAlumnoForm = () => {
    setShowAlumnoModal(false)
    setEditingAlumno(null)
    setAlumnoForm({
      nombre: '',
      email: '',
      rut: '',
      seccion: '',
      carrera: '',
      jornada: 'D'
    })
  }

  const handleSaveAlumno = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!alumnoForm.nombre || !alumnoForm.email || !alumnoForm.rut || !alumnoForm.carrera || !alumnoForm.jornada) {
      showNotification('err', 'Por favor completa todos los campos')
      return
    }
    setSavingAlumno(true)
    try {
      const isEdit = !!editingAlumno
      const url = '/api/admin/estudiantes'
      const method = isEdit ? 'PUT' : 'POST'
      const body = isEdit 
        ? { id: editingAlumno.id, ...alumnoForm }
        : alumnoForm

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Ocurrió un error en el servidor')
      }

      showNotification('ok', isEdit ? 'Alumno actualizado correctamente' : 'Alumno registrado correctamente con clave temporal AlumnoInacap2026!')
      cancelAlumnoForm()
      fetchData(true)
    } catch (err: any) {
      console.error(err)
      showNotification('err', err.message || 'Error al guardar alumno.')
    } finally {
      setSavingAlumno(false)
    }
  }

  const handleDeleteAlumno = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar permanentemente este alumno? Esta acción no se puede deshacer y borrará su cuenta de acceso.')) return
    setIsDeleting(id)
    try {
      const res = await fetch(`/api/admin/estudiantes?id=${id}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Error al eliminar alumno')
      }
      showNotification('ok', 'Alumno eliminado correctamente')
      if (verAlumno && verAlumno.id === id) {
        setVerAlumno(null)
      }
      fetchData(true)
    } catch (err: any) {
      console.error(err)
      showNotification('err', err.message || 'No se pudo eliminar el alumno.')
    } finally {
      setIsDeleting(null)
    }
  }

  const handleLimpiarCorreosFallidos = async () => {
    if (!confirm('¿Estás seguro de que deseas vaciar el historial de correos fallidos?')) return
    try {
      const { error } = await supabaseBrowser
        .from('correos_fallidos')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Borrar todos
      
      if (error) throw error
      setCorreosFallidos([])
      showNotification('ok', 'Historial de correos fallidos limpiado con éxito.')
    } catch (err: any) {
      console.error('Error al limpiar correos fallidos:', err.message)
      showNotification('err', 'No se pudo limpiar el historial: ' + err.message)
    }
  }

  // ─── Control Administrativo de Solicitudes ──────────────────────────────────
  const forceUpdateSolicitudEstado = async (id: string, nuevoEstado: EstadoSolicitud) => {
    try {
      const { error } = await supabaseBrowser
        .from('solicitudes')
        .update({ estado: nuevoEstado })
        .eq('id', id)

      if (error) throw error
      showNotification('ok', `Estado de solicitud forzado a ${nuevoEstado} exitosamente`)
      
      // Update selected modal detail view if open
      if (selectedSolicitud && selectedSolicitud.id === id) {
        const isFinalized = nuevoEstado === 'DEVUELTA' || nuevoEstado === 'RECHAZADA'
        const matchesTab = activeTab === 'listo' ? isFinalized : !isFinalized
        if (!matchesTab) {
          setSelectedSolicitud(null)
        } else {
          setSelectedSolicitud(prev => prev ? { ...prev, estado: nuevoEstado } : null)
        }
      }
      fetchData(true)
    } catch (err: any) {
      showNotification('err', 'Error al actualizar estado. Permisos insuficientes.')
    }
  }

  const forceDeleteSolicitud = async (id: string) => {
    if (!confirm('¿CONFIRMAR ELIMINACIÓN? Esta acción borrará permanentemente la solicitud y sus items asociados. No se puede deshacer.')) return
    try {
      const { error } = await supabaseBrowser
        .from('solicitudes')
        .delete()
        .eq('id', id)

      if (error) throw error
      showNotification('ok', 'Solicitud eliminada de la base de datos')
      setSelectedSolicitud(null)
      fetchData(true)
    } catch (err: any) {
      showNotification('err', 'No se pudo eliminar la solicitud.')
    }
  }

  // ─── List Filtering ────────────────────────────────────────────────────────
  const filteredDocentes = useMemo(() => {
    return docentes.filter(d => 
      d.nombre.toLowerCase().includes(searchDocente.toLowerCase()) ||
      d.email.toLowerCase().includes(searchDocente.toLowerCase()) ||
      d.asignatura.toLowerCase().includes(searchDocente.toLowerCase())
    )
  }, [docentes, searchDocente])

  const paginatedDocentes = useMemo(() => {
    const startIndex = (pageDocentes - 1) * itemsPerPage
    return filteredDocentes.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredDocentes, pageDocentes])

  const filteredAlumnosDiurno = useMemo(() => {
    return alumnos.filter(al => 
      al.jornada === 'D' &&
      (al.nombre.toLowerCase().includes(searchAlumno.toLowerCase()) ||
       al.email.toLowerCase().includes(searchAlumno.toLowerCase()) ||
       (al.rut || '').toLowerCase().includes(searchAlumno.toLowerCase()) ||
       (al.carrera || '').toLowerCase().includes(searchAlumno.toLowerCase()) ||
       (al.seccion || '').toLowerCase().includes(searchAlumno.toLowerCase()))
    )
  }, [alumnos, searchAlumno])

  const filteredAlumnosVespertino = useMemo(() => {
    return alumnos.filter(al => 
      al.jornada === 'V' &&
      (al.nombre.toLowerCase().includes(searchAlumno.toLowerCase()) ||
       al.email.toLowerCase().includes(searchAlumno.toLowerCase()) ||
       (al.rut || '').toLowerCase().includes(searchAlumno.toLowerCase()) ||
       (al.carrera || '').toLowerCase().includes(searchAlumno.toLowerCase()) ||
       (al.seccion || '').toLowerCase().includes(searchAlumno.toLowerCase()))
    )
  }, [alumnos, searchAlumno])

  const filteredSolicitudes = useMemo(() => {
    return solicitudes.filter(s => {
      const matchesSearch = 
        s.alumno.toLowerCase().includes(searchSolicitud.toLowerCase()) ||
        s.rut.toLowerCase().includes(searchSolicitud.toLowerCase()) ||
        s.asignatura.toLowerCase().includes(searchSolicitud.toLowerCase()) ||
        (s.codigo_entrega || '').includes(searchSolicitud)

      // Separación de solicitudes concluidas (Listas) de las activas
      const isFinalized = s.estado === 'DEVUELTA' || s.estado === 'RECHAZADA'
      const matchesTab = activeTab === 'listo' ? isFinalized : !isFinalized

      const matchesEstado = filtroSolicitudEstado === 'TODAS' || s.estado === filtroSolicitudEstado
      const matchesJornada = filtroSolicitudJornada === 'TODAS' || s.jornada === filtroSolicitudJornada

      return matchesSearch && matchesTab && matchesEstado && matchesJornada
    })
  }, [solicitudes, searchSolicitud, filtroSolicitudEstado, filtroSolicitudJornada, activeTab])

  const paginatedSolicitudes = useMemo(() => {
    const page = activeTab === 'listo' ? pageSolicitudesListo : pageSolicitudesActivas
    const startIndex = (page - 1) * itemsPerPage
    return filteredSolicitudes.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredSolicitudes, pageSolicitudesActivas, pageSolicitudesListo, activeTab])

  // Overview dashboard calculations
  const dashboardStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return {
      total: solicitudes.length,
      pendientes: solicitudes.filter(s => s.estado === 'PENDIENTE').length,
      aprobadas: solicitudes.filter(s => s.estado === 'APROBADA').length,
      entregadas: solicitudes.filter(s => s.estado === 'ENTREGADA').length,
      creadasHoy: solicitudes.filter(s => s.created_at.startsWith(today)).length,
      docentesActivos: docentes.filter(d => d.activo).length
    }
  }, [solicitudes, docentes])

  if (loadingProfile) {
    return (
      <main className="min-h-screen py-8 px-4 flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="max-w-md w-full text-center space-y-4">
          <div className="flex justify-center">
            <span className="w-10 h-10 border-4 border-white/20 border-t-red-600 rounded-full animate-spin" />
          </div>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest animate-pulse">Verificando credenciales de administrador...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen py-8 px-4 sm:px-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <Link href="/panel" className="btn-secondary !px-3 !py-2" title="Volver al Panel">
              <ChevronLeft size={16} />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-10 rounded-full bg-gradient-to-b from-red-500 to-red-700" style={{ background: 'var(--nacap-red)' }} />
              <div>
                <p className="text-[10px] font-extrabold tracking-widest uppercase text-red-500">
                  Panel de Control General
                </p>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  Administración Central
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <button 
              onClick={() => fetchData(true)} 
              className="btn-secondary !py-2 !px-3 hover:text-white" 
              title="Sincronizar Supabase"
              disabled={loading || refreshing}
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            </button>
            
            {profile && (
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-white/5 bg-white/2">
                <div className="text-right">
                  <p className="text-xs font-bold leading-none">{profile.nombre}</p>
                  <span className="text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-red-600 text-white mt-1 inline-block">
                    {profile.rol}
                  </span>
                </div>
                <div className="flex items-center gap-1 border-l border-white/10 pl-2">
                  <NotificationBell />
                  <HelpButton rol="ADMIN" />
                  <button
                    onClick={handleLogout}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-red-400 transition-colors"
                    title="Cerrar Sesión"
                  >
                    <LogOut size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Global Notifications */}
        {msg && (
          <div className="card p-3.5 mb-6 text-center animate-fade-in border-l-4"
            style={{ 
              borderColor: msg.type === 'ok' ? 'var(--success)' : 'var(--danger)',
              background: msg.type === 'ok' ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)'
            }}>
            <p className="text-sm font-semibold flex items-center justify-center gap-2" style={{ color: msg.type === 'ok' ? 'var(--success)' : 'var(--danger)' }}>
              {msg.type === 'ok' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              {msg.text}
            </p>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl bg-white/2 border border-white/5 overflow-x-auto select-none no-scrollbar">
          {[
            { id: 'dashboard',   label: 'Resumen',         icon: <LayoutDashboard size={14} /> },
            { id: 'docentes',    label: 'Docentes',         icon: <Users size={14} /> },
            { id: 'alumnos',     label: 'Estudiantes',      icon: <Users size={14} /> },
            { id: 'solicitudes', label: 'Solicitudes Activas', icon: <FileText size={14} /> },
            { id: 'listo',       label: 'Devueltas / Listo', icon: <CheckCircle2 size={14} /> },
            { id: 'diagnostico', label: 'Base de Datos',   icon: <Database size={14} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as Tab)
                cancelDocenteForm()
                setFiltroSolicitudEstado('TODAS')
                setSelectedSolicitud(null)
                setSearchSolicitud('')
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 whitespace-nowrap cursor-pointer"
              style={activeTab === tab.id
                ? { background: 'var(--nacap-red)', color: 'white' }
                : { color: 'var(--text-secondary)', background: 'transparent' }}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.id === 'diagnostico' && correosFallidos.length > 0 && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              )}
            </button>
          ))}
          {/* Separador + link a módulo de Mantención */}
          <div className="ml-auto flex items-center">
            <div className="w-px h-6 mx-1" style={{ background: 'var(--border)' }} />
            <Link
              href="/admin/mantencion"
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all"
              style={{ background: 'rgba(30,136,229,0.12)', color: '#1E88E5', border: '1px solid rgba(30,136,229,0.25)' }}
            >
              <Wrench size={14} />
              Plan Mantención
            </Link>
          </div>
        </div>


        {/* Main Content Loading */}
        {loading ? (
          <div className="card p-12 text-center flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-4 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Conectando a la base de datos de Supabase...</p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* ─── PESTAÑA: DASHBOARD ──────────────────────────────────────── */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6 animate-fade-in">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Solicitudes', value: dashboardStats.total, color: 'var(--nacap-red)', icon: <FileText size={20} /> },
                    { label: 'Pendientes entrega', value: dashboardStats.pendientes, color: '#F59E0B', icon: <Clock size={20} /> },
                    { label: 'En Préstamo', value: dashboardStats.entregadas, color: '#3B82F6', icon: <Truck size={20} /> },
                    { label: 'Docentes Activos', value: dashboardStats.docentesActivos, color: '#10B981', icon: <Users size={20} /> },
                  ].map((s, idx) => (
                    <div key={idx} className="card p-5 relative overflow-hidden bg-gradient-to-br from-white/2 to-white/0">
                      <div className="absolute right-3 top-3 opacity-10" style={{ color: s.color }}>
                        {s.icon}
                      </div>
                      <p className="text-2xl sm:text-3xl font-black mt-1" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
                      <p className="text-[11px] font-bold mt-1 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>{s.label}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Recent Requests (2/3 width) */}
                  <div className="lg:col-span-2 card p-5 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-extrabold text-sm uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                        <Clock size={16} className="text-red-500" /> Últimas Solicitudes Recibidas
                      </h2>
                      <button 
                        onClick={() => {
                          setActiveTab('solicitudes')
                          setSelectedSolicitud(null)
                          setFiltroSolicitudEstado('TODAS')
                          setSearchSolicitud('')
                        }} 
                        className="text-xs text-red-500 font-bold hover:underline"
                      >
                        Ver todas →
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      {solicitudes.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">
                          Sin solicitudes enviadas en la base de datos
                        </div>
                      ) : (
                        <table className="nacap-table">
                          <thead>
                            <tr>
                              <th>Alumno</th>
                              <th>Carrera / Secc.</th>
                              <th>Estado</th>
                              <th>Fecha</th>
                            </tr>
                          </thead>
                          <tbody>
                            {solicitudes.slice(0, 5).map(sol => (
                              <tr 
                                key={sol.id} 
                                className="cursor-pointer"
                                onClick={() => {
                                  setSelectedSolicitud(sol)
                                  const isFinalized = sol.estado === 'DEVUELTA' || sol.estado === 'RECHAZADA'
                                  setActiveTab(isFinalized ? 'listo' : 'solicitudes')
                                  setFiltroSolicitudEstado('TODAS')
                                  setSearchSolicitud('')
                                }}
                              >
                                <td className="font-semibold">{sol.alumno}</td>
                                <td>{(sol.asignatura || '').split(' ')[0]} — {sol.seccion}</td>
                                <td>
                                  <span className={`badge ${
                                    sol.estado === 'PENDIENTE' ? 'badge-pending' :
                                    sol.estado === 'APROBADA' ? 'badge-approved' :
                                    sol.estado === 'DEVUELTA' ? 'badge-approved' :
                                    sol.estado === 'RECHAZADA' ? 'badge-rejected' :
                                    sol.estado === 'DEVUELTA_INCOMPLETA' ? 'badge-pending' : 'badge-delivered'
                                  }`}>
                                    {sol.estado}
                                  </span>
                                </td>
                                <td className="text-xs text-gray-400">{new Date(sol.created_at).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>

                  {/* Quick stats distribution (1/3 width) */}
                  <div className="card p-5 space-y-4">
                    <h2 className="font-extrabold text-sm uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                      <Sparkles size={15} className="text-red-500" /> Distribución de Estados
                    </h2>
                    
                    {solicitudes.length === 0 ? (
                      <p className="text-xs text-gray-400 py-6 text-center">No hay datos disponibles</p>
                    ) : (
                      <div className="space-y-3 pt-2">
                        {[
                          { label: 'Pendientes de Firma', count: dashboardStats.pendientes, color: '#F59E0B', pct: (dashboardStats.pendientes / solicitudes.length) * 100 },
                          { label: 'Aprobadas (Pendiente Entrega)', count: dashboardStats.aprobadas, color: '#10B981', pct: (dashboardStats.aprobadas / solicitudes.length) * 100 },
                          { label: 'Entregadas (Concluidas)', count: dashboardStats.entregadas, color: '#3B82F6', pct: (dashboardStats.entregadas / solicitudes.length) * 100 },
                          { label: 'Rechazadas', count: solicitudes.filter(s => s.estado === 'RECHAZADA').length, color: '#EF4444', pct: (solicitudes.filter(s => s.estado === 'RECHAZADA').length / solicitudes.length) * 100 },
                        ].map((dist, i) => (
                          <div key={i} className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-gray-300">{dist.label}</span>
                              <span style={{ color: dist.color }}>{dist.count} ({dist.pct.toFixed(0)}%)</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${dist.pct}%`, backgroundColor: dist.color }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ─── PESTAÑA: DOCENTES ────────────────────────────────────────── */}
            {activeTab === 'docentes' && (
              <div className="space-y-4 animate-fade-in">
                {/* Header list/form toggle */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="relative w-full sm:max-w-xs">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      className="input-field !pl-9 text-xs"
                      placeholder="Buscar por docente o asignatura..."
                      value={searchDocente}
                      onChange={e => setSearchDocente(e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={() => {
                      if (showDocenteForm) cancelDocenteForm()
                      else setShowDocenteForm(true)
                    }} 
                    className="btn-primary !py-2 !px-4 text-xs w-full sm:w-auto"
                  >
                    {showDocenteForm ? <X size={14} /> : <Plus size={14} />}
                    {showDocenteForm ? 'Cerrar Formulario' : 'Agregar Docente'}
                  </button>
                </div>

                {/* Formulario Docente */}
                {showDocenteForm && (
                  <form onSubmit={handleSaveDocente} className="card p-5 space-y-4 bg-gradient-to-r from-white/2 to-white/0 animate-fade-in">
                    <h3 className="font-extrabold text-sm uppercase tracking-wider text-red-500 border-b border-white/5 pb-2">
                      {editingDocente ? 'Editar Docente Registrado' : 'Registrar Nuevo Docente'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="label">Nombre Completo</label>
                        <input
                          required
                          type="text"
                          className="input-field"
                          placeholder="Juan Pérez Valenzuela"
                          value={docenteForm.nombre}
                          onChange={e => setDocenteForm(p => ({ ...p, nombre: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="label">Email Institucional</label>
                        <input
                          required
                          type="email"
                          className="input-field"
                          placeholder="juan.perez@inacap.cl"
                          value={docenteForm.email}
                          onChange={e => setDocenteForm(p => ({ ...p, email: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="label">Asignatura Principal / Taller</label>
                        <input
                          required
                          type="text"
                          className="input-field"
                          placeholder="Mantenimiento Base Mecánico"
                          value={docenteForm.asignatura}
                          onChange={e => setDocenteForm(p => ({ ...p, asignatura: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/5 pt-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="docente_activo_check"
                          className="w-4 h-4 accent-red-600 rounded"
                          checked={docenteForm.activo}
                          onChange={e => setDocenteForm(p => ({ ...p, activo: e.target.checked }))}
                        />
                        <label htmlFor="docente_activo_check" className="text-xs font-bold text-gray-300 uppercase cursor-pointer select-none">
                          Habilitado (Aparecerá en el formulario de alumnos)
                        </label>
                      </div>

                      <div className="flex gap-2">
                        <button type="submit" className="btn-success !py-2 !px-4 text-xs">
                          <Save size={14} /> Guardar Cambios
                        </button>
                        <button type="button" onClick={cancelDocenteForm} className="btn-secondary !py-2 !px-4 text-xs">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* Listado Docentes */}
                <div className="card p-5">
                  {filteredDocentes.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">
                      No se encontraron docentes con los criterios ingresados
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="nacap-table">
                        <thead>
                          <tr>
                            <th>Nombre</th>
                            <th>Email</th>
                            <th>Asignatura</th>
                            <th className="text-center">Estado</th>
                            <th className="text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedDocentes.map(doc => (
                            <tr key={doc.id} className="group">
                              <td className="font-semibold flex items-center gap-2.5 py-3">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black uppercase text-red-500 bg-red-500/10">
                                  {doc.nombre.charAt(0)}
                                </div>
                                <span>{doc.nombre}</span>
                              </td>
                              <td className="text-gray-300">{doc.email}</td>
                              <td className="text-gray-400 font-medium">{doc.asignatura}</td>
                              <td className="text-center">
                                <button 
                                  onClick={() => toggleDocenteActivo(doc)}
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                                    doc.activo 
                                      ? 'bg-green-500/10 border-green-500/30 text-green-500' 
                                      : 'bg-red-500/10 border-red-500/30 text-red-500'
                                  }`}
                                  title="Haz clic para alternar estado"
                                >
                                  {doc.activo ? 'ACTIVO' : 'INACTIVO'}
                                </button>
                              </td>
                              <td className="text-right">
                                <div className="flex justify-end gap-1">
                                  <button
                                    onClick={() => startEditDocente(doc)}
                                    className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                                    title="Editar Docente"
                                  >
                                    <Pencil size={13} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDocente(doc.id)}
                                    disabled={isDeleting === doc.id}
                                    className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
                                    title="Eliminar Docente"
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
                        currentPage={pageDocentes}
                        totalPages={Math.ceil(filteredDocentes.length / itemsPerPage)}
                        onPageChange={setPageDocentes}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── PESTAÑA: ALUMNOS ────────────────────────────────────────── */}
            {activeTab === 'alumnos' && (
              <div className="space-y-4 animate-fade-in">
                {/* Header with Search and Add buttons */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  {/* Sub-tabs: Diurno vs Vespertino */}
                  <div className="flex gap-1 p-1 rounded-xl bg-white/2 border border-white/5 select-none w-full sm:w-auto">
                    <button
                      onClick={() => setSubTabAlumnos('diurno')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer`}
                      style={subTabAlumnos === 'diurno'
                        ? { background: 'var(--nacap-red)', color: 'white' }
                        : { color: 'var(--text-secondary)', background: 'transparent' }}
                    >
                      Jornada Diurna ({filteredAlumnosDiurno.length})
                    </button>
                    <button
                      onClick={() => setSubTabAlumnos('vespertino')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer`}
                      style={subTabAlumnos === 'vespertino'
                        ? { background: 'var(--nacap-red)', color: 'white' }
                        : { color: 'var(--text-secondary)', background: 'transparent' }}
                    >
                      Jornada Vespertina ({filteredAlumnosVespertino.length})
                    </button>
                  </div>

                  {/* Search and Add controls */}
                  <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                    <div className="relative w-full sm:max-w-xs">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        className="input-field !pl-9 text-xs"
                        placeholder="Buscar por rut, nombre, seccion..."
                        value={searchAlumno}
                        onChange={e => setSearchAlumno(e.target.value)}
                      />
                    </div>
                    <button
                      onClick={() => {
                        cancelAlumnoForm()
                        setShowAlumnoModal(true)
                      }}
                      className="btn-primary !py-2 !px-4 text-xs w-full sm:w-auto flex items-center justify-center gap-2"
                    >
                      <Plus size={14} /> Registrar Estudiante
                    </button>
                  </div>
                </div>

                {/* Table block */}
                <div className="card p-5">
                  {subTabAlumnos === 'diurno' ? (
                    filteredAlumnosDiurno.length === 0 ? (
                      <div className="text-center py-10 text-gray-500">
                        No se encontraron alumnos en la jornada diurna
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="nacap-table">
                          <thead>
                            <tr>
                              <th>Nombre</th>
                              <th>RUT</th>
                              <th>Email</th>
                              <th>Carrera</th>
                              <th className="text-right">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredAlumnosDiurno
                              .slice((pageAlumnosDiurno - 1) * itemsPerPage, pageAlumnosDiurno * itemsPerPage)
                              .map(al => (
                                <tr key={al.id} className="group">
                                  <td className="font-semibold flex items-center gap-2.5 py-3">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black uppercase text-red-500 bg-red-500/10">
                                      {al.nombre.charAt(0)}
                                    </div>
                                    <span>{al.nombre}</span>
                                  </td>
                                  <td className="text-gray-300 font-mono">{al.rut || '—'}</td>
                                  <td className="text-gray-400">{al.email}</td>
                                  <td className="text-gray-400 font-bold" title={CARRERA_NOMBRES[al.carrera] || al.carrera || '—'}>
                                    {al.carrera || al.seccion || '—'}
                                  </td>
                                  <td className="text-right">
                                    <div className="flex justify-end gap-1">
                                      <button
                                        onClick={() => setVerAlumno(al)}
                                        className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                                        title="Ver Perfil"
                                      >
                                        <Eye size={13} />
                                      </button>
                                      <button
                                        onClick={() => startEditAlumno(al)}
                                        className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                                        title="Editar Perfil"
                                      >
                                        <Pencil size={13} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteAlumno(al.id)}
                                        disabled={isDeleting === al.id}
                                        className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
                                        title="Eliminar Estudiante"
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
                          currentPage={pageAlumnosDiurno}
                          totalPages={Math.ceil(filteredAlumnosDiurno.length / itemsPerPage)}
                          onPageChange={setPageAlumnosDiurno}
                        />
                      </div>
                    )
                  ) : (
                    filteredAlumnosVespertino.length === 0 ? (
                      <div className="text-center py-10 text-gray-500">
                        No se encontraron alumnos en la jornada vespertina
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="nacap-table">
                          <thead>
                            <tr>
                              <th>Nombre</th>
                              <th>RUT</th>
                              <th>Email</th>
                              <th>Carrera</th>
                              <th className="text-right">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredAlumnosVespertino
                              .slice((pageAlumnosVespertino - 1) * itemsPerPage, pageAlumnosVespertino * itemsPerPage)
                              .map(al => (
                                <tr key={al.id} className="group">
                                  <td className="font-semibold flex items-center gap-2.5 py-3">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black uppercase text-red-500 bg-red-500/10">
                                      {al.nombre.charAt(0)}
                                    </div>
                                    <span>{al.nombre}</span>
                                  </td>
                                  <td className="text-gray-300 font-mono">{al.rut || '—'}</td>
                                  <td className="text-gray-400">{al.email}</td>
                                  <td className="text-gray-400 font-bold" title={CARRERA_NOMBRES[al.carrera] || al.carrera || '—'}>
                                    {al.carrera || al.seccion || '—'}
                                  </td>
                                  <td className="text-right">
                                    <div className="flex justify-end gap-1">
                                      <button
                                        onClick={() => setVerAlumno(al)}
                                        className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                                        title="Ver Perfil"
                                      >
                                        <Eye size={13} />
                                      </button>
                                      <button
                                        onClick={() => startEditAlumno(al)}
                                        className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                                        title="Editar Perfil"
                                      >
                                        <Pencil size={13} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteAlumno(al.id)}
                                        disabled={isDeleting === al.id}
                                        className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
                                        title="Eliminar Estudiante"
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
                          currentPage={pageAlumnosVespertino}
                          totalPages={Math.ceil(filteredAlumnosVespertino.length / itemsPerPage)}
                          onPageChange={setPageAlumnosVespertino}
                        />
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* ─── PESTAÑA: SOLICITUDES (HISTORIAL COMPLETO) ────────────────── */}
            {(activeTab === 'solicitudes' || activeTab === 'listo') && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                {/* List y filtros (2/3 width) */}
                <div className="lg:col-span-2 space-y-4">
                  
                  {/* Buscador y Filtros */}
                  <div className="card p-4 space-y-3 bg-white/2">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        className="input-field !pl-9 text-xs"
                        placeholder="Buscar por alumno, RUT, asignatura o código..."
                        value={searchSolicitud}
                        onChange={e => setSearchSolicitud(e.target.value)}
                      />
                    </div>
                    
                    <div className="flex flex-wrap gap-2 text-xs">
                      {/* Estado Filter */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-400 font-bold">Estado:</span>
                        <select
                          className="input-field !py-1 !px-2 text-xs w-auto bg-transparent border-white/10"
                          value={filtroSolicitudEstado}
                          onChange={e => setFiltroSolicitudEstado(e.target.value as EstadoSolicitud | 'TODAS')}
                        >
                          {activeTab === 'solicitudes' ? (
                            <>
                              <option value="TODAS">Todos los Estados</option>
                              <option value="PENDIENTE">PENDIENTE</option>
                              <option value="APROBADA">APROBADA</option>
                              <option value="ENTREGADA">ENTREGADA</option>
                              <option value="DEVUELTA_INCOMPLETA">DEVUELTA INCOMPLETA</option>
                            </>
                          ) : (
                            <>
                              <option value="TODAS">Todos (Listo/Historial)</option>
                              <option value="DEVUELTA">DEVUELTA</option>
                              <option value="RECHAZADA">RECHAZADA</option>
                            </>
                          )}
                        </select>
                      </div>

                      {/* Jornada Filter */}
                      <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                        <span className="text-gray-400 font-bold">Jornada:</span>
                        <select
                          className="input-field !py-1 !px-2 text-xs w-auto bg-transparent border-white/10"
                          value={filtroSolicitudJornada}
                          onChange={e => setFiltroSolicitudJornada(e.target.value as Jornada | 'TODAS')}
                        >
                          <option value="TODAS">Todas las Jornadas</option>
                          <option value="D">Diurna</option>
                          <option value="V">Vespertina</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Listado */}
                  <div className="card p-5">
                    {paginatedSolicitudes.length === 0 ? (
                      <div className="text-center py-10 text-gray-500">
                        No se encontraron solicitudes con los filtros aplicados
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          {paginatedSolicitudes.map(sol => (
                            <div
                              key={sol.id}
                              onClick={() => setSelectedSolicitud(sol)}
                              className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all border"
                              style={{ 
                                background: selectedSolicitud?.id === sol.id ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.01)',
                                borderColor: selectedSolicitud?.id === sol.id ? 'var(--nacap-red)' : 'var(--border)'
                              }}
                            >
                              <div className="min-w-0">
                                <p className="font-bold text-sm text-white truncate">{sol.alumno}</p>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 mt-1">
                                  <span>RUT: <strong className="text-gray-300 font-medium">{sol.rut}</strong></span>
                                  <span>Jornada: <strong className="text-gray-300 font-medium">{getJornadaLabel(sol.jornada)}</strong></span>
                                  <span className="truncate">Asignatura: <strong className="text-gray-300 font-medium">{(sol.asignatura || '').split(' ')[0]}</strong></span>
                                </div>
                              </div>

                              <div className="flex sm:flex-col items-end gap-2 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-white/5 pt-2 sm:pt-0">
                                <span className={`badge ${
                                  sol.estado === 'PENDIENTE' ? 'badge-pending' :
                                  sol.estado === 'APROBADA' ? 'badge-approved' :
                                  sol.estado === 'DEVUELTA' ? 'badge-approved' :
                                  sol.estado === 'RECHAZADA' ? 'badge-rejected' :
                                  sol.estado === 'DEVUELTA_INCOMPLETA' ? 'badge-pending' : 'badge-delivered'
                                }`}>
                                  {sol.estado}
                                </span>
                                <span className="text-[10px] text-gray-500">
                                  {formatFechaHora(sol.created_at)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <Pagination
                          currentPage={activeTab === 'listo' ? pageSolicitudesListo : pageSolicitudesActivas}
                          totalPages={Math.ceil(filteredSolicitudes.length / itemsPerPage)}
                          onPageChange={activeTab === 'listo' ? setPageSolicitudesListo : setPageSolicitudesActivas}
                        />
                      </>
                    )}
                  </div>
                </div>

                {/* Side detail panel (1/3 width) */}
                <div className="card p-5 h-fit lg:sticky lg:top-24">
                  {selectedSolicitud ? (
                    <div className="space-y-4 animate-fade-in">
                      <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <div>
                          <p className="text-[9px] font-extrabold tracking-widest text-red-500 uppercase">Detalle Administrativo</p>
                          <h3 className="font-black text-base text-white mt-0.5">Solicitud de Material</h3>
                        </div>
                        <button 
                          onClick={() => setSelectedSolicitud(null)}
                          className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
                        >
                          <X size={15} />
                        </button>
                      </div>

                      <div className="space-y-2.5 text-xs">
                        <div className="flex justify-between py-1.5 border-b border-white/3">
                          <span className="text-gray-400 font-bold">Alumno:</span>
                          <span className="font-semibold text-white">{selectedSolicitud.alumno}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-white/3">
                          <span className="text-gray-400 font-bold">RUT:</span>
                          <span className="font-semibold text-white">{selectedSolicitud.rut}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-white/3">
                          <span className="text-gray-400 font-bold">Asignatura:</span>
                          <span className="font-semibold text-white text-right truncate max-w-[200px]" title={selectedSolicitud.asignatura}>
                            {selectedSolicitud.asignatura}
                          </span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-white/3">
                          <span className="text-gray-400 font-bold">Sección:</span>
                          <span className="font-semibold text-white">{selectedSolicitud.seccion}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-white/3">
                          <span className="text-gray-400 font-bold">Jornada:</span>
                          <span className="font-semibold text-white">{getJornadaLabel(selectedSolicitud.jornada)}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-white/3">
                          <span className="text-gray-400 font-bold">Docente:</span>
                          <span className="font-semibold text-white">{selectedSolicitud.docente?.nombre || 'Docente Cargando...'}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-white/3">
                          <span className="text-gray-400 font-bold">Token Firma Docente:</span>
                          <span className="font-mono text-[10px] text-gray-300 truncate max-w-[150px]" title={selectedSolicitud.token_aprobacion}>
                            {selectedSolicitud.token_aprobacion}
                          </span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-white/3">
                          <span className="text-gray-400 font-bold">Código Pañol (6 dígitos):</span>
                          <span className="font-mono font-bold text-red-400">{selectedSolicitud.codigo_entrega || '— Sin generar —'}</span>
                        </div>
                      </div>

                      {/* Items table */}
                      <div className="space-y-2">
                        <p className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">Herramientas Solicitadas:</p>
                        <div className="rounded-xl border border-white/5 bg-black/10 overflow-hidden">
                          <table className="nacap-table">
                            <thead>
                              <tr>
                                <th className="!py-1.5 !px-2.5">Cant</th>
                                <th className="!py-1.5 !px-2.5">Descripción</th>
                                <th className="!py-1.5 !px-2.5">Estado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(selectedSolicitud.items || []).map((item, idx) => (
                                <tr key={idx}>
                                  <td className="!py-1.5 !px-2.5 font-bold text-red-500">{item.cantidad}</td>
                                  <td className="!py-1.5 !px-2.5 text-xs text-white">{item.descripcion}</td>
                                  <td className="!py-1.5 !px-2.5 text-[10px] text-gray-400">{item.estado_item}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Observations */}
                      {selectedSolicitud.observaciones && (
                        <div className="p-2.5 rounded-lg bg-yellow-500/5 border border-yellow-500/15 text-xs">
                          <p className="font-bold text-yellow-500">Observaciones del Docente:</p>
                          <p className="text-gray-300 mt-1 italic">{selectedSolicitud.observaciones}</p>
                        </div>
                      )}

                      {/* Override Actions */}
                      <div className="border-t border-white/5 pt-4 space-y-2">
                        <p className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">Control de Flujo Forzado (Admin):</p>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => forceUpdateSolicitudEstado(selectedSolicitud.id, 'APROBADA')}
                            className="btn-success !py-2 !px-1.5 text-[10px] leading-tight flex-1"
                            disabled={selectedSolicitud.estado === 'APROBADA'}
                          >
                            <CheckCircle2 size={12} /> Aprobar
                          </button>
                          <button
                            onClick={() => forceUpdateSolicitudEstado(selectedSolicitud.id, 'ENTREGADA')}
                            className="btn-primary !py-2 !px-1.5 text-[10px] leading-tight flex-1 !bg-blue-600 hover:!bg-blue-700"
                            disabled={selectedSolicitud.estado === 'ENTREGADA'}
                          >
                            <Truck size={12} /> Entregado
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => forceUpdateSolicitudEstado(selectedSolicitud.id, 'RECHAZADA')}
                            className="btn-danger !py-2 !px-1.5 text-[10px] leading-tight flex-1"
                            disabled={selectedSolicitud.estado === 'RECHAZADA'}
                          >
                            <XCircle size={12} /> Rechazar
                          </button>
                          <button
                            onClick={() => forceUpdateSolicitudEstado(selectedSolicitud.id, 'PENDIENTE')}
                            className="btn-secondary !py-2 !px-1.5 text-[10px] leading-tight flex-1"
                            disabled={selectedSolicitud.estado === 'PENDIENTE'}
                          >
                            <Clock size={12} /> Pendiente
                          </button>
                        </div>

                        <button
                          onClick={() => forceDeleteSolicitud(selectedSolicitud.id)}
                          className="btn-danger w-full !bg-red-800 hover:!bg-red-950 !py-2 text-[10px] uppercase font-black"
                        >
                          <Trash2 size={12} /> Eliminar Permanentemente
                        </button>
                      </div>

                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500 flex flex-col items-center justify-center gap-3">
                      <Eye size={24} />
                      <p className="text-xs">Haz clic en una solicitud del listado para inspeccionar detalles y realizar anulaciones/modificaciones administrativas.</p>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* ─── PESTAÑA: DIAGNÓSTICO DE BASE DE DATOS ────────────────────── */}
            {activeTab === 'diagnostico' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                
                {/* Loaded Counts */}
                <div className="card p-5 space-y-4">
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-red-500 border-b border-white/5 pb-2 flex items-center gap-2">
                    <Database size={16} /> Estado de Tablas de Alumnos y Asignaturas
                  </h3>

                  <div className="space-y-3.5">
                    <div className="flex justify-between items-center py-2 border-b border-white/3">
                      <div>
                        <p className="font-bold text-sm text-white">Alumnos Jornada Diurna</p>
                        <p className="text-[10px] text-gray-400">Registros activos en rol ALUMNO (Jornada D)</p>
                      </div>
                      <span className="text-lg font-black text-red-500">{stats.alumnosDiurno}</span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-white/3">
                      <div>
                        <p className="font-bold text-sm text-white">Alumnos Jornada Vespertina</p>
                        <p className="text-[10px] text-gray-400">Registros activos en rol ALUMNO (Jornada V)</p>
                      </div>
                      <span className="text-lg font-black text-red-500">{stats.alumnosVespertino}</span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-white/3">
                      <div>
                        <p className="font-bold text-sm text-white">Asignaturas de Mantenimiento (IMI)</p>
                        <p className="text-[10px] text-gray-400">Cargadas para Ingeniería en Mantenimiento Industrial</p>
                      </div>
                      <span className="text-lg font-black text-red-500">{stats.asignaturasIMI}</span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-white/3">
                      <div>
                        <p className="font-bold text-sm text-white">Asignaturas de Mecánica (MI)</p>
                        <p className="text-[10px] text-gray-400">Cargadas para Ingeniería en Mecánica Automotriz</p>
                      </div>
                      <span className="text-lg font-black text-red-500">{stats.asignaturasMI}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-white/2 border border-white/5 flex items-start gap-2.5">
                    <Info size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] text-gray-400 leading-normal">
                      Estos contadores leen directamente las tablas <code className="text-gray-200 font-mono">public.perfiles</code> y <code className="text-gray-200 font-mono">public.asignaturas</code> del esquema de Supabase.
                    </p>
                  </div>
                </div>

                {/* Technical reference */}
                <div className="card p-5 space-y-4">
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-red-500 border-b border-white/5 pb-2 flex items-center gap-2">
                    <ShieldAlert size={16} /> Seguridad y Acceso
                  </h3>

                  <div className="space-y-4 text-xs">
                    <div className="space-y-2 text-gray-300">
                      <p className="font-bold text-white uppercase text-[10px] tracking-wide">Esquema RLS (Row Level Security)</p>
                      <p className="text-xs leading-relaxed text-gray-400">
                        La seguridad a nivel de filas garantiza que:
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-gray-400">
                        <li>Solo perfiles con rol <code className="text-white font-semibold">ADMIN</code> o <code className="text-white font-semibold">PANOL</code> puedan leer y editar herramientas (<code className="text-white">materiales</code>).</li>
                        <li>Los alumnos puedan buscar materiales activos pero no modificarlos.</li>
                        <li>Las solicitudes y firmas dependan de políticas que vinculan la autenticación directa.</li>
                      </ul>
                    </div>
                  </div>
                </div>

              </div>

              {/* Alertas de correos fallidos */}
              <div className="card p-5 space-y-4 mt-6 animate-fade-in">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-red-500 flex items-center gap-2">
                    <AlertTriangle className="text-red-500 animate-pulse" size={16} /> Alertas de Comunicación: Correos Fallidos
                  </h3>
                  {correosFallidos.length > 0 && (
                    <button
                      onClick={handleLimpiarCorreosFallidos}
                      className="flex items-center gap-1.5 px-3 py-1 rounded bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20 text-xs font-bold transition-all cursor-pointer"
                    >
                      <Trash2 size={12} /> Limpiar Historial
                    </button>
                  )}
                </div>

                {correosFallidos.length === 0 ? (
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-start gap-3">
                    <CheckCircle2 className="text-green-500 flex-shrink-0 mt-0.5" size={16} />
                    <div>
                      <p className="font-bold text-xs text-green-400">Todo en orden</p>
                      <p className="text-[11px] text-gray-400">No se registran fallos en los envíos de correo. El sistema funciona correctamente con Brevo (Primario) y Resend (Fallback).</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                      ⚠️ <strong>Atención:</strong> Se han detectado {correosFallidos.length} intentos de correo fallidos en los que tanto Brevo como Resend no respondieron. Verifica las llaves API en <code className="text-white bg-black/40 px-1 rounded">.env.local</code>.
                    </div>

                    <div className="overflow-x-auto">
                      <table className="nacap-table w-full text-left text-[11px]">
                        <thead>
                          <tr className="border-b border-white/10 text-gray-400">
                            <th className="py-2 px-3 font-semibold">Fecha / Hora</th>
                            <th className="py-2 px-3 font-semibold">Destinatario</th>
                            <th className="py-2 px-3 font-semibold">Asunto</th>
                            <th className="py-2 px-3 font-semibold">Error Brevo</th>
                            <th className="py-2 px-3 font-semibold">Error Resend</th>
                          </tr>
                        </thead>
                        <tbody>
                          {correosFallidos.map((log: any) => (
                            <tr key={log.id} className="border-b border-white/5 hover:bg-white/2">
                              <td className="py-2.5 px-3 text-gray-400 whitespace-nowrap">
                                {formatFechaHora(log.fecha)}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-white">
                                {log.destinatario_nombre} <br />
                                <span className="font-normal text-[10px] text-gray-400">{log.destinatario}</span>
                              </td>
                              <td className="py-2.5 px-3 text-gray-300 max-w-[200px] truncate" title={log.asunto}>
                                {log.asunto}
                              </td>
                              <td className="py-2.5 px-3 text-red-400 font-mono text-[10px] max-w-[200px] break-words">
                                {log.error_brevo || '—'}
                              </td>
                              <td className="py-2.5 px-3 text-red-400 font-mono text-[10px] max-w-[200px] break-words">
                                {log.error_resend || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          </div>
        )}

        {/* Modal Alumno Form (Add / Edit) */}
        {showAlumnoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="card w-full max-w-md p-6 space-y-4 border border-white/10 shadow-2xl relative">
              <button
                type="button"
                onClick={cancelAlumnoForm}
                className="absolute right-4 top-4 p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
              
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-red-500 border-b border-white/5 pb-2">
                {editingAlumno ? 'Editar Perfil del Estudiante' : 'Registrar Nuevo Estudiante'}
              </h3>

              <form onSubmit={handleSaveAlumno} className="space-y-4 text-xs">
                <div>
                  <label className="label">Nombre Completo</label>
                  <input
                    required
                    type="text"
                    className="input-field"
                    placeholder="Diego Henríquez Gonzales"
                    value={alumnoForm.nombre}
                    onChange={e => setAlumnoForm(p => ({ ...p, nombre: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="label">Email Institucional</label>
                  <input
                    required
                    type="email"
                    className="input-field"
                    placeholder="diego.henriquez@inacapmail.cl"
                    value={alumnoForm.email}
                    onChange={e => setAlumnoForm(p => ({ ...p, email: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">RUT</label>
                    <input
                      required
                      type="text"
                      className="input-field"
                      placeholder="12.345.678-9"
                      value={alumnoForm.rut}
                      onChange={e => setAlumnoForm(p => ({ ...p, rut: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label">Sección (Opcional)</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Ej: A01"
                      value={alumnoForm.seccion}
                      onChange={e => setAlumnoForm(p => ({ ...p, seccion: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Carrera</label>
                  <select
                    required
                    className="input-field"
                    value={alumnoForm.carrera}
                    onChange={e => setAlumnoForm(p => ({ ...p, carrera: e.target.value }))}
                  >
                    <option value="" disabled>Seleccionar carrera</option>
                    {Object.entries(CARRERA_NOMBRES).map(([code, name]) => (
                      <option key={code} value={code}>
                        [{code}] — {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Jornada de Clases</label>
                  <select
                    className="input-field"
                    value={alumnoForm.jornada}
                    onChange={e => setAlumnoForm(p => ({ ...p, jornada: e.target.value as 'D' | 'V' }))}
                  >
                    <option value="D">Diurna (D)</option>
                    <option value="V">Vespertina (V)</option>
                  </select>
                </div>

                {!editingAlumno && (
                  <div className="p-3 rounded-lg bg-red-950/20 border border-red-500/10 flex items-start gap-2">
                    <Info size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-[10px] text-gray-400 leading-normal">
                      La cuenta se creará automáticamente en Supabase Auth con la contraseña por defecto: <code className="text-red-300 font-mono font-bold">AlumnoInacap2026!</code>
                    </p>
                  </div>
                )}

                <div className="flex gap-2 justify-end border-t border-white/5 pt-4">
                  <button
                    type="submit"
                    disabled={savingAlumno}
                    className="btn-success !py-2 !px-4"
                  >
                    {savingAlumno ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelAlumnoForm}
                    className="btn-secondary !py-2 !px-4"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Ver Alumno */}
        {verAlumno && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="card w-full max-w-md p-6 space-y-4 border border-white/10 shadow-2xl relative text-xs">
              <button
                type="button"
                onClick={() => setVerAlumno(null)}
                className="absolute right-4 top-4 p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>

              <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-sm font-black uppercase text-red-500">
                  {verAlumno.nombre.charAt(0)}
                </div>
                <div>
                  <p className="text-[9px] font-extrabold tracking-widest text-red-500 uppercase">Detalle del Estudiante</p>
                  <h3 className="font-black text-base text-white mt-0.5">{verAlumno.nombre}</h3>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex justify-between py-1.5 border-b border-white/3">
                  <span className="text-gray-400 font-bold">RUT:</span>
                  <span className="font-semibold text-white font-mono">{verAlumno.rut || '—'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/3">
                  <span className="text-gray-400 font-bold">Email Institucional:</span>
                  <span className="font-semibold text-white">{verAlumno.email}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/3">
                  <span className="text-gray-400 font-bold">Carrera:</span>
                  <span className="font-semibold text-white font-bold" title={CARRERA_NOMBRES[verAlumno.carrera] || verAlumno.carrera}>
                    {CARRERA_NOMBRES[verAlumno.carrera] || verAlumno.carrera || '—'}
                  </span>
                </div>
                {verAlumno.seccion && (
                  <div className="flex justify-between py-1.5 border-b border-white/3">
                    <span className="text-gray-400 font-bold">Sección / Curso:</span>
                    <span className="font-semibold text-white font-bold">{verAlumno.seccion}</span>
                  </div>
                )}
                <div className="flex justify-between py-1.5 border-b border-white/3">
                  <span className="text-gray-400 font-bold">Jornada:</span>
                  <span className="font-semibold text-white">{getJornadaLabel(verAlumno.jornada)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/3">
                  <span className="text-gray-400 font-bold">ID Único (Auth):</span>
                  <span className="font-mono text-[10px] text-gray-400 truncate max-w-[200px]" title={verAlumno.id}>{verAlumno.id}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/3">
                  <span className="text-gray-400 font-bold">Creado el:</span>
                  <span className="font-semibold text-white">{verAlumno.created_at ? new Date(verAlumno.created_at).toLocaleString() : '—'}</span>
                </div>
              </div>

              <div className="flex gap-2 justify-end border-t border-white/5 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setVerAlumno(null)
                    startEditAlumno(verAlumno)
                  }}
                  className="btn-success !py-2 !px-4"
                >
                  Editar Datos
                </button>
                <button
                  type="button"
                  onClick={() => setVerAlumno(null)}
                  className="btn-secondary !py-2 !px-4"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
