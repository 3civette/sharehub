import type { Metadata } from 'next'
import './globals.css'
import { TenantProvider } from '@/contexts/TenantContext'

export const metadata: Metadata = {
  title: 'Meeting Hub',
  description: 'Share slides and photos at your events',
}

export default function RootLayout({
  children,
}: {
  children: React.Node
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <TenantProvider>
          {children}
        </TenantProvider>
      </body>
    </html>
  )
}
