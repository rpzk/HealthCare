import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { prisma } from '@/lib/prisma'
import path from 'path'
import { promises as fs } from 'fs'

export const runtime = 'nodejs'

type Domain = 'terms' | 'cid' | 'ciap2' | 'nursing' | 'cbo' | 'medications' | 'procedures' | 'formulaTemplates'

const DOMAINS: Domain[] = ['terms', 'cid', 'ciap2', 'nursing', 'cbo', 'medications', 'procedures', 'formulaTemplates']

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const base = process.env.BACKUPS_DIR || path.join(process.cwd(), 'backups', 'healthcare')
  try {
    const entries = await fs.readdir(base, { withFileTypes: true })
    const partialDirs = entries
      .filter(e => e.isDirectory() && e.name.startsWith('partial_'))
      .map(e => e.name)
      .sort((a,b) => b.localeCompare(a))

    const items = await Promise.all(partialDirs.map(async (dir) => {
      const full = path.join(base, dir)
      const files = await fs.readdir(full)
      const stats = await fs.stat(full)
      return {
        id: dir,
        createdAt: stats.mtime,
        files,
        domains: DOMAINS.filter(d => files.includes(`${d}.json`)),
      }
    }))

    return NextResponse.json({ success: true, items })
  } catch (e) {
    return NextResponse.json({ success: true, items: [] })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  try {
    const body = await request.json()
    let domains: Domain[] = Array.isArray(body?.domains) ? body.domains : []
    domains = domains.filter((d: any): d is Domain => DOMAINS.includes(d))
    if (domains.length === 0) {
      return NextResponse.json({ error: 'Selecione ao menos um domínio' }, { status: 400 })
    }

    const base = process.env.BACKUPS_DIR || path.join(process.cwd(), 'backups', 'healthcare')
    const ts = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0,14)
    const dir = path.join(base, `partial_${ts}`)
    await fs.mkdir(dir, { recursive: true })

    const written: string[] = []

    if (domains.includes('terms')) {
      const terms = await prisma.term.findMany()
      await fs.writeFile(path.join(dir, 'terms.json'), JSON.stringify(terms, null, 2), 'utf8')
      written.push('terms.json')
    }

    if (domains.includes('cid')) {
      // Exportar apenas CID10
      const systems = await prisma.codeSystem.findMany({ where: { kind: 'CID10' } as any })
      const systemIds = systems.map(s => s.id)
      const codes = systemIds.length > 0 ? await prisma.medicalCode.findMany({ where: { systemId: { in: systemIds } } }) : []
      await fs.writeFile(path.join(dir, 'code_systems_cid10.json'), JSON.stringify(systems, null, 2), 'utf8')
      await fs.writeFile(path.join(dir, 'medical_codes_cid10.json'), JSON.stringify(codes, null, 2), 'utf8')
      written.push('code_systems_cid10.json', 'medical_codes_cid10.json')
    }

    if (domains.includes('cbo')) {
      const groups = await prisma.cBOGroup.findMany()
      const occupations = await prisma.occupation.findMany()
      await fs.writeFile(path.join(dir, 'cbo_groups.json'), JSON.stringify(groups, null, 2), 'utf8')
      await fs.writeFile(path.join(dir, 'occupations.json'), JSON.stringify(occupations, null, 2), 'utf8')
      written.push('cbo_groups.json', 'occupations.json')
    }

    if (domains.includes('medications')) {
      const meds = await prisma.medication.findMany()
      await fs.writeFile(path.join(dir, 'medications.json'), JSON.stringify(meds, null, 2), 'utf8')
      written.push('medications.json')
    }

    if (domains.includes('procedures')) {
      const procedures = await prisma.procedure.findMany()
      await fs.writeFile(path.join(dir, 'procedures.json'), JSON.stringify(procedures, null, 2), 'utf8')
      written.push('procedures.json')
    }

    if (domains.includes('formulaTemplates')) {
      const formulas = await prisma.formulaTemplate.findMany()
      await fs.writeFile(path.join(dir, 'formula_templates.json'), JSON.stringify(formulas, null, 2), 'utf8')
      written.push('formula_templates.json')
    }

    if (domains.includes('ciap2') || domains.includes('nursing')) {
      const kinds: any[] = []
      if (domains.includes('ciap2')) kinds.push('CIAP2')
      if (domains.includes('nursing')) kinds.push('NURSING')
      const systems = await prisma.codeSystem.findMany({ where: { kind: { in: kinds as any } } })
      const systemIds = systems.map(s => s.id)
      const codes = systemIds.length > 0 ? await prisma.medicalCode.findMany({ where: { systemId: { in: systemIds } } }) : []
      await fs.writeFile(path.join(dir, 'code_systems_extra.json'), JSON.stringify(systems, null, 2), 'utf8')
      await fs.writeFile(path.join(dir, 'medical_codes_extra.json'), JSON.stringify(codes, null, 2), 'utf8')
      written.push('code_systems_extra.json', 'medical_codes_extra.json')
    }

    return NextResponse.json({ success: true, id: `partial_${ts}`, files: written })
  } catch (e: any) {
    console.error('[Partial Backup] Error:', e)
    return NextResponse.json({ error: e?.message || 'Erro ao criar backup parcial' }, { status: 500 })
  }
}
