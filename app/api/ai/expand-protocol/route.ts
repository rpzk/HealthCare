/**
 * POST /api/ai/expand-protocol
 *
 * Expande siglas de protocolos clínicos (TARV, RIPE, etc.) em lista de medicamentos via IA.
 */

export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { validateRequestBody } from '@/lib/with-auth'
import { withMedicalAIAuth } from '@/lib/advanced-auth'
import { medicalAI } from '@/lib/advanced-medical-ai'
import { auditLogger, AuditAction } from '@/lib/audit-logger'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { TermAudience } from '@prisma/client'
import { assertUserAcceptedTerms } from '@/lib/terms-enforcement'
import { termsEnforcementErrorResponse } from '@/lib/terms-http'

const expandProtocolSchema = z.object({
  sigla: z.string().min(2, 'Sigla deve ter pelo menos 2 caracteres').max(50),
  patientAge: z.number().int().min(0).optional(),
  patientSex: z.enum(['M', 'F']).optional(),
  context: z.string().max(500).optional(),
})

export const POST = withMedicalAIAuth(async (request, { user }) => {
  try {
    await assertUserAcceptedTerms({
      prisma,
      userId: user.id,
      audience: TermAudience.PROFESSIONAL,
      gates: ['AI'],
    })
  } catch (e) {
    const res = termsEnforcementErrorResponse(e)
    if (res) return res
    throw e
  }

  const validation = await validateRequestBody(request, (body) => {
    const result = expandProtocolSchema.safeParse(body)
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors
      const errors = (flat.sigla as string[]) || Object.values(flat).flat().filter(Boolean) || ['Sigla inválida']
      return { success: false, errors }
    }
    return { success: true, data: result.data }
  })

  if (!validation.success) {
    return validation.response!
  }

  const { sigla, patientAge, patientSex, context } = validation.data!

  try {
    const result = await medicalAI.expandProtocol(sigla, {
      patientAge,
      patientSex,
      context,
      userId: user.id,
    })

    if (!result.recognized || result.medications.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            result.description ||
            'Sigla não reconhecida com segurança. Revise o termo informado.',
          metadata: {
            sigla: sigla.toUpperCase(),
            recognized: result.recognized,
            confidence: result.confidence ?? 'low',
          },
        },
        { status: 422 }
      )
    }

    auditLogger.logSuccess(
      user.id,
      user.email,
      user.role,
      AuditAction.AI_ANALYSIS,
      'ai-expand-protocol',
      { sigla, medicationsCount: result.medications.length }
    )

    return NextResponse.json({
      success: true,
      data: result,
      metadata: {
        expandedAt: new Date().toISOString(),
        sigla: sigla.toUpperCase(),
        recognized: result.recognized,
        confidence: result.confidence ?? 'medium',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao expandir protocolo'
    return NextResponse.json(
      { error: message, success: false },
      { status: 500 }
    )
  }
})
