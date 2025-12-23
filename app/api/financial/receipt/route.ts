import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'
export const dynamic = 'force-dynamic'


export const GET = withAuth(async (req: NextRequest, { user }) => {
  const { searchParams } = new URL(req.url)
  const transactionId = searchParams.get('id')

  if (!transactionId) {
    return NextResponse.json({ error: 'ID da transação é obrigatório' }, { status: 400 })
  }

  try {
    const transaction = await prisma.financialTransaction.findUnique({
      where: { id: transactionId },
      include: {
        patient: {
          select: {
            name: true,
            cpf: true
          }
        }
      }
    })

    if (!transaction) {
      return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 })
    }

    // Get doctor info if consultation exists
    let doctorInfo = null
    if (transaction.consultationId) {
      const consultation = await prisma.consultation.findUnique({
        where: { id: transaction.consultationId },
        include: {
          doctor: {
            select: {
              name: true,
              crmNumber: true
            }
          }
        }
      })
      doctorInfo = consultation?.doctor
    }

    // Get clinic settings
    const clinicSettings = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: ['CLINIC_NAME', 'CLINIC_ADDRESS', 'CLINIC_CNPJ']
        }
      }
    })

    const settings = clinicSettings.reduce((acc: Record<string, string>, setting: { key: string; value: string }) => {
      acc[setting.key] = setting.value
      return acc
    }, {} as Record<string, string>)

    const receiptData = {
      id: transaction.id,
      date: transaction.paidDate || transaction.dueDate,
      patientName: transaction.patient?.name || 'Paciente não identificado',
      patientCpf: transaction.patient?.cpf,
      doctorName: doctorInfo?.name || 'Profissional não identificado',
      doctorCrm: doctorInfo?.crmNumber,
      amount: Number(transaction.amount),
      description: transaction.description,
      category: transaction.category,
      paymentMethod: transaction.paymentMethod,
      clinicName: settings.CLINIC_NAME || 'HealthCare Clinic',
      clinicAddress: settings.CLINIC_ADDRESS,
      clinicCnpj: settings.CLINIC_CNPJ
    }

    return NextResponse.json(receiptData)
  } catch (error) {
    console.error('Error generating receipt:', error)
    return NextResponse.json(
      { error: 'Erro ao gerar recibo' },
      { status: 500 }
    )
  }
})
