/**
 * Webhook: Recebimento de Resultados de Laboratório
 * 
 * Endpoints para receber resultados via:
 * - HL7 v2.x (POST com Content-Type: application/hl7-v2)
 * - FHIR R4 (POST com Content-Type: application/fhir+json)
 * 
 * Configurar no laboratório:
 * - Endpoint: https://seu-dominio.com/api/webhooks/lab-results
 * - Headers: Authorization: Bearer {seu-token}
 */

import { NextRequest, NextResponse } from 'next/server'
import { LabIntegrationService, type FHIRDiagnosticReport } from '@/lib/lab-integration-service'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * POST /api/webhooks/lab-results
 * Recebe resultado de exame do laboratório
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.LAB_WEBHOOK_SECRET || process.env.NEXTAUTH_SECRET
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('[LabWebhook] Requisição sem token de autenticação')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const token = authHeader.slice(7)
    if (token !== expectedToken) {
      logger.warn('[LabWebhook] Token inválido')
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Detectar formato pelo Content-Type
    const contentType = request.headers.get('content-type') || ''
    
    let result
    
    if (contentType.includes('application/hl7') || contentType.includes('x-application/hl7')) {
      // HL7 v2.x
      const raw = await request.text()
      logger.info('[LabWebhook] Recebendo mensagem HL7 v2.x')
      
      // Parse e processa a mensagem
      const hl7Message = LabIntegrationService.parseHL7v2(raw)
      result = await LabIntegrationService.processResult({
        format: 'hl7v2',
        content: raw
      })
      
      // Gerar ACK
      if (result.success) {
        const ack = LabIntegrationService.generateACK(hl7Message, true)
        return new NextResponse(ack, {
          status: 200,
          headers: { 'Content-Type': 'application/hl7-v2' }
        })
      } else {
        const nack = LabIntegrationService.generateACK(hl7Message, false, result.error)
        return new NextResponse(nack, {
          status: 200, // HL7 sempre retorna 200, erro no ACK
          headers: { 'Content-Type': 'application/hl7-v2' }
        })
      }
      
    } else if (contentType.includes('application/fhir') || contentType.includes('application/json')) {
      // FHIR R4
      const body = await request.json()
      logger.info('[LabWebhook] Recebendo DiagnosticReport FHIR')
      
      // Pode ser um DiagnosticReport direto ou um Bundle
      if (body.resourceType === 'Bundle') {
        // Processar cada entry do Bundle
        const results = []
        for (const entry of body.entry || []) {
          if (entry.resource?.resourceType === 'DiagnosticReport') {
            const res = await LabIntegrationService.processResult({
              format: 'fhir',
              content: entry.resource as FHIRDiagnosticReport
            })
            results.push(res)
          }
        }
        
        return NextResponse.json({
          success: results.every(r => r.success),
          processed: results.length,
          results
        })
      } else if (body.resourceType === 'DiagnosticReport') {
        result = await LabIntegrationService.processResult({
          format: 'fhir',
          content: body as FHIRDiagnosticReport
        })
      } else {
        logger.warn('[LabWebhook] Tipo de recurso não suportado:', body.resourceType)
        return NextResponse.json({
          error: 'Unsupported resource type',
          expected: 'DiagnosticReport or Bundle'
        }, { status: 400 })
      }
    } else {
      logger.warn('[LabWebhook] Content-Type não suportado:', contentType)
      return NextResponse.json({
        error: 'Unsupported Content-Type',
        expected: ['application/hl7-v2', 'application/fhir+json', 'application/json']
      }, { status: 415 })
    }

    const duration = Date.now() - startTime
    logger.info(`[LabWebhook] Processado em ${duration}ms`, result)

    return NextResponse.json({
      success: result.success,
      processedCount: result.processedCount,
      error: result.error,
      processingTime: duration
    }, {
      status: result.success ? 200 : 400
    })

  } catch (error) {
    logger.error('[LabWebhook] Erro ao processar:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: (error as Error).message
    }, { status: 500 })
  }
}

/**
 * GET /api/webhooks/lab-results
 * Health check e informações do webhook
 */
export async function GET() {
  const pendingResults = await LabIntegrationService.getPendingResults()
  
  return NextResponse.json({
    status: 'ok',
    service: 'lab-results-webhook',
    supportedFormats: ['HL7 v2.x', 'FHIR R4'],
    pendingResults,
    endpoints: {
      receive: 'POST /api/webhooks/lab-results'
    }
  })
}
