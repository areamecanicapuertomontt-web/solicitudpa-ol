'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseClient } from '@/lib/supabase-client'
import { Eye, EyeOff, Lock, Mail, AlertCircle, LogIn } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error: signInError } = await supabaseClient.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (signInError) {
        if (signInError.message === 'Invalid login credentials') {
          setError('Correo o contraseña incorrectos. Por favor, verifica tus datos.')
        } else {
          setError(signInError.message)
        }
        setLoading(false)
        return
      }

      const user = data.user
      const rol = user?.user_metadata?.rol || 'ALUMNO'

      // Redirección basada en rol
      if (rol === 'ALUMNO') {
        router.push('/solicitud')
      } else {
        router.push('/panel')
      }
      
      // Forzar recarga leve para actualizar el estado del middleware y cookies
      router.refresh()
    } catch (e: unknown) {
      setError('Ocurrió un error inesperado al intentar iniciar sesión.')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: 'var(--bg-primary)' }}>
      
      {/* Fondo decorativo difuminado */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full opacity-10 blur-[80px]"
          style={{ background: 'radial-gradient(circle, var(--nacap-red), transparent)' }} />
      </div>

      <div className="relative max-w-md w-full animate-fade-in">
        
        {/* Logo e Identificación */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2.5 mb-3">
            <div className="w-1.5 h-9 rounded-full" style={{ background: 'var(--nacap-red)' }} />
            <span className="text-sm font-black tracking-[4px] uppercase" style={{ color: 'var(--nacap-red)' }}>
              Área Mecánica
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
            INACAP
          </h1>
          <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
            Sistema de Pañol · Control de Acceso
          </p>
        </div>

        {/* Tarjeta de Formulario */}
        <div className="card p-8 shadow-2xl">
          <h2 className="text-lg font-bold mb-6 text-center" style={{ color: 'var(--text-primary)' }}>
            Ingresa a tu cuenta
          </h2>

          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* Input Email */}
            <div>
              <label className="label flex items-center gap-2">
                <Mail size={13} />
                Correo Electrónico
              </label>
              <div className="relative">
                <input
                  required
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(null) }}
                  className="input-field"
                  placeholder="ejemplo@inacapmail.cl"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Input Password */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="label flex items-center gap-2 mb-0">
                  <Lock size={13} />
                  Contraseña
                </label>
                <Link href="/olvidar-contrasena" className="text-[11px] hover:underline" style={{ color: 'var(--text-secondary)' }}>
                  ¿La olvidaste?
                </Link>
              </div>
              <div className="relative">
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(null) }}
                  className="input-field pr-12"
                  placeholder="••••••••"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-200 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Alerta de Error */}
            {error && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl border animate-slide-in"
                style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)' }}>
                <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-400 leading-relaxed">{error}</p>
              </div>
            )}

            {/* Botón de Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 mt-2 flex justify-center items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  Iniciar Sesión
                </>
              )}
            </button>

          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <Link href="/" className="text-xs hover:underline" style={{ color: 'var(--text-secondary)' }}>
            ← Volver al inicio
          </Link>
        </div>

      </div>
    </main>
  )
}
