import type { Metadata } from 'next'
import './globals.css'
import { DisclaimerBanner } from '@/components/disclaimer-banner'
import { ErrorBoundary } from '@/components/error-boundary'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'WITNESS | AI-Powered Evidence Preservation',
  description: 'AI-assisted evidence preservation for human rights organizations. Pre-analysis tool for ICC testimony processing.',
  keywords: ['ICC', 'evidence preservation', 'human rights', 'testimony analysis', 'AI', 'international criminal law'],
  authors: [{ name: 'WITNESS' }],
  openGraph: {
    title: 'WITNESS — AI-Powered Evidence Preservation',
    description: 'Transcribe, analyze, cross-reference and export testimony evidence for ICC proceedings. Powered by Mistral AI and Whisper.',
    type: 'website',
    locale: 'en_US',
    siteName: 'WITNESS',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WITNESS — AI-Powered Evidence Preservation',
    description: 'Transcribe, analyze, cross-reference and export testimony evidence for ICC proceedings.',
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('witness-theme');if(t==='light')document.documentElement.setAttribute('data-theme','light')}catch(e){}`,
          }}
        />
      </head>
      <body className="bg-navy text-white font-sans h-screen overflow-hidden antialiased">
        <ErrorBoundary>
          <DisclaimerBanner />
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'var(--bg-navy-light, #0a0e26)',
                color: 'var(--text-white, #fff)',
                border: '1px solid var(--border-color, #1e2540)',
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
