import axios from 'axios'
import FormData from 'form-data'
import fs from 'fs'
import path from 'path'

const GOTENBERG_URL = process.env.GOTENBERG_URL || 'http://gotenberg:3000'

// Remove static CERT_PATH and CERT_PASSWORD

export interface PdfSigningOptions {
  html?: string
  pdfBuffer?: Buffer
  filename?: string // nome sugerido para download
  customCss?: string
  certPath?: string // Caminho do .pfx/.p12 do usuário
  certPassword?: string // Senha do certificado
}

export interface ConvertHtmlToPdfOptions {
  customCss?: string
  /** Margens em pt (50pt ≈ 17.6mm). Se não informado, usa padrão Gotenberg. */
  marginPt?: number
}

/**
 * Converte HTML para PDF via Gotenberg (sem assinatura digital)
 */
export async function convertHtmlToPdf(
  html: string,
  customCssOrOptions?: string | ConvertHtmlToPdfOptions
): Promise<Buffer> {
  const opts: ConvertHtmlToPdfOptions =
    typeof customCssOrOptions === 'string'
      ? { customCss: customCssOrOptions }
      : customCssOrOptions ?? {}
  const { customCss: css, marginPt } = opts

  const tempFiles: string[] = []
  try {
    const form = new FormData()

    const htmlPath = path.join('/tmp', `doc-${Date.now()}.html`)
    let htmlContent = html
    if (css) {
      htmlContent = htmlContent.replace('</head>', `<style>${css}</style></head>`)
    }
    fs.writeFileSync(htmlPath, htmlContent)
    form.append('files', fs.createReadStream(htmlPath), { filename: 'index.html' })
    tempFiles.push(htmlPath)

    // Para documentos mais pesados (ex.: apresentações longas), aumentamos o tempo
    // máximo que o Chromium no Gotenberg pode esperar antes de considerar timeout.
    // Valor em segundos.
    form.append('waitTimeout', '120')

    if (marginPt != null) {
      // 50pt ≈ 1.76cm; Gotenberg espera número em cm (sem unidade)
      const cm = (marginPt * 0.352778) / 10
      const marginValue = cm.toFixed(2)
      form.append('marginTop', marginValue)
      form.append('marginBottom', marginValue)
      form.append('marginLeft', marginValue)
      form.append('marginRight', marginValue)
    }

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
        // Tempo máximo de espera da requisição HTTP ao Gotenberg (ms)
        timeout: 180000,
      }
    )
    return Buffer.from(gotenbergResp.data)
  } catch (err: unknown) {
    const axErr = err as { code?: string; response?: { status?: number; data?: unknown }; message?: string }
    const details = axErr?.code === 'ECONNREFUSED'
      ? 'Gotenberg não está acessível. Verifique GOTENBERG_URL e se o container está em execução.'
      : axErr?.response?.status
        ? `Gotenberg retornou ${axErr.response.status}`
        : axErr?.message || String(err)
    throw new Error(`Serviço de PDF indisponível: ${details}`)
  } finally {
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
