#!/usr/bin/env tsx
/**
 * Script de Importação: RENAME 2024
 * 
 * Fonte: Portaria GM/MS nº 6.324, de 26 de dezembro de 2024
 * PDF: https://bvsms.saude.gov.br/bvs/publicacoes/relacao_nacional_medicamentos_2024.pdf
 * Painel: http://ads.saude.gov.br/servlet/mstrWeb?...documentID=642B02B14CCFA8D7D876F3A50C77313B...
 * 
 * IMPORTANTE: Este script importa dados da RENAME 2024 (Relação Nacional de Medicamentos Essenciais).
 * 
 * Estrutura esperada do arquivo fonte (CSV ou JSON):
 * - codigoCATMAT: Código CATMAT (Sistema de Catalogação de Material)
 * - denominacaoComum: DCB - Denominação Comum Brasileira
 * - principioAtivo: Princípio ativo principal
 * - concentracao: Ex: "500 mg"
 * - formaFarmaceutica: Ex: "Comprimido", "Solução injetável"
 * - apresentacao: Ex: "Caixa com 30 comprimidos"
 * - componente: "Básico", "Estratégico", "Especializado"
 * 
 * Uso:
 *   npm run fixtures:import:rename
 */

import { PrismaClient, PrescriptionType } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as fs from 'fs'
import * as path from 'path'

const connectionString = process.env.DATABASE_URL || 'postgresql://healthcare:healthcare123@localhost:5432/healthcare_db'
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const FIXTURES_BASE = path.join(process.cwd(), 'fixtures', '01-master-data')
const RENAME_FILE = path.join(FIXTURES_BASE, 'dcb-medicamentos-2025.json')

interface RENAMEMedicationData {
  codigoCATMAT: string
  denominacaoComum: string
  principioAtivo: string
  concentracao?: string
  formaFarmaceutica: string
  apresentacao?: string
  componente: string // Básico, Estratégico, Especializado
  anexo?: string
  via?: string
  controlado?: boolean
  antimicrobiano?: boolean
  altoValor?: boolean
  usoHospitalar?: boolean
  programaEspecifico?: string
  atenBasica?: boolean
  atenEspecializada?: boolean
  atenHospitalar?: boolean
  farmaciaPopular?: boolean
  observacoes?: string
}

async function main() {
  console.log('\n🚀 IMPORTANDO RENAME 2024 (Relação Nacional de Medicamentos Essenciais)')
  console.log('═'.repeat(80) + '\n')

  try {
    // Verificar se o arquivo existe
    if (!fs.existsSync(RENAME_FILE)) {
      console.log('⚠️  Arquivo RENAME não encontrado:', RENAME_FILE)
      console.log('\n📋 COMO OBTER OS DADOS DA RENAME 2024:\n')
      console.log('   1. Acesse: https://www.gov.br/saude/pt-br/composicao/sectics/rename')
      console.log('   2. Baixe o PDF: https://bvsms.saude.gov.br/bvs/publicacoes/relacao_nacional_medicamentos_2024.pdf')
      console.log('   3. Ou acesse o painel: http://ads.saude.gov.br/servlet/mstrWeb?...')
      console.log('   4. Converta para JSON e salve em:', RENAME_FILE)
      console.log('\n📄 Formato esperado do JSON:')
      console.log(`
{
  "data": [
    {
      "codigoCATMAT": "123456",
      "denominacaoComum": "Paracetamol",
      "principioAtivo": "Paracetamol",
      "concentracao": "500 mg",
      "formaFarmaceutica": "Comprimido",
      "apresentacao": "Caixa com 20 comprimidos",
      "componente": "Básico",
      "atenBasica": true
    }
  ]
}
      `)
      console.log('\n💡 Ou use o script de conversão (ainda não implementado):')
      console.log('   npm run fixtures:convert:rename\n')
      
      process.exit(1)
    }

    // Carregar dados
    console.log('📂 Carregando', RENAME_FILE)
    const rawData = fs.readFileSync(RENAME_FILE, 'utf-8')
    const renameData: { data: RENAMEMedicationData[] } = JSON.parse(rawData)
    
    console.log(`   ✓ ${renameData.data.length} medicamentos carregados\n`)

    // Importar medicamentos RENAME em Medication (tabela unificada)
    console.log('💊 Importando medicamentos RENAME em Medication...')
    
    let imported = 0
    let updated = 0
    let errors = 0
    
    for (const med of renameData.data) {
      try {
        const pt: PrescriptionType = med.controlado
          ? PrescriptionType.CONTROLLED_C1
          : med.antimicrobiano
            ? PrescriptionType.ANTIMICROBIAL
            : PrescriptionType.SIMPLE

        const data = {
          name: med.denominacaoComum,
          synonym: med.principioAtivo,
          strength: med.concentracao,
          form: med.formaFarmaceutica,
          route: med.via,
          prescriptionType: pt,
          basicPharmacy: med.atenBasica || false,
          popularPharmacy: med.farmaciaPopular || false,
          hospitalPharmacy: med.atenHospitalar || false,
          componente: med.componente,
          apresentacao: med.apresentacao,
          controlado: med.controlado || false,
          antimicrobiano: med.antimicrobiano || false,
          altoValor: med.altoValor || false,
          usoHospitalar: med.usoHospitalar || false,
          programaEspecifico: med.programaEspecifico,
          atenEspecializada: med.atenEspecializada || false,
          observations: med.observacoes,
        }

        if (med.codigoCATMAT) {
          const existing = await prisma.medication.findFirst({
            where: { codigoCATMAT: med.codigoCATMAT },
          })
          if (existing) {
            await prisma.medication.update({
              where: { id: existing.id },
              data: { ...data, codigoCATMAT: med.codigoCATMAT },
            })
            updated++
          } else {
            await prisma.medication.create({
              data: { ...data, codigoCATMAT: med.codigoCATMAT },
            })
            imported++
          }
        } else {
          await prisma.medication.create({ data })
          imported++
        }
        
        const total = imported + updated
        if (total % 100 === 0) {
          console.log(`   Progresso: ${total}/${renameData.data.length}`)
        }
      } catch (error: any) {
        errors++
        if (errors <= 5) {
          console.warn(`   ⚠️ Erro ao importar ${med.denominacaoComum}:`, error.message?.substring(0, 100))
        }
      }
    }
    
    console.log(`   ✓ ${imported} criados, ${updated} atualizados`)
    if (errors > 0) {
      console.log(`   ⚠️  ${errors} erros encontrados\n`)
    } else {
      console.log('')
    }

    // Estatísticas (Medication com codigoCATMAT = RENAME)
    console.log('═'.repeat(80))
    console.log('📊 ESTATÍSTICAS RENAME (Medication)\n')
    
    const whereRename = { codigoCATMAT: { not: null } }
    const total = await prisma.medication.count({ where: whereRename })
    const basico = await prisma.medication.count({ where: { ...whereRename, componente: 'Básico' } })
    const estrategico = await prisma.medication.count({ where: { ...whereRename, componente: 'Estratégico' } })
    const especializado = await prisma.medication.count({ where: { ...whereRename, componente: 'Especializado' } })
    const controlados = await prisma.medication.count({ where: { ...whereRename, controlado: true } })
    const antimicrobianos = await prisma.medication.count({ where: { ...whereRename, antimicrobiano: true } })
    
    console.log('   Total importado:', total)
    console.log('')
    console.log('   Por componente:')
    console.log('   • Básico:', basico)
    console.log('   • Estratégico:', estrategico)
    console.log('   • Especializado:', especializado)
    console.log('')
    console.log('   Características:')
    console.log('   • Controlados:', controlados)
    console.log('   • Antimicrobianos:', antimicrobianos)
    console.log('')
    
    console.log('═'.repeat(80))
    console.log('✅ RENAME 2024 IMPORTADA COM SUCESSO!')
    console.log('═'.repeat(80) + '\n')

  } catch (error) {
    console.error('\n❌ Erro na importação:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main()
