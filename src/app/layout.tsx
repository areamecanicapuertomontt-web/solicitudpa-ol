import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Pañol Mecánico — INACAP Área Mecánica',
  description: 'Sistema de solicitud de materiales del Área Mecánica INACAP. Solicita herramientas y materiales de manera rápida y sencilla.',
  keywords: 'INACAP, área mecánica, pañol, solicitud de materiales, herramientas',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
