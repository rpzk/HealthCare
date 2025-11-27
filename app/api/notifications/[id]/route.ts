import { NextResponse } from 'next/server'
import { NotificationService } from '@/lib/notification-service'
import { withAuth, AuthenticatedApiHandler } from '@/lib/with-auth'

interface RouteParams {
  params: {
    id: string
  }
}

// PATCH - Marcar notificação como lida
export const PATCH = withAuth(async (request, { params, user }) => {
  try {
    const body = await request.json()
    
    // Accept both formats: { action: 'mark_read' } or { read: true }
    if (body.action === 'mark_read' || body.read === true) {
      await NotificationService.markAsRead(params.id)
      return NextResponse.json({ 
        success: true,
        message: 'Notificação marcada como lida'
      })
    }

    return NextResponse.json(
      { error: 'Ação não reconhecida' },
      { status: 400 }
    )

  } catch (error: any) {
    console.error('Erro ao atualizar notificação:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}) as AuthenticatedApiHandler

// DELETE - Excluir notificação
export const DELETE = withAuth(async (request, { params, user }) => {
  try {
    await NotificationService.deleteNotification(params.id)
    return NextResponse.json({ 
      success: true,
      message: 'Notificação excluída com sucesso'
    })
  } catch (error: any) {
    console.error('Erro ao excluir notificação:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}) as AuthenticatedApiHandler
