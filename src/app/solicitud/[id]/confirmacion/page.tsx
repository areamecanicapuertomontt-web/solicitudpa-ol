import { CheckCircle2, Clock, Bell } from 'lucide-react'
import Link from 'next/link'

export default async function ConfirmacionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: 'var(--bg-primary)' }}>

      <div className="max-w-md w-full animate-fade-in">

        {/* Ícono de éxito */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-6"
            style={{ background: 'rgba(34, 197, 94, 0.12)', border: '2px solid rgba(34, 197, 94, 0.3)' }}>
            <CheckCircle2 size={48} style={{ color: '#22C55E' }} />
          </div>

          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-1 h-8 rounded-full" style={{ background: 'var(--nacap-red)' }} />
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--nacap-red)' }}>
              Área Mecánica — INACAP
            </span>
          </div>

          <h1 className="text-3xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>
            ¡Solicitud Enviada!
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Tu solicitud fue registrada exitosamente.
          </p>
        </div>

        {/* Pasos de seguimiento */}
        <div className="card p-6 mb-5">
          <h2 className="text-sm font-bold uppercase tracking-wider mb-5" style={{ color: 'var(--text-secondary)' }}>
            ¿Qué sigue?
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>
                <Bell size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Notificación al docente
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  Tu docente recibió una notificación push con los detalles. Deberá aprobar la solicitud.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(96,165,250,0.12)', color: '#60A5FA' }}>
                <Clock size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Espera la aprobación
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  Una vez aprobada, el pañol recibirá la notificación para preparar tus materiales.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E' }}>
                <CheckCircle2 size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Retira en el pañol
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  Preséntate al pañol mecánico con tu RUT para retirar los materiales.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ID de referencia */}
        <div className="card p-4 mb-6">
          <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
            ID de referencia
          </p>
          <p className="text-center font-mono text-sm font-bold mt-1" style={{ color: 'var(--text-secondary)' }}>
            {id.slice(0, 8).toUpperCase()}
          </p>
        </div>

        {/* Botón volver */}
        <Link href="/solicitud" className="btn-primary w-full justify-center py-4">
          Nueva Solicitud
        </Link>
        <div className="mt-3 text-center">
          <Link href="/" className="text-sm hover:underline" style={{ color: 'var(--text-muted)' }}>
            Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  )
}
