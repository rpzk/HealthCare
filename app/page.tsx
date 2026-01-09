import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { authOptions } from '@/lib/auth'
import { LandingPage } from '@/components/landing/landing-page'

export const metadata: Metadata = {
  title: 'HealthCare - Sistema Completo de Gestão em Saúde',
  description: 'Plataforma integrada para gestão de prontuários eletrônicos, telemedicina, prescrições digitais e muito mais. Atendimento humanizado com tecnologia de ponta.',
}

export default async function HomePage() {
  // Verificar se usuário já está logado
  const session = await getServerSession(authOptions)
  
  if (session) {
    // Verificar se há um papel ativo definido pelo usuário (via RoleSwitcher)
    const cookieStore = cookies()
    const activeRole = cookieStore.get('active_role')?.value
    
    // Usar o papel ativo do cookie APENAS se for permitido para este usuário.
    // Isso evita loops/redirects incorretos quando o cookie fica “sujo” de outra conta.
    const sessionRole = session?.user?.role
    const availableRoles = (session.user as any)?.availableRoles as string[] | undefined
    const isActiveRoleAllowed =
      Boolean(activeRole) &&
      (activeRole === sessionRole || (Array.isArray(availableRoles) && availableRoles.includes(activeRole!)))

    const effectiveRole = isActiveRoleAllowed ? activeRole : sessionRole
    
    // Redirecionar usuários logados para suas respectivas áreas
    if (effectiveRole === 'PATIENT') {
      redirect('/minha-saude')
    }
    
    if (effectiveRole === 'ADMIN') {
      redirect('/admin')
    }
    
    // Outros profissionais vão para dashboard
    redirect('/appointments/dashboard')
  }

  // Usuários não logados veem a landing page
  return <LandingPage />
}
