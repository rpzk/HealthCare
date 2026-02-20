/**
 * API de Receituário Controlado
 * 
 * POST /api/prescriptions/controlled - Gera receituário especial
 * GET /api/prescriptions/controlled - Verifica tipo de controle de medicamentos
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ControlledPrescriptionService } from '@/lib/controlled-prescription-service'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const runtime = 'nodejs'

// Schema para verificação de medicamentos
const checkMedicationsSchema = z.object({
  medications: z.array(z.object({
    name: z.string().min(1)
  })).min(1)
})

// Schema para geração de receituário
const generatePrescriptionSchema = z.object({
  patientId: z.string().min(1),
  medications: z.array(z.object({
    name: z.string().min(1),
    concentration: z.string().optional(),
    form: z.string().optional(),
    quantity: z.number().min(1),
    quantityText: z.string().optional(),
    dosage: z.string().min(1),
    instructions: z.string().optional()
  })).min(1),
  issuedAt: z.string().optional()
})

// GET - Verificar tipo de controle dos medicamentos
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const medicationsParam = searchParams.get('medications')

    if (!medicationsParam) {
      return NextResponse.json(
        { error: 'Parâmetro medications é obrigatório' },
        { status: 400 }
      )
    }

    // Parse dos nomes de medicamentos (separados por vírgula)
    const medicationNames = medicationsParam.split(',').map(m => m.trim())

    // Verificar cada medicamento
    const results = medicationNames.map(medicationName => {
      const info = ControlledPrescriptionService.getControlledMedicationInfo(medicationName)
      return {
        ...info,
        name: medicationName
      }
    })

    // Determinar tipo de receituário necessário
    const prescriptionType = ControlledPrescriptionService.determinePrescriptionType(
      medicationNames.map(name => ({ name }))
    )

    // Resumo
    const hasControlled = results.some(r => r.list !== 'NONE')
    const requiresNotification = results.some(r => r.requiresNotification)
    const highestControl = results.reduce((acc, r) => {
      const priority = ['NONE', 'ANTIMICROBIAL', 'C1', 'C2', 'C3', 'C4', 'C5', 'B1', 'B2', 'A1', 'A2', 'A3']
      return priority.indexOf(r.list) > priority.indexOf(acc) ? r.list : acc
    }, 'NONE' as string)

    return NextResponse.json({
      medications: results,
      prescriptionType,
      summary: {
        hasControlled,
        requiresNotification,
        highestControlList: highestControl,
        paperColor: results[0]?.paperColor || 'WHITE',
        copies: Math.max(...results.map(r => r.copies)),
        minValidityDays: Math.min(...results.map(r => r.validityDays))
      }
    })
  } catch (error) {
    console.error('[Controlled Prescription API] Erro GET:', error)
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    )
  }
}

// POST - Gerar receituário controlado
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar se é médico
    const prescriber = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        role: true,
        crmNumber: true,
        licenseNumber: true,
        speciality: true,
        phone: true
      }
    })

    if (!prescriber || !['DOCTOR', 'NURSE'].includes(prescriber.role)) {
      return NextResponse.json(
        { error: 'Apenas médicos e enfermeiros podem gerar receituários controlados' },
        { status: 403 }
      )
    }

    if (!prescriber.crmNumber && !prescriber.licenseNumber) {
      return NextResponse.json(
        { error: 'Prescritor deve ter CRM ou COREN cadastrado' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const parsed = generatePrescriptionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { patientId, medications, issuedAt } = parsed.data

    // Buscar paciente
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        name: true,
        cpf: true,
        birthDate: true,
        address: true,
        phone: true
      }
    })

    if (!patient) {
      return NextResponse.json(
        { error: 'Paciente não encontrado' },
        { status: 404 }
      )
    }

    // Buscar configurações do estabelecimento
    const systemSettings = await prisma.systemSetting.findFirst({
      where: { key: 'establishment' }
    })

    const establishment = systemSettings?.value as {
      name?: string
      cnes?: string
      address?: string
      phone?: string
    } | null

    // Preparar dados para geração
    const prescriptionData = {
      patient: {
        name: patient.name,
        cpf: patient.cpf || undefined,
        address: patient.address || 'Não informado',
        birthDate: patient.birthDate,
        phone: patient.phone || undefined
      },
      prescriber: {
        name: prescriber.name,
        crm: prescriber.crmNumber || prescriber.licenseNumber || '',
        crmState: 'SP', // TODO: Extrair do CRM ou configuração
        specialty: prescriber.speciality || undefined,
        address: establishment?.address || '',
        phone: prescriber.phone || undefined
      },
      establishment: {
        name: establishment?.name || 'Unidade de Saúde',
        cnes: establishment?.cnes || undefined,
        address: establishment?.address || '',
        phone: establishment?.phone || undefined
      },
      medications: medications.map(med => ({
        ...med,
        quantityText: med.quantityText || ControlledPrescriptionService.numberToWords(med.quantity),
        list: ControlledPrescriptionService.getMedicationControlList(med.name)
      })),
      prescriptionDate: new Date(),
      issuedAt: issuedAt || 'São Paulo'
    }

    // Validar prescrição
    const validation = ControlledPrescriptionService.validatePrescription(prescriptionData)
    
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Prescrição inválida', details: validation.errors, warnings: validation.warnings },
        { status: 400 }
      )
    }

    // Gerar receituário
    const result = ControlledPrescriptionService.generatePrescriptionHTML(prescriptionData)

    return NextResponse.json({
      success: true,
      prescription: {
        type: result.type,
        paperColor: result.paperColor,
        copies: result.copies,
        validityDays: result.validityDays,
        notificationNumber: result.notificationNumber,
        html: result.html
      },
      warnings: validation.warnings,
      medicationsInfo: medications.map(med => {
        const info = ControlledPrescriptionService.getControlledMedicationInfo(med.name)
        return {
          ...info,
          medicationName: med.name
        }
      })
    })
  } catch (error) {
    console.error('[Controlled Prescription API] Erro POST:', error)
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    )
  }
}
