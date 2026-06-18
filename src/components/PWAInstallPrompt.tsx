'use client'

import { useState, useEffect } from 'react'
import { Download, X, HelpCircle, Share, PlusSquare } from 'lucide-react'

export default function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // 1. Verificar si ya está en modo Standalone (ya instalada)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (navigator as any).standalone 
      || document.referrer.includes('android-app://')

    if (isStandalone) {
      console.log('[PWAInstallPrompt] La app ya está corriendo en modo standalone (instalada)')
      return
    }

    // 2. Verificar si el usuario ya descartó el banner en esta sesión
    const dismissed = sessionStorage.getItem('pwa_install_dismissed')
    if (dismissed === 'true') {
      return
    }

    // 3. Capturar el evento de instalación nativo (Chrome, Android, Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      console.log('[PWAInstallPrompt] Evento beforeinstallprompt capturado')
      setDeferredPrompt(e)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // 4. Detectar si es iOS (Safari no soporta beforeinstallprompt)
    const userAgent = window.navigator.userAgent.toLowerCase()
    const ios = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(ios)

    // Si es iOS, mostramos el prompt de forma personalizada ya que no tiene evento nativo
    if (ios) {
      // Retrasar la aparición del prompt unos segundos para no ser invasivo al instante
      const timer = setTimeout(() => {
        setShowPrompt(true)
      }, 5000)
      return () => clearTimeout(timer)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (isIOS) {
      // Para iOS mostramos la guía visual
      setShowIOSGuide(true)
      return
    }

    if (!deferredPrompt) {
      // Si no hay evento nativo pero no es iOS, damos una ayuda genérica
      alert('Para instalar la aplicación en este navegador, abre el menú del navegador y selecciona "Instalar aplicación" o "Añadir a la pantalla de inicio".')
      return
    }

    // Ejecutar prompt nativo
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    console.log(`[PWAInstallPrompt] Resultado de la instalación: ${outcome}`)
    
    // Limpiar el prompt guardado
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    sessionStorage.setItem('pwa_install_dismissed', 'true')
    setShowPrompt(false)
  }

  if (!showPrompt) return null

  return (
    <>
      {/* Banner flotante */}
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-[360px] bg-[#0F1B2F]/95 border border-red-500/20 shadow-2xl rounded-2xl p-4 z-40 backdrop-blur-md animate-fade-in flex flex-col gap-3">
        <div className="flex items-start gap-3">
          {/* Logo de INACAP */}
          <div className="w-10 h-10 rounded-xl bg-white border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
            <img src="/icon.png" alt="INACAP Logo" className="w-8 h-8 object-contain" />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-black uppercase tracking-wider text-white">Instalar App Pañol</h4>
            <p className="text-[11px] text-gray-300 mt-0.5 leading-snug">
              Instala la aplicación en tu celular para recibir alertas push al instante y acceso rápido.
            </p>
          </div>

          <button 
            onClick={handleDismiss}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleInstallClick}
            className="flex-1 btn-primary !py-1.5 !px-3 text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download size={13} />
            Instalar Aplicación
          </button>
          <button
            onClick={handleDismiss}
            className="btn-secondary !py-1.5 !px-3 text-[11px] font-bold text-gray-400 hover:text-white cursor-pointer"
          >
            Más tarde
          </button>
        </div>
      </div>

      {/* Modal Guía iOS (Safari) */}
      {showIOSGuide && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#0F1B2F] border border-white/5 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
              <div className="flex items-center gap-2">
                <HelpCircle size={18} style={{ color: 'var(--nacap-red)' }} />
                <h3 className="text-xs font-black uppercase tracking-wider text-white">Instalación en iPhone</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 text-xs text-gray-300">
              <p className="leading-relaxed">
                Safari en iOS no soporta la instalación automatizada. Sigue estos pasos manuales rápidos:
              </p>

              <div className="space-y-3">
                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-red-600/10 text-red-400 flex items-center justify-center font-black text-xs flex-shrink-0">1</div>
                  <div>
                    <h4 className="font-bold text-white flex items-center gap-1">
                      Presiona Compartir <Share size={13} className="text-red-400 inline" />
                    </h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Busca el botón de compartir (cuadrado con flecha hacia arriba) en la barra inferior de Safari.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-red-600/10 text-red-400 flex items-center justify-center font-black text-xs flex-shrink-0">2</div>
                  <div>
                    <h4 className="font-bold text-white flex items-center gap-1">
                      Añadir a pantalla de inicio <PlusSquare size={13} className="text-red-400 inline" />
                    </h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Desliza el menú de opciones hacia abajo y pulsa sobre <strong>"Añadir a la pantalla de inicio"</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-red-600/10 text-red-400 flex items-center justify-center font-black text-xs flex-shrink-0">3</div>
                  <div>
                    <h4 className="font-bold text-white">Confirmar</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Pulsa <strong>"Añadir"</strong> en la esquina superior derecha de tu iPhone. ¡Listo!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-white/5 bg-white/[0.01] flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowIOSGuide(false)
                  setShowPrompt(false)
                }}
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
