/**
 * Test PAdES signing com certificado A1 real
 * 
 * Uso: npx tsx scripts/test-pades-signing.ts
 */

import { signPdfWithNodeForge } from '@/lib/pades-nodeforge-signer'
import fs from 'fs'
import path from 'path'

async function main() {
  console.log('🔐 TESTE DE ASSINATURA DIGITAL PADES')
  console.log('=====================================\n')

  // Caminhos
  const certPath = path.join(process.cwd(), 'meucertificado.p12')
  const testPdfPath = path.join(process.cwd(), 'ssf/Fixtures/SOAP - Unassus.pdf')
  const outputPath = path.join(process.cwd(), 'scripts', 'sample-signed.pdf')

  // Verificar certificado
  if (!fs.existsSync(certPath)) {
    console.error('❌ Certificado não encontrado em:', certPath)
    process.exit(1)
  }
  console.log('✅ Certificado encontrado:', certPath)

  // Criar um PDF de teste válido se não existir
  if (!fs.existsSync(testPdfPath)) {
    console.log('\n❌ PDF de teste não encontrado em:', testPdfPath)
    process.exit(1)
  }
  console.log('\n📄 Usando PDF existente para teste')

  const pdfBuffer = fs.readFileSync(testPdfPath)
  console.log('\n📊 Dados do teste:')
  console.log(`  - Tamanho do PDF: ${pdfBuffer.length} bytes`)
  console.log(`  - Certificado: ${certPath.split('/').pop()}`)

  // Executar assinatura
  console.log('\n🔏 Assinando PDF...')
  
  try {
    const result = await signPdfWithNodeForge(
      pdfBuffer,
      certPath,
      'r',
      {
        reason: 'Teste de Assinatura Digital',
        location: 'Brasil',
        contactInfo: 'test@example.com',
      }
    )

    console.log('\n✅ PDF ASSINADO COM SUCESSO!\n')
    console.log('📋 Informações da assinatura:')
    console.log(`  Subject: ${result.certificateInfo.subject}`)
    console.log(`  Issuer: ${result.certificateInfo.issuer}`)
    console.log(`  Serial: ${result.certificateInfo.serialNumber}`)
    console.log(`  Valid From: ${result.certificateInfo.validFrom}`)
    console.log(`  Valid To: ${result.certificateInfo.validTo}`)
    console.log(`  Signed At: ${result.signedAt}`)

    // Salvar PDF assinado
    fs.writeFileSync(outputPath, result.signedPdf)
    console.log(`\n📁 PDF assinado salvo em: ${outputPath}`)
    console.log(`  Tamanho: ${result.signedPdf.length} bytes`)
    console.log(`  Aumento: ${result.signedPdf.length - pdfBuffer.length} bytes (assinatura + metadados)`)

    console.log('\n✨ PRÓXIMOS PASSOS:')
    console.log('  1. Abra o PDF em um leitor (Adobe Reader, etc)')
    console.log('  2. Procure a aba "Assinaturas"')
    console.log('  3. Você deve ver a assinatura digital listada')
    console.log('  4. Envie para validação em: https://validar.iti.gov.br/')
    console.log('\n')

  } catch (error) {
    console.error('\n❌ ERRO ao assinar PDF:')
    console.error(error)
    process.exit(1)
  }
}

main()
