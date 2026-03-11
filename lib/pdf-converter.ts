/**
 * Conversor HTML→PDF com fallback em camadas (enterprise)
 *
 * Ordem de tentativa:
 * 1. Gotenberg primário (GOTENBERG_URL)
 * 2. Gotenberg secundário (GOTENBERG_URL_SECONDARY) — se definido
 * 3. Puppeteer local (PDF_FALLBACK_PUPPETEER !== 'false')
 *
 * Todos os backends usam Chromium — PDFs compatíveis com assinatura PAdES.
 */

import fs from 'fs'
import path from 'path'
import FormData from 'form-data'
import axios from 'axios'
import { logger } from '@/lib/logger'

const GOTENBERG_PRIMARY = process.env.GOTENBERG_URL || 'http://gotenberg:3000'
const GOTENBERG_SECONDARY = process.env.GOTENBERG_URL_SECONDARY
const PUPPETEER_FALLBACK_ENABLED = process.env.PDF_FALLBACK_PUPPETEER === 'true'

export interface HtmlToPdfOptions {
  customCss?: string
  /** Margens em pt (50pt ≈ 17.6mm). Padrão: sem margem explícita (Gotenberg default). */
  marginPt?: number
  /** Timeout em ms. Padrão: 120000. */
  timeoutMs?: number
}

const DEFAULT_TIMEOUT = 120_000

async function convertViaGotenberg(
  html: string,
  baseUrl: string,
  opts: HtmlToPdfOptions
): Promise<Buffer> {
  const tempPath = path.join('/tmp', `pdf-${Date.now()}-${Math.random().toString(36).slice(2)}.html`)
  try {
    let content = html
    if (opts.customCss) {
      content = content.replace('</head>', `<style>${opts.customCss}</style></head>`)
    }
    fs.writeFileSync(tempPath, content)

    const form = new FormData()
    form.append('files', fs.createReadStream(tempPath), { filename: 'index.html' })
    form.append('waitTimeout', '120')
    form.append('printBackground', 'true')

    if (opts.marginPt != null) {
      const cm = (opts.marginPt * 0.352778) / 10
      const m = cm.toFixed(2)
      form.append('marginTop', m)
      form.append('marginBottom', m)
      form.append('marginLeft', m)
      form.append('marginRight', m)
    }

    const resp = await axios.post(
      `${baseUrl}/forms/chromium/convert/html`,
      form,
      {
        headers: form.getHeaders(),
        responseType: 'arraybuffer',
        maxContentLength: 20 * 1024 * 1024,
        maxBodyLength: 20 * 1024 * 1024,
        timeout: opts.timeoutMs ?? DEFAULT_TIMEOUT,
      }
    )
    return Buffer.from(resp.data)
  } finally {
    try {
      fs.unlinkSync(tempPath)
    } catch {
      /* ignore */
    }
  }
}

async function convertViaPuppeteer(
  html: string,
  opts: HtmlToPdfOptions
): Promise<Buffer> {
  const puppeteer = await import('puppeteer')
  const browser = await puppeteer.default.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  })
  try {
    const page = await browser.newPage()
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: opts.timeoutMs ?? DEFAULT_TIMEOUT,
    })

    const pdfOpts: Record<string, unknown> = {
      format: 'A4',
      printBackground: true,
    }
    if (opts.marginPt != null) {
      const marginMm = opts.marginPt * 0.352778
      pdfOpts.margin = {
        top: `${marginMm}mm`,
        right: `${marginMm}mm`,
        bottom: `${marginMm}mm`,
        left: `${marginMm}mm`,
      }
    }

    const pdf = await page.pdf(pdfOpts)
    return Buffer.from(pdf)
  } finally {
    await browser.close().catch(() => {})
  }
}

/**
 * Converte HTML em PDF usando fallback em camadas.
 * Lança erro somente se todos os backends falharem.
 */
export async function convertHtmlToPdfWithFallback(
  html: string,
  opts: HtmlToPdfOptions = {}
): Promise<Buffer> {
  const errors: Array<{ backend: string; err: unknown }> = []

  // 1. Gotenberg primário
  try {
    const buf = await convertViaGotenberg(html, GOTENBERG_PRIMARY, opts)
    logger.debug({ size: buf.length }, '[PDF] Gerado via Gotenberg primário')
    return buf
  } catch (err) {
    errors.push({ backend: 'Gotenberg (primary)', err })
    logger.warn({ err }, '[PDF] Gotenberg primário falhou, tentando fallback')
  }

  // 2. Gotenberg secundário (se configurado)
  if (GOTENBERG_SECONDARY) {
    try {
      const buf = await convertViaGotenberg(html, GOTENBERG_SECONDARY, opts)
      logger.info({ size: buf.length }, '[PDF] Gerado via Gotenberg secundário (fallback)')
      return buf
    } catch (err) {
      errors.push({ backend: 'Gotenberg (secondary)', err })
      logger.warn({ err }, '[PDF] Gotenberg secundário falhou')
    }
  }

  // 3. Puppeteer (se habilitado)
  if (PUPPETEER_FALLBACK_ENABLED) {
    try {
      const buf = await convertViaPuppeteer(html, opts)
      logger.info({ size: buf.length }, '[PDF] Gerado via Puppeteer (fallback)')
      return buf
    } catch (err) {
      errors.push({ backend: 'Puppeteer', err })
      logger.warn({ err }, '[PDF] Puppeteer fallback falhou')
    }
  } else {
    logger.debug('[PDF] Puppeteer fallback desabilitado (defina PDF_FALLBACK_PUPPETEER=true para habilitar)')
  }

  const msg = errors
    .map((e) => `${e.backend}: ${e.err instanceof Error ? e.err.message : String(e.err)}`)
    .join('; ')
  throw new Error(`Serviço de PDF indisponível. Falhas: ${msg}`)
}
