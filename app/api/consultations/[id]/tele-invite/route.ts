import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { emailService } from '@/lib/email-service'
import crypto from 'crypto'
import { logger } from '@/lib/logger'

// POST - Enviar convite de teleconsulta para o paciente
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const consultationId = params.id

    // Buscar consulta com dados do paciente
    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        doctor: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!consultation) {
      return NextResponse.json({ error: 'Consulta não encontrada' }, { status: 404 })
    }

    if (!consultation.patient?.email && !consultation.patient?.phone) {
      return NextResponse.json({ 
        error: 'Paciente não possui email ou telefone cadastrado' 
      }, { status: 400 })
    }

    // Gerar token único para o paciente acessar a teleconsulta
    const teleToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24) // Expira em 24 horas

    // Salvar token na consulta
    await prisma.consultation.update({
      where: { id: consultationId },
      data: {
        meetingLink: teleToken,
        status: 'IN_PROGRESS',
        actualDate: consultation.actualDate || new Date()
      }
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const teleLink = `${baseUrl}/tele/join/${teleToken}`

    // Enviar email se disponível
    if (consultation.patient?.email) {
      const emailResult = await emailService.sendEmail({
        to: consultation.patient.email,
        subject: `📹 Teleconsulta - Dr(a). ${consultation.doctor?.name || 'Médico'}`,
        html: `
          <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">📹 Teleconsulta</h1>
            </div>
            
            <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px;">Olá, <strong>${consultation.patient.name}</strong>!</p>
              
              <p style="font-size: 15px; color: #4b5563;">
                Dr(a). <strong>${consultation.doctor?.name || 'Seu médico'}</strong> está aguardando você para uma teleconsulta.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${teleLink}" style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold;">
                  🎥 Entrar na Teleconsulta
                </a>
              </div>
              
              <p style="font-size: 14px; color: #6b7280;">
                <strong>Dicas para uma boa teleconsulta:</strong>
              </p>
              <ul style="font-size: 14px; color: #6b7280;">
                <li>Esteja em um local silencioso e bem iluminado</li>
                <li>Verifique sua conexão de internet</li>
                <li>Permita acesso à câmera e microfone quando solicitado</li>
              </ul>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              
              <p style="font-size: 12px; color: #9ca3af;">
                Este link é válido por 24 horas. Se você não solicitou esta teleconsulta, ignore este email.
              </p>
            </div>
          </div>
        `,
        text: `Olá ${consultation.patient.name}, Dr(a). ${consultation.doctor?.name} está aguardando você para uma teleconsulta. Acesse: ${teleLink}`
      })

      logger.info('[tele-invite] Email enviado:', emailResult.success)
    }

    return NextResponse.json({
      success: true,
      teleLink,
      message: consultation.patient?.email 
        ? `Convite enviado para ${consultation.patient.email}` 
        : 'Link gerado (paciente não possui email)',
      patientEmail: consultation.patient?.email,
      patientPhone: consultation.patient?.phone
    })

  } catch (error) {
    logger.error('Erro ao enviar convite de teleconsulta:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
