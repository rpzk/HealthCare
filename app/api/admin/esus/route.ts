/**
 * API e-SUS AB - Administração e Exportação
 * 
 * GET - Retorna status e configuração
 * POST - Exporta lote de fichas
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ESUSService } from '@/lib/esus-service'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const runtime = 'nodejs'

// ============ GET - Status e Configuração ============

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar se é admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    // Roles administrativas que podem acessar o e-SUS
    const adminRoles = ['ADMIN', 'DOCTOR', 'NURSE']
    if (!user?.role || !adminRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Verificar configuração
    const config = await ESUSService.checkConfig()

    // Estatísticas
    const stats = await prisma.eSUSSubmission.groupBy({
      by: ['status'],
      _count: true
    })

    // Últimos lotes
    const recentBatches = await ESUSService.listBatches(10)

    // Contagem de consultas pendentes de envio (sem envio e-SUS)
    // Buscamos consultas completas que não tenham um registro em ESUSSubmission
    const allCompletedIds = await prisma.consultation.findMany({
      where: { status: 'COMPLETED' },
      select: { id: true }
    })

    const submittedIds = await prisma.eSUSSubmission.findMany({
      where: {
        fichaType: { in: ['CDS_ATENDIMENTO_INDIVIDUAL', 'CDS_ATENDIMENTO_BATCH'] }
      },
      select: { localResourceId: true }
    })

    const submittedSet = new Set(submittedIds.map(s => s.localResourceId))
    const pendingConsultations = allCompletedIds.filter(c => !submittedSet.has(c.id)).length

    return NextResponse.json({
      config,
      stats: stats.reduce((acc, s) => ({ ...acc, [s.status]: s._count }), {}),
      recentBatches,
      pendingConsultations
    })
  } catch (error) {
    console.error('[e-SUS API] Erro GET:', error)
    return NextResponse.json(
      { error: 'Erro interno ao buscar status' },
      { status: 500 }
    )
  }
}

// ============ POST - Exportar Lote ============

const exportSchema = z.object({
  startDate: z.string().transform(s => new Date(s)),
  endDate: z.string().transform(s => new Date(s)),
  format: z.enum(['xml', 'json']).optional().default('xml')
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar se é admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    // Roles administrativas que podem acessar o e-SUS
    const adminRoles = ['ADMIN', 'DOCTOR', 'NURSE']
    if (!user?.role || !adminRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = exportSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { startDate, endDate, format } = parsed.data

    // Verificar configuração
    const config = await ESUSService.checkConfig()
    if (!config.configured) {
      return NextResponse.json(
        { error: 'e-SUS não configurado', configErrors: config.errors },
        { status: 400 }
      )
    }

    // Exportar lote
    const result = await ESUSService.exportBatchToXML(startDate, endDate)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Erro na exportação', details: result.errors },
        { status: 500 }
      )
    }

    // Retornar resultado
    if (format === 'xml' && result.xml) {
      // Retornar como arquivo XML para download
      return new Response(result.xml, {
        status: 200,
        headers: {
          'Content-Type': 'application/xml',
          'Content-Disposition': `attachment; filename="esus_export_${result.batchId}.xml"`
        }
      })
    }

    return NextResponse.json({
      success: true,
      batchId: result.batchId,
      fichasCount: result.fichasCount,
      errors: result.errors
    })
  } catch (error) {
    console.error('[e-SUS API] Erro POST:', error)
    return NextResponse.json(
      { error: 'Erro interno ao exportar' },
      { status: 500 }
    )
  }
}
