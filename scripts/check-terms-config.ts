import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL não configurado')
  }

  const adapter = new PrismaPg({ connectionString: databaseUrl })

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

const prisma = createPrismaClient()

const REQUIRED = {
  AI: {
    PATIENT: ['ai-consent-patient', 'ai-consent'],
    PROFESSIONAL: ['ai-consent-professional', 'ai-consent'],
  },
  TELEMEDICINE: {
    PATIENT: ['telemedicine-consent-patient'],
    PROFESSIONAL: ['telemedicine-consent-professional'],
  },
  RECORDING: {
    PATIENT: ['recording-consent-patient', 'recording-consent'],
    PROFESSIONAL: ['recording-consent-professional', 'recording-consent'],
  },
  IMAGE: {
    PATIENT: ['image-consent-patient'],
    PROFESSIONAL: ['image-consent-professional'],
  },
  ADMIN_PRIVILEGED: {
    PROFESSIONAL: ['admin-privileged-consent', 'admin-consent'],
  },
} as const

async function main() {
  const terms = await prisma.term.findMany({
    where: { isActive: true },
    select: { slug: true, version: true, audience: true },
    orderBy: [{ slug: 'asc' }, { createdAt: 'desc' }],
  })

  const bySlug = new Map<string, typeof terms>()
  for (const t of terms) {
    const arr = bySlug.get(t.slug) ?? []
    arr.push(t)
    bySlug.set(t.slug, arr)
  }

  console.log('Active terms (by slug):')
  if (bySlug.size === 0) console.log('- (none)')
  for (const [slug, arr] of bySlug) {
    const uniq = Array.from(new Set(arr.map((a) => `${a.version}/${a.audience}`)))
    console.log(`- ${slug}: ${uniq.join(', ')}`)
  }

  const hasAnyActive = (slugs: readonly string[], audience: 'PATIENT' | 'PROFESSIONAL') => {
    for (const slug of slugs) {
      const arr = bySlug.get(slug)
      if (!arr) continue
      // assertUserAcceptedTerms allows (audience ALL) OR (matching audience)
      if (arr.some((t) => t.audience === 'ALL' || t.audience === audience)) return true
    }
    return false
  }

  console.log('\nGate configuration check:')
  for (const [gate, audMap] of Object.entries(REQUIRED)) {
    for (const audience of Object.keys(audMap)) {
      const slugs = (audMap as any)[audience] as readonly string[]
      const ok = hasAnyActive(slugs, audience as 'PATIENT' | 'PROFESSIONAL')
      console.log(`- ${gate} / ${audience}: ${ok ? 'OK' : 'MISSING'} (${slugs.join(', ')})`)
    }
  }

  console.log('\nPublic pages slugs:')
  for (const slug of ['terms-of-use', 'privacy-policy']) {
    console.log(`- ${slug}: ${bySlug.has(slug) ? 'OK' : 'MISSING'}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
