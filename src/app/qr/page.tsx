'use client'

import { useState } from 'react'
import { Download, Printer, QrCode } from 'lucide-react'
import Link from 'next/link'

export default function QRPage() {
  const [url, setUrl] = useState('')
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const solicitudUrl = `${siteUrl}/solicitud`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(solicitudUrl)}&bgcolor=ffffff&color=0D1B2A&margin=10`

  return (
    <main className="min-h-screen py-10 px-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8 animate-fade-in">
          <Link href="/" className="btn-secondary !px-3 !py-2">←</Link>
          <div className="flex items-center gap-3">
            <div className="w-1 h-10 rounded-full" style={{ background: 'var(--nacap-red)' }} />
            <div>
              <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--nacap-red)' }}>Pañol Mecánico</p>
              <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Código QR</h1>
            </div>
          </div>
        </div>

        {/* QR Card */}
        <div className="card p-8 text-center animate-fade-in mb-5" style={{ animationDelay: '80ms' }}>
          <div className="flex justify-center mb-6">
            <div className="qr-container shadow-2xl animate-pulse-glow">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrUrl} alt="QR Solicitud de Material" width={300} height={300} />
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-1 h-6 rounded-full" style={{ background: 'var(--nacap-red)' }} />
            <span className="text-xs font-black tracking-widest uppercase" style={{ color: 'var(--nacap-red)' }}>
              Área Mecánica
            </span>
          </div>
          <p className="text-xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>INACAP</p>
          <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>
            Pañol Mecánico — Solicitud de Materiales
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Escanea con tu celular para solicitar materiales
          </p>
        </div>

        {/* Info */}
        <div className="card p-4 mb-5 animate-fade-in" style={{ animationDelay: '160ms' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>URL del formulario</p>
          <p className="text-xs font-mono break-all" style={{ color: 'var(--text-muted)' }}>{solicitudUrl}</p>
        </div>

        {/* Botones */}
        <div className="flex gap-3 animate-fade-in" style={{ animationDelay: '240ms' }}>
          <button
            onClick={() => window.print()}
            className="btn-primary flex-1 py-3"
          >
            <Printer size={17} />
            Imprimir
          </button>
          <a
            href={qrUrl}
            download="qr-panol-nacap.png"
            className="btn-secondary flex-1 py-3 text-center"
          >
            <Download size={17} />
            Descargar
          </a>
        </div>

        {/* Instrucciones de impresión */}
        <div className="card p-4 mt-5 animate-fade-in" style={{ animationDelay: '300ms' }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
            💡 Instrucciones
          </p>
          <ul className="text-xs space-y-1" style={{ color: 'var(--text-muted)' }}>
            <li>• Imprime en tamaño carta o A4</li>
            <li>• Pega el QR en un lugar visible del pañol</li>
            <li>• Los alumnos escanean con la cámara del celular</li>
            <li>• No necesitan instalar ninguna app</li>
          </ul>
        </div>
      </div>

      {/* Estilos para impresión */}
      <style>{`
        @media print {
          body { background: white !important; }
          .btn-primary, .btn-secondary, header, footer { display: none !important; }
          .card { border: 1px solid #ccc !important; background: white !important; }
          * { color: black !important; }
        }
      `}</style>
    </main>
  )
}
