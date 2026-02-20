/**
 * Adiciona DocTimeStamp (carimbo de tempo RFC 3161) ao PDF assinado.
 * Conformidade PAdES-T / PAdES-LTV para validação de longo prazo.
 *
 * O token de tempo é incorporado como uma assinatura de tipo DocTimeStamp
 * (SubFilter ETSI.RFC3161), em uma nova revisão incremental do PDF.
 */

import { logger } from '@/lib/logger'

/**
 * Encontra o último trailer do PDF e extrai /Root e /Prev.
 * Procura de trás para frente a partir do último %%EOF.
 */
function parseLastTrailer(pdfBuffer: Buffer): { root: string; prev: string } | null {
  const str = pdfBuffer.toString('binary')
  const eofIndex = str.lastIndexOf('%%EOF')
  if (eofIndex === -1) return null

  const afterEof = str.substring(eofIndex)
  const beforeEof = str.substring(0, eofIndex)
  const startxrefIdx = beforeEof.lastIndexOf('startxref')
  if (startxrefIdx === -1) return null
  const afterStartxref = beforeEof.substring(startxrefIdx + 9)
  const prevMatch = afterStartxref.match(/\s*(\d+)\s*/)
  if (!prevMatch) return null
  const prev = prevMatch[1]
  const beforeStartxref = beforeEof.substring(0, startxrefIdx)
  const trailerIdx = beforeStartxref.lastIndexOf('trailer')
  if (trailerIdx === -1) return null
  const afterTrailer = beforeStartxref.substring(trailerIdx + 7)
  const dictStart = afterTrailer.indexOf('<<')
  if (dictStart === -1) return null
  let depth = 0
  let end = -1
  for (let i = dictStart; i < afterTrailer.length; i++) {
    if (afterTrailer[i] === '<' && afterTrailer[i + 1] === '<') {
      depth++
      i++
    } else if (afterTrailer[i] === '>' && afterTrailer[i + 1] === '>') {
      depth--
      if (depth === 0) {
        end = i
        break
      }
      i++
    }
  }
  if (end === -1) return null
  const trailerDict = afterTrailer.substring(dictStart, end + 2)
  const rootMatch = trailerDict.match(/\/Root\s*(\d+)\s+(\d+)\s+R/)
  if (!rootMatch) return null
  const root = `${rootMatch[1]} ${rootMatch[2]} R`
  return { root, prev }
}

/**
 * Escapa caracteres para string hexadecimal no PDF (Contents).
 */
function bufferToHexContents(token: Buffer): string {
  return token.toString('hex').toUpperCase()
}

/**
 * Anexa uma revisão incremental ao PDF com uma assinatura DocTimeStamp.
 * ByteRange cobre todo o PDF original (bytes 0 até pdfBuffer.length).
 * O token RFC 3161 é colocado em /Contents.
 *
 * @param pdfBuffer PDF já assinado (PAdES-B)
 * @param timestampToken Token retornado pela TSA (RFC 3161 TimeStampToken / ContentInfo)
 * @returns Buffer do PDF com DocTimeStamp anexado
 */
export function appendDocTimeStampToPdf(
  pdfBuffer: Buffer,
  timestampToken: Buffer
): Buffer {
  const trailer = parseLastTrailer(pdfBuffer)
  if (!trailer) {
    logger.warn('[DocTimeStamp] Não foi possível parsear trailer do PDF; anexando com valores padrão')
  }

  const rootRef = trailer?.root ?? '1 0 R'
  const prevRef = trailer?.prev ?? '0'
  const contentLength = pdfBuffer.length

  const hexContents = bufferToHexContents(timestampToken)
  // Objeto de assinatura DocTimeStamp (object number alto para não colidir com o documento)
  const sigObjNum = 999
  const sigDict = [
    `<< /Type /Sig /SubFilter /ETSI.RFC3161`,
    `/ByteRange [0 ${contentLength}]`,
    `/Contents <${hexContents}>`,
    `/Filter /Adobe.PPKLite`,
    `/Name (DocTimeStamp)`,
    `/M (D:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z) >>`
  ].join('\n')

  const sigObject = `${sigObjNum} 0 obj\n${sigDict}\nendobj\n`
  const sigObjectOffset = pdfBuffer.length

  const xrefContent = [
    'xref',
    '0 1',
    '0000000000 65535 f ',
    `${String(sigObjectOffset).padStart(10, '0')} 00000 n `,
    '',
    `trailer << /Size 2 /Prev ${prevRef} /Root ${rootRef} >>`,
    'startxref',
    String(pdfBuffer.length + sigObject.length),
    '%%EOF'
  ].join('\n')

  return Buffer.concat([
    pdfBuffer,
    Buffer.from(sigObject, 'binary'),
    Buffer.from(xrefContent, 'binary')
  ])
}
