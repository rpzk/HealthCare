/**
 * Utilities for stamping a PDF with integrity metadata (hash/timestamp) and optional QR code.
 *
 * Important: this module DOES NOT implement ICP-Brasil (A1) cryptographic PDF signing.
 * If you need legal digital signature, use a real A1 signing implementation.
 */

import { createHash } from 'crypto'
import QRCode from 'qrcode'

export interface PdfSigningOptions {
  pdf: Buffer
  certificatePath?: string
  certificatePassword?: string
  signerName?: string
  reason?: string
  location?: string
  includeQrCode?: boolean
  includeTimestamp?: boolean
}

export interface SignatureMetadata {
  hash: string
  timestamp: string
  signer: string
  reason: string
  location: string
  mode?: 'INTEGRITY_ONLY'
}

/**
 * Generates SHA-256 hash of PDF content for digital signature.
 * This is a placeholder implementation. In production, use:
 * - node-signpdf (requires openssl and certificate files)
 * - libp11 with PKCS#11 hardware tokens
 */
export async function signPdf(options: PdfSigningOptions): Promise<{
  signedPdf: Buffer
  metadata: SignatureMetadata
}> {
  const {
    pdf,
    certificatePath,
    certificatePassword,
    signerName = 'Sistema de Prontuário Eletrônico',
    reason = 'Exportação de Prontuário do Paciente',
    location = 'Hospital/Clínica',
    includeQrCode = true,
    includeTimestamp = true,
  } = options

  // This module does not implement A1/ICP-Brasil PDF signing.
  // Refuse to proceed if caller tries to use certificate inputs.
  if (certificatePath || certificatePassword) {
    throw new Error(
      'Assinatura ICP-Brasil (A1) para PDF não está implementada neste módulo. Use o fluxo de assinatura A1 real.'
    )
  }

  // Generate hash of the PDF
  const hash = createHash('sha256').update(pdf).digest('hex')
  const timestamp = new Date().toISOString()

  // Build integrity metadata (not a legal digital signature)
  const metadata: SignatureMetadata = {
    hash,
    timestamp,
    signer: signerName,
    reason,
    location,
    mode: 'INTEGRITY_ONLY',
  }

  if (!includeTimestamp) {
    metadata.timestamp = ''
  }

  // Append metadata to PDF as a trailing comment block.
  // Note: this is NOT an embedded cryptographic signature, only an integrity stamp.
  const marker = '\n%HEALTHCARE-INTEGRITY-METADATA\n'
  const metadataJson = Buffer.from(`${marker}${JSON.stringify(metadata)}\n`)
  const signedPdf = Buffer.concat([pdf, metadataJson])

  // Optionally generate a QR code buffer (PNG) for external use.
  // We do not embed it visually into the PDF here.
  if (includeQrCode) {
    // no-op here; callers may use generateSignatureQrCode
  }

  return {
    signedPdf,
    metadata,
  }
}

/**
 * Verifies a signed PDF signature (placeholder).
 * In production, use proper certificate chain validation.
 */
export function verifyPdfSignature(pdf: Buffer, metadata: SignatureMetadata): boolean {
  // Verifies integrity stamp by recomputing SHA-256 hash.
  // If the PDF contains an appended metadata marker, the hash is computed
  // over the original PDF bytes (before the marker).
  try {
    const marker = Buffer.from('\n%HEALTHCARE-INTEGRITY-METADATA\n')
    const idx = pdf.lastIndexOf(marker)
    const originalPdf = idx >= 0 ? pdf.subarray(0, idx) : pdf
    const computed = createHash('sha256').update(originalPdf).digest('hex')
    return computed === metadata.hash
  } catch {
    return false
  }
}

/**
 * Generates a QR code for PDF verification.
 * The QR code can link to a verification endpoint.
 */
export async function generateSignatureQrCode(
  pdfHash: string,
  verificationUrl: string
): Promise<Buffer> {
  const qrcodeText = `${verificationUrl}?hash=${encodeURIComponent(pdfHash)}`
  return QRCode.toBuffer(qrcodeText, {
    type: 'image/png',
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 256,
  })
}

/**
 * Adds a visual signature appearance to the PDF (placeholder).
 */
export function addSignatureAppearance(
  pdf: Buffer,
  metadata: SignatureMetadata,
  qrCodeImage?: Buffer
): Buffer {
  // Intentionally left as a no-op.
  // If you add a visual block, do NOT label it as a legally/cryptographically validated signature unless
  // you actually implement a cryptographic signature.
  return pdf
}

/**
 * Timestamp the signature using RFC 3161 (placeholder).
 */
export async function timestampSignature(
  pdfHash: string,
  timestampServiceUrl?: string
): Promise<string> {
  // This function currently returns a local timestamp.
  // It does NOT call an RFC 3161 TSA and therefore should not be treated as legally binding.
  // If/when a TSA is implemented, `timestampServiceUrl` will be required.
  return new Date().toISOString()
}
