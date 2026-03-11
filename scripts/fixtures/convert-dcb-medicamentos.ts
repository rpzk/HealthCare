#!/usr/bin/env tsx
/**
 * Script de Conversão: Lista DCB (Denominação Comum Brasileira) - Fevereiro 2025
 * 
 * Fonte: Lista DCB consolidada - ANVISA
 * Arquivo: 1- Lista DCB consolidada fev 2025.xlsx
 * 
 * Uso:
 *   npm run fixtures:convert:dcb
 */

import XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'

const DCB_FILE = '/home/rafael/Desenvolvimento/Fixtures/Medicamentos/1- Lista DCB consolidada fev 2025.xlsx'
const OUTPUT_FILE = '/home/rafael/Desenvolvimento/HealthCare/fixtures/01-master-data/dcb-medicamentos-2025.json'

interface DCBMedicamento {
  codigoCATMAT?: string
  denominacaoComum: string
  principioAtivo: string
  concentracao?: string
  formaFarmaceutica?: string
  apresentacao?: string
  componente: string
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

function loadExcel(filePath: string): any[] {
  console.log('📂 Carregando planilha DCB...')
  const workbook = XLSX.readFile(filePath)
  const sheetName = workbook.SheetNames[0]
  console.log(`   • Planilha: "${sheetName}"`)
  
  const worksheet = workbook.Sheets[sheetName]
  // Usar header: 1 para pegar array de arrays, depois processar
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
  
  // Pular as 2 primeiras linhas (título e cabeçalho)
  const dataRows = rawData.slice(2) as any[][]
  
  console.log(`   ✓ ${dataRows.length} linhas de dados\n`)
  return dataRows
}

function normalizeDCBData(rawData: any[][]): DCBMedicamento[] {
  console.log('🔄 Processando dados DCB...\n')
  
  const medicamentos: DCBMedicamento[] = []
  let processados = 0
  let ignorados = 0
  
  // Estrutura da planilha:
  // [0] = Nº DCB
  // [1] = DENOMINAÇÃO COMUM BRASILEIRA
  // [2] = Nº CAS
  // [3] = CLASSIFICAÇÃO (IFA, INF, BIO, etc)
  // [4] = HISTÓRICO
  
  console.log('📋 Estrutura da planilha:')
  console.log('   [0] Nº DCB')
  console.log('   [1] DENOMINAÇÃO COMUM BRASILEIRA')
  console.log('   [2] Nº CAS')
  console.log('   [3] CLASSIFICAÇÃO')
  console.log('   [4] HISTÓRICO\n')
  
  for (const row of rawData) {
    try {
      const numero = row[0]
      const dcb = row[1]
      const cas = row[2]
      const classificacao = row[3]
      
      // Pular linhas vazias
      if (!dcb || dcb.toString().trim() === '') {
        ignorados++
        continue
      }
      
      const denominacao = dcb.toString().trim()
      
      // Detectar características baseado no nome
      const nomeLower = denominacao.toLowerCase()
      
      // Detectar se é controlado
      const controlado = nomeLower.includes('morfina') ||
                        nomeLower.includes('diazepam') ||
                        nomeLower.includes('clonazepam') ||
                        nomeLower.includes('fenobarbital') ||
                        nomeLower.includes('tramadol') ||
                        nomeLower.includes('midazolam') ||
                        nomeLower.includes('fentanil') ||
                        nomeLower.includes('oxicodona') ||
                        nomeLower.includes('metadona')
      
      // Detectar antimicrobianos
      const antimicrobiano = nomeLower.includes('cilina') || // penicilina, amoxicilina
                            nomeLower.includes('micina') ||  // azitromicina, eritromicina
                            nomeLower.includes('floxacino') || // ciprofloxacino
                            nomeLower.includes('cefalosporina') ||
                            nomeLower.includes('tetraciclina') ||
                            nomeLower.includes('cef') && nomeLower.includes('xona') || // ceftriaxona
                            nomeLower.includes('vancomicina') ||
                            nomeLower.includes('metronidazol')
      
      // Detectar uso hospitalar
      const usoHospitalar = nomeLower.includes('injetável') ||
                           nomeLower.includes(' iv') ||
                           nomeLower.includes('propofol') ||
                           nomeLower.includes('rocurônio') ||
                           nomeLower.includes('atracúrio')
      
      medicamentos.push({
        codigoCATMAT: `DCB${String(numero).padStart(6, '0')}`,
        denominacaoComum: denominacao,
        principioAtivo: denominacao,
        formaFarmaceutica: 'Princípio ativo',  // DCB é lista de princípios ativos, não medicamentos formulados
        componente: 'Básico',
        controlado,
        antimicrobiano,
        altoValor: false,
        usoHospitalar,
        atenBasica: !usoHospitalar,
        atenEspecializada: false,
        atenHospitalar: usoHospitalar,
        farmaciaPopular: !controlado && !usoHospitalar,
        observacoes: `Classificação: ${classificacao || 'N/A'} | CAS: ${cas || 'N/A'}`
      })
      
      processados++
      
      if (processados % 1000 === 0) {
        console.log(`   Processados: ${processados}...`)
      }
      
    } catch (error) {
      ignorados++
    }
  }
  
  console.log(`\n   ✓ ${processados} medicamentos processados`)
  console.log(`   ⚠️  ${ignorados} linhas ignoradas\n`)
  
  return medicamentos
}

async function main() {
  console.log('\n🚀 CONVERTENDO LISTA DCB - FEVEREIRO 2025\n')
  console.log('═'.repeat(80) + '\n')
  
  try {
    // 1. Verificar se arquivo existe
    if (!fs.existsSync(DCB_FILE)) {
      console.error('❌ Arquivo não encontrado:', DCB_FILE)
      process.exit(1)
    }
    
    const stats = fs.statSync(DCB_FILE)
    console.log(`📊 Arquivo: ${(stats.size / 1024).toFixed(0)} KB\n`)
    
    // 2. Carregar Excel
    const rawData = loadExcel(DCB_FILE)
    
    // 3. Normalizar dados
    const medicamentos = normalizeDCBData(rawData)
    
    // 4. Estatísticas
    console.log('📊 ESTATÍSTICAS:\n')
    
    const controlados = medicamentos.filter(m => m.controlado).length
    const antimicrobianos = medicamentos.filter(m => m.antimicrobiano).length
    const comConcentracao = medicamentos.filter(m => m.concentracao).length
    const comForma = medicamentos.filter(m => m.formaFarmaceutica && m.formaFarmaceutica !== 'Não especificada').length
    
    console.log(`   Total de medicamentos: ${medicamentos.length}`)
    console.log(`   Com concentração: ${comConcentracao}`)
    console.log(`   Com forma farmacêutica: ${comForma}`)
    console.log(`   Controlados: ${controlados}`)
    console.log(`   Antimicrobianos: ${antimicrobianos}`)
    console.log('')
    
    // Amostra
    console.log('   📋 Amostra (primeiros 10):')
    medicamentos.slice(0, 10).forEach((m, i) => {
      const tags = []
      if (m.controlado) tags.push('CONTROLADO')
      if (m.antimicrobiano) tags.push('ANTIMICROBIANO')
      const tagStr = tags.length > 0 ? ` [${tags.join(', ')}]` : ''
      console.log(`      ${i + 1}. ${m.denominacaoComum}${m.concentracao ? ' ' + m.concentracao : ''}${tagStr}`)
    })
    console.log('')
    
    // 5. Salvar JSON
    const output = {
      metadata: {
        fonte: 'Lista DCB consolidada - ANVISA - Fevereiro 2025',
        arquivo: '1- Lista DCB consolidada fev 2025.xlsx',
        versao: '2025-02',
        dataConversao: new Date().toISOString(),
        totalMedicamentos: medicamentos.length
      },
      data: medicamentos
    }
    
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2))
    
    console.log('═'.repeat(80))
    console.log('✅ CONVERSÃO CONCLUÍDA!')
    console.log(`   Arquivo salvo: ${OUTPUT_FILE}`)
    console.log(`   Total: ${medicamentos.length} medicamentos`)
    console.log('')
    console.log('🚀 Próximo passo:')
    console.log('   npm run fixtures:import:rename')
    console.log('═'.repeat(80) + '\n')
    
  } catch (error: any) {
    console.error('\n❌ Erro na conversão:', error.message)
    if (error.stack) {
      console.error('\n📋 Stack trace:')
      console.error(error.stack)
    }
    process.exit(1)
  }
}

main()
