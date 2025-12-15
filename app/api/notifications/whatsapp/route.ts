import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { WhatsAppService } from '@/lib/whatsapp-service'
import { z } from 'zod'

const sendMessageSchema = z.object({
  phoneNumber: z.string().min(10).max(15),
  message: z.string().min(1).max(4096),
  type: z.enum(['custom', 'appointment_confirmation', 'appointment_reminder', 'exam_results']).optional()
})

// POST - Send WhatsApp notification
export const POST = withAuth(async (req: NextRequest, { user }) => {
  // Only admin and staff can send WhatsApp messages
  if (!['ADMIN', 'MANAGER', 'RECEPTIONIST', 'DOCTOR'].includes(user.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const parseResult = sendMessageSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { phoneNumber, message } = parseResult.data

    if (!WhatsAppService.isConfigured()) {
      return NextResponse.json(
        {
          error: 'WhatsApp não configurado',
          message: 'Configure as variáveis de ambiente WHATSAPP_* para habilitar o envio de mensagens'
        },
        { status: 503 }
      )
    }

    const success = await WhatsAppService.sendMessage({
      to: phoneNumber,
      message
    })

    if (!success) {
      return NextResponse.json(
        { error: 'Falha ao enviar mensagem' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Mensagem enviada com sucesso'
    })
  } catch (error) {
    console.error('Error sending WhatsApp:', error)
    return NextResponse.json(
      { error: 'Erro ao enviar mensagem WhatsApp' },
      { status: 500 }
    )
  }
})

// GET - Check WhatsApp configuration status
export const GET = withAuth(async (req: NextRequest, { user }) => {
  const configured = await WhatsAppService.isConfigured()
  
  return NextResponse.json({
    configured,
    provider: process.env.WHATSAPP_PROVIDER || 'not_set',
    message: configured 
      ? 'WhatsApp está configurado e pronto para uso'
      : 'Configure WHATSAPP_API_URL e WHATSAPP_API_KEY no arquivo .env'
  })
})
