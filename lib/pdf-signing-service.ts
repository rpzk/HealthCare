import axios from 'axios'
import FormData from 'form-data'
import fs from 'fs'
import path from 'path'

const GOTENBERG_URL = process.env.GOTENBERG_URL || 'http://localhost:3001'

// Remove static CERT_PATH and CERT_PASSWORD

export interface PdfSigningOptions {
  html?: string
  pdfBuffer?: Buffer
  filename?: string // nome sugerido para download
  customCss?: string
  certPath?: string // Caminho do .pfx/.p12 do usuário
  certPassword?: string // Senha do certificado
}

/**
 * Converte HTML para PDF via Gotenberg (sem assinatura digital)
 */
export async function convertHtmlToPdf(html: string, customCss?: string): Promise<Buffer> {
  const tempFiles: string[] = []
  try {
    const form = new FormData()
    
    // Gera HTML temporário
    const htmlPath = path.join('/tmp', `doc-${Date.now()}.html`)
    let htmlContent = html
    if (customCss) {
      htmlContent = htmlContent.replace('</head>', `<style>${customCss}</style></head>`)
    }
    fs.writeFileSync(htmlPath, htmlContent)
    form.append('files', fs.createReadStream(htmlPath), { filename: 'index.html' })
    tempFiles.push(htmlPath)

    const gotenbergResp = await axios.post(
      `${GOTENBERG_URL}/forms/chromium/convert/html`,
      form,
      {
        headers: {
          ...form.getHeaders(),
        },
        responseType: 'arraybuffer',
        maxContentLength: 20 * 1024 * 1024,
        maxBodyLength: 20 * 1024 * 1024,
      }
    )
    return Buffer.from(gotenbergResp.data)
  } finally {
    // Limpa arquivos temporários
    for (const f of tempFiles) {
      try { fs.unlinkSync(f) } catch {}
    }
  }
}

export async function signPdfWithGotenberg(options: PdfSigningOptions): Promise<Buffer> {
  if (!options.html && !options.pdfBuffer) {
    throw new Error('É necessário fornecer html ou pdfBuffer')
  }
  if (!options.certPath || !options.certPassword) {
    throw new Error('Caminho e senha do certificado são obrigatórios')
  }

  // Cria arquivos temporários
  const tempFiles: string[] = []
  let mainFilePath = ''
  try {
    const form = new FormData()
    if (options.html) {
      // Gera HTML temporário
      const htmlPath = path.join('/tmp', `doc-${Date.now()}.html`)
      let htmlContent = options.html
      if (options.customCss) {
        htmlContent = htmlContent.replace('</head>', `<style>${options.customCss}</style></head>`)
      }
      fs.writeFileSync(htmlPath, htmlContent)
      form.append('files', fs.createReadStream(htmlPath), { filename: options.filename || 'documento.html' })
      tempFiles.push(htmlPath)
      mainFilePath = htmlPath
    } else if (options.pdfBuffer) {
      // Gera PDF temporário
      const pdfPath = path.join('/tmp', `doc-${Date.now()}.pdf`)
      fs.writeFileSync(pdfPath, options.pdfBuffer)
      form.append('files', fs.createReadStream(pdfPath), { filename: options.filename || 'documento.pdf' })
      tempFiles.push(pdfPath)
      mainFilePath = pdfPath
    }
    // Certificado do usuário
    form.append('files', fs.createReadStream(options.certPath), { filename: 'certificado.p12' })
    form.append('password', options.certPassword)

    const gotenbergResp = await axios.post(
      `${GOTENBERG_URL}/forms/libreoffice/convert`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Gotenberg-Pdf-Format': 'PDF/A-1a',
          'Gotenberg-Pdf-Sign': 'true',
        },
        responseType: 'arraybuffer',
        maxContentLength: 20 * 1024 * 1024,
        maxBodyLength: 20 * 1024 * 1024,
      }
    )
    return Buffer.from(gotenbergResp.data)
  } finally {
    // Limpa arquivos temporários
    for (const f of tempFiles) {
      try { fs.unlinkSync(f) } catch {}
    }
  }
}
