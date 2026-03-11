/**
 * Middleware para forçar 2FA em roles sensíveis
 */

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function require2FAForRole() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return { required: false, redirect: '/auth/signin' }
  }

  const userId = session.user.id
  const userRole = session.user.role

  // Roles que DEVEM ter 2FA obrigatório (todos os profissionais, exceto PATIENT)
  const sensitiveRoles = [
    'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PHYSIOTHERAPIST', 'PSYCHOLOGIST',
    'HEALTH_AGENT', 'TECHNICIAN', 'PHARMACIST', 'DENTIST', 'NUTRITIONIST', 'SOCIAL_WORKER', 'OTHER'
  ]

  if (!sensitiveRoles.includes(userRole)) {
    return { required: false }
  }

  // Verificar se o usuário tem 2FA habilitado
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorEnabled: true }
  })

  if (!user?.twoFactorEnabled) {
    return {
      required: true,
      redirect: '/settings?tab=security&force2fa=true',
      message: 'Você precisa habilitar autenticação em dois fatores para continuar'
    }
  }

  return { required: false }
}
