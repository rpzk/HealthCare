import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({
        status: 'not_authenticated',
        session: null
      })
    }

    const userId = (session.user as any).id
    
    // Buscar dados do usuário no banco
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        assignedRoles: {
          select: {
            role: true,
            isPrimary: true,
            assignedAt: true
          },
          orderBy: [{ isPrimary: 'desc' }, { assignedAt: 'asc' }]
        }
      }
    })

    return NextResponse.json({
      status: 'authenticated',
      session: {
        user: {
          id: session.user.id,
          email: (session.user as any).email,
          name: (session.user as any).name,
          role: (session.user as any).role,
          availableRoles: (session.user as any).availableRoles
        },
        expiresAt: session.expires
      },
      database: user,
      isAdmin: (session.user as any).role === 'ADMIN',
      hasAdminInAvailable: (session.user as any).availableRoles?.includes('ADMIN'),
      isActive: user?.isActive
    }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      error: error.message
    }, { status: 500 })
  }
}
