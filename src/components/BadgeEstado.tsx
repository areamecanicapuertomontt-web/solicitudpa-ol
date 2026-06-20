import { Clock, CheckCircle2, XCircle, Truck } from 'lucide-react'

export function BadgeEstado({ estado }: { estado: string }) {
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
