import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { verifyConfig } from '@/lib/config-check'
verifyConfig()
import { Providers } from '@/components/providers'
import '@/lib/server-instrumentation'
import '@/lib/prisma-warmup'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Sistema de Prontuário Eletrônico',
  description: 'Sistema moderno de prontuário eletrônico com IA embarcada',
  keywords: ['prontuário eletrônico', 'sistema médico', 'saúde', 'IA médica'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
