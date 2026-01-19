import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { prisma } from '@/lib/prisma'
import path from 'path'
import { promises as fs } from 'fs'

export const runtime = 'nodejs'

type Domain = 'terms' | 'cid' | 'ciap2' | 'nursing' | 'cbo' | 'medications' | 'procedures' | 'formulaTemplates'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  try {
    const body = await request.json()
    const id: string | undefined = body?.id // ex: partial_20260103123456
    let domains: Domain[] = Array.isArray(body?.domains) ? body.domains : []
    domains = domains.filter((d: any): d is Domain => ['terms','cid','ciap2','nursing','cbo','medications','procedures','formulaTemplates'].includes(d))
    if (!id || domains.length === 0) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
    }

    const dir = path.join(process.env.BACKUPS_DIR || path.join(process.cwd(), 'backups', 'healthcare'), id)
    try { await fs.access(dir) } catch { return NextResponse.json({ error: 'Backup parcial não encontrado' }, { status: 404 }) }

    // Restaurar de forma segura: upsert, sem deletar dependências
    const results: Record<string, number> = {}

    if (domains.includes('terms')) {
      const raw = await fs.readFile(path.join(dir, 'terms.json'), 'utf8').catch(() => '[]')
      const terms = JSON.parse(raw)
      let count = 0
      for (const t of terms) {
        await prisma.term.upsert({
          where: { id: t.id },
          create: {
            id: t.id, slug: t.slug, title: t.title, content: t.content, version: t.version, isActive: t.isActive, audience: t.audience,
          },
          update: { slug: t.slug, title: t.title, content: t.content, version: t.version, isActive: t.isActive, audience: t.audience },
        })
        count++
      }
      results['terms'] = count
    }

    if (domains.includes('cid')) {
      const [sysRaw, codesRaw] = await Promise.all([
        fs.readFile(path.join(dir, 'code_systems_cid10.json'), 'utf8').catch(() => '[]'),
        fs.readFile(path.join(dir, 'medical_codes_cid10.json'), 'utf8').catch(() => '[]'),
      ])
      const systems = JSON.parse(sysRaw)
      const codes = JSON.parse(codesRaw)
      let sCount = 0, cCount = 0
      for (const s of systems) {
        await prisma.codeSystem.upsert({
          where: { id: s.id },
          create: { id: s.id, kind: s.kind, name: s.name, version: s.version, description: s.description, active: s.active },
          update: { name: s.name, version: s.version, description: s.description, active: s.active },
        })
        sCount++
      }
      // Build existing pairs (systemId, code)
      const bySystem: Record<string, Set<string>> = {}
      for (const s of systems) {
        bySystem[s.id] = new Set()
        const existing = await prisma.medicalCode.findMany({ where: { systemId: s.id }, select: { code: true } })
        existing.forEach(e => bySystem[s.id].add(e.code))
      }
      for (const m of codes) {
        const exists = bySystem[m.systemId]?.has(m.code)
        if (!exists) {
          await prisma.medicalCode.create({ data: {
            id: m.id, systemId: m.systemId, code: m.code, display: m.display, description: m.description, parentId: m.parentId,
            synonyms: m.synonyms, searchableText: m.searchableText, active: m.active, chapter: m.chapter, isCategory: m.isCategory,
            sexRestriction: m.sexRestriction, crossAsterisk: m.crossAsterisk, shortDescription: m.shortDescription,
          } })
          cCount++
        }
      }
      results['cid'] = sCount + cCount
    }

    if (domains.includes('cbo')) {
      const [groupsRaw, occRaw] = await Promise.all([
        fs.readFile(path.join(dir, 'cbo_groups.json'), 'utf8').catch(() => '[]'),
        fs.readFile(path.join(dir, 'occupations.json'), 'utf8').catch(() => '[]'),
      ])
      const groups = JSON.parse(groupsRaw)
      const occs = JSON.parse(occRaw)
      let gCount = 0, oCount = 0
      for (const g of groups) {
        await prisma.cBOGroup.upsert({
          where: { id: g.id },
          create: { id: g.id, code: g.code, name: g.name, level: g.level, parentId: g.parentId },
          update: { code: g.code, name: g.name, level: g.level, parentId: g.parentId },
        })
        gCount++
      }
      for (const o of occs) {
        await prisma.occupation.upsert({
          where: { id: o.id },
          create: { id: o.id, code: o.code, title: o.title, description: o.description, groupId: o.groupId, synonyms: o.synonyms, active: o.active },
          update: { code: o.code, title: o.title, description: o.description, groupId: o.groupId, synonyms: o.synonyms, active: o.active },
        })
        oCount++
      }
      results['cbo'] = gCount + oCount
    }

    if (domains.includes('medications')) {
      const raw = await fs.readFile(path.join(dir, 'medications.json'), 'utf8').catch(() => '[]')
      const meds = JSON.parse(raw)
      let count = 0
      for (const m of meds) {
        await prisma.medication.upsert({
          where: { id: m.id },
          create: {
            id: m.id, name: m.name, synonym: m.synonym, tradeName: m.tradeName, prescriptionType: m.prescriptionType,
            basicPharmacy: m.basicPharmacy, municipalPharmacy: m.municipalPharmacy, statePharmacy: m.statePharmacy,
            homePharmacy: m.homePharmacy, popularPharmacy: m.popularPharmacy, hospitalPharmacy: m.hospitalPharmacy,
            commercialPharmacy: m.commercialPharmacy, compoundPharmacy: m.compoundPharmacy, susCode: m.susCode,
            instructions: m.instructions, notes: m.notes, description: m.description, warnings: m.warnings, interactions: m.interactions,
            observations: m.observations, minAge: m.minAge, maxAge: m.maxAge, sexRestriction: m.sexRestriction, validityDays: m.validityDays,
            route: m.route, strength: m.strength, unit: m.unit, form: m.form, packaging: m.packaging, packageSize: m.packageSize,
            dosePerKg: m.dosePerKg, maxDailyDosePerKg: m.maxDailyDosePerKg, defaultFrequency: m.defaultFrequency, defaultDuration: m.defaultDuration,
            maxQuantity: m.maxQuantity, active: m.active,
          },
          update: {
            name: m.name, synonym: m.synonym, tradeName: m.tradeName, prescriptionType: m.prescriptionType,
            basicPharmacy: m.basicPharmacy, municipalPharmacy: m.municipalPharmacy, statePharmacy: m.statePharmacy,
            homePharmacy: m.homePharmacy, popularPharmacy: m.popularPharmacy, hospitalPharmacy: m.hospitalPharmacy,
            commercialPharmacy: m.commercialPharmacy, compoundPharmacy: m.compoundPharmacy, susCode: m.susCode,
            instructions: m.instructions, notes: m.notes, description: m.description, warnings: m.warnings, interactions: m.interactions,
            observations: m.observations, minAge: m.minAge, maxAge: m.maxAge, sexRestriction: m.sexRestriction, validityDays: m.validityDays,
            route: m.route, strength: m.strength, unit: m.unit, form: m.form, packaging: m.packaging, packageSize: m.packageSize,
            dosePerKg: m.dosePerKg, maxDailyDosePerKg: m.maxDailyDosePerKg, defaultFrequency: m.defaultFrequency, defaultDuration: m.defaultDuration,
            maxQuantity: m.maxQuantity, active: m.active,
          },
        })
        count++
      }
      results['medications'] = count
    }

    if (domains.includes('procedures')) {
      const raw = await fs.readFile(path.join(dir, 'procedures.json'), 'utf8').catch(() => '[]')
      const procedures = JSON.parse(raw)
      let count = 0
      for (const p of procedures) {
        await prisma.procedure.upsert({
          where: { id: p.id },
          create: {
            id: p.id,
            code: p.code,
            name: p.name,
            complexity: p.complexity ?? null,
            financing: p.financing ?? null,
            minAge: p.minAge ?? null,
            maxAge: p.maxAge ?? null,
            sexRestriction: p.sexRestriction ?? null,
            group: p.group ?? null,
            subgroup: p.subgroup ?? null,
            cboRequired: p.cboRequired ?? null,
            active: p.active ?? true,
            validFrom: p.validFrom ? new Date(p.validFrom) : null,
          },
          update: {
            code: p.code,
            name: p.name,
            complexity: p.complexity ?? null,
            financing: p.financing ?? null,
            minAge: p.minAge ?? null,
            maxAge: p.maxAge ?? null,
            sexRestriction: p.sexRestriction ?? null,
            group: p.group ?? null,
            subgroup: p.subgroup ?? null,
            cboRequired: p.cboRequired ?? null,
            active: p.active ?? true,
            validFrom: p.validFrom ? new Date(p.validFrom) : null,
          },
        })
        count++
      }
      results['procedures'] = count
    }

    if (domains.includes('formulaTemplates')) {
      const raw = await fs.readFile(path.join(dir, 'formula_templates.json'), 'utf8').catch(() => '[]')
      const formulas = JSON.parse(raw)
      let count = 0
      for (const f of formulas) {
        await prisma.formulaTemplate.upsert({
          where: { id: f.id },
          create: {
            id: f.id, name: f.name, category: f.category, ingredients: f.ingredients, form: f.form, dosage: f.dosage, notes: f.notes,
            indications: f.indications, contraindications: f.contraindications, sideEffects: f.sideEffects, interactions: f.interactions,
            monitoring: f.monitoring, duration: f.duration, source: f.source, pharmacy: f.pharmacy, active: f.active,
          },
          update: {
            name: f.name, category: f.category, ingredients: f.ingredients, form: f.form, dosage: f.dosage, notes: f.notes,
            indications: f.indications, contraindications: f.contraindications, sideEffects: f.sideEffects, interactions: f.interactions,
            monitoring: f.monitoring, duration: f.duration, source: f.source, pharmacy: f.pharmacy, active: f.active,
          },
        })
        count++
      }
      results['formulaTemplates'] = count
    }

    if (domains.includes('ciap2') || domains.includes('nursing')) {
      const [sysRaw, codesRaw] = await Promise.all([
        fs.readFile(path.join(dir, 'code_systems_extra.json'), 'utf8').catch(() => '[]'),
        fs.readFile(path.join(dir, 'medical_codes_extra.json'), 'utf8').catch(() => '[]'),
      ])
      const systems = JSON.parse(sysRaw)
      const codes = JSON.parse(codesRaw)
      let sCount = 0, cCount = 0
      for (const s of systems) {
        await prisma.codeSystem.upsert({
          where: { id: s.id },
          create: { id: s.id, kind: s.kind, name: s.name, version: s.version, description: s.description, active: s.active },
          update: { name: s.name, version: s.version, description: s.description, active: s.active },
        })
        sCount++
      }
      for (const m of codes) {
        // Create only if code absent in that system to avoid heavy updates
        const exists = await prisma.medicalCode.findFirst({ where: { systemId: m.systemId, code: m.code }, select: { id: true } })
        if (!exists) {
          await prisma.medicalCode.create({ data: {
            id: m.id, systemId: m.systemId, code: m.code, display: m.display, description: m.description, parentId: m.parentId,
            synonyms: m.synonyms, searchableText: m.searchableText, active: m.active, chapter: m.chapter, isCategory: m.isCategory,
            sexRestriction: m.sexRestriction, crossAsterisk: m.crossAsterisk, shortDescription: m.shortDescription,
          } })
          cCount++
        }
      }
      results['extraCodes'] = sCount + cCount
    }

    return NextResponse.json({ success: true, results })
  } catch (e: any) {
    console.error('[Partial Restore] Error:', e)
    return NextResponse.json({ error: e?.message || 'Erro ao restaurar backup parcial' }, { status: 500 })
  }
}
