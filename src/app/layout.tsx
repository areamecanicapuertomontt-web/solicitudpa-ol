import type { Metadata } from 'next'
import './globals.css'
import FCMHandler from '@/components/FCMHandler'

export const metadata: Metadata = {
  title: 'Pañol Mecánico — INACAP Área Mecánica',
  description: 'Sistema de solicitud de materiales del Área Mecánica INACAP. Solicita herramientas y materiales de manera rápida y sencilla.',
  keywords: 'INACAP, área mecánica, pañol, solicitud de materiales, herramientas',
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" data-scroll-behavior="smooth">
      <body className="antialiased">
        <FCMHandler />
        {children}
      </body>
    </html>
  )
}
