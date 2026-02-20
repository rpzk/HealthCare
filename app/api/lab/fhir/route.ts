/**
 * API para receber resultados de laboratório via HL7 FHIR
 * 
 * Endpoint para integração com sistemas de laboratório
 * Suporta FHIR R4 Bundle com DiagnosticReport e Observations
 */

import { NextRequest, NextResponse } from 'next/server'
import { HL7FHIRLabService } from '@/lib/hl7-fhir-lab-service'
import { logger } from '@/lib/logger'
import crypto from 'crypto'

// Headers de autenticação esperados
const API_KEY_HEADER = 'x-api-key'
const LAB_ID_HEADER = 'x-lab-id'

// Validar autenticação do laboratório
async function validateLabAuth(request: NextRequest): Promise<{ valid: boolean; labId?: string; error?: string }> {
  const apiKey = request.headers.get(API_KEY_HEADER)
  const labId = request.headers.get(LAB_ID_HEADER)

  if (!apiKey) {
    return { valid: false, error: 'API key não fornecida' }
  }

  if (!labId) {
    return { valid: false, error: 'ID do laboratório não fornecido' }
  }

  // Em produção, validar API key e labId no banco de dados
  // Por enquanto, aceitar qualquer chave válida no formato
  const expectedKeyFormat = /^lab_[a-zA-Z0-9]{32}$/
  if (!expectedKeyFormat.test(apiKey)) {
    // Para desenvolvimento, aceitar qualquer chave
    logger.warn(`[HL7FHIR] API key em formato inesperado: ${apiKey.substring(0, 10)}...`)
  }

  return { valid: true, labId }
}

/**
 * POST /api/lab/fhir
 * Receber Bundle FHIR com resultados de exames
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  
  try {
    logger.info(`[HL7FHIR] [${requestId}] Recebendo bundle de laboratório`)

    // Validar autenticação
    const auth = await validateLabAuth(request)
    if (!auth.valid) {
      logger.warn(`[HL7FHIR] [${requestId}] Autenticação falhou: ${auth.error}`)
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      )
    }

    // Validar content-type
    const contentType = request.headers.get('content-type')
    if (!contentType?.includes('application/fhir+json') && !contentType?.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type deve ser application/fhir+json ou application/json' },
        { status: 415 }
      )
    }

    // Parsear body
    let bundle
    try {
      bundle = await request.json()
    } catch (e) {
      return NextResponse.json(
        { error: 'JSON inválido no corpo da requisição' },
        { status: 400 }
      )
    }

    // Validar bundle FHIR
    const validation = HL7FHIRLabService.validateBundle(bundle)
    if (!validation.valid) {
      return NextResponse.json(
        { 
          error: 'Bundle FHIR inválido',
          details: validation.errors
        },
        { status: 400 }
      )
    }

    // Processar bundle
    const result = await HL7FHIRLabService.processIncomingBundle(bundle)

    logger.info(`[HL7FHIR] [${requestId}] Bundle processado: ${result.processed} resultados`)

    // Retornar resposta FHIR OperationOutcome
    return NextResponse.json({
      resourceType: 'OperationOutcome',
      issue: [
        {
          severity: result.errors.length > 0 ? 'warning' : 'information',
          code: 'informational',
          diagnostics: `Processados ${result.processed} resultados. ${result.errors.length} erros.`,
          details: {
            text: result.errors.length > 0 ? result.errors.join('; ') : 'Sucesso'
          }
        }
      ],
      extension: [
        {
          url: 'http://healthcare.local/fhir/extension/processing-summary',
          valueString: JSON.stringify({
            requestId,
            processed: result.processed,
            errors: result.errors.length,
            timestamp: new Date().toISOString()
          })
        }
      ]
    }, {
      status: result.errors.length > 0 && result.processed === 0 ? 422 : 200,
      headers: {
        'Content-Type': 'application/fhir+json'
      }
    })

  } catch (error: any) {
    logger.error(`[HL7FHIR] [${requestId}] Erro ao processar bundle:`, error)

    return NextResponse.json({
      resourceType: 'OperationOutcome',
      issue: [{
        severity: 'error',
        code: 'exception',
        diagnostics: error.message || 'Erro interno ao processar bundle'
      }]
    }, {
      status: 500,
      headers: {
        'Content-Type': 'application/fhir+json'
      }
    })
  }
}

/**
 * GET /api/lab/fhir
 * Metadata do endpoint FHIR
 */
export async function GET() {
  return NextResponse.json({
    resourceType: 'CapabilityStatement',
    status: 'active',
    date: new Date().toISOString(),
    kind: 'instance',
    software: {
      name: 'Healthcare PEP',
      version: '2.0.0'
    },
    fhirVersion: '4.0.1',
    format: ['application/fhir+json'],
    rest: [{
      mode: 'server',
      resource: [
        {
          type: 'Bundle',
          interaction: [{ code: 'create' }],
          documentation: 'Aceita Bundles com DiagnosticReport e Observation'
        },
        {
          type: 'DiagnosticReport',
          interaction: [{ code: 'create' }],
          documentation: 'Resultados de exames laboratoriais'
        },
        {
          type: 'Observation',
          interaction: [{ code: 'create' }],
          documentation: 'Observações individuais de exames'
        }
      ]
    }]
  }, {
    headers: {
      'Content-Type': 'application/fhir+json'
    }
  })
}
