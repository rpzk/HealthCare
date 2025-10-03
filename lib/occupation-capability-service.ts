import { prisma } from '@/lib/prisma'
import * as PrismaNS from '@prisma/client'
const { StratumLevel } = PrismaNS as any
import { auditLogger, AuditAction } from '@/lib/audit-logger'

export interface UpsertCBOGroupInput { code: string; name: string; level: number; parentCode?: string }
export interface UpsertOccupationInput { code: string; title: string; description?: string; groupCode?: string; synonyms?: string[] }
export interface CreateJobRoleInput { title: string; occupationCode?: string; requiredMinStratum: typeof StratumLevel[keyof typeof StratumLevel]; requiredMaxStratum?: typeof StratumLevel[keyof typeof StratumLevel]; description?: string; tasks?: string; capabilities?: Record<string, number> }
export interface AssignUserRoleInput { userId: string; jobRoleId: string }
export interface CapabilityEvaluationInput { subjectUserId: string; evaluatorUserId: string; jobRoleId?: string; stratumAssessed: typeof StratumLevel[keyof typeof StratumLevel]; potentialStratum?: typeof StratumLevel[keyof typeof StratumLevel]; timeSpanMonths?: number; evidence?: string; gaps?: Record<string, any>; recommendations?: string }

export const OccupationCapabilityService = {
  async upsertGroup(input: UpsertCBOGroupInput, actor?: { id:string; email?:string; role?:string }) {
    const parent = input.parentCode ? await (prisma as any).cBOGroup.findFirst({ where: { code: input.parentCode } }) : null
    const res = await (prisma as any).cBOGroup.upsert({
      where: { code: input.code },
      update: { name: input.name, level: input.level, parentId: parent?.id },
      create: { code: input.code, name: input.name, level: input.level, parentId: parent?.id }
    })
    // auditoria genérica (sem usuário explícito aqui - caller deve complementar depois se necessário)
  try { auditLogger.log(actor?.id||'system', actor?.email||'system@local', actor?.role||'SYSTEM', AuditAction.DATA_IMPORT, 'CBOGroup', { resourceId: res.id }) } catch {}
    return res
  },
  async upsertOccupation(input: UpsertOccupationInput, actor?: { id:string; email?:string; role?:string }) {
    const group = input.groupCode ? await (prisma as any).cBOGroup.findFirst({ where: { code: input.groupCode } }) : null
    const res = await (prisma as any).occupation.upsert({
      where: { code: input.code },
      update: { title: input.title, description: input.description, groupId: group?.id, synonyms: input.synonyms ? JSON.stringify(input.synonyms) : undefined },
      create: { code: input.code, title: input.title, description: input.description, groupId: group?.id, synonyms: input.synonyms ? JSON.stringify(input.synonyms) : undefined }
    })
  try { auditLogger.log(actor?.id||'system', actor?.email||'system@local', actor?.role||'SYSTEM', AuditAction.DATA_IMPORT, 'Occupation', { resourceId: res.id }) } catch {}
    return res
  },
  async createJobRole(input: CreateJobRoleInput, actor?: { id:string; email?:string; role?:string }) {
    const occ = input.occupationCode ? await (prisma as any).occupation.findFirst({ where: { code: input.occupationCode } }) : null
    const res = await (prisma as any).jobRole.create({ data: {
      title: input.title,
      occupationId: occ?.id,
      requiredMinStratum: input.requiredMinStratum,
      requiredMaxStratum: input.requiredMaxStratum,
      description: input.description,
      tasks: input.tasks,
      capabilitiesJson: input.capabilities ? JSON.stringify(input.capabilities) : undefined
    }})
  try { auditLogger.log(actor?.id||'system', actor?.email||'system@local', actor?.role||'SYSTEM', AuditAction.DATA_IMPORT, 'JobRole', { resourceId: res.id }) } catch {}
    return res
  },
  async assignUserRole(input: AssignUserRoleInput, actor?: { id:string; email?:string; role?:string }) {
    const res = await (prisma as any).userJobRole.upsert({
      where: { userId_jobRoleId: { userId: input.userId, jobRoleId: input.jobRoleId } },
      update: { active: true },
      create: { userId: input.userId, jobRoleId: input.jobRoleId }
    })
  try { auditLogger.log(actor?.id||'system', actor?.email||'system@local', actor?.role||'SYSTEM', AuditAction.DATA_IMPORT, 'UserJobRole', { resourceId: res.id }) } catch {}
    return res
  },
  async evaluateCapability(input: CapabilityEvaluationInput, actor?: { id:string; email?:string; role?:string }) {
    // Auto-inferir estrato se não fornecido com base em timeSpanMonths siguiendo heurística Jaques
    let stratum = input.stratumAssessed
    if(!stratum && input.timeSpanMonths){
      const m = input.timeSpanMonths
      if (m <= 3) stratum = 'S1'; else if (m <= 12) stratum = 'S2'; else if (m <= 24) stratum = 'S3'; else if (m <= 48) stratum = 'S4'; else if (m <= 84) stratum = 'S5'; else if (m <= 120) stratum = 'S6'; else if (m <= 180) stratum = 'S7'; else stratum = 'S8'
    }
    // Calcular capabilityScores cruzando gaps vs capabilities do jobRole (se houver)
    let capabilityScores: any = null
    if (input.jobRoleId) {
      const jr = await (prisma as any).jobRole.findFirst({ where: { id: input.jobRoleId } })
      if (jr?.capabilitiesJson) {
        try {
          const weights = JSON.parse(jr.capabilitiesJson)
          capabilityScores = {}
          for (const k of Object.keys(weights)) {
            const gapVal = input.gaps ? input.gaps[k] : undefined
            // gap textual penaliza levemente
            let gapPenalty = 0
            if (typeof gapVal === 'string' && gapVal.length) gapPenalty = 0.1
            capabilityScores[k] = Math.max(0, Math.min(1, (weights[k] || 0) - gapPenalty))
          }
        } catch {}
      }
    }
    const res = await (prisma as any).capabilityEvaluation.create({ data: {
      subjectUserId: input.subjectUserId,
      evaluatorUserId: input.evaluatorUserId,
      jobRoleId: input.jobRoleId,
      stratumAssessed: stratum || input.stratumAssessed,
      potentialStratum: input.potentialStratum,
      timeSpanMonths: input.timeSpanMonths,
      evidence: input.evidence,
      gaps: input.gaps ? JSON.stringify(input.gaps) : undefined,
      recommendations: input.recommendations,
      capabilityScores: capabilityScores ? JSON.stringify(capabilityScores) : undefined
    }})
  try { auditLogger.log(actor?.id||'system', actor?.email||'system@local', actor?.role||'SYSTEM', AuditAction.CAPABILITY_EVALUATION_CREATE, 'CapabilityEvaluation', { resourceId: res.id }) } catch {}
    return res
  },
  async listUserEvaluations(userId: string, limit=50) {
    return (prisma as any).capabilityEvaluation.findMany({ where: { subjectUserId: userId }, orderBy: { createdAt: 'desc' }, take: limit })
  },
  async searchOccupations(query: string, limit=30) {
    const q = query.trim().toLowerCase()
    return (prisma as any).occupation.findMany({ where: { OR: [ { code: { contains: q, mode: 'insensitive' } }, { title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } } ] }, take: limit })
  },
  async matchUserToRoles(userId: string, limit=20) {
    // Coleta última avaliação do usuário por createdAt
    const lastEval = await (prisma as any).capabilityEvaluation.findFirst({ where: { subjectUserId: userId }, orderBy: { createdAt: 'desc' } })
    const roles = await (prisma as any).jobRole.findMany({ where: { active: true }, take: limit*3 })
    if (!lastEval) return roles.slice(0, limit)
    const userStratum = lastEval.stratumAssessed
    // ranking por proximidade de estrato + ocupação se existir potencial
    const ord = roles.map((r:any)=>{
      const min = r.requiredMinStratum as string
      const max = r.requiredMaxStratum as string | null
      const score = this._fitScore(userStratum, min, max, lastEval.potentialStratum)
      return { role: r, score }
    }).sort((a: { role:any; score:number }, b: { role:any; score:number })=> b.score - a.score).slice(0, limit).map((x: { role:any; score:number })=> ({ ...x.role, _fitScore: x.score }))
    return ord
  }
  ,async batchImport(payload: { groups?: UpsertCBOGroupInput[]; occupations?: UpsertOccupationInput[]; roles?: CreateJobRoleInput[] }, actor?: { id:string; email?:string; role?:string }) {
    let g=0,o=0,r=0
  if (payload.groups) { for (const gg of payload.groups) { await this.upsertGroup(gg, actor); g++ } }
  if (payload.occupations) { for (const oc of payload.occupations) { await this.upsertOccupation(oc, actor); o++ } }
  if (payload.roles) { for (const rl of payload.roles) { await this.createJobRole(rl, actor); r++ } }
    return { groups:g, occupations:o, roles:r }
  }
  ,async groupTree(depth=3) {
    const groups = await (prisma as any).cBOGroup.findMany({ orderBy: { level: 'asc' } })
    const byParent: Record<string, any[]> = {}
    for (const g of groups) { const p = g.parentId || 'root'; (byParent[p] ||= []).push(g) }
    function build(parentId:string|null, d:number): any[] { if (d===0) return [];
      return (byParent[parentId||'root']||[]).map(g=> ({ id:g.id, code:g.code, name:g.name, level:g.level, children: build(g.id, d-1) })) }
    return build(null, depth)
  }
  ,_fitScore(userStratum: string, min: string, max: string|null, potential?: string|null) {
    const order = ['S1','S2','S3','S4','S5','S6','S7','S8']
    const idx = (s:string)=> order.indexOf(s)
    const u = idx(userStratum); const mn = idx(min); const mx = max? idx(max): mn
    if (u < mn) { // abaixo do mínimo
      const gap = mn - u; return 0.4 - gap*0.1
    }
    if (u > mx) { // acima do máximo – possível over-skill
      return 0.6 - (u-mx)*0.05
    }
    let base = 0.75 + (mx - mn)*0.02
    if (potential) { const p = idx(potential); if (p > mx) base += Math.min(0.15, (p-mx)*0.05) }
    return Math.min(1, Math.max(0, base))
  }
}
