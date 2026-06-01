'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, ChevronLeft, Send, AlertCircle, LogOut } from 'lucide-react'
import type { Docente, SolicitudFormData } from '@/lib/types'
import { supabaseClient } from '@/lib/supabase-client'


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

export default function SolicitudPage() {
  const router = useRouter()
  const [docentes, setDocentes] = useState<Docente[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [asignaturas, setAsignaturas] = useState<any[]>([])
  const [selectedCarrera, setSelectedCarrera] = useState<string>('ALL')

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

  useEffect(() => {
    async function loadAsignaturas() {
      const { data, error } = await supabaseClient
        .from('asignaturas')
        .select('*')
        .order('nivel', { ascending: true })
        .order('nombre', { ascending: true })
      
      if (!error && data) {
        setAsignaturas(data)
      }
    }
    loadAsignaturas()
  }, [])

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabaseClient.auth.getUser()
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
        
        const seccionVal = perf.seccion || ''
        const detected = seccionVal.toLowerCase().includes('mantenimiento') || seccionVal.toLowerCase().includes('imi')
          ? 'IMI'
          : seccionVal.toLowerCase().includes('automotriz') || seccionVal.toLowerCase().includes('mi')
          ? 'MI'
          : 'ALL'
        
        setSelectedCarrera(detected)
        if (detected !== 'ALL') {
          if (seccionVal.length < 10) {
            setValue('seccion', seccionVal)
          } else {
            setValue('seccion', '')
          }
        } else {
          setValue('seccion', seccionVal)
        }
      }
    }
    loadProfile()
  }, [setValue])

  const filteredAsignaturas = asignaturas.filter(a => {
    if (selectedCarrera === 'ALL') return true
    return a.carrera === selectedCarrera
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
        body: JSON.stringify(data),
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
            <a href="/" className="btn-secondary !px-3 !py-2">
              <ChevronLeft size={18} />
            </a>
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
                  ¡Hola, {profile.nombre.split(' ')[0]}! 👋
                </h2>
                <p className="text-xs mt-2 text-gray-400">
                  Bienvenido al sistema. Tus datos institucionales se vincularán automáticamente a esta solicitud:
                </p>
                <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3 text-xs text-gray-300 font-medium">
                  <div>RUT: <span className="text-white font-bold">{profile.rut || 'N/A'}</span></div>
                  <div>Correo: <span className="text-white font-bold">{profile.email}</span></div>
                  {profile.jornada && (
                    <div>Jornada: <span className="text-white font-bold">{profile.jornada === 'D' ? 'Diurna' : 'Vespertina'}</span></div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Hidden fields to submit student info with form values */}
          <input type="hidden" {...register('alumno')} />
          <input type="hidden" {...register('rut')} />
          <input type="hidden" {...register('alumno_email')} />

          {/* ── Datos de la Asignatura ── */}
          <div className="card p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-secondary)' }}>
              Asignatura
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Filtrar por Carrera</label>
                  <select
                    value={selectedCarrera}
                    onChange={(e) => setSelectedCarrera(e.target.value)}
                    className="input-field"
                  >
                    <option value="ALL">Todas las asignaturas</option>
                    <option value="IMI">Ing. en Mantenimiento Industrial (IMI)</option>
                    <option value="MI">Ing. en Mecánica y Electromovilidad (MI)</option>
                  </select>
                </div>

                <div>
                  <label className="label">Asignatura</label>
                  <select
                    {...register('asignatura')}
                    className="input-field text-sm"
                    defaultValue=""
                  >
                    <option value="" disabled>— Selecciona tu Asignatura —</option>
                    {filteredAsignaturas.map(a => (
                      <option key={`${a.codigo}-${a.carrera}`} value={a.nombre}>
                        Sem. {a.nivel} — [{a.codigo}] {a.nombre} ({a.carrera})
                      </option>
                    ))}
                    {filteredAsignaturas.length === 0 && (
                      <option value="" disabled>Cargando asignaturas...</option>
                    )}
                  </select>
                  {errors.asignatura && <p className="text-xs mt-1" style={{ color: 'var(--nacap-red)' }}>{errors.asignatura.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Sección</label>
                  <input
                    {...register('seccion')}
                    className="input-field"
                    placeholder="Ej: A01"
                  />
                  {errors.seccion && <p className="text-xs mt-1" style={{ color: 'var(--nacap-red)' }}>{errors.seccion.message}</p>}
                </div>
                <div>
                  <label className="label">Jornada</label>
                  <select {...register('jornada')} className="input-field">
                    <option value="D">Diurno</option>
                    <option value="V">Vespertino</option>
                  </select>
                  {errors.jornada && <p className="text-xs mt-1" style={{ color: 'var(--nacap-red)' }}>{errors.jornada.message}</p>}
                </div>
                <div>
                  <label className="label">Fecha</label>
                  <input
                    {...register('fecha')}
                    type="date"
                    className="input-field"
                  />
                  {errors.fecha && <p className="text-xs mt-1" style={{ color: 'var(--nacap-red)' }}>{errors.fecha.message}</p>}
                </div>
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
                    {/* Descripción */}
                    <div className="flex-1">
                      <label className="label">Descripción</label>
                      <input
                        {...register(`items.${idx}.descripcion`)}
                        className="input-field"
                        placeholder="Ej: Llave inglesa 12 pulgadas"
                      />
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
      </div>
    </main>
  )
}
