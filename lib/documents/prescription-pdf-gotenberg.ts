/**
 * Gera PDF de prescrição exclusivamente via Gotenberg.
 *
 * Roteamento de layout:
 * - Strip (A, B, B2, C2, Talidomida): overlay de PNG oficial ANVISA (notificação de receita)
 * - CE (C1, C4, C5): layout HTML puro reproduzindo a RECEITA DE CONTROLE ESPECIAL
 * - Antimicrobiano: layout profissional com 2 vias + badge de validade
 * - Simples: layout profissional estilo Memed
 */

import { generatePrescriptionHtml } from './prescription-html-generator'
import {
  generateAnvisaPrescriptionHtml,
  type AnvisaPrescriptionType,
} from './anvisa-prescription-html-generator'
import { classifyMedication } from './prescription-classifier'
import { convertHtmlToPdf } from '@/lib/pdf-signing-service'
import type { PrescriptionDocument } from './types'
import type { PrescriptionHtmlOptions } from './prescription-html-generator'
import { logger } from '@/lib/logger'

export interface GeneratePrescriptionPdfViaGotenbergOptions extends PrescriptionHtmlOptions {
  verificationUrl?: string
  useStamp?: boolean
}

const STRIP_ANVISA_TYPES = [
  'CONTROLLED_A',
  'CONTROLLED_B',
  'CONTROLLED_B2',
  'CONTROLLED_C2',
  'CONTROLLED_TALIDOMIDA',
]

function shouldUseAnvisaStripLayout(
  doc: PrescriptionDocument,
  prescriptionType: string
): prescriptionType is AnvisaPrescriptionType {
  if (!STRIP_ANVISA_TYPES.includes(prescriptionType)) return false
  return doc.medications.every(
    (m) => classifyMedication(m.name || m.genericName) === prescriptionType
  )
}

/**
 * Gera buffer PDF da prescrição usando HTML + Gotenberg.
 */
export async function generatePrescriptionPdfViaGotenberg(
  doc: PrescriptionDocument,
  options: GeneratePrescriptionPdfViaGotenbergOptions = {}
): Promise<Buffer> {
  const prescriptionType = options.prescriptionType as string | undefined
  let html: string
  let useZeroMargin = false

  if (prescriptionType && shouldUseAnvisaStripLayout(doc, prescriptionType)) {
    html = await generateAnvisaPrescriptionHtml(doc, {
      prescriptionType: prescriptionType as AnvisaPrescriptionType,
      viaNumber: options.viaNumber,
      controlNumber: options.controlNumber,
      uf: options.uf,
      expiresAt: options.expiresAt,
      justification: options.justification,
      buyerName: options.buyerName,
      buyerDocument: options.buyerDocument,
      buyerAddress: options.buyerAddress,
      buyerCity: options.buyerCity,
      buyerState: options.buyerState,
      buyerPhone: options.buyerPhone,
      verificationUrl: options.verificationUrl,
    })
    useZeroMargin = true
  } else {
    html = await generatePrescriptionHtml(doc, options)
  }

  try {
    const marginPt = useZeroMargin ? 0 : 50
    const pdf = await convertHtmlToPdf(html, { marginPt })
    return pdf
  } catch (err) {
    logger.error({ err, prescriptionId: doc.prescriptionId }, 'Gotenberg falhou ao gerar PDF de prescrição')
    throw err instanceof Error ? err : new Error('Serviço de PDF indisponível')
  }
}
