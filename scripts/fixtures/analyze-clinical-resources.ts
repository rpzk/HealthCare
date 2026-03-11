import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || 'postgresql://healthcare:healthcare123@localhost:5432/healthcare_db' 
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function analyzeResources() {
  console.log('\n' + '═'.repeat(80))
  console.log('🔍 ANÁLISE DE RECURSOS CLÍNICOS DISPONÍVEIS')
  console.log('═'.repeat(80) + '\n')

  try {
    // ============================================
    // 1. MEDICAMENTOS (RENAME)
    // ============================================
    console.log('💊 MEDICAMENTOS\n')
    
    const medications = await prisma.medication.count()
    const medicationsRename = await prisma.medication.count({ 
      where: { susCode: { not: null } } 
    })
    
    if (medications === 0) {
      console.log('   ⚠️  NENHUM MEDICAMENTO CADASTRADO')
      console.log('   ❌ RENAME não está importada')
      console.log('   📋 Necessário importar medicamentos da RENAME\n')
    } else {
      console.log('   ✅ Total cadastrados:', medications)
      console.log('   ✅ Com código SUS (RENAME):', medicationsRename)
      
      // Amostra
      const samples = await prisma.medication.findMany({ take: 5 })
      console.log('\n   📋 Amostra:')
      samples.forEach((m, i) => {
        console.log(`      ${i+1}. ${m.name}${m.susCode ? ` (SUS: ${m.susCode})` : ''}`)
      })
      console.log('')
    }

    // ============================================
    // 2. EXAMES/PROCEDIMENTOS SIGTAP
    // ============================================
    console.log('🔬 EXAMES/PROCEDIMENTOS SIGTAP\n')
    
    const sigtapTotal = await prisma.sIGTAPProcedimento.count()
    
    if (sigtapTotal === 0) {
      console.log('   ⚠️  NENHUM PROCEDIMENTO SIGTAP')
      console.log('   ❌ Provável erro na importação\n')
    } else {
      console.log('   ✅ Total procedimentos SIGTAP:', sigtapTotal)
      
      // Buscar grupos relacionados a exames
      const grupos = await prisma.sIGTAPGrupo.findMany({
        include: {
          subgrupos: {
            include: {
              _count: { select: { procedimentos: true } }
            }
          }
        }
      })
      
      console.log('\n   📊 Grupos SIGTAP:')
      grupos.forEach(g => {
        const totalProc = g.subgrupos.reduce((sum, sg) => sum + sg._count.procedimentos, 0)
        if (totalProc > 0) {
          console.log(`      • ${g.code} - ${g.name}: ${totalProc} procedimentos`)
        }
      })
      
      // Verificar se ExamRequest está vinculado ao SIGTAP
      console.log('\n   🔗 VÍNCULO ExamRequest ↔ SIGTAP:')
      console.log('      ⚠️  ExamRequest usa campo texto livre (examType)')
      console.log('      💡 Recomendação: Vincular ao SIGTAPProcedimento')
      console.log('')
    }

    // ============================================
    // 3. ESPECIALIDADES PARA ENCAMINHAMENTO
    // ============================================
    console.log('👨‍⚕️ ESPECIALIDADES/OCUPAÇÕES PARA ENCAMINHAMENTO\n')
    
    const occupations = await prisma.occupation.count()
    
    if (occupations === 0) {
      console.log('   ⚠️  NENHUMA OCUPAÇÃO CBO')
      console.log('   ❌ Provável erro na importação\n')
    } else {
      console.log('   ✅ Total ocupações CBO:', occupations)
      
      // Buscar ocupações médicas
      const medicalOccupations = await prisma.occupation.findMany({
        where: {
          OR: [
            { title: { contains: 'MEDICO', mode: 'insensitive' } },
            { title: { contains: 'MÉDICO', mode: 'insensitive' } }
          ]
        },
        take: 10
      })
      
      console.log('   ✅ Ocupações médicas encontradas:', medicalOccupations.length)
      
      if (medicalOccupations.length > 0) {
        console.log('\n   📋 Amostra de especialidades médicas:')
        medicalOccupations.slice(0, 5).forEach((o, i) => {
          console.log(`      ${i+1}. [${o.code}] ${o.title}`)
        })
      }
      
      // Verificar se Referral está vinculado ao CBO
      console.log('\n   🔗 VÍNCULO Referral ↔ CBO:')
      console.log('      ⚠️  Referral usa campo texto livre (specialty)')
      console.log('      💡 Recomendação: Vincular ao Occupation (CBO)')
      console.log('')
    }

    // ============================================
    // 4. RESUMO E RECOMENDAÇÕES
    // ============================================
    console.log('═'.repeat(80))
    console.log('📊 RESUMO\n')
    
    const issues = []
    const recommendations = []
    
    if (medications === 0) {
      issues.push('❌ Medicamentos (RENAME) não importados')
      recommendations.push('Importar RENAME completa')
    }
    
    if (sigtapTotal > 0) {
      issues.push('⚠️  ExamRequest não vinculado ao SIGTAP (usa texto livre)')
      recommendations.push('Adicionar campo procedimentoId em ExamRequest')
    }
    
    if (occupations > 0) {
      issues.push('⚠️  Referral não vinculado ao CBO (usa texto livre)')
      recommendations.push('Adicionar campo targetOccupationId em Referral')
    }
    
    if (issues.length > 0) {
      console.log('🔴 PROBLEMAS IDENTIFICADOS:\n')
      issues.forEach((issue, i) => console.log(`   ${i+1}. ${issue}`))
      console.log('')
    }
    
    if (recommendations.length > 0) {
      console.log('💡 RECOMENDAÇÕES:\n')
      recommendations.forEach((rec, i) => console.log(`   ${i+1}. ${rec}`))
      console.log('')
    }
    
    console.log('═'.repeat(80) + '\n')

  } catch (error) {
    console.error('\n❌ Erro na análise:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

analyzeResources()
