/**
 * Gera PDF de prescrição exclusivamente via Gotenberg.
 * Sem fallback PDFKit - se Gotenberg falhar, lança erro.
 */

import { generatePrescriptionHtml } from './prescription-html-generator'
import { convertHtmlToPdf } from '@/lib/pdf-signing-service'
import type { PrescriptionDocument } from './types'
import type { PrescriptionHtmlOptions } from './prescription-html-generator'
import { logger } from '@/lib/logger'

export interface GeneratePrescriptionPdfViaGotenbergOptions extends PrescriptionHtmlOptions {
  verificationUrl?: string
}

/**
 * Gera buffer PDF da prescrição usando HTML + Gotenberg.
 * Margens 50pt conforme padrão ANVISA.
 */
export async function generatePrescriptionPdfViaGotenberg(
  doc: PrescriptionDocument,
  options: GeneratePrescriptionPdfViaGotenbergOptions = {}
): Promise<Buffer> {
  const html = await generatePrescriptionHtml(doc, options)
  try {
    const pdf = await convertHtmlToPdf(html, { marginPt: 50 })
    return pdf
  } catch (err) {
    logger.error({ err, prescriptionId: doc.prescriptionId }, 'Gotenberg falhou ao gerar PDF de prescrição')
    throw err instanceof Error ? err : new Error('Serviço de PDF indisponível')
  }
}
