import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export interface ExternalFetchAdapter<T> {
  name: string
  sourceType: 'ICD10' | 'ICD11' | 'CIAP2' | 'NURSING' | 'CBO'
  fetchList(): Promise<T[]> // baixa e parseia a lista completa de códigos / ocupações
  mapRecord(r: T): { code: string; display: string; description?: string; parentCode?: string }
  version?(): Promise<string | undefined>
}

export class ExternalUpdatesService {
  constructor(private adapter: ExternalFetchAdapter<any>) {}

  async runUpdate(options: { dryRun?: boolean; retireMissing?: boolean; preview?: boolean } = {}) {
    const versionTag = this.adapter.version ? await this.adapter.version() : undefined
    const start = await (prisma as any).externalSourceUpdate.create({ data: { sourceType: this.adapter.sourceType, versionTag, status: 'RUNNING' } })
    try {
      const list = await this.adapter.fetchList()
      const rawJson = JSON.stringify(list)
      const checksum = crypto.createHash('sha256').update(rawJson).digest('hex')
      // evitar reprocessar mesma versão/checksum
      const recentSame = await (prisma as any).externalSourceUpdate.findFirst({ where: { sourceType: this.adapter.sourceType, checksum }, orderBy: { startedAt: 'desc' } })
      if (recentSame) {
        await (prisma as any).externalSourceUpdate.update({ where: { id: start.id }, data: { status: 'SUCCESS', finishedAt: new Date(), fetchedCount: list.length, checksum, skippedCount: list.length, meta: JSON.stringify({ skippedReason: 'checksum_match' }) } })
        return { skipped: true, reason: 'checksum_match', count: list.length }
      }
      let inserted=0, updated=0, skipped=0, retired=0
      const meta: any = {}
      if (this.adapter.sourceType === 'CBO') {
        // Hierarquia CBO (Grupos) + Occupation
        const existingAll = await (prisma as any).occupation.findMany({ where: { active: true }, select: { id:true, code:true, title:true, description:true, groupId:true } })
        const incomingCodes = new Set<string>()
        const occupationMapped = list.map((item:any) => this.adapter.mapRecord(item))

        // Coleta códigos de grupos (níveis 1,2,3,4) a partir do prefixo numérico das ocupações
        const groupCodesNeeded = new Set<string>()
        const occToFamily: Record<string,string|undefined> = {}
        for (const mapped of occupationMapped) {
          const digits = mapped.code.replace(/[^0-9]/g,'') // remove hífen
          if (digits.length >= 1) groupCodesNeeded.add(digits.substring(0,1))
          if (digits.length >= 2) groupCodesNeeded.add(digits.substring(0,2))
          if (digits.length >= 3) groupCodesNeeded.add(digits.substring(0,3))
          if (digits.length >= 4) {
            const family = digits.substring(0,4)
            groupCodesNeeded.add(family)
            occToFamily[mapped.code] = family
          }
        }

        // Carrega grupos existentes
        const existingGroups = await (prisma as any).cBOGroup.findMany({ where: { code: { in: Array.from(groupCodesNeeded) } }, select: { id:true, code:true, level:true } })
        const groupIdByCode: Record<string,string> = {}
        for (const g of existingGroups) groupIdByCode[g.code] = g.id

        // Cria grupos que faltam em ordem de nível
        const createGroup = async (code: string) => {
          if (groupIdByCode[code]) return groupIdByCode[code]
            const level = code.length === 1 ? 1 : code.length === 2 ? 2 : code.length === 3 ? 3 : 4
            const parentCode = level === 1 ? undefined : code.substring(0, code.length - 1)
            const parentId = parentCode ? groupIdByCode[parentCode] : undefined
            const name = level === 1 ? `Grupo ${code}` : level === 2 ? `Subgrupo Principal ${code}` : level === 3 ? `Subgrupo ${code}` : `Família ${code}`
            if (!options.dryRun) {
              const created = await (prisma as any).cBOGroup.create({ data: { code, name, level, parentId } })
              groupIdByCode[code] = created.id
              return created.id
            } else {
              groupIdByCode[code] = `dry-${code}`
              return groupIdByCode[code]
            }
        }

        const orderedGroupCodes = Array.from(groupCodesNeeded).sort((a,b)=> a.length - b.length || a.localeCompare(b))
        for (const gc of orderedGroupCodes) {
          // garante cadeia ascendente
          if (gc.length > 1) {
            for (let i=1;i<gc.length;i++) {
              const prefix = gc.substring(0,i)
              if (!groupIdByCode[prefix]) await createGroup(prefix)
            }
          }
          await createGroup(gc)
        }

        for (const mapped of occupationMapped) {
          incomingCodes.add(mapped.code)
          const existing = await (prisma as any).occupation.findFirst({ where: { code: mapped.code } })
          const groupCode = occToFamily[mapped.code]
          const groupId = groupCode ? groupIdByCode[groupCode] : undefined
          if (!existing) {
            if (!options.dryRun) await (prisma as any).occupation.create({ data: { code: mapped.code, title: mapped.display, description: mapped.description, groupId } })
            inserted++
          } else {
            const before = (existing.description||'') + '|' + existing.title + '|' + (existing.groupId||'')
            const after = (mapped.description||'') + '|' + mapped.display + '|' + (groupId||'')
            if (before !== after) {
              if (!options.dryRun) await (prisma as any).occupation.update({ where: { id: existing.id }, data: { title: mapped.display, description: mapped.description, groupId } })
              updated++
            } else {
              skipped++
            }
          }
        }
        if (options.retireMissing) {
          const toRetire = existingAll.filter((e: any) => !incomingCodes.has(e.code))
          if (options.preview) meta.toRetire = toRetire.map((t: any)=> t.code)
          else if (!options.dryRun) {
            await (prisma as any).occupation.updateMany({ where: { id: { in: toRetire.map((t:any)=> t.id) } }, data: { active: false } })
          }
          retired = toRetire.length
        }
      } else {
        // Demais: MedicalCode dentro de CodeSystem correspondente
        const systemKind = this.adapter.sourceType === 'ICD10' ? 'CID10'
          : this.adapter.sourceType === 'ICD11' ? 'CID11'
          : this.adapter.sourceType === 'CIAP2' ? 'CIAP2'
          : this.adapter.sourceType === 'NURSING' ? 'NURSING' : 'CID10'
        let system = await (prisma as any).codeSystem.findFirst({ where: { kind: systemKind, version: versionTag || null } })
        if (!system) {
          if (!options.dryRun) {
            system = await (prisma as any).codeSystem.create({ data: { kind: systemKind, name: systemKind + ' Imported', version: versionTag } })
          } else {
            system = { id: 'dry', kind: systemKind }
          }
        }
        // index parents first pass
        const parentCache: Record<string,string> = {}
        const existingAll: { id:string; code:string; display:string; description:string | null; active:boolean }[] = await (prisma as any).medicalCode.findMany({ where: { systemId: system.id }, select: { id:true, code:true, display:true, description:true, active:true } })
        for (const e of existingAll) parentCache[e.code] = e.id
        const incomingCodes = new Set<string>()
        for (const item of list) {
          const mapped = this.adapter.mapRecord(item)
          const parentId = mapped.parentCode ? parentCache[mapped.parentCode] : undefined
          incomingCodes.add(mapped.code)
          const existing = existingAll.find((x) => x.code === mapped.code)
          if (!existing) {
            if (!options.dryRun) {
              const created = await (prisma as any).medicalCode.create({ data: { systemId: system.id, code: mapped.code, display: mapped.display, description: mapped.description, parentId } })
              parentCache[mapped.code] = created.id
            }
            inserted++
          } else {
            const before = (existing.display||'') + '|' + (existing.description||'')
            const after = (mapped.display||'') + '|' + (mapped.description||'')
            if (before !== after) {
              if (!options.dryRun) await (prisma as any).medicalCode.update({ where: { id: existing.id }, data: { display: mapped.display, description: mapped.description, parentId } })
              updated++
            } else skipped++
          }
        }
        if (options.retireMissing) {
          const toRetire = existingAll.filter((e:any) => !incomingCodes.has(e.code) && e.active)
          if (options.preview) meta.toRetire = toRetire.map((t:any)=> t.code)
          else if (!options.dryRun) {
            await (prisma as any).medicalCode.updateMany({ where: { id: { in: toRetire.map((t:any)=> t.id) } }, data: { active: false } })
          }
          retired = toRetire.length
        }
      }
      const updateData: any = { status: 'SUCCESS', finishedAt: new Date(), fetchedCount: list.length, insertedCount: inserted, updatedCount: updated, skippedCount: skipped, retiredCount: retired, checksum }
      if (Object.keys(meta).length) updateData.meta = JSON.stringify(meta)
      if (options.preview) {
        // Não persiste SUCCESS real em preview: mantem RUNNING -> SUCCESS com meta preview
        updateData.status = 'SUCCESS'
      }
      await (prisma as any).externalSourceUpdate.update({ where: { id: start.id }, data: updateData })
      return { inserted, updated, skipped, retired, fetched: list.length, preview: !!options.preview, meta }
    } catch (e:any) {
      await (prisma as any).externalSourceUpdate.update({ where: { id: start.id }, data: { status: 'ERROR', finishedAt: new Date(), errorMessage: e.message } })
      throw e
    }
  }
}
