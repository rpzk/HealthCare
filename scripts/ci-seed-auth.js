// Seed de verificação - NÃO cria usuários de teste
// Para criar admin, use: node scripts/createsuperuser.js
const { PrismaClient } = require('@prisma/client')

async function main(){
  const prisma = new PrismaClient()
  try {
    // Apenas verifica se existe algum admin
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN' }
    })
    
    if (adminCount === 0) {
      console.log('[ci-seed-auth] ⚠️  Nenhum administrador encontrado!')
      console.log('[ci-seed-auth] 💡 Execute: node scripts/createsuperuser.js')
      console.log('[ci-seed-auth] 💡 Ou defina: ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME')
      
      // Se variáveis de ambiente estiverem definidas, criar admin automaticamente
      if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
        const bcrypt = require('bcryptjs')
        const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12)
        
        await prisma.user.create({
          data: {
            email: process.env.ADMIN_EMAIL,
            name: process.env.ADMIN_NAME || 'Administrador',
            role: 'ADMIN',
            password: passwordHash,
            isActive: true
          }
        })
        console.log('[ci-seed-auth] ✅ Admin criado via variáveis de ambiente')
      }
    } else {
      console.log(`[ci-seed-auth] ✅ ${adminCount} administrador(es) encontrado(s)`)
    }
    
    console.log('[ci-seed-auth] OK')
  } catch(e){
    console.error('[ci-seed-auth] FAILED', e)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

main()
