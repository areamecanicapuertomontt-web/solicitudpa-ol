import Link from 'next/link'
import { QrCode, ClipboardList, CheckCircle2, Package } from 'lucide-react'
import HomeAuthButtons from '@/components/home-auth-buttons'


export default function HomePage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const solicitudUrl = `${siteUrl}/solicitud`

  return (
    <main className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        {/* Fondo decorativo */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #E63946, transparent)' }} />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full opacity-5"
            style={{ background: 'radial-gradient(circle, #1E88E5, transparent)' }} />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 pt-12 pb-8">

          {/* Logo / Header */}
          <div className="flex items-center gap-4 mb-10 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-12 rounded-full" style={{ background: 'var(--nacap-red)' }} />
              <div>
                <p className="text-xs font-bold tracking-[3px] uppercase" style={{ color: 'var(--nacap-red)' }}>
                  Área Mecánica
                </p>
                <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  INACAP
                </h1>
              </div>
            </div>
            <div className="ml-auto">
              <span className="text-xs px-3 py-1 rounded-full border font-medium"
                style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}>
                Pañol Mecánico
              </span>
            </div>
          </div>

          {/* Hero text */}
          <div className="mb-12 animate-fade-in" style={{ animationDelay: '80ms' }}>
            <h2 className="text-4xl sm:text-5xl font-black mb-3 leading-tight gradient-text">
              Solicitud de<br />Materiales
            </h2>
            <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
              Solicita herramientas y materiales del pañol de forma rápida y simple.
            </p>
          </div>

          {/* Card central con QR + Botón */}
          <div className="card p-8 mb-8 animate-fade-in" style={{ animationDelay: '160ms' }}>
            <div className="flex flex-col sm:flex-row items-center gap-8">

              {/* QR Code display */}
              <div className="flex-shrink-0 flex flex-col items-center gap-3">
                <div className="qr-container shadow-2xl animate-pulse-glow">
                  {/* QR se renderiza en el cliente, aquí placeholder */}
                  <QRCodeDisplay url={solicitudUrl} />
                </div>
                <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                  Escanea con tu celular
                </p>
              </div>

              <div className="w-px h-24 hidden sm:block" style={{ background: 'var(--border)' }} />
              <div className="h-px w-full sm:hidden" style={{ background: 'var(--border)' }} />

              {/* Info + Botón */}
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                  ¿Necesitas materiales?
                </h3>
                <p className="mb-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Escanea el QR con tu celular o inicia sesión para llenar el formulario de solicitud.
                </p>
                <HomeAuthButtons />

              </div>
            </div>
          </div>

          {/* Flujo del proceso */}
          <div className="animate-fade-in" style={{ animationDelay: '240ms' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
              Cómo funciona
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 stagger-children">
              {[
                {
                  icon: <ClipboardList size={20} />,
                  step: '01',
                  title: 'Llena el formulario',
                  desc: 'Ingresa tus datos, elige tu docente y los materiales que necesitas.',
                },
                {
                  icon: <CheckCircle2 size={20} />,
                  step: '02',
                  title: 'Docente aprueba',
                  desc: 'Tu docente recibe un correo y aprueba la solicitud con un clic.',
                },
                {
                  icon: <Package size={20} />,
                  step: '03',
                  title: 'Retira en el pañol',
                  desc: 'El pañol recibe la confirmación y te entrega los materiales.',
                },
              ].map((item) => (
                <div key={item.step} className="card p-5 animate-fade-in">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(230, 57, 70, 0.12)', color: 'var(--nacap-red)' }}>
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-xs font-bold mb-0.5" style={{ color: 'var(--nacap-red)' }}>
                        PASO {item.step}
                      </p>
                      <h4 className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                        {item.title}
                      </h4>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {item.desc}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto py-6 text-center border-t" style={{ borderColor: 'var(--border)' }}>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          © {new Date().getFullYear()} INACAP — Área Mecánica · Sistema de Solicitud de Materiales
        </p>
        <div className="mt-3 flex justify-center gap-4">
          <Link href="/panel"
            className="text-xs hover:underline transition-colors"
            style={{ color: 'var(--text-muted)' }}>
            Panel Pañol
          </Link>
          <span style={{ color: 'var(--border)' }}>|</span>
          <Link href="/qr"
            className="text-xs hover:underline transition-colors"
            style={{ color: 'var(--text-muted)' }}>
            Imprimir QR
          </Link>
        </div>
      </div>

    </main>
  )
}

// Componente QR (server-side con import dinámico en cliente)
// Por simplicidad usamos una imagen SVG placeholder
// El QR real se genera en /qr page
function QRCodeDisplay({ url }: { url: string }) {
  // Usamos la API de Google Charts para generar el QR server-side
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=0D1B2A&margin=0`
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={qrUrl}
      alt="QR Code para solicitar materiales"
      width={160}
      height={160}
      style={{ display: 'block' }}
    />
  )
}
