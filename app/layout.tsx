import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { verifyConfig } from '@/lib/config-check'
verifyConfig()
import { Providers } from '@/components/providers'
import { ClientErrorLogger } from '@/components/client-error-logger'
import { DebugOverlay } from '@/components/debug-overlay'
import '@/lib/server-instrumentation'
import '@/lib/prisma-warmup'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Sistema de Prontuário Eletrônico',
  description: 'Sistema moderno de prontuário eletrônico com IA embarcada',
  keywords: ['prontuário eletrônico', 'sistema médico', 'saúde', 'IA médica'],
  icons: {
    icon: ['/favicon.ico', '/favicon.svg'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <script
          // Early guard script executed before React components hydrate
          dangerouslySetInnerHTML={{
            __html: `(() => {try {\n  // Define a global watcher to log first access attempts to systemHealth before React sets state\n  if (!window.__EARLY_GUARDS_INSTALLED) {\n    window.__EARLY_GUARDS_INSTALLED = true;\n    const origConsoleError = console.error;\n    console.error = function() {\n      if (arguments[0] && typeof arguments[0] === 'string' && arguments[0].includes('systemHealth')) {\n        window.__EARLY_SYSTEM_HEALTH_ERROR = { msg: arguments[0], stack: new Error().stack };\n      }\n      return origConsoleError.apply(this, arguments);\n    };\n    // Patch any object named securityOverview if it appears on window early
    Object.defineProperty(window, '__SAFE_SYSTEM_HEALTH__', { configurable: true, get() { return 'healthy'; }});\n  }\n} catch(e) { /* swallow */ }} )();`
          }}
        />
        <Providers>
          <ClientErrorLogger />
          <DebugOverlay />
          {children}
        </Providers>
      </body>
    </html>
  )
}
