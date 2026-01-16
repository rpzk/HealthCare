import { TermAudience } from '@prisma/client'
import type { PrismaClient, Term } from '@prisma/client'

export type TermsGate = 'AI' | 'TELEMEDICINE' | 'RECORDING' | 'IMAGE' | 'ADMIN_PRIVILEGED'

export class TermsNotAcceptedError extends Error {
  readonly code = 'TERMS_NOT_ACCEPTED'
  readonly missingTerms: Array<Pick<Term, 'id' | 'slug' | 'title' | 'audience'>>

  constructor(missingTerms: Array<Pick<Term, 'id' | 'slug' | 'title' | 'audience'>>) {
    super('Não permitido por falta de aceite de termos/consentimentos obrigatórios')
    this.missingTerms = missingTerms
  }
}

export class TermsNotConfiguredError extends Error {
  readonly code = 'TERMS_NOT_CONFIGURED'
  readonly missing: Array<{ gate: TermsGate; slugs: string[] }>

  constructor(missing: Array<{ gate: TermsGate; slugs: string[] }>) {
    super('Serviço indisponível: termos/consentimentos obrigatórios não configurados')
    this.missing = missing
  }
}

export function getAudienceForRole(role: string | null | undefined): TermAudience {
  return role === 'PATIENT' ? TermAudience.PATIENT : TermAudience.PROFESSIONAL
}

function getGateSlugs(gate: TermsGate, audience: TermAudience): string[] {
  // Prefer audience-specific slugs first, but allow fallback to legacy/shared slugs.
  // NOTE: slug+version is unique, so audience-specific terms must use different slugs.
  switch (gate) {
    case 'AI':
      return audience === TermAudience.PATIENT
        ? ['ai-consent-patient', 'ai-consent']
        : ['ai-consent-professional', 'ai-consent']
    case 'TELEMEDICINE':
      return audience === TermAudience.PATIENT
        ? ['telemedicine-consent-patient']
        : ['telemedicine-consent-professional']
    case 'RECORDING':
      return audience === TermAudience.PATIENT
        ? ['recording-consent-patient', 'recording-consent']
        : ['recording-consent-professional', 'recording-consent']
    case 'IMAGE':
      return audience === TermAudience.PATIENT
        ? ['image-consent-patient']
        : ['image-consent-professional']
    case 'ADMIN_PRIVILEGED':
      // Only meaningful for privileged staff/admin operations.
      // Keep it PROFESSIONAL-scoped (admins are treated as PROFESSIONAL audience).
      return audience === TermAudience.PATIENT
        ? []
        : ['admin-privileged-consent', 'admin-consent']
    default:
      return []
  }
}

export async function assertUserAcceptedTerms(params: {
  prisma: PrismaClient
  userId: string
  audience: TermAudience
  gates: TermsGate[]
}): Promise<void> {
  const requiredActiveTerms: Array<Pick<Term, 'id' | 'slug' | 'title' | 'audience'>> = []
  const missingConfigured: Array<{ gate: TermsGate; slugs: string[] }> = []

  const gates = Array.from(new Set(params.gates))
  for (const gate of gates) {
    const slugs = Array.from(new Set(getGateSlugs(gate, params.audience)))
    if (slugs.length === 0) continue

    const gateTerms = await params.prisma.term.findMany({
      where: {
        isActive: true,
        slug: { in: slugs },
        OR: [{ audience: TermAudience.ALL }, { audience: params.audience }],
      },
      select: {
        id: true,
        slug: true,
        title: true,
        audience: true,
      },
    })

    if (gateTerms.length === 0) {
      missingConfigured.push({ gate, slugs })
      continue
    }

    requiredActiveTerms.push(...gateTerms)
  }

  if (missingConfigured.length > 0) {
    // ADMIN_PRIVILEGED is an operational safety gate, but it must not deadlock
    // administration when terms haven't been configured yet.
    // If only this gate is missing, allow the request to proceed.
    const onlyAdminPrivileged = missingConfigured.every((m) => m.gate === 'ADMIN_PRIVILEGED')
    if (!onlyAdminPrivileged) {
      throw new TermsNotConfiguredError(missingConfigured)
    }
  }

  // If there are no configured gates, do nothing.
  if (requiredActiveTerms.length === 0) return

  const uniqById = new Map(requiredActiveTerms.map((t) => [t.id, t]))
  const uniqueRequiredTerms = Array.from(uniqById.values())

  const accepted = await params.prisma.termAcceptance.findMany({
    where: {
      userId: params.userId,
      termId: { in: uniqueRequiredTerms.map((t) => t.id) },
    },
    select: { termId: true },
  })

  const acceptedIds = new Set(accepted.map((a) => a.termId))
  const missing = uniqueRequiredTerms.filter((t) => !acceptedIds.has(t.id))
  if (missing.length > 0) throw new TermsNotAcceptedError(missing)
}
