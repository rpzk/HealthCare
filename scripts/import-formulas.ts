/**
 * Script de Importação de Fórmulas Magistrais
 * 
 * Importa fórmulas dos CSVs em ssf/Receitas/ para o banco de dados
 * 
 * Uso: npx ts-node scripts/import-formulas.ts
 * Ou:  npx tsx scripts/import-formulas.ts
 */

import { PrismaClient, Prisma } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// Mapeamento de arquivos para categorias completas
const categoryMap: Record<string, string> = {
  '01_Endocrinologia_Metabolismo.csv': 'Endocrinologia e Metabolismo',
  '02_Gastrointestinal_Microbiota.csv': 'Gastrointestinal e Microbiota',
  '03_Neurologia_SaudeMental.csv': 'Neurologia e Saúde Mental',
  '04_Mitocondria_Cardio_Imuno.csv': 'Mitocôndria, Cardio e Imunologia',
  '05_Detox_Drenagem.csv': 'Detox e Drenagem',
  '06_Dermatologia_Estetica.csv': 'Dermatologia e Estética',
}

interface FormulaCSV {
  categoria: string
  nome: string
  ingredientes: string
  forma: string
  posologia: string
  notas: string
}

/**
 * Parse de uma linha CSV (considerando ; como separador)
 */
function parseCSVLine(line: string): string[] {
  const parts: string[] = []
  let current = ''
  let inQuotes = false

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ';' && !inQuotes) {
      parts.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  parts.push(current.trim())

  return parts
}

/**
 * Lê e parseia um arquivo CSV
 */
function parseCSVFile(filePath: string): FormulaCSV[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').filter(line => line.trim())
  
  // Pula o cabeçalho
  const dataLines = lines.slice(1)
  
  return dataLines.map(line => {
    const parts = parseCSVLine(line)
    return {
      categoria: parts[0] || '',
      nome: parts[1] || '',
      ingredientes: parts[2] || '',
      forma: parts[3] || '',
      posologia: parts[4] || '',
      notas: parts[5] || '',
    }
  }).filter(f => f.nome) // Remove linhas vazias
}

/**
 * Converte FormulaCSV para formato Prisma
 */
function toFormulaTemplate(csv: FormulaCSV, fullCategory: string): Prisma.FormulaTemplateCreateInput {
  return {
    name: csv.nome,
    category: fullCategory,
    ingredients: csv.ingredientes,
    form: csv.forma,
    dosage: csv.posologia,
    notes: csv.notas || null,
    source: 'CSV - SSF/Receitas',
    pharmacy: 'Manipulação',
  }
}

/**
 * Importa todas as fórmulas dos CSVs
 */
async function importAllFormulas(): Promise<void> {
  const receitasDir = path.join(process.cwd(), 'ssf', 'Receitas')
  
  console.log('🧪 Iniciando importação de fórmulas magistrais...\n')
  
  let totalCreated = 0
  let totalUpdated = 0
  let totalErrors = 0
  
  for (const [filename, fullCategory] of Object.entries(categoryMap)) {
    const filePath = path.join(receitasDir, filename)
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Arquivo não encontrado: ${filename}`)
      continue
    }
    
    console.log(`📁 Processando: ${filename}`)
    
    const formulas = parseCSVFile(filePath)
    console.log(`   Encontradas ${formulas.length} fórmulas`)
    
    for (const csv of formulas) {
      try {
        const data = toFormulaTemplate(csv, fullCategory)
        
        // Verifica se já existe
        const existing = await prisma.formulaTemplate.findFirst({
          where: {
            name: data.name,
            category: data.category,
          },
        })
        
        if (existing) {
          await prisma.formulaTemplate.update({
            where: { id: existing.id },
            data,
          })
          totalUpdated++
          console.log(`   ✏️  Atualizado: ${data.name}`)
        } else {
          await prisma.formulaTemplate.create({ data })
          totalCreated++
          console.log(`   ✅ Criado: ${data.name}`)
        }
      } catch (error) {
        totalErrors++
        console.log(`   ❌ Erro: ${csv.nome} - ${error}`)
      }
    }
    
    console.log('')
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅ Criadas: ${totalCreated} fórmulas`)
  console.log(`✏️  Atualizadas: ${totalUpdated} fórmulas`)
  console.log(`❌ Erros: ${totalErrors}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

/**
 * Adiciona fórmulas extras do guia PDF (as mais importantes)
 */
async function importPDFFormulas(): Promise<void> {
  console.log('\n📚 Importando fórmulas do guia PDF...\n')
  
  // Fórmulas extraídas do guia-magistral.pdf
  const pdfFormulas: Prisma.FormulaTemplateCreateInput[] = [
    {
      name: 'Ômega 3 Ultra Concentrado',
      category: 'Cardiovascular',
      ingredients: 'Óleo de peixe concentrado 1000mg (EPA 600mg + DHA 400mg)',
      form: 'Cápsula Oleosa',
      dosage: '1-2 cápsulas ao dia, preferencialmente com refeições',
      notes: 'Alta concentração EPA/DHA. Livre de metais pesados.',
      indications: 'Hipertrigliceridemia, proteção cardiovascular, anti-inflamatório',
      contraindications: 'Alergia a peixe, distúrbios de coagulação sem acompanhamento',
      sideEffects: 'Eructação, gosto de peixe, desconforto gástrico',
      monitoring: 'Perfil lipídico a cada 3 meses',
      source: 'PDF - Guia Magistral Singularis',
      pharmacy: 'Singularis',
    },
    {
      name: 'Natoquinase Cardiovascular',
      category: 'Cardiovascular',
      ingredients: 'Natoquinase 100mg (2000 FU)',
      form: 'Cápsula',
      dosage: '1 cápsula ao dia, longe das refeições',
      notes: 'Enzima fibrinolítica natural. Não usar com anticoagulantes.',
      indications: 'Prevenção de trombose, melhora da circulação',
      contraindications: 'Uso de anticoagulantes, pré-operatório, distúrbios hemorrágicos',
      sideEffects: 'Raros. Possível sangramento em doses altas.',
      monitoring: 'Coagulograma se uso prolongado',
      source: 'PDF - Guia Magistral Singularis',
      pharmacy: 'Singularis',
    },
    {
      name: 'Curcumina Biodisponível',
      category: 'Anti-inflamatório',
      ingredients: 'Curcumina 95% 500mg | Piperina 5mg',
      form: 'Cápsula',
      dosage: '1 cápsula 2x ao dia, com refeições',
      notes: 'Piperina aumenta biodisponibilidade em até 2000%',
      indications: 'Anti-inflamatório, antioxidante, dores articulares, neuroproteção',
      contraindications: 'Obstrução biliar, cálculos biliares',
      sideEffects: 'Desconforto gástrico em doses altas',
      source: 'PDF - Guia Magistral',
      pharmacy: 'Manipulação',
    },
    {
      name: 'Condroprotetor Completo',
      category: 'Ortopedia',
      ingredients: 'Glucosamina sulfato 1500mg | Condroitina sulfato 1200mg | MSM 500mg | Colágeno tipo II 40mg',
      form: 'Sachê ou Cápsula',
      dosage: '1 dose ao dia, preferencialmente em jejum',
      notes: 'Para regeneração da cartilagem. Resultados em 8-12 semanas.',
      indications: 'Artrose, artrite, desgaste articular, condromalácia',
      contraindications: 'Alergia a frutos do mar (glucosamina)',
      sideEffects: 'Desconforto gástrico, flatulência',
      duration: 'Mínimo 3 meses contínuos',
      monitoring: 'Avaliação clínica mensal',
      source: 'PDF - Guia Magistral',
      pharmacy: 'Manipulação',
    },
    {
      name: 'Adaptógeno Premium',
      category: 'Neurologia e Saúde Mental',
      ingredients: 'Ashwagandha KSM-66 300mg | Rhodiola rosea 200mg | Ginseng coreano 100mg',
      form: 'Cápsula',
      dosage: '1 cápsula pela manhã',
      notes: 'Blend de adaptógenos padronizados. Não usar à noite.',
      indications: 'Estresse, fadiga crônica, burnout, melhora cognitiva',
      contraindications: 'Hipertireoidismo, uso de estimulantes',
      sideEffects: 'Raros. Possível insônia se tomado tarde.',
      source: 'PDF - Guia Magistral',
      pharmacy: 'Manipulação',
    },
    {
      name: 'Suporte Tireoidiano',
      category: 'Endocrinologia e Metabolismo',
      ingredients: 'Selênio quelado 100mcg | Zinco quelado 15mg | Tirosina 500mg | Iodo 150mcg',
      form: 'Cápsula',
      dosage: '1 cápsula ao dia, pela manhã',
      notes: 'Para suporte à função tireoidiana. Não substituir hormônio.',
      indications: 'Hipotireoidismo subclínico, suporte tireoidiano',
      contraindications: 'Hipertireoidismo, doença de Graves',
      monitoring: 'TSH, T4L a cada 3 meses',
      source: 'PDF - Guia Magistral',
      pharmacy: 'Manipulação',
    },
    {
      name: 'Hepatoprotetor',
      category: 'Gastrointestinal',
      ingredients: 'Silimarina 200mg | NAC 600mg | Ácido alfa-lipóico 300mg',
      form: 'Cápsula',
      dosage: '1 cápsula 2x ao dia',
      notes: 'Proteção e regeneração hepática',
      indications: 'Esteatose hepática, hepatotoxicidade, suporte detox',
      contraindications: 'Obstrução biliar',
      sideEffects: 'Náusea, diarreia em doses altas',
      monitoring: 'TGO, TGP, GGT mensalmente',
      source: 'PDF - Guia Magistral',
      pharmacy: 'Manipulação',
    },
    {
      name: 'Imunomodulador',
      category: 'Imunologia',
      ingredients: 'Vitamina D3 5000 UI | Vitamina C 1000mg | Zinco quelado 30mg | Selênio 100mcg | Quercetina 500mg',
      form: 'Cápsula ou Sachê',
      dosage: '1 dose ao dia',
      notes: 'Suporte imunológico completo',
      indications: 'Prevenção de infecções, suporte imune, recuperação pós-infecção',
      contraindications: 'Hipercalcemia, doença granulomatosa',
      monitoring: '25-OH Vitamina D a cada 6 meses',
      source: 'PDF - Guia Magistral',
      pharmacy: 'Manipulação',
    },
    {
      name: 'Sono Profundo',
      category: 'Neurologia e Saúde Mental',
      ingredients: 'Melatonina 3mg | Magnésio glicina 400mg | L-Teanina 200mg | GABA 250mg',
      form: 'Cápsula ou Sublingual',
      dosage: '1 dose 30-60 min antes de dormir',
      notes: 'Fórmula para indução e qualidade do sono',
      indications: 'Insônia, dificuldade de iniciar sono, jet lag',
      contraindications: 'Gestação, lactação, doenças autoimunes',
      sideEffects: 'Sonolência matinal, sonhos vívidos',
      source: 'PDF - Guia Magistral',
      pharmacy: 'Manipulação',
    },
    {
      name: 'Anti-aging Mitocondrial',
      category: 'Mitocôndria, Cardio e Imunologia',
      ingredients: 'CoQ10 ubiquinol 100mg | PQQ 20mg | NAD+ precursor (NMN) 250mg | Resveratrol 100mg',
      form: 'Cápsula',
      dosage: '1 cápsula pela manhã',
      notes: 'Suporte à função mitocondrial e longevidade',
      indications: 'Fadiga, anti-envelhecimento, suporte energético celular',
      contraindications: 'Gestação, lactação',
      sideEffects: 'Raros. Insônia se tomado à noite.',
      source: 'PDF - Guia Magistral',
      pharmacy: 'Manipulação',
    },
  ]
  
  let created = 0
  let updated = 0
  
  for (const formula of pdfFormulas) {
    try {
      const existing = await prisma.formulaTemplate.findFirst({
        where: {
          name: formula.name,
          category: formula.category,
        },
      })
      
      if (existing) {
        await prisma.formulaTemplate.update({
          where: { id: existing.id },
          data: formula,
        })
        updated++
        console.log(`   ✏️  Atualizado: ${formula.name}`)
      } else {
        await prisma.formulaTemplate.create({ data: formula })
        created++
        console.log(`   ✅ Criado: ${formula.name}`)
      }
    } catch (error) {
      console.log(`   ❌ Erro: ${formula.name} - ${error}`)
    }
  }
  
  console.log(`\n📚 PDF: ${created} criadas, ${updated} atualizadas`)
}

/**
 * Main
 */
async function main(): Promise<void> {
  try {
    await importAllFormulas()
    await importPDFFormulas()
    
    // Contagem final
    const total = await prisma.formulaTemplate.count({ where: { active: true } })
    console.log(`\n🎉 Total de fórmulas no banco: ${total}`)
    
  } catch (error) {
    console.error('Erro na importação:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
