/**
 * Criar JobRoles a partir de Occupations já importadas (ex: via SSF CBO).
 *
 * Motivação:
 * - O workflow RO/SST (ROLE assessments) depende de job_roles.
 * - CBO fornece títulos/códigos reais, mas não define estrato (Time Span) automaticamente.
 * - Para não inventar dados, este script exige que você informe o estrato mínimo (e opcionalmente o máximo).
 *
 * Uso (exemplos):
 *  - Buscar por texto e criar (dry-run):
 *      npx tsx scripts/create-jobroles-from-occupations.ts --q "enfermeiro" --minStratum S2
 *  - Criar de fato (confirm):
 *      npx tsx scripts/create-jobroles-from-occupations.ts --q "enfermeiro" --minStratum S2 --confirm
 *  - Por códigos específicos (pode repetir):
 *      npx tsx scripts/create-jobroles-from-occupations.ts --code 223505 --code 223565 --minStratum S2 --confirm
 */

import { prisma } from '@/lib/prisma'
import { StratumLevel } from '@prisma/client'

function getArg(flag: string): string | undefined {
  const idx = process.argv.findIndex((a) => a === flag || a.startsWith(`${flag}=`))
  if (idx === -1) return undefined
  const val = process.argv[idx]
  if (val.includes('=')) return val.split('=')[1]
  return process.argv[idx + 1]
}

function getArgs(flag: string): string[] {
  const out: string[] = []
  for (let i = 0; i < process.argv.length; i++) {
    const a = process.argv[i]
    if (a === flag) {
      const next = process.argv[i + 1]
      if (next && !next.startsWith('--')) out.push(next)
    } else if (a.startsWith(`${flag}=`)) {
      out.push(a.split('=')[1])
    }
  }
  return out
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag)
}

function parseStratum(v: string | undefined, label: string): StratumLevel {
  if (!v) throw new Error(`${label} é obrigatório (ex: S1..S8)`) 
  const s = String(v).trim().toUpperCase()
  const allowed = new Set(Object.values(StratumLevel))
  if (!allowed.has(s as StratumLevel)) {
    throw new Error(`${label} inválido: ${v}. Use um de: ${Array.from(allowed).join(', ')}`)
  }
  return s as StratumLevel
}

async function main() {
  const q = getArg('--q')
  const codes = getArgs('--code').map((c) => String(c).trim()).filter(Boolean)
  const limit = Number(getArg('--limit') || '50')
  const confirm = hasFlag('--confirm')

  const requiredMinStratum = parseStratum(getArg('--minStratum'), '--minStratum')
  const requiredMaxStratumRaw = getArg('--maxStratum')
  const requiredMaxStratum = requiredMaxStratumRaw ? parseStratum(requiredMaxStratumRaw, '--maxStratum') : undefined

  if ((!q || q.trim() === '') && codes.length === 0) {
    throw new Error('Forneça --q "texto" ou pelo menos um --code <código>')
  }

  let occupations: { id: string; code: string; title: string; description: string | null }[] = []

  if (codes.length) {
    const unique = Array.from(new Set(codes))
    occupations = await prisma.occupation.findMany({
      where: { code: { in: unique } },
      select: { id: true, code: true, title: true, description: true },
    })

    const found = new Set(occupations.map((o) => o.code))
    const missing = unique.filter((c) => !found.has(c))
    if (missing.length) {
      throw new Error(`Occupation(s) não encontrada(s) para code(s): ${missing.join(', ')}`)
    }
  } else {
    const query = q!.trim()
    occupations = await prisma.occupation.findMany({
      where: {
        active: true,
        OR: [
          { code: { contains: query, mode: 'insensitive' } },
          { title: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: Math.min(Math.max(limit, 1), 500),
      select: { id: true, code: true, title: true, description: true },
      orderBy: { title: 'asc' },
    })

    if (!occupations.length) {
      console.log('Nenhuma Occupation encontrada para:', query)
      return
    }
  }

  console.log('JobRole create-from-occupations:')
  console.log('  occupations:', occupations.length)
  console.log('  requiredMinStratum:', requiredMinStratum)
  console.log('  requiredMaxStratum:', requiredMaxStratum || '(none)')
  console.log('  mode:', confirm ? 'WRITE (confirm)' : 'DRY-RUN')

  let created = 0
  let skipped = 0

  for (const occ of occupations) {
    const existing = await prisma.jobRole.findFirst({
      where: {
        occupationId: occ.id,
        title: occ.title,
      },
      select: { id: true },
    })

    if (existing) {
      skipped++
      continue
    }

    if (!confirm) {
      console.log(`- would create: ${occ.code} | ${occ.title}`)
      continue
    }

    await prisma.jobRole.create({
      data: {
        title: occ.title,
        occupationId: occ.id,
        requiredMinStratum,
        requiredMaxStratum,
        description: occ.description || null,
      },
      select: { id: true },
    })

    created++
    if (created % 200 === 0) console.log('  created:', created)
  }

  console.log('—'.repeat(60))
  console.log('Concluído:')
  console.log('  created:', created)
  console.log('  skipped (already existed):', skipped)
  if (!confirm) console.log('  (dry-run) Use --confirm para gravar no banco')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
