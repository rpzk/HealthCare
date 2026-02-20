/**
 * Inspeciona um PDF assinado (prescrição) para diagnóstico de validação no ITI.
 * Uso: npx ts-node scripts/inspect-prescription-pdf.ts <caminho-do-pdf>
 * Ex.: npx ts-node scripts/inspect-prescription-pdf.ts uploads/documents/prescription/cml70rpxd001201o6wfot5qr3.pdf
 */

import * as fs from 'fs'
import * as path from 'path'

const pdfPath = process.argv[2]
if (!pdfPath) {
  console.error('Uso: npx ts-node scripts/inspect-prescription-pdf.ts <caminho-do-pdf>')
  process.exit(1)
}

const fullPath = path.isAbsolute(pdfPath) ? pdfPath : path.join(process.cwd(), pdfPath)
if (!fs.existsSync(fullPath)) {
  console.error('Arquivo não encontrado:', fullPath)
  process.exit(1)
}

const buf = fs.readFileSync(fullPath)
const str = buf.toString('binary')

console.log('=== Inspeção do PDF assinado ===')
console.log('Arquivo:', fullPath)
console.log('Tamanho total:', buf.length, 'bytes')
console.log('')

// /Type /Sig
const hasSig = /\/Type\s*\/Sig/.test(str)
console.log('Contém /Type /Sig:', hasSig)

// /SubFilter
const subFilterMatch = str.match(/\/SubFilter\s*\/([^\s\/\]]+)/)
console.log('SubFilter:', subFilterMatch ? subFilterMatch[1] : '(não encontrado)')

// /ByteRange
const byteRangeMatch = str.match(/\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/)
if (byteRangeMatch) {
  const [, a, b, c, d] = byteRangeMatch.map(Number)
  const sum = a + b + c + d
  const ok = sum === buf.length
  console.log('ByteRange:', [a, b, c, d])
  console.log('  Soma dos intervalos:', sum, '| Tamanho do arquivo:', buf.length, '| Consistente:', ok ? 'SIM' : 'NÃO')
} else {
  console.log('ByteRange: (não encontrado)')
}

// /Contents
const contentsMatch = str.match(/\/Contents\s*<([0-9A-Fa-f]+)>/)
if (contentsMatch) {
  const hexLen = contentsMatch[1].length
  const byteLen = Math.floor(hexLen / 2)
  console.log('Contents (hex):', hexLen, 'caracteres =', byteLen, 'bytes')
} else {
  console.log('Contents: (não encontrado)')
}

// /Filter
const filterMatch = str.match(/\/Filter\s*\/([^\s\/\]]+)/)
console.log('Filter:', filterMatch ? filterMatch[1] : '(não encontrado)')

console.log('')
console.log('Para validar no ITI: baixe o PDF pelo botão "Ver PDF" e envie em validar.iti.gov.br.')
console.log('Se falhar, tente definir PADES_SUBFILTER=adbe no .env e assinar uma nova prescrição.')
