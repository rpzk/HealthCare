declare module 'qrcode' {
  interface QRCodeToBufferOptions {
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
    type?: 'image/png' | 'image/jpeg' | 'image/webp'
    quality?: number
    margin?: number
    width?: number
    color?: {
      dark?: string
      light?: string
    }
    rendererOpts?: any
  }

  interface QRCodeToDataURLOptions {
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
    type?: 'image/png' | 'image/jpeg' | 'image/webp'
    quality?: number
    margin?: number
    width?: number
    color?: {
      dark?: string
      light?: string
    }
  }

  interface QRCodeOptions {
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
    type?: 'image/png' | 'image/jpeg' | 'image/webp'
    quality?: number
    margin?: number
    width?: number
    color?: {
      dark?: string
      light?: string
    }
  }

  function toBuffer(
    data: string | ArrayBuffer,
    options?: QRCodeToBufferOptions
  ): Promise<Buffer>
  function toDataURL(
    data: string | ArrayBuffer,
    options?: QRCodeToDataURLOptions
  ): Promise<string>
  function toString(
    data: string | ArrayBuffer,
    options?: QRCodeOptions & { type?: 'terminal' }
  ): Promise<string>

  export { toBuffer, toDataURL, toString }
}
