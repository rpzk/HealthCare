/* eslint-disable @typescript-eslint/no-explicit-any */
// Note: This file uses dynamic Prisma model access for optional models
import { prisma } from '@/lib/prisma'
// Usar import amplo para contornar cache de tipos em hot-reload
import * as PrismaNS from '@prisma/client'
const { CodeSystemKind, DiagnosisStatus, DiagnosisCertainty } = PrismaNS as any
import Redis from 'ioredis'
import { medicalAI } from '@/lib/advanced-medical-ai'

// ---- Simple cache (Redis + memory fallback) ----
let _redis: Redis | null = null
let _redisTried = false
function getRedis(): Redis | null {
  if (process.env.DISABLE_REDIS === '1') return null
  if (_redis || _redisTried) return _redis
  try {
    if (process.env.REDIS_URL) {
      _redis = new Redis(process.env.REDIS_URL)
    } else {
      _redis = new Redis({ host: process.env.REDIS_HOST || 'localhost', port: parseInt(process.env.REDIS_PORT||'6379') })
    }
  } catch { /* ignore */ }
  _redisTried = true
  return _redis
}

interface CacheEntry { value: unknown; exp: number }
const memoryCache = new Map<string, CacheEntry>()
function cacheGet(key:string) {
  const e = memoryCache.get(key); if (!e) return undefined; if (Date.now()>e.exp){ memoryCache.delete(key); return undefined } return e.value
}
function cacheSet(key:string, value: unknown, ttlMs:number) {
  memoryCache.set(key, { value, exp: Date.now()+ttlMs })
}

// Runtime ensure of FTS index (idempotent)
let _ftsEnsured = false
async function ensureFtsIndex() {
  if (_ftsEnsured) return
  try {
    await prisma.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS medical_codes_fts_idx ON medical_codes USING GIN (to_tsvector('simple', coalesce(code,'') || ' ' || coalesce(display,'') || ' ' || coalesce(description,'')));")
    _ftsEnsured = true
  } catch (e) {
    // silencioso – fallback ILIKE
  }
}

export interface UpsertCodeSystemInput {
  kind: typeof CodeSystemKind[keyof typeof CodeSystemKind]
  name: string
  version?: string
  description?: string
  active?: boolean
}

export interface ImportMedicalCodeInput {
  systemKind: typeof CodeSystemKind[keyof typeof CodeSystemKind]
  systemVersion?: string
  codes: Array<{
    code: string
    display: string
    description?: string
    parentCode?: string
    synonyms?: string[]
  }>
  rebuildSearchText?: boolean
}

export const CodingService = {
  async upsertCodeSystem(input: UpsertCodeSystemInput) {
  return (prisma as any).codeSystem.upsert({
      where: { kind_version: { kind: input.kind, version: input.version || null } },
      update: { name: input.name, description: input.description, active: input.active ?? true },
      create: { kind: input.kind, name: input.name, version: input.version, description: input.description, active: input.active ?? true }
    })
  },
  async bulkImportCodes(input: ImportMedicalCodeInput) {
  const system = await (prisma as any).codeSystem.findFirst({ where: { kind: input.systemKind, version: input.systemVersion || null } })
    if (!system) throw new Error('CodeSystem não encontrado')

    // index parents first pass
    const parentMap: Record<string,string> = {}
  const existing = await (prisma as any).medicalCode.findMany({ where: { systemId: system.id }, select: { id:true, code:true } })
    for (const e of existing) parentMap[e.code] = e.id

    for (const c of input.codes) {
      const parentId = c.parentCode ? parentMap[c.parentCode] : undefined
  const record = await (prisma as any).medicalCode.upsert({
        where: { systemId_code: { systemId: system.id, code: c.code } },
        update: { display: c.display, description: c.description, parentId, synonyms: c.synonyms ? JSON.stringify(c.synonyms) : undefined },
        create: { systemId: system.id, code: c.code, display: c.display, description: c.description, parentId, synonyms: c.synonyms ? JSON.stringify(c.synonyms) : undefined }
      })
      parentMap[c.code] = record.id
    }
    // invalidar cache de busca
    memoryCache.clear()
    if (input.rebuildSearchText) {
      await this.rebuildSearchableText(system.id)
    }
    return { imported: input.codes.length }
  },
  async rebuildSearchableText(systemId: string) {
  const codes = await (prisma as any).medicalCode.findMany({ where: { systemId } })
    for (const c of codes) {
      const synonyms: string[] = c.synonyms ? JSON.parse(c.synonyms) : []
      const text = [c.code, c.display, c.description, c.shortDescription, ...synonyms].filter(Boolean).join(' ').toLowerCase()
  await (prisma as any).medicalCode.update({ where: { id: c.id }, data: { searchableText: text } })
    }
    return { rebuilt: codes.length }
  },
  async searchCodes(query: string, systemKind?: typeof CodeSystemKind[keyof typeof CodeSystemKind], limit = 25, opts: { fts?: boolean; chapter?: string; sexRestriction?: string; categoriesOnly?: boolean } = {}) {
    const q = query.trim()
    const cacheKey = `codeSearch:${systemKind||'ANY'}:${opts.fts?'1':'0'}:${opts.chapter||''}:${opts.sexRestriction||''}:${opts.categoriesOnly?'1':'0'}:${limit}:${q.toLowerCase()}`
    const cached = cacheGet(cacheKey)
    if (cached) return cached
    const redis = getRedis()
    if (redis) {
      try { const r = await redis.get(cacheKey); if (r) { const parsed = JSON.parse(r); cacheSet(cacheKey, parsed, 30_000); return parsed } } catch {}
    }
    let results: { id: string; code: string; display: string }[] = []
    if (opts.fts && q.length > 2) {
      await ensureFtsIndex()
      try {
        const systemFilter = systemKind ? `AND cs.kind = '${systemKind}'` : ''
        const chapterFilter = opts.chapter ? `AND mc.chapter = '${opts.chapter}'` : ''
        const sexFilter = opts.sexRestriction ? `AND (mc."sexRestriction" = '${opts.sexRestriction}' OR mc."sexRestriction" IS NULL)` : ''
        const categoryFilter = opts.categoriesOnly ? `AND mc."isCategory" = true` : ''
        results = await prisma.$queryRawUnsafe(`SELECT mc.* FROM medical_codes mc JOIN code_systems cs ON mc."systemId" = cs.id WHERE to_tsvector('simple', coalesce(mc.code,'')||' '||coalesce(mc.display,'')||' '||coalesce(mc.description,'')) @@ plainto_tsquery('simple', $1) ${systemFilter} ${chapterFilter} ${sexFilter} ${categoryFilter} ORDER BY mc.code LIMIT ${limit}`, q)
      } catch { /* fallback below */ }
    }
    if (!results.length) {
      const lo = q.toLowerCase()
      const additionalFilters: Record<string, unknown>[] = []
      if (opts.chapter) additionalFilters.push({ chapter: opts.chapter })
      if (opts.sexRestriction) additionalFilters.push({ OR: [{ sexRestriction: opts.sexRestriction }, { sexRestriction: null }] })
      if (opts.categoriesOnly) additionalFilters.push({ isCategory: true })
      
      results = await (prisma as any).medicalCode.findMany({
        where: {
          active: true,
          AND: [
            systemKind ? { system: { kind: systemKind } } : {},
            ...additionalFilters,
            { OR: [
              { code: { contains: lo, mode: 'insensitive' } },
              { display: { contains: lo, mode: 'insensitive' } },
              { shortDescription: { contains: lo, mode: 'insensitive' } },
              { searchableText: { contains: lo, mode: 'insensitive' } }
            ] }
          ]
        },
        take: limit
      })
    }
    cacheSet(cacheKey, results, 30_000)
    if (redis) { try { await redis.setex(cacheKey, 30, JSON.stringify(results)) } catch {} }
    return results
  },
  async getCodeDetail(idOrCode: string) {
    // try by id then by code
    const code = await (prisma as any).medicalCode.findFirst({ where: { id: idOrCode }, include: { parent: true } })
      || await (prisma as any).medicalCode.findFirst({ where: { code: idOrCode }, include: { parent: true } })
    if (!code) return null
    // ascend hierarchy up to 5 levels
    const path: { id: string; code: string; display: string }[] = []
    let current = code.parent
    let depth = 0
    while (current && depth < 5) {
      path.unshift({ id: current.id, code: current.code, display: current.display })
      current = await (prisma as any).medicalCode.findFirst({ where: { id: current.parentId || '' }, select: { id: true, code: true, display: true, parentId: true } })
      depth++
    }
    return { ...code, hierarchyPath: path }
  },
  async recordDiagnosis(input: {
    patientId: string
    primaryCodeId: string
    consultationId?: string
    secondaryCodeIds?: string[]
    notes?: string
    onsetDate?: Date
    certainty?: typeof DiagnosisCertainty[keyof typeof DiagnosisCertainty]
    changedByUserId?: string
    reason?: string
  }) {
    return prisma.$transaction(async (tx) => {
  const diag = await (tx as any).diagnosis.create({ data: {
        patientId: input.patientId,
        consultationId: input.consultationId,
        primaryCodeId: input.primaryCodeId,
        notes: input.notes,
        onsetDate: input.onsetDate,
        certainty: input.certainty || DiagnosisCertainty.CONFIRMED
      }})
      if (input.secondaryCodeIds?.length) {
        for (let i=0;i<input.secondaryCodeIds.length;i++) {
          await (tx as any).diagnosisSecondaryCode.create({ data: { diagnosisId: diag.id, codeId: input.secondaryCodeIds[i], order: i } })
        }
      }
      await (tx as any).diagnosisRevision.create({ data: {
        diagnosisId: diag.id,
        previous: null,
        next: { primaryCodeId: input.primaryCodeId, secondary: input.secondaryCodeIds||[], notes: input.notes, certainty: input.certainty },
        changedByUserId: input.changedByUserId,
        reason: input.reason || 'create'
      }})
      return diag
    })
  },
  async updateDiagnosis(id: string, data: Partial<{ status: typeof DiagnosisStatus[keyof typeof DiagnosisStatus]; resolvedDate: Date; notes: string; certainty: typeof DiagnosisCertainty[keyof typeof DiagnosisCertainty]; secondaryCodeIds: string[] }>) {
    return prisma.$transaction(async (tx) => {
      const current = await (tx as any).diagnosis.findUnique({ where: { id }, include: { secondaryCodes: true } })
      const updateData: Record<string, unknown> = {}
      if (data.status) updateData.status = data.status
      if (data.resolvedDate) updateData.resolvedDate = data.resolvedDate
      if (data.notes !== undefined) updateData.notes = data.notes
      if (data.certainty) updateData.certainty = data.certainty
  const diag = await (tx as any).diagnosis.update({ where: { id }, data: updateData })
      if (data.secondaryCodeIds) {
  await (tx as any).diagnosisSecondaryCode.deleteMany({ where: { diagnosisId: id } })
        for (let i=0;i<data.secondaryCodeIds.length;i++) {
          await (tx as any).diagnosisSecondaryCode.create({ data: { diagnosisId: id, codeId: data.secondaryCodeIds[i], order: i } })
        }
      }
      await (tx as any).diagnosisRevision.create({ data: {
        diagnosisId: id,
        previous: current ? { status: current.status, certainty: current.certainty, notes: current.notes, secondary: current.secondaryCodes.map((s: { codeId: string })=>s.codeId) } : null,
        next: { status: diag.status, certainty: diag.certainty, notes: diag.notes, secondary: data.secondaryCodeIds || (current?.secondaryCodes||[]).map((s: { codeId: string })=>s.codeId) }
      } })
      return diag
    })
  }
  ,async listDiagnosisRevisions(diagnosisId: string) {
    return (prisma as any).diagnosisRevision.findMany({ where: { diagnosisId }, orderBy: { changedAt: 'desc' }, take: 50 })
  }
  ,async topCodes(params: { systemKind?: string; days?: number; limit?: number } = {}) {
    const days = params.days ?? 30
    const limit = Math.min(params.limit ?? 20, 100)
    const since = new Date(Date.now() - days*86400000)
    const systemFilter = params.systemKind ? `AND cs.kind='${params.systemKind}'` : ''
    return prisma.$queryRawUnsafe(`SELECT mc.code, mc.display, COUNT(d.id) as usages
      FROM diagnoses d
      JOIN medical_codes mc ON d."primaryCodeId" = mc.id
      JOIN code_systems cs ON mc."systemId" = cs.id
      WHERE d."createdAt" >= $1 ${systemFilter}
      GROUP BY mc.code, mc.display
      ORDER BY usages DESC
      LIMIT ${limit}`, since)
  }
  ,async patientCodeTimeline(patientId: string, limit=100) {
    return prisma.$queryRawUnsafe(`SELECT d.id, d."createdAt", mc.code, mc.display
      FROM diagnoses d
      JOIN medical_codes mc ON d."primaryCodeId" = mc.id
      WHERE d."patientId" = $1
      ORDER BY d."createdAt" DESC
      LIMIT ${limit}`, patientId)
  }
  ,async suggestCodes(input: { freeText: string; systemKind?: string; limit?: number }) {
    const limit = Math.min(input.limit || 5, 15)
    const text = input.freeText.trim()
    if (!text) return []
    // Heurística rápida: extrair tokens relevantes
    const tokens = Array.from(new Set(text.toLowerCase().replace(/[^a-z0-9à-ú\s]/gi,' ').split(/\s+/).filter(t=>t.length>3))).slice(0,12)
    // Busca combinada OR por tokens
    const ors = tokens.map(t=>({ OR: [ { code: { contains: t, mode:'insensitive' } }, { display: { contains: t, mode:'insensitive' } }, { searchableText: { contains: t, mode:'insensitive' } } ] }))
    const prelim = await (prisma as any).medicalCode.findMany({
      where: { active:true, AND: [ input.systemKind ? { system: { kind: input.systemKind } } : {}, { OR: ors.map(o=>o.OR).flat() } ] },
      take: limit*3
    })
    // Ranking simples por número de matches de tokens
    const scored = prelim.map((c:any)=>{
      const hay = (c.code + ' ' + c.display + ' ' + (c.searchableText||'')).toLowerCase()
      let score = 0; for (const tk of tokens) if (hay.includes(tk)) score++
      return { c, score }
    }).sort((a: { c:any; score:number }, b: { c:any; score:number })=> b.score - a.score).slice(0, limit).map((s: { c:any; score:number })=> s.c)
    // (Opcional) tentativa de IA se chave estiver configurada
    if (process.env.GOOGLE_AI_API_KEY) {
      try {
        const ai = await medicalAI.analyzeSymptoms({
          symptoms: tokens.slice(0,8),
          patientAge: 40,
          patientGender: 'M'
        })
        const names = ai.possibleDiagnoses?.map(d=>d.name.toLowerCase())||[]
        // Boost códigos cujo display coincide com nomes IA
        for (const s of scored) {
          if (names.some(n=> s.display.toLowerCase().includes(n))) (s as any)._aiBoost = 1
        }
        return scored.sort((a:any,b:any)=> (b._aiBoost||0) - (a._aiBoost||0))
      } catch { /* silencioso */ }
    }
    return scored
  }
  ,async listChapters(systemKind?: string) {
    // Lista capítulos únicos disponíveis no sistema
    const chapters = await prisma.$queryRawUnsafe(`
      SELECT DISTINCT mc.chapter, COUNT(*) as count
      FROM medical_codes mc
      JOIN code_systems cs ON mc."systemId" = cs.id
      WHERE mc.chapter IS NOT NULL
      ${systemKind ? `AND cs.kind = '${systemKind}'` : ''}
      GROUP BY mc.chapter
      ORDER BY mc.chapter
    `)
    
    // Mapeamento de capítulos CID-10 para nomes
    const chapterNames: Record<string, string> = {
      'I': 'Doenças infecciosas e parasitárias',
      'II': 'Neoplasias',
      'III': 'Doenças do sangue e órgãos hematopoéticos',
      'IV': 'Doenças endócrinas, nutricionais e metabólicas',
      'V': 'Transtornos mentais e comportamentais',
      'VI': 'Doenças do sistema nervoso',
      'VII': 'Doenças do olho e anexos',
      'VIII': 'Doenças do ouvido e da apófise mastoide',
      'IX': 'Doenças do aparelho circulatório',
      'X': 'Doenças do aparelho respiratório',
      'XI': 'Doenças do aparelho digestivo',
      'XII': 'Doenças da pele e do tecido subcutâneo',
      'XIII': 'Doenças do sistema osteomuscular',
      'XIV': 'Doenças do aparelho geniturinário',
      'XV': 'Gravidez, parto e puerpério',
      'XVI': 'Afecções originadas no período perinatal',
      'XVII': 'Malformações congênitas',
      'XVIII': 'Sintomas, sinais e achados anormais',
      'XIX': 'Lesões, envenenamentos e causas externas',
      'XX': 'Causas externas de morbidade e mortalidade',
      'XXI': 'Fatores que influenciam o estado de saúde',
      'XXII': 'Códigos para propósitos especiais'
    }
    
    return (chapters as any[]).map(c => ({
      code: c.chapter,
      name: chapterNames[c.chapter] || `Capítulo ${c.chapter}`,
      count: Number(c.count)
    }))
  }
  ,async getCodesByChapter(chapter: string, systemKind?: string, limit = 100) {
    return (prisma as any).medicalCode.findMany({
      where: {
        chapter,
        active: true,
        ...(systemKind ? { system: { kind: systemKind } } : {})
      },
      orderBy: { code: 'asc' },
      take: limit
    })
  }
  ,async getCodeStats(systemKind?: string) {
    const systemFilter = systemKind ? `AND cs.kind = '${systemKind}'` : ''
    
    const [total, categories, withSexRestriction, etiologies, manifestations] = await Promise.all([
      prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM medical_codes mc JOIN code_systems cs ON mc."systemId" = cs.id WHERE 1=1 ${systemFilter}`),
      prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM medical_codes mc JOIN code_systems cs ON mc."systemId" = cs.id WHERE mc."isCategory" = true ${systemFilter}`),
      prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM medical_codes mc JOIN code_systems cs ON mc."systemId" = cs.id WHERE mc."sexRestriction" IS NOT NULL ${systemFilter}`),
      prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM medical_codes mc JOIN code_systems cs ON mc."systemId" = cs.id WHERE mc."crossAsterisk" = 'ETIOLOGY' ${systemFilter}`),
      prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM medical_codes mc JOIN code_systems cs ON mc."systemId" = cs.id WHERE mc."crossAsterisk" = 'MANIFESTATION' ${systemFilter}`)
    ])
    
    return {
      total: Number((total as any)[0]?.count || 0),
      categories: Number((categories as any)[0]?.count || 0),
      withSexRestriction: Number((withSexRestriction as any)[0]?.count || 0),
      etiologyCodes: Number((etiologies as any)[0]?.count || 0),
      manifestationCodes: Number((manifestations as any)[0]?.count || 0)
    }
  }
  ,async searchCodesForGender(query: string, gender: 'M' | 'F', systemKind?: string, limit = 25) {
    // Busca códigos válidos para o gênero do paciente
    return this.searchCodes(query, systemKind as any, limit, { sexRestriction: gender })
  }
}
