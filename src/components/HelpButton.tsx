'use client'

import { useState } from 'react'
import { HelpCircle, X, Info, CheckCircle2, Clock, ShieldAlert } from 'lucide-react'

interface HelpButtonProps {
  rol?: 'ALUMNO' | 'DOCENTE' | 'PANOL' | 'ADMIN'
}

export default function HelpButton({ rol = 'ALUMNO' }: HelpButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  const getHelpContent = () => {
    switch (rol) {
      case 'DOCENTE':
        return (
          <div className="space-y-4 text-xs text-gray-300">
            <div className="flex gap-3 items-start bg-red-500/5 p-3 rounded-xl border border-red-500/10">
              <Info size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
              <p>Como **Docente**, tu rol principal es supervisar y autorizar el préstamo de herramientas en los talleres.</p>
            </div>
            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-red-600/10 text-red-400 flex items-center justify-center font-black text-xs flex-shrink-0">1</span>
                <div>
                  <h4 className="font-bold text-white">Revisar Solicitudes</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">Ve a la pestaña <strong>"Por decidir"</strong>. Ahí verás todas las solicitudes que tus alumnos han registrado bajo tu nombre.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-red-600/10 text-red-400 flex items-center justify-center font-black text-xs flex-shrink-0">2</span>
                <div>
                  <h4 className="font-bold text-white">Aprobar o Rechazar</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">Haz clic en una solicitud para ver los detalles. Puedes presionar **Aprobar** (genera un código para el alumno) o **Rechazar** (ingresando un motivo obligatorio).</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-red-600/10 text-red-400 flex items-center justify-center font-black text-xs flex-shrink-0">3</span>
                <div>
                  <h4 className="font-bold text-white">Monitoreo de Herramientas</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">Si un alumno realiza una devolución incompleta o no entrega las herramientas a tiempo, recibirás una notificación de alerta push con el detalle de las piezas faltantes.</p>
                </div>
              </div>
            </div>
          </div>
        )
      case 'PANOL':
      case 'ADMIN':
        return (
          <div className="space-y-4 text-xs text-gray-300">
            <div className="flex gap-3 items-start bg-red-500/5 p-3 rounded-xl border border-red-500/10">
              <Info size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
              <p>Como **Pañolero / Administrador**, eres responsable de la entrega física y el control de retornos del inventario de herramientas.</p>
            </div>
            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-red-600/10 text-red-400 flex items-center justify-center font-black text-xs flex-shrink-0">1</span>
                <div>
                  <h4 className="font-bold text-white">Entregar Herramientas</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">Cuando un alumno se presente, busca su solicitud aprobada, presiona **"Ingresar Código y Entregar"** y digita el código de 6 dígitos que posee el alumno (o búscalo por su RUT).</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-red-600/10 text-red-400 flex items-center justify-center font-black text-xs flex-shrink-0">2</span>
                <div>
                  <h4 className="font-bold text-white">Registrar Retornos (Checklist)</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">Al devolver las herramientas, selecciona la solicitud y marca con un ticket (✓) los materiales que el alumno efectivamente entregó de vuelta. Luego haz clic en <strong>"Confirmar Devolución"</strong>.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-red-600/10 text-red-400 flex items-center justify-center font-black text-xs flex-shrink-0">3</span>
                <div>
                  <h4 className="font-bold text-white">Gestión de Materiales Faltantes</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">Si el alumno <strong>no devolvió algún material</strong> o no trajo nada, simplemente deja los checkboxes desmarcados y confirma la devolución. El sistema cambiará el estado a <strong>"Devolución Incompleta"</strong> y alertará al docente y director de carrera por push.</p>
                </div>
              </div>
            </div>
          </div>
        )
      case 'ALUMNO':
      default:
        return (
          <div className="space-y-4 text-xs text-gray-300">
            <div className="flex gap-3 items-start bg-red-500/5 p-3 rounded-xl border border-red-500/10">
              <Info size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
              <p>Bienvenido al **Portal de Solicitudes**. Sigue estos sencillos pasos para pedir herramientas para tus clases prácticas:</p>
            </div>
            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-red-600/10 text-red-400 flex items-center justify-center font-black text-xs flex-shrink-0">1</span>
                <div>
                  <h4 className="font-bold text-white">Rellenar Formulario</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">Ingresa tus datos personales (Nombre, RUT, Correo), selecciona tu carrera, asignatura, sección y el docente a cargo de tu taller.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-red-600/10 text-red-400 flex items-center justify-center font-black text-xs flex-shrink-0">2</span>
                <div>
                  <h4 className="font-bold text-white">Agregar Materiales</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">Selecciona del buscador las herramientas y cantidades que vas a requerir. Envía tu solicitud.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-red-600/10 text-red-400 flex items-center justify-center font-black text-xs flex-shrink-0">3</span>
                <div>
                  <h4 className="font-bold text-white">Aprobación y Retiro</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">Tu profesor recibirá una alerta para aprobar tu solicitud. Una vez aprobada, recibirás una notificación con tu **Código de Entrega**. Preséntate en el pañol con tu RUT y dicta tu código para retirar.</p>
                </div>
              </div>
            </div>
          </div>
        )
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="btn-secondary !p-2 flex items-center justify-center cursor-pointer"
        title="Ayuda de uso (?)"
      >
        <HelpCircle size={16} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0F1B2F] border border-white/5 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
              <div className="flex items-center gap-2">
                <HelpCircle size={18} style={{ color: 'var(--nacap-red)' }} />
                <h3 className="text-sm font-black uppercase tracking-wider text-white">¿Cómo funciona?</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto max-h-[70vh]">
              {getHelpContent()}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-white/5 bg-white/[0.01] flex justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="btn-primary !px-4 !py-1.5 text-xs font-bold cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
