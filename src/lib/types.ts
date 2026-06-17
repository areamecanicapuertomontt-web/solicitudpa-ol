// Tipos principales del sistema de solicitud de materiales NACAP

// ─── Tipos del Plan de Mantención ────────────────────────────────────────────

export type NivelUso   = 'USO MAYOR' | 'USO MENOR'
export type NivelCosto = 'COSTO MAYOR' | 'COSTO MENOR'
export type FrecuenciaMantencion = 'ANUAL' | 'SEMESTRAL' | 'MENSUAL' | 'TRIMESTRAL'
export type EstadoMantencion = 'P' | 'R' | 'C'

export interface SeccionMantencion {
  id: string
  plan_id: string
  numero: number
  nombre: string
  responsable: string | null
  created_at: string
}

export interface Equipo {
  id: string
  seccion_id: string | null
  numero_item: number
  nombre: string
  codigo_inventario: string | null
  nivel_uso: NivelUso | null
  nivel_costo: NivelCosto | null
  frecuencia: FrecuenciaMantencion
  mes_programado: string | null
  estado_programado: EstadoMantencion
  cantidad: number | null
  requiere_calibracion: boolean | null
  tiene_informe_tecnico: boolean
  tiene_cert_calibracion: boolean
  activo: boolean | null
  observaciones: string | null
  created_at: string
  updated_at: string
  // Relaciones (join)
  secciones_mantencion?: SeccionMantencion
}

export interface PlanMantencion {
  id: string
  titulo: string
  fecha: string
  version: string
  actualizado_segun: string | null
  objetivo_general: string | null
  activo: boolean
  created_at: string
}

export interface ActividadPlanificacion {
  id: string
  plan_id: string
  numero: number
  actividad: string
  responsable: string | null
  frecuencia: string | null
  detalle_meses: string | null
  created_at: string
}

export interface RegistroMantencion {
  id: string
  equipo_id: string
  fecha_realizado: string | null
  tipo: 'PREVENTIVA' | 'CORRECTIVA' | null
  estado: EstadoMantencion
  tecnico: string | null
  observaciones: string | null
  created_at: string
}

export type EstadoSolicitud = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'ENTREGADA' | 'DEVUELTA' | 'DEVUELTA_INCOMPLETA'

export type Jornada = 'D' | 'V'

export type EstadoItem = 'NUEVO' | 'USADO' | 'CUALQUIERA'

export interface Docente {
  id: string
  nombre: string
  email: string
  asignatura: string
  activo: boolean
  created_at: string
}

export interface ItemSolicitud {
  id?: string
  solicitud_id?: string
  cantidad: number
  descripcion: string
  estado_item: EstadoItem
  devuelto?: boolean
}

export interface Solicitud {
  id: string
  alumno: string
  rut: string
  alumno_email?: string
  asignatura: string
  seccion: string
  jornada: Jornada
  carrera?: string
  fecha: string
  estado: EstadoSolicitud
  docente_id: string
  token_aprobacion: string
  codigo_entrega?: string
  observaciones?: string
  created_at: string
  updated_at: string
  // Relaciones
  docente?: Docente
  items?: ItemSolicitud[]
}

export interface SolicitudFormData {
  alumno: string
  rut: string
  alumno_email: string
  asignatura: string
  seccion: string
  carrera?: string
  fecha: string
  jornada: Jornada
  docente_id: string
  items: {
    cantidad: number
    descripcion: string
    estado_item: EstadoItem
  }[]
}
