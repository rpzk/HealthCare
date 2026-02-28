import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { z } from 'zod'

export const runtime = 'nodejs'

const createProtocolSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  category: z.enum([
    'HYPERTENSION', 'DIABETES', 'PRENATAL', 'CHILDCARE', 'MENTAL_HEALTH',
    'RESPIRATORY', 'INFECTIOUS', 'CHRONIC', 'PREVENTIVE', 'EMERGENCY', 'CUSTOM'
  ]).default('CUSTOM'),
  isPublic: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  prescriptions: z.array(z.object({
    medicationName: z.string(),
    dosage: z.string(),
    frequency: z.string(),
    duration: z.string(),
    instructions: z.string().optional()
  })).default([]),
  exams: z.array(z.object({
    examName: z.string(),
    description: z.string(),
    priority: z.string().optional(),
    notes: z.string().optional()
  })).default([]),
  referrals: z.array(z.object({
    specialty: z.string(),
    description: z.string(),
    priority: z.string().optional(),
    notes: z.string().optional()
  })).default([]),
  diagnoses: z.array(z.object({
    cidCode: z.string(),
    description: z.string()
  })).default([])
})

type ProtocolItems = {
  prescriptions: Array<{ medicationName: string; dosage: string; frequency: string; duration: string; instructions?: string }>
  exams: Array<{ examName: string; description: string; priority?: string; notes?: string }>
  referrals: Array<{ specialty: string; description: string; priority?: string; notes?: string }>
  diagnoses: Array<{ cidCode: string; description: string }>
}

// GET - Listar protocolos (do médico logado + públicos)
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const url = new URL(req.url)
    const includePublic = url.searchParams.get('includePublic') === 'true'

    const where: { doctorId?: string; isPublic?: boolean; isActive: boolean; OR?: Array<{ doctorId: string } | { isPublic: true }> } = {
      isActive: true
    }

    if (includePublic) {
      where.OR = [
        { doctorId: user.id },
        { isPublic: true }
      ]
    } else {
      where.doctorId = user.id
    }

    const protocols = await prisma.protocol.findMany({
      where,
      include: {
        doctor: {
          select: { name: true }
        }
      },
      orderBy: { usageCount: 'desc' }
    })

    // Normalizar items (sempre arrays para o frontend)
    const normalized = protocols.map((p) => {
      const items = ((p.items as ProtocolItems | null) || {}) as ProtocolItems
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        category: p.category,
        usageCount: p.usageCount,
        isPublic: p.isPublic,
        specialty: p.specialty,
        doctor: p.doctor,
        prescriptions: items.prescriptions || [],
        exams: items.exams || [],
        referrals: items.referrals || [],
        diagnoses: items.diagnoses || []
      }
    })

    return NextResponse.json({ protocols: normalized })
  } catch (error) {
    logger.error('Erro ao listar protocolos:', error)
    return NextResponse.json({ error: 'Erro ao listar protocolos' }, { status: 500 })
  }
})

// POST - Criar protocolo
export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    const body = await req.json()
    const parsed = createProtocolSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { name, description, category, isPublic, tags, prescriptions, exams, referrals, diagnoses } = parsed.data

    const hasContent = prescriptions.length > 0 || exams.length > 0 || referrals.length > 0
    if (!hasContent) {
      return NextResponse.json(
        { error: 'Adicione pelo menos uma prescrição, exame ou encaminhamento' },
        { status: 400 }
      )
    }

    const items: ProtocolItems = {
      prescriptions,
      exams,
      referrals,
      diagnoses
    }

    const protocol = await prisma.protocol.create({
      data: {
        name,
        description: description || null,
        category,
        isPublic,
        tags: tags || [],
        doctorId: user.id,
        items
      }
    })

    return NextResponse.json({ protocol })
  } catch (error) {
    logger.error('Erro ao criar protocolo:', error)
    return NextResponse.json({ error: 'Erro ao criar protocolo' }, { status: 500 })
  }
})
