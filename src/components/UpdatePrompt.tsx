'use client';

import { useEffect, useState } from 'react';

export default function UpdatePrompt() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const checkForUpdate = async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return;

      // Si ya hay un SW esperando al montar (venían de una sesión previa)
      if (registration.waiting) {
        setWaitingWorker(registration.waiting);
        setShowPrompt(true);
      }

      // Escuchar cuando se encuentre un SW nuevo
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker);
            setShowPrompt(true);
          }
        });
      });
    };

    checkForUpdate();

    // También escuchar el evento nativo de controllerchange para recargar automático
    // cuando el nuevo SW toma el control
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }, []);

  const handleUpdate = () => {
    if (!waitingWorker) return;
    // Decirle al SW que tome el control ahora
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9999] flex items-center justify-between
                    gap-3 rounded-2xl bg-gray-900/90 backdrop-blur-md border border-white/20
                    px-4 py-3 shadow-2xl animate-fade-in">
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-white">
          🚀 Nueva versión disponible
        </span>
        <span className="text-xs text-white/70">
          Actualiza para obtener los últimos cambios
        </span>
      </div>
      <button
        onClick={handleUpdate}
        className="shrink-0 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold
                   text-white hover:bg-red-700 active:scale-95 transition-all"
      >
        Actualizar
      </button>
    </div>
  );
}
