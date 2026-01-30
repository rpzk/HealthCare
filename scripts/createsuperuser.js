#!/usr/bin/env node
/**
 * Create Superuser - Similar to Django's createsuperuser
 * 
 * Usage:
 *   npx ts-node scripts/createsuperuser.ts
 *   # or in Docker:
 *   docker exec -it healthcare-app node scripts/createsuperuser.js
 * 
 * Environment variables (optional):
 *   ADMIN_EMAIL - Email do admin
 *   ADMIN_PASSWORD - Senha do admin
 *   ADMIN_NAME - Nome do admin
 */

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const readline = require('readline')

// Prisma 7+: inicialização explícita da URL do banco
const datasourceUrl = process.env.DATABASE_URL ||
  'postgresql://healthcare:umbrel_secure_pass@localhost:5432/healthcare_db'
const prisma = new PrismaClient({ datasourceUrl })

function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
}

function question(rl, prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer)
    })
  })
}

function questionHidden(prompt) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    
    process.stdout.write(prompt)
    
    // Disable echo for password
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true)
    }
    
    let password = ''
    
    const onData = (char) => {
      char = char.toString()
      
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004': // Ctrl+D
          if (process.stdin.isTTY) {
            process.stdin.setRawMode(false)
          }
          process.stdin.removeListener('data', onData)
          console.log()
          rl.close()
          resolve(password)
          break
        case '\u0003': // Ctrl+C
          process.exit()
          break
        case '\u007F': // Backspace
          password = password.slice(0, -1)
          break
        default:
          password += char
          break
      }
    }
    
    process.stdin.on('data', onData)
    process.stdin.resume()
  })
}

async function main() {
  console.log('\n🏥 HealthCare - Create Superuser')
  console.log('================================\n')
  
  let email, password, name
  
  // Check environment variables first
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    email = process.env.ADMIN_EMAIL
    password = process.env.ADMIN_PASSWORD
    name = process.env.ADMIN_NAME || 'Administrador'
    console.log('📧 Using environment variables for admin creation...')
  } else {
    // Interactive mode
    const rl = createInterface()
    
    // Get email
    while (!email) {
      email = await question(rl, 'Email: ')
      if (!email) {
        console.log('❌ Email é obrigatório')
        continue
      }
      if (!email.includes('@')) {
        console.log('❌ Email inválido')
        email = null
        continue
      }
      
      // Check if user exists
      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing) {
        const overwrite = await question(rl, `⚠️  Usuário ${email} já existe. Sobrescrever? (s/N): `)
        if (overwrite.toLowerCase() !== 's') {
          email = null
          continue
        }
      }
    }
    
    // Get name
    name = await question(rl, 'Nome completo: ')
    if (!name) {
      name = 'Administrador'
    }
    
    rl.close()
    
    // Get password (hidden)
    while (!password) {
      password = await questionHidden('Senha: ')
      if (!password || password.length < 6) {
        console.log('❌ Senha deve ter pelo menos 6 caracteres')
        password = null
        continue
      }
      
      const confirm = await questionHidden('Confirmar senha: ')
      if (password !== confirm) {
        console.log('❌ Senhas não conferem')
        password = null
      }
    }
  }
  
  try {
    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)
    
    // Create or update user
    const user = await prisma.user.upsert({
      where: { email },
      update: { 
        password: passwordHash, 
        role: 'ADMIN', 
        name,
        isActive: true 
      },
      create: { 
        email, 
        name, 
        role: 'ADMIN', 
        password: passwordHash,
        isActive: true
      }
    })
    
    console.log('\n✅ Superusuário criado com sucesso!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`   📧 Email: ${user.email}`)
    console.log(`   👤 Nome: ${user.name}`)
    console.log(`   🔑 Role: ${user.role}`)
    console.log(`   🆔 ID: ${user.id}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
  } catch (error) {
    console.error('\n❌ Erro ao criar superusuário:', error.message)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

main()
