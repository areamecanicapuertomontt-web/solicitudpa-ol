// Utilidades generales

export function formatRut(rut: string): string {
  // Eliminar puntos y guion
  const clean = rut.replace(/\./g, '').replace('-', '')
  if (clean.length < 2) return rut
  const body = clean.slice(0, -1)
  const dv = clean.slice(-1)
  // Formatear con puntos
  const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${formatted}-${dv}`
}

export function formatFecha(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatFechaHora(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getJornadaLabel(jornada: string): string {
  return jornada === 'D' ? 'Diurno' : 'Vespertino'
}

export function getEstadoColor(estado: string): string {
  switch (estado) {
    case 'PENDIENTE': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30'
    case 'APROBADA': return 'text-green-400 bg-green-400/10 border-green-400/30'
    case 'RECHAZADA': return 'text-red-400 bg-red-400/10 border-red-400/30'
    case 'ENTREGADA': return 'text-blue-400 bg-blue-400/10 border-blue-400/30'
    default: return 'text-gray-400 bg-gray-400/10 border-gray-400/30'
  }
}

export function getEstadoLabel(estado: string): string {
  switch (estado) {
    case 'PENDIENTE': return 'Pendiente'
    case 'APROBADA': return 'Aprobada'
    case 'RECHAZADA': return 'Rechazada'
    case 'ENTREGADA': return 'Entregada'
    default: return estado
  }
}
