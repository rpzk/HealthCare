import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { authOptions } from '@/lib/auth'
import { ClientDashboard } from '@/components/dashboard/client-dashboard'

export const metadata: Metadata = {
  title: 'Dashboard - Sistema de Prontuário Eletrônico',
  description: 'Painel principal do sistema médico',
}

export default async function DashboardPage() {
  // Verificar sessão e redirecionar por role
  const session = await getServerSession(authOptions)
  
  // Verificar se há um papel ativo definido pelo usuário (via RoleSwitcher)
  const cookieStore = cookies()
  const activeRole = cookieStore.get('active_role')?.value
  
  // Usar o papel ativo do cookie se existir, senão usar o papel da sessão
  const effectiveRole = activeRole || session?.user?.role
  
  // Pacientes vão para área do paciente
  if (effectiveRole === 'PATIENT') {
    redirect('/minha-saude')
  }

  // Admins vão para painel administrativo (apenas se não escolheu outro papel)
  if (effectiveRole === 'ADMIN') {
    redirect('/admin')
  }

  return <ClientDashboard />
}
