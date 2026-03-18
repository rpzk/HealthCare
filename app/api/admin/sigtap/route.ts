/**
 * GET  /api/admin/sigtap  — competência atualmente carregada
 * POST /api/admin/sigtap  — aciona atualização em background
 *
 * Body POST (opcional):
 *   { competencia?: "YYYYMM", force?: boolean }
 */
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { withRbac } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { execFile } from 'child_process'
import path from 'path'

export const GET = withRbac('admin', async () => {
  const setting = await (prisma as any).systemSetting
    .findUnique({ where: { key: 'sigtap_competencia' } })
    .catch(() => null)

  return NextResponse.json({
    loaded: setting?.value ?? null,
    updatedAt: setting?.updatedAt ?? null,
  })
})

export const POST = withRbac('admin', async (req: NextRequest, { user }) => {
  const body = await req.json().catch(() => ({}))
  const competencia: string | undefined = body.competencia
  const force: boolean = body.force === true

  if (competencia && !/^\d{6}$/.test(competencia)) {
    return NextResponse.json({ error: 'competencia deve ser YYYYMM (ex: 202603)' }, { status: 400 })
  }

  logger.info(`[SigtapAdmin] Atualização solicitada por ${user.email} (competencia=${competencia ?? 'auto'}, force=${force})`)

  // Executa em background — não bloqueia a requisição
  const scriptPath = path.join(process.cwd(), 'scripts', 'update-sigtap.ts')
  const scriptArgs = ['tsx', scriptPath]
  if (competencia) scriptArgs.push('--competencia', competencia)
  if (force) scriptArgs.push('--force')

  const child = execFile(scriptArgs[0], scriptArgs.slice(1), {
    env: { ...process.env },
    cwd: process.cwd(),
  })

  child.stdout?.on('data', (d) => process.stdout.write(d))
  child.stderr?.on('data', (d) => process.stderr.write(d))
  child.on('close', (code) => {
    if (code === 0) {
      logger.info('[SigtapAdmin] Atualização concluída com sucesso')
    } else {
      logger.error(`[SigtapAdmin] Atualização falhou com código ${code}`)
    }
  })

  return NextResponse.json(
    {
      message: 'Atualização SIGTAP iniciada em background.',
      competencia: competencia ?? 'auto-detectada',
      note: 'Acompanhe os logs do servidor. Pode demorar 10-20 minutos.',
    },
    { status: 202 },
  )
})
