import { prisma } from '@/lib/prisma'
import type { CodeSystemKind, Prisma } from '@prisma/client'
import crypto from 'crypto'

export interface ExternalMappedRecord {
  code: string
  display: string
  description?: string
  parentCode?: string
}

export interface ExternalFetchAdapter<TRecord, TMapped extends ExternalMappedRecord = ExternalMappedRecord> {
  name: string
  sourceType: 'ICD10' | 'ICD11' | 'CIAP2' | 'NURSING' | 'CBO'
  fetchList(): Promise<TRecord[]>
  mapRecord(record: TRecord): TMapped
  version?(): Promise<string | undefined>
}

export interface ExternalUpdateOptions {
  dryRun?: boolean
  retireMissing?: boolean
  preview?: boolean
}

export interface ExternalUpdateSummary {
  inserted: number
  updated: number
  skipped: number
  retired: number
  fetched: number
  preview: boolean
  meta: Record<string, unknown>
}

export interface ExternalUpdateSkipped {
  skipped: true
  reason: string
  count: number
}

type ExternalUpdateResult = ExternalUpdateSummary | ExternalUpdateSkipped

type PrismaExternalSourceUpdateDelegate = typeof prisma.externalSourceUpdate
type PrismaOccupationDelegate = typeof prisma.occupation
type PrismaCboGroupDelegate = typeof prisma.cBOGroup
type PrismaCodeSystemDelegate = typeof prisma.codeSystem
type PrismaMedicalCodeDelegate = typeof prisma.medicalCode

type OccupationSummary = Pick<Prisma.OccupationGetPayload<{ select: {
  id: true
  code: true
  title: true
  description: true
  groupId: true
  active: true
} }>, 'id' | 'code' | 'title' | 'description' | 'groupId' | 'active'>

type CboGroupSummary = Pick<Prisma.CBOGroupGetPayload<{ select: { id: true; code: true; level: true } }>, 'id' | 'code' | 'level'>

type MedicalCodeSummary = Pick<Prisma.MedicalCodeGetPayload<{ select: {
  id: true
  code: true
  display: true
  description: true
  active: true
} }>, 'id' | 'code' | 'display' | 'description' | 'active'>

type CodeSystemSummary = Pick<Prisma.CodeSystemGetPayload<{ select: {
  id: true
  kind: true
  name: true
  version: true
} }>, 'id' | 'kind' | 'name' | 'version'>

export class ExternalUpdatesService<TRecord, TMapped extends ExternalMappedRecord = ExternalMappedRecord> {
  constructor(private readonly adapter: ExternalFetchAdapter<TRecord, TMapped>) {}

  async runUpdate(options: ExternalUpdateOptions = {}): Promise<ExternalUpdateResult> {
    const externalSourceUpdate: PrismaExternalSourceUpdateDelegate = prisma.externalSourceUpdate
    const occupationDelegate: PrismaOccupationDelegate = prisma.occupation
    const cboGroupDelegate: PrismaCboGroupDelegate = prisma.cBOGroup
    const codeSystemDelegate: PrismaCodeSystemDelegate = prisma.codeSystem
    const medicalCodeDelegate: PrismaMedicalCodeDelegate = prisma.medicalCode

    const versionTag = this.adapter.version ? await this.adapter.version() : undefined
    const start = await externalSourceUpdate.create({
      data: {
        sourceType: this.adapter.sourceType,
        versionTag,
        status: 'RUNNING'
      }
    })

    try {
      const list = await this.adapter.fetchList()
      const rawJson = JSON.stringify(list)
      const checksum = crypto.createHash('sha256').update(rawJson).digest('hex')

      const recentSame = await externalSourceUpdate.findFirst({
        where: {
          sourceType: this.adapter.sourceType,
          checksum
        },
        orderBy: { startedAt: 'desc' }
      })

      if (recentSame) {
        await externalSourceUpdate.update({
          where: { id: start.id },
          data: {
            status: 'SUCCESS',
            finishedAt: new Date(),
            fetchedCount: list.length,
            checksum,
            skippedCount: list.length,
            meta: JSON.stringify({ skippedReason: 'checksum_match' })
          }
        })

        return { skipped: true, reason: 'checksum_match', count: list.length }
      }

      let inserted = 0
      let updated = 0
      let skipped = 0
      let retired = 0
      const meta: Record<string, unknown> = {}

      if (this.adapter.sourceType === 'CBO') {
        const existingActive: OccupationSummary[] = await occupationDelegate.findMany({
          where: { active: true },
          select: { id: true, code: true, title: true, description: true, groupId: true, active: true }
        })

        const incomingCodes = new Set<string>()
        const occupationMapped = list.map((item) => this.adapter.mapRecord(item))

        const groupCodesNeeded = new Set<string>()
        const occToFamily: Record<string, string | undefined> = {}
        for (const mapped of occupationMapped) {
          const digits = mapped.code.replace(/[^0-9]/g, '')
          if (digits.length >= 1) groupCodesNeeded.add(digits.substring(0, 1))
          if (digits.length >= 2) groupCodesNeeded.add(digits.substring(0, 2))
          if (digits.length >= 3) groupCodesNeeded.add(digits.substring(0, 3))
          if (digits.length >= 4) {
            const family = digits.substring(0, 4)
            groupCodesNeeded.add(family)
            occToFamily[mapped.code] = family
          }
        }

        const existingGroups: CboGroupSummary[] = await cboGroupDelegate.findMany({
          where: { code: { in: Array.from(groupCodesNeeded) } },
          select: { id: true, code: true, level: true }
        })

        const groupIdByCode = new Map<string, string>()
        for (const group of existingGroups) {
          groupIdByCode.set(group.code, group.id)
        }

        const createGroup = async (code: string): Promise<string> => {
          const existingId = groupIdByCode.get(code)
          if (existingId) return existingId

          const level = code.length === 1 ? 1 : code.length === 2 ? 2 : code.length === 3 ? 3 : 4
          const parentCode = level === 1 ? undefined : code.substring(0, code.length - 1)
          const parentId = parentCode ? groupIdByCode.get(parentCode) : undefined
          const name = level === 1
            ? `Grupo ${code}`
            : level === 2
              ? `Subgrupo Principal ${code}`
              : level === 3
                ? `Subgrupo ${code}`
                : `Família ${code}`

          if (options.dryRun) {
            const dryId = `dry-${code}`
            groupIdByCode.set(code, dryId)
            return dryId
          }

          const created = await cboGroupDelegate.create({ data: { code, name, level, parentId } })
          groupIdByCode.set(code, created.id)
          return created.id
        }

        const orderedGroupCodes = Array.from(groupCodesNeeded).sort((a, b) => a.length - b.length || a.localeCompare(b))
        for (const groupCode of orderedGroupCodes) {
          if (groupCode.length > 1) {
            for (let i = 1; i < groupCode.length; i += 1) {
              const prefix = groupCode.substring(0, i)
              if (!groupIdByCode.has(prefix)) {
                await createGroup(prefix)
              }
            }
          }
          await createGroup(groupCode)
        }

        for (const mapped of occupationMapped) {
          incomingCodes.add(mapped.code)
          const existing = await occupationDelegate.findFirst({ where: { code: mapped.code } })
          const groupCode = occToFamily[mapped.code]
          const groupId = groupCode ? groupIdByCode.get(groupCode) : undefined

          if (!existing) {
            if (!options.dryRun) {
              await occupationDelegate.create({
                data: {
                  code: mapped.code,
                  title: mapped.display,
                  description: mapped.description,
                  groupId
                }
              })
            }
            inserted += 1
            continue
          }

          const before = `${existing.description ?? ''}|${existing.title}|${existing.groupId ?? ''}`
          const after = `${mapped.description ?? ''}|${mapped.display}|${groupId ?? ''}`
          if (before !== after) {
            if (!options.dryRun) {
              await occupationDelegate.update({
                where: { id: existing.id },
                data: {
                  title: mapped.display,
                  description: mapped.description,
                  groupId
                }
              })
            }
            updated += 1
          } else {
            skipped += 1
          }
        }

        if (options.retireMissing) {
          const toRetire = existingActive.filter((current) => !incomingCodes.has(current.code))
          if (options.preview) {
            meta.toRetire = toRetire.map((item) => item.code)
          } else if (!options.dryRun && toRetire.length) {
            await occupationDelegate.updateMany({
              where: { id: { in: toRetire.map((item) => item.id) } },
              data: { active: false }
            })
          }
          retired = toRetire.length
        }
      } else {
        const systemKind: CodeSystemKind =
          this.adapter.sourceType === 'ICD10' ? 'CID10'
            : this.adapter.sourceType === 'ICD11' ? 'CID11'
              : this.adapter.sourceType === 'CIAP2' ? 'CIAP2'
                : this.adapter.sourceType === 'NURSING' ? 'NURSING' : 'CID10'

        let system = await codeSystemDelegate.findFirst({
          where: { kind: systemKind, version: versionTag ?? null },
          select: { id: true, kind: true, name: true, version: true }
        }) as CodeSystemSummary | null
        if (!system) {
          if (options.dryRun) {
            system = {
              id: 'dry',
              kind: systemKind,
              name: `${systemKind} Imported`,
              version: versionTag ?? null
            }
          } else {
            system = await codeSystemDelegate.create({
              data: {
                kind: systemKind,
                name: `${systemKind} Imported`,
                version: versionTag
              },
              select: { id: true, kind: true, name: true, version: true }
            })
          }
        }

        if (!system) {
          throw new Error('Falha ao resolver sistema de códigos para atualização externa.')
        }

        const parentCache = new Map<string, string>()
        const existingCodes: MedicalCodeSummary[] = await medicalCodeDelegate.findMany({
          where: { systemId: system.id },
          select: { id: true, code: true, display: true, description: true, active: true }
        })
        for (const existing of existingCodes) {
          parentCache.set(existing.code, existing.id)
        }

        const incomingCodes = new Set<string>()
        for (const item of list) {
          const mapped = this.adapter.mapRecord(item)
          const parentId = mapped.parentCode ? parentCache.get(mapped.parentCode) : undefined
          incomingCodes.add(mapped.code)
          const existing = existingCodes.find((code) => code.code === mapped.code)

          if (!existing) {
            if (!options.dryRun) {
              const created = await medicalCodeDelegate.create({
                data: {
                  systemId: system.id,
                  code: mapped.code,
                  display: mapped.display,
                  description: mapped.description,
                  parentId
                }
              })
              parentCache.set(mapped.code, created.id)
            }
            inserted += 1
            continue
          }

          const before = `${existing.display ?? ''}|${existing.description ?? ''}`
          const after = `${mapped.display ?? ''}|${mapped.description ?? ''}`
          if (before !== after || (mapped.parentCode && !parentCache.has(mapped.parentCode))) {
            if (!options.dryRun) {
              await medicalCodeDelegate.update({
                where: { id: existing.id },
                data: {
                  display: mapped.display,
                  description: mapped.description,
                  parentId
                }
              })
            }
            updated += 1
          } else {
            skipped += 1
          }
        }

        if (options.retireMissing) {
          const toRetire = existingCodes.filter((record) => !incomingCodes.has(record.code) && record.active)
          if (options.preview) {
            meta.toRetire = toRetire.map((record) => record.code)
          } else if (!options.dryRun && toRetire.length) {
            await medicalCodeDelegate.updateMany({
              where: { id: { in: toRetire.map((record) => record.id) } },
              data: { active: false }
            })
          }
          retired = toRetire.length
        }
      }

      const updateData: Prisma.ExternalSourceUpdateUpdateInput = {
        status: 'SUCCESS',
        finishedAt: new Date(),
        fetchedCount: list.length,
        insertedCount: inserted,
        updatedCount: updated,
        skippedCount: skipped,
        retiredCount: retired,
        checksum
      }

      if (Object.keys(meta).length) {
        updateData.meta = JSON.stringify(meta)
      }

      await externalSourceUpdate.update({
        where: { id: start.id },
        data: updateData
      })

      return {
        inserted,
        updated,
        skipped,
        retired,
        fetched: list.length,
        preview: Boolean(options.preview),
        meta
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      await externalSourceUpdate.update({
        where: { id: start.id },
        data: {
          status: 'ERROR',
          finishedAt: new Date(),
          errorMessage: message
        }
      })
      throw error
    }
  }
}
