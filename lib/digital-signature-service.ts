import crypto from 'crypto'

export interface SignatureResult {
  signature: string
  timestamp: Date
  signerId: string
  algorithm: string
}

export class DigitalSignatureService {
  /**
   * Creates an integrity token for a document.
   *
   * Important: this is NOT an ICP-Brasil digital signature.
   * If you need legal signing, use the A1 certificate signer flow.
   */
  static async signDocument(
    content: string,
    signerId: string
  ): Promise<SignatureResult> {
    const timestamp = new Date()

    const secret = process.env.DOCUMENT_INTEGRITY_SECRET
    if (!secret) {
      throw new Error(
        'DOCUMENT_INTEGRITY_SECRET não configurado. Assinatura/tokens de integridade estão desabilitados.'
      )
    }

    const payload = `${content}|${signerId}`
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    return {
      signature,
      timestamp,
      signerId,
      algorithm: 'HMAC-SHA256'
    }
  }

  /**
   * Verify an integrity token (HMAC)
   */
  static async verifySignature(
    content: string,
    signature: string,
    signerId: string
  ): Promise<boolean> {
    const secret = process.env.DOCUMENT_INTEGRITY_SECRET
    if (!secret) return false

    const payload = `${content}|${signerId}`
    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')
    if (signature.length !== expected.length) return false
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  }
}
