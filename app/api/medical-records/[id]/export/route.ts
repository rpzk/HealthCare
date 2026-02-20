import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { 
  generateMedicalRecordHtml, 
  exportMedicalRecordToPdf 
} from '@/lib/medical-record-pdf-export'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'

/**
 * GET /api/medical-records/[id]/export
 * Exporta um prontuário médico para PDF ou HTML
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    
    const format = searchParams.get('format') || 'pdf'
    const includeVersionHistory = searchParams.get('history') === 'true'
    const includeAttachments = searchParams.get('attachments') === 'true'
    const includeSignatures = searchParams.get('signatures') === 'true'

    // Verificar se o prontuário existe e se o usuário tem acesso
    const record = await prisma.medicalRecord.findUnique({
      where: { id },
      select: { 
        id: true, 
        patientId: true, 
        doctorId: true,
        title: true 
      }
    })

    if (!record) {
      return NextResponse.json(
        { error: 'Prontuário não encontrado' },
        { status: 404 }
      )
    }

    // Verificar permissões
    const userRole = session.user.role
    
    if (userRole === 'PATIENT') {
      // Paciente só pode ver seus próprios prontuários
      const patient = await prisma.patient.findFirst({
        where: {
          OR: [
            { userId: session.user.id },
            { email: session.user.email || '' }
          ]
        },
        select: { id: true }
      })

      if (!patient || patient.id !== record.patientId) {
        return NextResponse.json(
          { error: 'Acesso negado a este prontuário' },
          { status: 403 }
        )
      }
    } else if (userRole === 'DOCTOR') {
      // Médico pode ver prontuários que criou ou de seus pacientes
      const hasAccess = record.doctorId === session.user.id
      
      if (!hasAccess) {
        // Verificar se o paciente é atendido por este médico
        const hasPatientAccess = await prisma.consultation.findFirst({
          where: {
            patientId: record.patientId,
            doctorId: session.user.id
          },
          select: { id: true }
        })

        if (!hasPatientAccess) {
          return NextResponse.json(
            { error: 'Acesso negado a este prontuário' },
            { status: 403 }
          )
        }
      }
    }
    // ADMIN pode acessar qualquer prontuário

    const exportOptions = {
      recordId: id,
      includeVersionHistory,
      includeAttachments,
      includeSignatures
    }

    if (format === 'html') {
      const html = await generateMedicalRecordHtml(exportOptions)
      
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `inline; filename="prontuario-${id.slice(-8)}.html"`
        }
      })
    }

    // PDF
    const pdfBuffer = await exportMedicalRecordToPdf(exportOptions)
    
    // Verificar se é PDF ou HTML (fallback)
    const isPdf = pdfBuffer[0] === 0x25 && pdfBuffer[1] === 0x50 // %P
    
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': isPdf ? 'application/pdf' : 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="prontuario-${id.slice(-8)}.${isPdf ? 'pdf' : 'html'}"`
      }
    })

  } catch (error) {
    logger.error('Erro ao exportar prontuário:', error)
    return NextResponse.json(
      { error: 'Erro ao exportar prontuário' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/medical-records/[id]/export
 * Exporta múltiplos prontuários (batch export)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Apenas ADMIN e DOCTOR podem fazer export em lote
    if (!['ADMIN', 'DOCTOR'].includes(session.user.role || '')) {
      return NextResponse.json(
        { error: 'Sem permissão para exportação em lote' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { recordIds, format = 'pdf', options = {} } = body

    if (!Array.isArray(recordIds) || recordIds.length === 0) {
      return NextResponse.json(
        { error: 'Lista de IDs inválida' },
        { status: 400 }
      )
    }

    // Limitar a 50 registros por vez
    if (recordIds.length > 50) {
      return NextResponse.json(
        { error: 'Máximo de 50 prontuários por exportação' },
        { status: 400 }
      )
    }

    // Verificar acesso aos prontuários
    const records = await prisma.medicalRecord.findMany({
      where: { id: { in: recordIds } },
      select: { id: true, doctorId: true, patientId: true }
    })

    if (session.user.role === 'DOCTOR') {
      const accessibleRecords = records.filter(r => r.doctorId === session.user.id)
      if (accessibleRecords.length !== records.length) {
        return NextResponse.json(
          { error: 'Alguns prontuários não são acessíveis' },
          { status: 403 }
        )
      }
    }

    // Gerar exports
    const results = await Promise.allSettled(
      records.map(async (record) => {
        const html = await generateMedicalRecordHtml({
          recordId: record.id,
          includeVersionHistory: options.includeVersionHistory || false,
          includeAttachments: options.includeAttachments || false,
          includeSignatures: options.includeSignatures || false
        })
        return { id: record.id, html }
      })
    )

    const exports = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return { id: recordIds[index], success: true, html: result.value.html }
      }
      return { 
        id: recordIds[index], 
        success: false, 
        error: (result.reason as Error)?.message || 'Erro desconhecido' 
      }
    })

    return NextResponse.json({
      total: recordIds.length,
      successful: exports.filter(e => e.success).length,
      failed: exports.filter(e => !e.success).length,
      exports: exports.map(e => ({
        id: e.id,
        success: e.success,
        error: e.success ? undefined : e.error
      }))
    })

  } catch (error) {
    logger.error('Erro na exportação em lote:', error)
    return NextResponse.json(
      { error: 'Erro na exportação em lote' },
      { status: 500 }
    )
  }
}
