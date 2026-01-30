import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { verifyConfig } from '@/lib/config-check'
verifyConfig()
import { Providers } from '@/components/providers'
import { ClientErrorLogger } from '@/components/client-error-logger'
import { DebugOverlay } from '@/components/debug-overlay'
import '@/lib/server-instrumentation'
import '@/lib/prisma-warmup'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

// Force dynamic rendering to avoid build-time data fetching against the database
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'Sistema de Prontuário Eletrônico',
  description: 'Sistema moderno de prontuário eletrônico com IA embarcada',
  keywords: ['prontuário eletrônico', 'sistema médico', 'saúde', 'IA médica'],
  icons: {
    icon: ['/favicon.ico', '/favicon.svg'],
    apple: '/icons/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'HealthCare',
  },
  formatDetection: {
    telephone: true,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#10b981' },
    { media: '(prefers-color-scheme: dark)', color: '#059669' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="HealthCare" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
      </head>
      <body className={inter.className}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Disable custom service worker to avoid stale bundles in production
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(regs) {
                  regs.forEach(function(reg) { reg.unregister().catch(function(){}); });
                });
              }
            `
          }}
        />
        <script
          // Early guard script executed before React components hydrate
          dangerouslySetInnerHTML={{
            __html: `(() => {try {\n  // Define a global watcher to log first access attempts to systemHealth before React sets state\n  if (!window.__EARLY_GUARDS_INSTALLED) {\n    window.__EARLY_GUARDS_INSTALLED = true;\n    const origConsoleError = console.error;\n    console.error = function() {\n      if (arguments[0] && typeof arguments[0] === 'string' && arguments[0].includes('systemHealth')) {\n        window.__EARLY_SYSTEM_HEALTH_ERROR = { msg: arguments[0], stack: new Error().stack };\n      }\n      return origConsoleError.apply(this, arguments);\n    };\n    // Patch any object named securityOverview if it appears on window early
    Object.defineProperty(window, '__SAFE_SYSTEM_HEALTH__', { configurable: true, get() { return 'healthy'; }});\n  }\n} catch(e) { /* swallow */ }} )();`
          }}
        />
        <Providers>
          <ClientErrorLogger />
          {/* <DebugOverlay /> - Desabilitado em produção */}
          <Toaster richColors position="top-right" closeButton />
          {children}
        </Providers>
      </body>
    </html>
  )
}
