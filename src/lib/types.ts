// Tipos principales del sistema de solicitud de materiales NACAP

export type EstadoSolicitud = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'ENTREGADA'

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
}

export interface Solicitud {
  id: string
  alumno: string
  rut: string
  alumno_email?: string
  asignatura: string
  seccion: string
  jornada: Jornada
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
  fecha: string
  jornada: Jornada
  docente_id: string
  items: {
    cantidad: number
    descripcion: string
    estado_item: EstadoItem
  }[]
}
