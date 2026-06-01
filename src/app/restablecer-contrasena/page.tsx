'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseClient } from '@/lib/supabase-client'
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function RestablecerContrasenaPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    // Verificar si existe una sesión activa (que Supabase Auth establece automáticamente al procesar el link de recuperación)
    async function checkSession() {
      const { data: { session } } = await supabaseClient.auth.getSession()
      if (!session) {
        setError('El enlace de recuperación ha expirado, es inválido o no estás autenticado. Vuelve a solicitar un enlace.')
      }
      setCheckingSession(false)
    }
    checkSession()
  }, [])

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const { error: updateError } = await supabaseClient.auth.updateUser({
        password: password,
      })

      if (updateError) {
        setError(updateError.message)
        setLoading(false)
        return
      }

      setSuccess(true)
      // Cerrar la sesión temporal para obligar al usuario a loguearse con su nueva contraseña
      await supabaseClient.auth.signOut()
    } catch (e: unknown) {
      setError('Ocurrió un error inesperado al actualizar la contraseña.')
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center space-y-3">
          <span className="w-8 h-8 border-3 border-white/20 border-t-white rounded-full animate-spin inline-block" />
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Verificando enlace de recuperación...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: 'var(--bg-primary)' }}>
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full opacity-5 blur-[80px]"
          style={{ background: 'radial-gradient(circle, var(--nacap-red), transparent)' }} />
      </div>

      <div className="relative max-w-md w-full animate-fade-in">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-1 h-7 rounded-full" style={{ background: 'var(--nacap-red)' }} />
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--nacap-red)' }}>
              Área Mecánica — INACAP
            </span>
          </div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
            Nueva Contraseña
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Elige una contraseña segura que puedas recordar.
          </p>
        </div>

        {/* Tarjeta */}
        <div className="card p-8 shadow-2xl">
          {success ? (
            <div className="text-center py-4 space-y-4 animate-fade-in">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full"
                style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <CheckCircle className="text-green-500" size={30} />
              </div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                ¡Contraseña Actualizada!
              </h2>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Tu contraseña ha sido modificada con éxito. Ya puedes iniciar sesión con tu nueva contraseña.
              </p>
              <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                <Link href="/login" className="btn-primary w-full text-xs py-3">
                  Iniciar Sesión
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              
              {/* Nueva Contraseña */}
              <div>
                <label className="label flex items-center gap-2">
                  <Lock size={13} />
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(null) }}
                    className="input-field pr-12"
                    placeholder="Mínimo 6 caracteres"
                    disabled={loading || !!error && error.includes('expirado')}
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

              {/* Confirmar Contraseña */}
              <div>
                <label className="label flex items-center gap-2">
                  <Lock size={13} />
                  Confirmar Contraseña
                </label>
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); setError(null) }}
                  className="input-field"
                  placeholder="Repite la contraseña"
                  disabled={loading || !!error && error.includes('expirado')}
                />
              </div>

              {error && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl border animate-slide-in"
                  style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)' }}>
                  <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-400 leading-relaxed">{error}</p>
                </div>
              )}

              {(!error || !error.includes('expirado')) && (
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3.5 mt-2 flex justify-center items-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Guardando contraseña...
                    </>
                  ) : (
                    <>
                      Establecer Contraseña
                    </>
                  )}
                </button>
              )}

              {error && error.includes('expirado') && (
                <Link href="/olvidar-contrasena" className="btn-secondary w-full py-3.5 mt-2 flex justify-center">
                  Solicitar nuevo enlace
                </Link>
              )}
            </form>
          )}
        </div>

      </div>
    </main>
  )
}
