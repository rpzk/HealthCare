const bcrypt = require('bcrypt')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

/**
 * Script para gerar hashes bcrypt das senhas dos usuários
 */
async function hashPasswords() {
  try {
    console.log('Iniciando processo de hash de senhas...')

    // Buscar usuários que não têm senha com hash
    const users = await prisma.user.findMany({
      where: {
        password: null
      }
    })

    console.log(`Encontrados ${users.length} usuários sem senha com hash`)

    for (const user of users) {
      let defaultPassword = 'admin123'
      
      // Personalizar senha padrão baseada no tipo de usuário
      if (user.role === 'ADMIN') {
        defaultPassword = 'admin123'
      } else if (user.role === 'DOCTOR') {
        defaultPassword = 'doctor123'
      } else if (user.role === 'NURSE') {
        defaultPassword = 'nurse123'
      }

      // Gerar hash da senha
      const saltRounds = 12
      const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds)

      // Atualizar usuário no banco
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      })

      console.log(`✅ Senha atualizada para usuário: ${user.email} (${user.role})`)
    }

    console.log('\n✅ Processo concluído com sucesso!')
    console.log('Senhas padrão por tipo de usuário:')
    console.log('- ADMIN: admin123')
    console.log('- DOCTOR: doctor123')
    console.log('- NURSE: nurse123')
    
  } catch (error) {
    console.error('❌ Erro ao processar senhas:', error)
  } finally {
    await prisma.$disconnect()
  }
}

hashPasswords()
