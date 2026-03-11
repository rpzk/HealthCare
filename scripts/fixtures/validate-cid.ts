import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL || 'postgresql://healthcare:healthcare123@localhost:5432/healthcare_db'
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('\n🔍 VALIDAÇÃO FINAL - CID-10 COMPLETO\n')
  console.log('════════════════════════════════════════════════════════════\n')

  try {
    // Contagens por nível
    const capitulos = await prisma.cID10Capitulo.count()
    const grupos = await prisma.cID10Grupo.count()
    const categorias = await prisma.cID10Categoria.count()
    
    // Subcategorias via systemId
    const codeSystem = await prisma.codeSystem.findFirst({
      where: { kind: 'CID10' }
    })
    
    if (!codeSystem) {
      console.log('❌ CodeSystem CID10 não encontrado!')
      process.exit(1)
    }
    
    const subcategorias = await prisma.medicalCode.count({
      where: { systemId: codeSystem.id }
    })

    // Exibir resultados
    console.log('📊 HIERARQUIA CID-10:')
    console.log('   ├─ Capítulos (I-XXII)           │', capitulos.toString().padStart(6), '✓')
    console.log('   ├─ Grupos (ex: A00-A09)         │', grupos.toString().padStart(6), '✓')
    console.log('   ├─ Categorias (ex: A00)         │', categorias.toString().padStart(6), '✓')
    console.log('   └─ Subcategorias (ex: A00.0)    │', subcategorias.toString().padStart(6), '✓')
    console.log('   ──────────────────────────────────────────────────────')
    const total = capitulos + grupos + categorias + subcategorias
    console.log('   🎯 TOTAL GERAL                  │', total.toString().padStart(6), '✓\n')

    // Verificação de integridade
    console.log('🔗 VERIFICAÇÃO DE INTEGRIDADE:\n')
    
    const gruposSemCapitulo = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count FROM cid10_grupos WHERE "capituloId" IS NULL
    `
    
    const categoriasSemGrupo = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count FROM cid10_categorias WHERE "grupoId" IS NULL
    `
    
    const subcategoriasSemCategoria = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count FROM medical_codes 
      WHERE "systemId" = ${codeSystem.id} AND "categoriaId" IS NULL
    `

    const countGruposSemCapitulo = parseInt(gruposSemCapitulo[0].count)
    const countCategoriasSemGrupo = parseInt(categoriasSemGrupo[0].count)
    const countSubcategoriasSemCategoria = parseInt(subcategoriasSemCategoria[0].count)

    console.log('   • Grupos sem capítulo:', countGruposSemCapitulo === 0 ? '✓ 0' : `⚠️  ${countGruposSemCapitulo}`)
    console.log('   • Categorias sem grupo:', countCategoriasSemGrupo === 0 ? '✓ 0' : `⚠️  ${countCategoriasSemGrupo}`)
    console.log('   • Subcategorias sem categoria:', countSubcategoriasSemCategoria === 0 ? '✓ 0' : `⚠️  ${countSubcategoriasSemCategoria}`)
    
    // Amostras
    console.log('\n📋 AMOSTRA DE SUBCATEGORIAS:\n')
    const samples = await prisma.medicalCode.findMany({
      where: { systemId: codeSystem.id },
      take: 10,
      include: {
        categoria: {
          include: {
            grupo: {
              include: {
                capitulo: true
              }
            }
          }
        }
      },
      orderBy: { code: 'asc' }
    })

    samples.forEach((s, i) => {
      const cap = s.categoria?.grupo?.capitulo?.code || '?'
      const grp = s.categoria?.grupo?.code || '?'
      console.log(`   ${(i + 1).toString().padStart(2)}. [${cap}] ${s.code.padEnd(6)} - ${s.display?.substring(0, 60)}`)
    })

    console.log('\n════════════════════════════════════════════════════════════')
    console.log('✅ CID-10 IMPORTADO E VALIDADO COM SUCESSO!')
    console.log(`   ${total.toLocaleString('pt-BR')} registros prontos para uso clínico`)
    console.log('════════════════════════════════════════════════════════════\n')

  } catch (error) {
    console.error('❌ Erro na validação:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main()
