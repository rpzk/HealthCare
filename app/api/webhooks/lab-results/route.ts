/**
 * POST /api/webhooks/lab-results
 *
 * Recebe resultados de laboratório em dois formatos:
 *   - HL7 v2.x  (Content-Type: application/hl7-v2)
 *   - FHIR R4   (Content-Type: application/fhir+json | application/json)
 *
 * Autenticação: Bearer token via LAB_WEBHOOK_SECRET (env obrigatório).
 * Para FHIR Bundles completos, use o endpoint dedicado /api/lab/fhir
 * que oferece autenticação por laboratório e IP allowlist.
 */

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { LabIntegrationService, type FHIRDiagnosticReport } from '@/lib/lab-integration-service'
import { HL7FHIRLabService } from '@/lib/hl7-fhir-lab-service'
import { logger } from '@/lib/logger'

function authenticate(request: NextRequest): { ok: boolean; error?: string } {
  const webhookSecret = process.env.LAB_WEBHOOK_SECRET
  if (!webhookSecret) {
    logger.error('[LabWebhook] LAB_WEBHOOK_SECRET não configurada — endpoint desabilitado')
    return { ok: false, error: 'Service unavailable' }
  }

  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, error: 'Unauthorized' }
  }

  const token = authHeader.slice(7)
  // Comparação em tempo constante para evitar timing attacks
  const expected = Buffer.from(webhookSecret)
  const provided = Buffer.from(token)
  if (
    expected.length !== provided.length ||
    !require('crypto').timingSafeEqual(expected, provided)
  ) {
    return { ok: false, error: 'Invalid token' }
  }

  return { ok: true }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  const auth = authenticate(request)
  if (!auth.ok) {
    const status = auth.error === 'Service unavailable' ? 503 : 401
    return NextResponse.json({ error: auth.error }, { status })
  }

  const contentType = request.headers.get('content-type') ?? ''

  try {
    // ── HL7 v2.x ─────────────────────────────────────────────────────────────
    if (contentType.includes('application/hl7') || contentType.includes('x-application/hl7')) {
      const raw = await request.text()
      logger.info('[LabWebhook] Recebendo mensagem HL7 v2.x')

      const hl7Message = LabIntegrationService.parseHL7v2(raw)
      const result = await LabIntegrationService.processResult({ format: 'hl7v2', content: raw })

      const ack = LabIntegrationService.generateACK(hl7Message, result.success, result.error)
      return new NextResponse(ack, {
        status: 200, // HL7 sempre retorna 200; o erro fica no ACK
        headers: { 'Content-Type': 'application/hl7-v2' },
      })
    }

    // ── FHIR R4 ───────────────────────────────────────────────────────────────
    if (contentType.includes('application/fhir') || contentType.includes('application/json')) {
      const body = await request.json()
      logger.info('[LabWebhook] Recebendo payload FHIR')

      // Bundle completo → processar via HL7FHIRLabService (mais completo)
      if (body.resourceType === 'Bundle') {
        const bundleResult = await HL7FHIRLabService.processIncomingBundle(body)
        const duration = Date.now() - startTime
        return NextResponse.json({
          success: bundleResult.errors.length === 0 || bundleResult.processed > 0,
          processed: bundleResult.processed,
          errors: bundleResult.errors,
          processingTime: duration,
        }, { status: bundleResult.processed === 0 && bundleResult.errors.length > 0 ? 422 : 200 })
      }

      // DiagnosticReport individual → processar via LabIntegrationService
      if (body.resourceType === 'DiagnosticReport') {
        const result = await LabIntegrationService.processResult({
          format: 'fhir',
          content: body as FHIRDiagnosticReport,
        })
        const duration = Date.now() - startTime
        return NextResponse.json({
          success: result.success,
          processedCount: result.processedCount,
          error: result.error,
          processingTime: duration,
        }, { status: result.success ? 200 : 400 })
      }

      logger.warn('[LabWebhook] resourceType não suportado:', body.resourceType)
      return NextResponse.json(
        { error: 'Unsupported resource type', expected: ['Bundle', 'DiagnosticReport'] },
        { status: 400 }
      )
    }

    logger.warn('[LabWebhook] Content-Type não suportado:', contentType)
    return NextResponse.json(
      { error: 'Unsupported Content-Type', expected: ['application/hl7-v2', 'application/fhir+json', 'application/json'] },
      { status: 415 }
    )
  } catch (error) {
    logger.error('[LabWebhook] Erro ao processar:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function GET() {
  const pendingResults = await LabIntegrationService.getPendingResults()
  return NextResponse.json({
    status: 'ok',
    service: 'lab-results-webhook',
    supportedFormats: ['HL7 v2.x', 'FHIR R4 Bundle', 'FHIR R4 DiagnosticReport'],
    pendingResults,
    note: 'Para integração FHIR com autenticação por laboratório, use POST /api/lab/fhir',
  })
}
