'use client'

import { useState } from 'react'
import { supabaseClient } from '@/lib/supabase-client'
import { Mail, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function OlvidarContrasenaPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
      const { error: resetError } = await supabaseClient.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${siteUrl}/restablecer-contrasena`,
      })

      if (resetError) {
        setError(resetError.message)
        setLoading(false)
        return
      }

      setSuccess(true)
    } catch (e: unknown) {
      setError('Ocurrió un error inesperado al intentar solicitar el restablecimiento.')
    } finally {
      setLoading(false)
    }
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
            Recuperar Contraseña
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Te enviaremos un correo con las instrucciones para restablecer tu contraseña.
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
                ¡Correo Enviado!
              </h2>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Hemos enviado un correo a <strong className="text-gray-100">{email}</strong> con un enlace seguro para que puedas cambiar tu contraseña. Por favor, revisa también tu carpeta de SPAM.
              </p>
              <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                <Link href="/login" className="btn-secondary w-full text-xs py-3">
                  Volver al inicio de sesión
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="label flex items-center gap-2">
                  <Mail size={13} />
                  Correo Electrónico
                </label>
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

              {error && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl border"
                  style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)' }}>
                  <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-400 leading-relaxed">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3.5 mt-2 flex justify-center items-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Enviando enlace...
                  </>
                ) : (
                  <>
                    Enviar Enlace de Recuperación
                  </>
                )}
              </button>

              <div className="pt-2 text-center border-t mt-4" style={{ borderColor: 'var(--border)' }}>
                <Link href="/login" className="text-xs hover:underline inline-flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                  <ArrowLeft size={12} />
                  Volver al Login
                </Link>
              </div>
            </form>
          )}
        </div>

      </div>
    </main>
  )
}
