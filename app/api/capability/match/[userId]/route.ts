import { NextRequest, NextResponse } from 'next/server'
import { OccupationCapabilityService } from '@/lib/occupation-capability-service'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }
  
  // Usuário só pode ver seus próprios dados, ou admin pode ver de todos
  const userRole = session.user.role
  if (session.user.id !== params.userId && !['ADMIN', 'OWNER', 'HR_MANAGER'].includes(userRole as string)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }
  
  const roles = await OccupationCapabilityService.matchUserToRoles(params.userId)
  return NextResponse.json({ roles })
}
