import { HeartPulse } from 'lucide-react'
import Link from 'next/link'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      {/* Header minimalista */}
      <header className="flex items-center justify-between px-4 py-4 sm:px-6 border-b bg-background/80 backdrop-blur">
        <Link 
          href="/" 
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <HeartPulse className="h-6 w-6" />
          <span className="font-medium">HealthCare</span>
        </Link>
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
        >
          Voltar ao início
        </Link>
      </header>

      {/* Conteúdo centralizado */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 overflow-y-auto">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-sm text-muted-foreground border-t bg-background/50">
        <span>Sistema HealthCare — Autenticação segura</span>
      </footer>
    </div>
  )
}
