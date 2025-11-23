import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { RegistrationForm } from './registration-form'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface RegisterPageProps {
  params: {
    token: string
  }
}

export default async function RegisterPage({ params }: RegisterPageProps) {
  const { token } = params

  const invite = await prisma.registrationInvite.findUnique({
    where: { token }
  })

  if (!invite) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Convite Inválido</CardTitle>
            <CardDescription>
              Este link de convite não existe ou foi digitado incorretamente.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (invite.status !== 'PENDING' || invite.expiresAt < new Date()) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-amber-600">Convite Expirado</CardTitle>
            <CardDescription>
              Este link de convite já foi utilizado ou expirou. Por favor, solicite um novo convite.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Fetch terms
  const terms = await prisma.term.findMany({
    where: { isActive: true }
  })

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Bem-vindo ao HealthCare</h1>
          <p className="mt-2 text-gray-600">Complete seu cadastro para acessar o sistema.</p>
        </div>
        
        <RegistrationForm invite={invite} terms={terms} />
      </div>
    </div>
  )
}
