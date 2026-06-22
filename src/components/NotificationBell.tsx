'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, CheckSquare, Loader2 } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { formatFechaHora } from '@/lib/utils'

interface Notificacion {
  id: string
  titulo: string
  mensaje: string
  url: string
  leido: boolean
  created_at: string
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notificacion[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // 1. Obtener usuario actual
  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabaseBrowser.auth.getUser()
      if (user) {
        setUserId(user.id)
      }
    }
    getUser()
  }, [])

  // 2. Cargar notificaciones
  const fetchNotifications = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session) return
      
      const res = await fetch('/api/notificaciones', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      const data = await res.json()
      const list = data.notifications || []
      setNotifications(list)
      setUnreadCount(list.filter((n: any) => !n.leido).length)
    } catch (err) {
      console.error('Error fetching notifications:', err)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    if (userId) {
      fetchNotifications()
    }
  }, [userId])

  // 3. Suscribirse a cambios en tiempo real (diferido)
  useEffect(() => {
    if (!userId) return

    let channel: any;
    const t = setTimeout(() => {
      channel = supabaseBrowser
        .channel(`user-notifications-${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'historial_notificaciones',
            filter: `user_id=eq.${userId}`
          },
          () => {
            // Recargar silenciosamente
            fetchNotifications(true)
            // Opcionalmente reproducir vibración corta en móvil
            try {
              if ('vibrate' in navigator) navigator.vibrate(100)
            } catch {}
          }
        )
        .subscribe((status, err) => {
          if (err) console.error("Notificaciones Realtime error:", err)
        }, 5000)
    }, 2000) // Diferido 2s extra para dejar respirar a las solicitudes principales

    return () => {
      clearTimeout(t)
      if (channel) supabaseBrowser.removeChannel(channel)
    }
  }, [userId])

  // 4. Cerrar menú al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 5. Acciones
  const handleMarkAsRead = async (id?: string) => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session) return

      const res = await fetch('/api/notificaciones', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ id })
      })

      if (res.ok) {
        if (id) {
          setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, leido: true } : n)
          )
          setUnreadCount(c => Math.max(0, c - 1))
        } else {
          setNotifications(prev => prev.map(n => ({ ...n, leido: true })))
          setUnreadCount(0)
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleNotificationClick = async (n: Notificacion) => {
    setIsOpen(false)
    if (!n.leido) {
      await handleMarkAsRead(n.id)
    }
    window.location.href = n.url
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Botón Campana */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-secondary !p-2 relative flex items-center justify-center cursor-pointer min-h-[44px] min-w-[44px]"
        title="Notificaciones"
      >
        <Bell size={16} className={unreadCount > 0 ? 'animate-bounce' : ''} />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white ring-2 ring-[var(--bg-primary)]">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Popover */}
      {isOpen && (
        <div className="fixed left-1/2 -translate-x-1/2 sm:absolute sm:left-auto sm:translate-x-0 sm:right-0 mt-2.5 w-[calc(100vw-2rem)] sm:w-80 rounded-2xl border border-white/5 bg-[#0F1B2F]/95 shadow-2xl backdrop-blur-md z-50 overflow-hidden animate-fade-in">
          <div className="p-3.5 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-white">Notificaciones</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => handleMarkAsRead()}
                className="text-[10px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer min-h-[44px] px-2"
              >
                <CheckSquare size={11} />
                Marcar leídas
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-white/5">
            {loading ? (
              <div className="p-6 flex items-center justify-center text-gray-500">
                <Loader2 size={18} className="animate-spin mr-2" />
                <span className="text-xs">Cargando...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-500">
                No tienes notificaciones
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3.5 cursor-pointer hover:bg-white/5 transition-all duration-150 flex items-start gap-2.5 ${!n.leido ? 'bg-white/[0.01]' : ''}`}
                >
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.leido ? 'bg-red-500' : 'bg-transparent'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold text-white truncate ${!n.leido ? 'text-white' : 'text-gray-300'}`}>{n.titulo}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5 leading-snug line-clamp-2">{n.mensaje}</p>
                    <span className="text-[9px] text-gray-500 mt-1 block">{formatFechaHora(n.created_at)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
