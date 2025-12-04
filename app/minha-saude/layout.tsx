import { Metadata } from 'next'

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
    <div className="min-h-screen">
      {children}
    </div>
  )
}
