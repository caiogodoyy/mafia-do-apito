import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Máfia do Apito',
  description: 'Estatísticas, rankings e peladas ao vivo da Máfia do Apito.',
}

export const viewport: Viewport = {
  themeColor: '#080c0a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh">{children}</body>
    </html>
  )
}
