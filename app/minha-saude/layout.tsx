import { Metadata } from 'next'
import { TermsGuard } from '@/components/terms-guard'

export const metadata: Metadata = {
  title: 'Minha Saúde | HealthCare',
  description: 'Acompanhe sua saúde, medicamentos e consultas',
}

export default function MinhaSaudeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Layout limpo sem sidebar para área do paciente (mobile-first)
  return (
    <TermsGuard>
      <div className="min-h-screen">
        {children}
      </div>
    </TermsGuard>
  )
}
