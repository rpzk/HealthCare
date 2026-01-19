import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

export const runtime = 'nodejs'

const querySchema = z.object({
  exportId: z.string().min(1, 'exportId obrigatório'),
})

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  try {
    const { searchParams } = new URL(request.url)
    const rawExportId = searchParams.get('exportId')

    const parsed = querySchema.safeParse({ exportId: rawExportId })
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten(), message: 'Entrada inválida' }, { status: 400 })
    }

    const { exportId } = parsed.data

    const export_ = await prisma.patientPdfExport.findUnique({
      where: { id: exportId },
      include: {
        patient: { select: { name: true, id: true } },
        logs: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    })

    if (!export_) {
      return NextResponse.json({ error: 'Exportação não encontrada' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      export: {
        id: export_.id,
        patientId: export_.patientId,
        patientName: export_.patient?.name,
        status: export_.status,
        progress: export_.progress,
        filename: export_.filename,
        fileSize: export_.fileSize,
        errorMessage: export_.errorMessage,
        requestedAt: export_.requestedAt,
        completedAt: export_.completedAt,
      },
      logs: export_.logs?.map((log) => ({
        step: log.step,
        percentage: log.percentage,
        message: log.message,
        createdAt: log.createdAt,
      })) || [],
    })
  } catch (e: any) {
    console.error('[Patient PDF Status] Error:', e)
    return NextResponse.json({ error: e?.message || 'Erro ao consultar status' }, { status: 500 })
  }
}
