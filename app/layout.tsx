import type { Metadata } from 'next'
import './globals.css'
import { DisclaimerBanner } from '@/components/disclaimer-banner'
import { ErrorBoundary } from '@/components/error-boundary'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'WITNESS | AI-Powered Evidence Preservation',
  description: 'AI-assisted evidence preservation for human rights organizations. Pre-analysis tool for ICC testimony processing.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="bg-navy text-white font-sans h-screen overflow-hidden antialiased">
        <ErrorBoundary>
          <DisclaimerBanner />
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#0a0e26',
                color: '#fff',
                border: '1px solid #1e2540',
                borderRadius: '0',
                fontSize: '13px',
              },
            }}
          />
        </ErrorBoundary>
      </body>
    </html>
  )
}
