import QRCode from 'qrcode'

/**
 * Generate QR code for certificate validation
 * Returns a PNG buffer with the QR code image
 */
export async function generateCertificateQRCode(
  validationUrl: string,
  options?: {
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
    width?: number
  }
): Promise<Buffer> {
  const opts = {
    errorCorrectionLevel: options?.errorCorrectionLevel || 'H',
    type: 'image/png',
    width: options?.width || 200,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  }

  return QRCode.toBuffer(validationUrl, opts)
}

/**
 * Generate QR code as data URL for embedding in HTML
 */
export async function generateCertificateQRCodeDataUrl(
  validationUrl: string
): Promise<string> {
  return QRCode.toDataURL(validationUrl, {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    width: 200,
    margin: 1,
  })
}
