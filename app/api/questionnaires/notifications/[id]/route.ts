import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PATCH - Marcar notificação como lida
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const notification = await prisma.notification.update({
      where: { id: params.id },
      data: { read: true },
    })

    return NextResponse.json(notification)
  } catch (error: any) {
    console.error('Erro ao marcar como lido:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar notificação' },
      { status: 500 }
    )
  }
}

// DELETE - Deletar notificação
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    await prisma.notification.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao deletar notificação:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar notificação' },
      { status: 500 }
    )
  }
}
