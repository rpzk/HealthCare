#!/usr/bin/env npx tsx
/**
 * Verifica ambiente de desenvolvimento: banco de dados e Redis
 * Uso: npx tsx scripts/check-dev-env.ts
 */

import 'dotenv/config'

async function main() {
  console.log('\n🔍 HealthCare - Verificação do ambiente de desenvolvimento\n')
  console.log('─'.repeat(50))

  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    console.log('❌ DATABASE_URL não definido no .env')
  } else {
    const safe = dbUrl.replace(/:([^:@]+)@/, ':****@')
    console.log('✓ DATABASE_URL:', safe)
  }

  // PostgreSQL (usa lib/prisma do projeto)
  try {
    const { prisma } = await import('../lib/prisma')
    await prisma.$queryRaw`SELECT 1`
    console.log('✓ Banco de dados: acessível')

    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { email: true, isActive: true, password: true }
    })
    if (admins.length === 0) {
      console.log('⚠️  Nenhum usuário ADMIN no banco')
    } else {
      admins.forEach((u, i) => {
        const pwd = u.password ? 'tem senha' : 'SEM SENHA'
        console.log(`   Admin ${i + 1}: ${u.email} (${u.isActive ? 'ativo' : 'inativo'}, ${pwd})`)
      })
    }
    await prisma.$disconnect()
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.log('❌ Banco de dados:', msg)
    if (msg.includes('connect') || msg.includes('ECONNREFUSED')) {
      console.log('   → Inicie o PostgreSQL: docker start <postgres> ou systemctl start postgresql')
    }
  }

  // Redis (opcional em dev — middleware usa in-memory em Edge)
  const redisHost = process.env.REDIS_HOST || 'localhost'
  const redisPort = process.env.REDIS_PORT || '6379'
  try {
    const Redis = (await import('ioredis')).default
    const redis = new Redis({ host: redisHost, port: Number(redisPort), lazyConnect: true })
    await redis.connect()
    await redis.ping()
    redis.disconnect()
    console.log(`✓ Redis: acessível em ${redisHost}:${redisPort}`)
  } catch {
    console.log(`⚠️  Redis: não acessível (${redisHost}:${redisPort}) — OK em dev, middleware usa in-memory`)
  }

  console.log('\n' + '─'.repeat(50))
  console.log('')
}

main().catch(console.error)
