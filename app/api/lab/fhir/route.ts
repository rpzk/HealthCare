/**
 * POST /api/lab/fhir
 * Recebe Bundle FHIR R4 com resultados de exames de um laboratório parceiro.
 *
 * Autenticação:
 *   x-lab-code: <code do laboratório>   (ex: "DASA")
 *   x-api-key:  <chave em texto puro>   (gerada no cadastro)
 *
 * GET /api/lab/fhir  →  CapabilityStatement (metadado do servidor FHIR)
 */

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { HL7FHIRLabService } from '@/lib/hl7-fhir-lab-service'
import { LabAuthService } from '@/lib/lab-auth-service'
import { logger } from '@/lib/logger'
import crypto from 'crypto'

function fhirError(status: number, diagnostics: string) {
  return NextResponse.json(
    {
      resourceType: 'OperationOutcome',
      issue: [{ severity: 'error', code: 'security', diagnostics }],
    },
    { status, headers: { 'Content-Type': 'application/fhir+json' } }
  )
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()

  // ── Autenticação ──────────────────────────────────────────────────────────
  const apiKey = request.headers.get('x-api-key') ?? ''
  const labCode = request.headers.get('x-lab-code') ?? ''
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    undefined

  const auth = await LabAuthService.validateApiKey(apiKey, labCode, clientIp)
  if (!auth.valid || !auth.lab) {
    logger.warn(`[HL7FHIR] [${requestId}] Auth falhou: ${auth.error} (lab=${labCode})`)
    return fhirError(401, auth.error ?? 'Não autorizado')
  }

  logger.info(`[HL7FHIR] [${requestId}] Autenticado: ${auth.lab.name}`)

  // ── Content-Type ──────────────────────────────────────────────────────────
  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.includes('application/fhir+json') && !contentType.includes('application/json')) {
    return fhirError(415, 'Content-Type deve ser application/fhir+json ou application/json')
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let bundle: unknown
  try {
    bundle = await request.json()
  } catch {
    return fhirError(400, 'JSON inválido no corpo da requisição')
  }

  // ── Validar Bundle ────────────────────────────────────────────────────────
  const validation = HL7FHIRLabService.validateBundle(bundle)
  if (!validation.valid) {
    return NextResponse.json(
      {
        resourceType: 'OperationOutcome',
        issue: [
          {
            severity: 'error',
            code: 'invalid',
            diagnostics: 'Bundle FHIR inválido',
            details: { text: validation.errors.join('; ') },
          },
        ],
      },
      { status: 400, headers: { 'Content-Type': 'application/fhir+json' } }
    )
  }

  // ── Processar ─────────────────────────────────────────────────────────────
  try {
    const result = await HL7FHIRLabService.processIncomingBundle(
      bundle as Parameters<typeof HL7FHIRLabService.processIncomingBundle>[0],
      auth.lab.id,
      auth.lab.tenantId ?? undefined
    )

    logger.info(
      `[HL7FHIR] [${requestId}] Processado: ${result.processed} resultados, ${result.errors.length} erros`
    )

    return NextResponse.json(
      {
        resourceType: 'OperationOutcome',
        issue: [
          {
            severity: result.errors.length > 0 ? 'warning' : 'information',
            code: 'informational',
            diagnostics: `Processados ${result.processed} resultados. ${result.errors.length} erros.`,
            details: { text: result.errors.length > 0 ? result.errors.join('; ') : 'Sucesso' },
          },
        ],
        extension: [
          {
            url: 'urn:healthcare:fhir:processing-summary',
            valueString: JSON.stringify({
              requestId,
              labCode,
              processed: result.processed,
              errors: result.errors.length,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      },
      {
        status: result.errors.length > 0 && result.processed === 0 ? 422 : 200,
        headers: { 'Content-Type': 'application/fhir+json' },
      }
    )
  } catch (error: any) {
    logger.error(`[HL7FHIR] [${requestId}] Erro ao processar bundle:`, error)
    return fhirError(500, error.message || 'Erro interno ao processar bundle')
  }
}

export async function GET() {
  return NextResponse.json(
    {
      resourceType: 'CapabilityStatement',
      status: 'active',
      date: new Date().toISOString(),
      kind: 'instance',
      software: { name: 'Healthcare PEP', version: '2.0.0' },
      fhirVersion: '4.0.1',
      format: ['application/fhir+json'],
      rest: [
        {
          mode: 'server',
          security: {
            description: 'API key via x-api-key + x-lab-code headers',
          },
          resource: [
            {
              type: 'Bundle',
              interaction: [{ code: 'create' }],
              documentation: 'Bundles com DiagnosticReport e Observation',
            },
            {
              type: 'DiagnosticReport',
              interaction: [{ code: 'create' }],
            },
            {
              type: 'Observation',
              interaction: [{ code: 'create' }],
            },
          ],
        },
      ],
    },
    { headers: { 'Content-Type': 'application/fhir+json' } }
  )
}
