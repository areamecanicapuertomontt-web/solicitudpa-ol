'use client'
// src/components/SolicitudStepper.tsx
// Tracker visual de etapas estilo "seguimiento de pedido" para Mis Solicitudes

import type { EstadoSolicitud } from '@/lib/types'

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface StepperProps {
  estado: EstadoSolicitud
  /** Código de 6 dígitos del QR (solo visible si estado === 'APROBADA') */
  codigoEntrega?: string | null
  /** Data URL del QR pre-generado */
  qrDataUrl?: string | null
  /** Motivo de rechazo (solo visible si estado === 'RECHAZADA') */
  motivo?: string | null
}

// ─── Definición de las etapas del flujo NORMAL ────────────────────────────────
const STEPS_NORMAL = [
  {
    key: 'PENDIENTE',
    label: 'Enviada',
    icon: '📋',
    color: {
      ring: 'border-amber-400',
      bg: 'bg-amber-400',
      text: 'text-amber-400',
      line: 'bg-amber-400',
      ping: 'bg-amber-400',
    },
  },
  {
    key: 'APROBADA',
    label: 'Aprobada',
    icon: '✅',
    color: {
      ring: 'border-emerald-400',
      bg: 'bg-emerald-400',
      text: 'text-emerald-400',
      line: 'bg-emerald-400',
      ping: 'bg-emerald-400',
    },
  },
  {
    key: 'ENTREGADA',
    label: 'Entregada',
    icon: '📦',
    color: {
      ring: 'border-blue-400',
      bg: 'bg-blue-400',
      text: 'text-blue-400',
      line: 'bg-blue-400',
      ping: 'bg-blue-400',
    },
  },
  {
    key: 'DEVUELTA',
    label: 'Devuelto',
    icon: '↩️',
    color: {
      ring: 'border-gray-400',
      bg: 'bg-gray-400',
      text: 'text-gray-400',
      line: 'bg-gray-400',
      ping: 'bg-gray-400',
    },
  },
]

// Mapea qué índice del array STEPS_NORMAL corresponde a cada estado de DB
const STATE_INDEX: Record<string, number> = {
  PENDIENTE: 0,
  APROBADA: 1,
  ENTREGADA: 2,
  DEVUELTA: 3,
  DEVUELTA_INCOMPLETA: 3, // se maneja aparte como rama especial
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function SolicitudStepper({ estado, codigoEntrega, qrDataUrl, motivo }: StepperProps) {
  const isRechazada = estado === 'RECHAZADA'
  const isIncompleta = estado === 'DEVUELTA_INCOMPLETA'

  // Índice de la etapa activa en el flujo normal
  const activeIndex = isRechazada ? -1 : (STATE_INDEX[estado] ?? 0)

  return (
    <div className="space-y-4">
      {/* ── Stepper horizontal ── */}
      <div className="relative flex items-start justify-between px-1">
        {STEPS_NORMAL.map((step, idx) => {
          const isCompleted = !isRechazada && activeIndex > idx
          const isActive = !isRechazada && activeIndex === idx
          const isFuture = !isRechazada && activeIndex < idx
          const c = step.color

          return (
            <div key={step.key} className="flex flex-col items-center flex-1 relative">

              {/* Línea conectora (izquierda del nodo, excepto primer paso) */}
              {idx > 0 && (
                <div className="absolute top-[18px] right-1/2 w-full h-[2px] -translate-y-px pr-1">
                  {isCompleted || isActive ? (
                    <div className={`h-full w-full ${STEPS_NORMAL[idx - 1].color.line} rounded-full`} />
                  ) : (
                    /* Línea dashed para pasos futuros */
                    <div className="h-full w-full rounded-full"
                      style={{
                        background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.12) 0, rgba(255,255,255,0.12) 4px, transparent 4px, transparent 8px)'
                      }}
                    />
                  )}
                </div>
              )}

              {/* Nodo del paso */}
              <div className="relative z-10 flex flex-col items-center">
                {/* Anillo pulsante (solo etapa activa) */}
                {isActive && (
                  <span className={`absolute inset-0 rounded-full ${c.ping} opacity-40 animate-ping`} />
                )}

                <div className={`
                  relative w-9 h-9 rounded-full flex items-center justify-center text-base
                  transition-all duration-300 border-2
                  ${isCompleted ? `${c.bg} border-transparent shadow-lg` : ''}
                  ${isActive ? `bg-gray-900 ${c.ring} shadow-lg` : ''}
                  ${isFuture ? 'bg-gray-800/60 border-gray-700' : ''}
                `}>
                  <span className={`text-sm leading-none select-none ${isFuture ? 'opacity-30' : 'opacity-100'}`}>
                    {step.icon}
                  </span>
                </div>

                {/* Label */}
                <span className={`
                  mt-1.5 text-[10px] font-semibold leading-tight text-center max-w-[52px] line-clamp-2
                  ${isCompleted ? c.text : ''}
                  ${isActive ? `${c.text} font-bold` : ''}
                  ${isFuture ? 'text-gray-600' : ''}
                `}>
                  {step.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Rama especial: RECHAZADA ── */}
      {isRechazada && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-3.5 flex gap-3 items-start animate-fade-in">
          <span className="text-xl leading-none flex-shrink-0">❌</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-red-400 mb-0.5">Solicitud rechazada por el docente</p>
            {motivo ? (
              <p className="text-xs text-gray-400 leading-relaxed">
                <span className="text-gray-500">Motivo:</span> {motivo}
              </p>
            ) : (
              <p className="text-xs text-gray-500">El docente no indicó un motivo específico.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Rama especial: DEVUELTA_INCOMPLETA ── */}
      {isIncompleta && (
        <div className="rounded-xl border border-orange-500/25 bg-orange-500/5 p-3.5 flex gap-3 items-start animate-fade-in">
          <span className="text-xl leading-none flex-shrink-0">⚠️</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-orange-400 mb-0.5">Devolución incompleta</p>
            <p className="text-xs text-gray-400 leading-relaxed">
              Hay materiales pendientes de retornar al pañol. El docente y el director de carrera fueron notificados.
            </p>
          </div>
        </div>
      )}

      {/* ── Panel de estado según etapa activa ── */}

      {/* PENDIENTE: esperando docente */}
      {estado === 'PENDIENTE' && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 flex gap-2.5 items-center animate-fade-in">
          <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400" />
          </span>
          <p className="text-xs text-amber-300 leading-relaxed">
            Esperando confirmación del docente. Esta página se actualiza automáticamente.
          </p>
        </div>
      )}

      {/* APROBADA: QR de retiro prominente */}
      {estado === 'APROBADA' && (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 flex flex-col items-center gap-3 animate-fade-in">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-emerald-400">🎉 ¡Aprobada! Preséntate al pañol</span>
          </div>

          {/* QR */}
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="QR de retiro"
              className="rounded-xl"
              style={{ width: 200, height: 200 }}
            />
          ) : (
            <div className="w-[200px] h-[200px] rounded-xl bg-white/5 flex items-center justify-center">
              <span className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          )}

          {/* Código manual */}
          {codigoEntrega && (
            <div className="flex flex-col items-center gap-1">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Código manual</p>
              <p className="font-mono font-black text-2xl tracking-[.3em] text-white">
                {codigoEntrega}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ENTREGADA: aviso de devolución */}
      {estado === 'ENTREGADA' && (
        <div className="rounded-xl border border-blue-400/20 bg-blue-400/5 p-3.5 flex gap-2.5 items-start animate-fade-in">
          <span className="text-base flex-shrink-0">📦</span>
          <p className="text-xs text-blue-300 leading-relaxed">
            Materiales entregados. Recuerda devolverlos al pañol al finalizar la clase.
          </p>
        </div>
      )}

      {/* DEVUELTA: completado */}
      {estado === 'DEVUELTA' && (
        <div className="rounded-xl border border-gray-600/30 bg-gray-700/10 p-3.5 flex gap-2.5 items-center animate-fade-in">
          <span className="text-base flex-shrink-0">✅</span>
          <p className="text-xs text-gray-400 leading-relaxed">
            Ciclo completado. Materiales devueltos correctamente al pañol.
          </p>
        </div>
      )}
    </div>
  )
}
