import type { Metadata } from 'next'
import './globals.css'
import { TenantProvider } from '@/contexts/TenantContext'

export const metadata: Metadata = {
  title: 'ShareHub',
  description: 'Share slides and photos at your events',
}

export default function RootLayout({
  children,
}: {
  children: React.Node
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <TenantProvider>
          {children}
        </TenantProvider>
      </body>
    </html>
  )
}
