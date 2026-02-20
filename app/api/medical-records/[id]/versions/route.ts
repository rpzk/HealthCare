import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'

/**
 * GET /api/medical-records/[id]/versions
 * Retorna o histórico de versões de um prontuário
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

    // Verificar se o prontuário existe
    const record = await prisma.medicalRecord.findUnique({
      where: { id },
      select: { 
        id: true, 
        version: true,
        patientId: true, 
        doctorId: true 
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
          { error: 'Acesso negado' },
          { status: 403 }
        )
      }
    } else if (userRole === 'DOCTOR' && record.doctorId !== session.user.id) {
      // Médico pode ver se tiver relação com o paciente
      const hasAccess = await prisma.consultation.findFirst({
        where: {
          patientId: record.patientId,
          doctorId: session.user.id
        }
      })
      
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Acesso negado' },
          { status: 403 }
        )
      }
    }

    // Buscar versões do prontuário
    // Primeiro, verificar se existe a tabela MedicalRecordVersion
    let versions: Array<{
      id: string
      version: number
      title: string
      description: string | null
      content: string | null
      recordType: string
      priority: string
      changedBy: string
      changedByName: string
      changedAt: string
      changeType: string
      changesSummary: string | null
    }> = []

    try {
      // Tentar buscar da tabela de versões se existir
      const versionRecords = await prisma.$queryRaw<Array<{
        id: string
        version: number
        title: string
        description: string | null
        content: string | null
        record_type: string
        priority: string
        changed_by: string
        changed_at: Date
        change_type: string
        changes_summary: string | null
      }>>`
        SELECT 
          mv.id,
          mv.version,
          mv.title,
          mv.description,
          mv.content,
          mv.record_type,
          mv.priority,
          mv.changed_by,
          mv.changed_at,
          mv.change_type,
          mv.changes_summary
        FROM medical_record_versions mv
        WHERE mv.medical_record_id = ${id}
        ORDER BY mv.version DESC
        LIMIT 100
      `

      // Buscar nomes dos usuários
      const userIds = [...new Set(versionRecords.map(v => v.changed_by))]
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true }
      })
      const userMap = new Map(users.map(u => [u.id, u.name]))

      versions = versionRecords.map(v => ({
        id: v.id,
        version: v.version,
        title: v.title,
        description: v.description,
        content: v.content,
        recordType: v.record_type,
        priority: v.priority || 'NORMAL',
        changedBy: v.changed_by,
        changedByName: userMap.get(v.changed_by) || 'Desconhecido',
        changedAt: v.changed_at.toISOString(),
        changeType: v.change_type || 'updated',
        changesSummary: v.changes_summary
      }))
    } catch {
      // Tabela não existe, usar audit log como fallback
      logger.info('Tabela de versões não encontrada, usando audit log')
      
      try {
        const auditLogs = await prisma.$queryRaw<Array<{
          id: string
          action: string
          user_id: string
          created_at: Date
          details: string | null
        }>>`
          SELECT id, action, user_id, created_at, details
          FROM audit_logs
          WHERE entity_type = 'MedicalRecord' AND entity_id = ${id}
          ORDER BY created_at DESC
          LIMIT 100
        `

        const userIds = [...new Set(auditLogs.map(a => a.user_id))]
        const users = await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true }
        })
        const userMap = new Map(users.map(u => [u.id, u.name]))

        versions = auditLogs.map((log, index) => ({
          id: log.id,
          version: auditLogs.length - index,
          title: 'Versão histórica',
          description: null,
          content: null,
          recordType: 'CONSULTATION',
          priority: 'NORMAL',
          changedBy: log.user_id,
          changedByName: userMap.get(log.user_id) || 'Desconhecido',
          changedAt: log.created_at.toISOString(),
          changeType: log.action.toLowerCase().includes('create') ? 'created' : 
                      log.action.toLowerCase().includes('delete') ? 'deleted' : 'updated',
          changesSummary: log.details
        }))
      } catch {
        // Nenhum histórico disponível
        logger.info('Nenhum histórico de versões disponível')
      }
    }

    // Se não temos versões mas temos o registro atual, adicionar como versão única
    if (versions.length === 0) {
      const currentRecord = await prisma.medicalRecord.findUnique({
        where: { id },
        include: {
          doctor: { select: { id: true, name: true } }
        }
      })

      if (currentRecord) {
        versions = [{
          id: currentRecord.id,
          version: currentRecord.version,
          title: currentRecord.title,
          description: currentRecord.description,
          content: currentRecord.notes || currentRecord.description || '',
          recordType: currentRecord.recordType,
          priority: currentRecord.priority || 'NORMAL',
          changedBy: currentRecord.doctorId || '',
          changedByName: currentRecord.doctor?.name || 'Sistema',
          changedAt: currentRecord.updatedAt.toISOString(),
          changeType: 'created',
          changesSummary: 'Versão atual'
        }]
      }
    }

    return NextResponse.json({
      recordId: id,
      currentVersion: record.version,
      totalVersions: versions.length,
      versions
    })

  } catch (error) {
    logger.error('Erro ao buscar versões:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar histórico de versões' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/medical-records/[id]/versions
 * Restaura uma versão específica do prontuário
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

    // Apenas médicos e admins podem restaurar versões
    if (!['DOCTOR', 'ADMIN'].includes(session.user.role || '')) {
      return NextResponse.json(
        { error: 'Sem permissão para restaurar versões' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { versionId, version: targetVersion } = body

    if (!versionId && !targetVersion) {
      return NextResponse.json(
        { error: 'Versão ou ID da versão é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar o prontuário atual
    const currentRecord = await prisma.medicalRecord.findUnique({
      where: { id }
    })

    if (!currentRecord) {
      return NextResponse.json(
        { error: 'Prontuário não encontrado' },
        { status: 404 }
      )
    }

    // Verificar permissão (médico pode restaurar seus próprios prontuários)
    if (session.user.role === 'DOCTOR' && currentRecord.doctorId !== session.user.id) {
      return NextResponse.json(
        { error: 'Sem permissão para restaurar este prontuário' },
        { status: 403 }
      )
    }

    // Buscar a versão a ser restaurada
    let versionToRestore: {
      title: string
      description: string | null
      content: string | null
      recordType: string
      priority: string | null
    } | null = null

    try {
      const versions = await prisma.$queryRaw<Array<{
        title: string
        description: string | null
        content: string | null
        record_type: string
        priority: string | null
      }>>`
        SELECT title, description, content, record_type, priority
        FROM medical_record_versions
        WHERE ${versionId ? prisma.$queryRaw`id = ${versionId}` : prisma.$queryRaw`medical_record_id = ${id} AND version = ${targetVersion}`}
        LIMIT 1
      `

      if (versions.length > 0) {
        versionToRestore = {
          title: versions[0].title,
          description: versions[0].description,
          content: versions[0].content,
          recordType: versions[0].record_type,
          priority: versions[0].priority
        }
      }
    } catch {
      return NextResponse.json(
        { error: 'Sistema de versionamento não disponível' },
        { status: 501 }
      )
    }

    if (!versionToRestore) {
      return NextResponse.json(
        { error: 'Versão não encontrada' },
        { status: 404 }
      )
    }

    // Salvar versão atual antes de restaurar
    await prisma.$executeRaw`
      INSERT INTO medical_record_versions 
        (id, medical_record_id, version, title, description, content, record_type, priority, changed_by, changed_at, change_type, changes_summary)
      VALUES 
        (gen_random_uuid(), ${id}, ${currentRecord.version}, ${currentRecord.title}, ${currentRecord.description}, ${currentRecord.notes || currentRecord.description || ''}, ${currentRecord.recordType}, ${currentRecord.priority}, ${session.user.id}, NOW(), 'updated', 'Backup antes de restauração')
    `

    // Restaurar a versão
    const restoredRecord = await prisma.medicalRecord.update({
      where: { id },
      data: {
        title: versionToRestore.title,
        description: versionToRestore.description || '',
        notes: versionToRestore.content || null,
        priority: versionToRestore.priority || 'NORMAL',
        version: currentRecord.version + 1,
        updatedAt: new Date()
      }
    })

    // Registrar a restauração como nova versão
    await prisma.$executeRaw`
      INSERT INTO medical_record_versions 
        (id, medical_record_id, version, title, description, content, record_type, priority, changed_by, changed_at, change_type, changes_summary)
      VALUES 
        (gen_random_uuid(), ${id}, ${restoredRecord.version}, ${restoredRecord.title}, ${restoredRecord.description}, ${restoredRecord.notes || restoredRecord.description || ''}, ${restoredRecord.recordType}, ${restoredRecord.priority}, ${session.user.id}, NOW(), 'restored', ${`Restaurado para versão anterior`})
    `

    return NextResponse.json({
      success: true,
      message: 'Versão restaurada com sucesso',
      newVersion: restoredRecord.version
    })

  } catch (error) {
    logger.error('Erro ao restaurar versão:', error)
    return NextResponse.json(
      { error: 'Erro ao restaurar versão' },
      { status: 500 }
    )
  }
}
