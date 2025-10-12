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
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-gray-900 text-gray-100">
        <TenantProvider>
          {children}
        </TenantProvider>
      </body>
    </html>
  )
}
