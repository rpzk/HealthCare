#!/usr/bin/env tsx
/**
 * Script de Download e Conversão: RENAME 2024 Completa
 * 
 * Baixa o PDF oficial da RENAME 2024 e extrai todos os medicamentos
 * 
 * Fonte: https://bvsms.saude.gov.br/bvs/publicacoes/relacao_nacional_medicamentos_2024.pdf
 * Portaria: GM/MS nº 6.324, de 26/12/2024
 * 
 * Uso:
 *   npm run fixtures:convert:rename
 */

import * as fs from 'fs'
import * as path from 'path'
import https from 'https'
import pdf from 'pdf-parse'

const RENAME_PDF_URL = 'https://bvsms.saude.gov.br/bvs/publicacoes/relacao_nacional_medicamentos_2024.pdf'
const FIXTURES_BASE = '/home/rafael/Desenvolvimento/HealthCare/fixtures/01-master-data'
const PDF_PATH = path.join(FIXTURES_BASE, 'rename-2024.pdf')
const JSON_OUTPUT = path.join(FIXTURES_BASE, 'rename-2024-full.json')

interface ParsedMedication {
  codigoCATMAT: string
  denominacaoComum: string
  principioAtivo: string
  concentracao?: string
  formaFarmaceutica: string
  apresentacao?: string
  componente: string
  anexo?: string
  via?: string
  controlado: boolean
  antimicrobiano: boolean
  altoValor: boolean
  usoHospitalar: boolean
  programaEspecifico?: string
  atenBasica: boolean
  atenEspecializada: boolean
  atenHospitalar: boolean
  farmaciaPopular: boolean
  observacoes?: string
}

async function downloadPDF(): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('📥 Baixando RENAME 2024 PDF...')
    console.log('   URL:', RENAME_PDF_URL)
    
    const file = fs.createWriteStream(PDF_PATH)
    
    https.get(RENAME_PDF_URL, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file)
        
        file.on('finish', () => {
          file.close()
          const stats = fs.statSync(PDF_PATH)
          console.log(`   ✓ PDF baixado: ${(stats.size / 1024 / 1024).toFixed(2)} MB\n`)
          resolve()
        })
      } else if (response.statusCode === 302 || response.statusCode === 301) {
        // Redirect
        const redirectUrl = response.headers.location
        if (redirectUrl) {
          console.log('   → Redirecionando para:', redirectUrl)
          https.get(redirectUrl, (redirectResponse) => {
            redirectResponse.pipe(file)
            file.on('finish', () => {
              file.close()
              const stats = fs.statSync(PDF_PATH)
              console.log(`   ✓ PDF baixado: ${(stats.size / 1024 / 1024).toFixed(2)} MB\n`)
              resolve()
            })
          }).on('error', reject)
        } else {
          reject(new Error('Redirect sem location'))
        }
      } else {
        reject(new Error(`HTTP ${response.statusCode}`))
      }
    }).on('error', (err) => {
      fs.unlinkSync(PDF_PATH)
      reject(err)
    })
  })
}

async function parsePDF(): Promise<string> {
  console.log('📄 Extraindo texto do PDF...')
  
  const dataBuffer = fs.readFileSync(PDF_PATH)
  const data = await pdf(dataBuffer)
  
  console.log(`   ✓ ${data.numpages} páginas extraídas`)
  console.log(`   ✓ ${data.text.length.toLocaleString()} caracteres\n`)
  
  return data.text
}

function parseMedications(text: string): ParsedMedication[] {
  console.log('💊 Parseando medicamentos...\n')
  
  const medications: ParsedMedication[] = []
  
  // Estratégia: A RENAME tem estrutura por componentes
  // Componente Básico / Estratégico / Especializado
  // Cada medicamento tem: DCB, forma, concentração, apresentação
  
  // Padrões comuns na RENAME:
  // - Linhas com código CATMAT (números)
  // - DCB (MAIÚSCULAS ou Primeira Maiúscula)
  // - Forma farmacêutica (comprimido, cápsula, solução, etc)
  // - Concentração (mg, g, UI, %, etc)
  
  const lines = text.split('\n')
  let currentComponent = ''
  let currentAnexo = ''
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Detectar componente
    if (line.includes('COMPONENTE BÁSICO')) {
      currentComponent = 'Básico'
      continue
    }
    if (line.includes('COMPONENTE ESTRATÉGICO')) {
      currentComponent = 'Estratégico'
      continue
    }
    if (line.includes('COMPONENTE ESPECIALIZADO')) {
      currentComponent = 'Especializado'
      continue
    }
    
    // Detectar anexo
    if (line.match(/ANEXO\s+[IVX]+/i)) {
      currentAnexo = line.match(/ANEXO\s+([IVX]+)/i)?.[1] || ''
      continue
    }
    
    // Tentar identificar medicamento
    // Padrão: pode começar com número (CATMAT) ou DCB direto
    // Exemplo: "123456 Paracetamol 500 mg Comprimido"
    // Ou: "Paracetamol 500 mg Comprimido"
    
    const medicamentoMatch = line.match(/^(\d{6})?\s*([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç\s\-\(\)\/\+]+)/)
    
    if (medicamentoMatch && line.length > 20) {
      const catmat = medicamentoMatch[1] || `AUTO${String(medications.length + 1).padStart(6, '0')}`
      const resto = medicamentoMatch[2].trim()
      
      // Tentar extrair componentes
      const concentracaoMatch = resto.match(/(\d+(?:[.,]\d+)?)\s*(mg|g|mL|UI|%|mcg)/i)
      const formaMatch = resto.match(/(comprimido|cápsula|solução|suspensão|injetável|ampola|frasco|pomada|creme|gel|xarope)/i)
      
      if (formaMatch) {
        medications.push({
          codigoCATMAT: catmat,
          denominacaoComum: resto.split(/\d/)[0].trim(),
          principioAtivo: resto.split(/\d/)[0].trim(),
          concentracao: concentracaoMatch ? concentracaoMatch[0] : undefined,
          formaFarmaceutica: formaMatch[1],
          componente: currentComponent || 'Básico',
          anexo: currentAnexo || undefined,
          controlado: line.toLowerCase().includes('controlad') || line.includes('Lista '),
          antimicrobiano: line.toLowerCase().includes('antimicrobiano') || line.toLowerCase().includes('antibiótico'),
          altoValor: currentComponent === 'Especializado',
          usoHospitalar: line.toLowerCase().includes('hospital'),
          atenBasica: currentComponent === 'Básico',
          atenEspecializada: currentComponent === 'Estratégico' || currentComponent === 'Especializado',
          atenHospitalar: line.toLowerCase().includes('hospital'),
          farmaciaPopular: currentComponent === 'Básico'
        })
      }
    }
  }
  
  return medications
}

async function main() {
  console.log('\n🚀 CONVERTENDO RENAME 2024 COMPLETA\n')
  console.log('═'.repeat(80) + '\n')
  
  try {
    // 1. Baixar PDF (se não existir)
    if (!fs.existsSync(PDF_PATH)) {
      await downloadPDF()
    } else {
      console.log('✓ PDF já existe, pulando download\n')
    }
    
    // 2. Extrair texto
    const text = await parsePDF()
    
    // 3. Parsear medicamentos
    const medications = parseMedications(text)
    
    console.log('📊 RESULTADO:\n')
    console.log(`   Total de medicamentos extraídos: ${medications.length}`)
    console.log('')
    
    // Estatísticas
    const basico = medications.filter(m => m.componente === 'Básico').length
    const estrategico = medications.filter(m => m.componente === 'Estratégico').length
    const especializado = medications.filter(m => m.componente === 'Especializado').length
    
    console.log('   Por componente:')
    console.log('   • Básico:', basico)
    console.log('   • Estratégico:', estrategico)
    console.log('   • Especializado:', especializado)
    console.log('')
    
    // Mostrar amostra
    console.log('   📋 Amostra (primeiros 5):')
    medications.slice(0, 5).forEach((m, i) => {
      console.log(`      ${i + 1}. ${m.denominacaoComum} ${m.concentracao || ''} - ${m.formaFarmaceutica}`)
    })
    console.log('')
    
    // 4. Salvar JSON
    const output = {
      metadata: {
        fonte: 'RENAME 2024 - Portaria GM/MS nº 6.324, de 26/12/2024',
        url: RENAME_PDF_URL,
        versao: '2024',
        dataExtracao: new Date().toISOString(),
        totalMedicamentos: medications.length
      },
      data: medications
    }
    
    fs.writeFileSync(JSON_OUTPUT, JSON.stringify(output, null, 2))
    
    console.log('═'.repeat(80))
    console.log('✅ CONVERSÃO CONCLUÍDA!')
    console.log(`   Arquivo salvo: ${JSON_OUTPUT}`)
    console.log(`   Total: ${medications.length} medicamentos`)
    console.log('')
    console.log('🚀 Próximo passo:')
    console.log('   npm run fixtures:import:rename')
    console.log('═'.repeat(80) + '\n')
    
    // Se extraiu poucos, avisar
    if (medications.length < 100) {
      console.log('⚠️  ATENÇÃO: Foram extraídos apenas', medications.length, 'medicamentos.')
      console.log('   O PDF pode ter estrutura diferente do esperado.')
      console.log('   Considere extração manual ou ajuste do parser.\n')
    }
    
  } catch (error: any) {
    console.error('\n❌ Erro na conversão:', error.message)
    console.error('\n💡 ALTERNATIVA: Extração manual')
    console.error('   1. Acesse: https://www.gov.br/saude/pt-br/composicao/sectics/rename')
    console.error('   2. Baixe o PDF oficial')
    console.error('   3. Use ferramenta online para converter PDF → Excel')
    console.error('   4. Converta Excel → JSON manualmente')
    console.error('   5. Salve em:', JSON_OUTPUT)
    console.error('')
    process.exit(1)
  }
}

main()
