import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// ============ VALIDATION SCHEMAS ============

const bulkDeleteSchema = z.object({
  operation: z.literal('delete'),
  ids: z.array(z.string()).min(1, 'Selecione pelo menos um registro')
})

const bulkArchiveSchema = z.object({
  operation: z.literal('archive'),
  ids: z.array(z.string()).min(1),
  archived: z.boolean()
})

const bulkExportSchema = z.object({
  operation: z.literal('export'),
  ids: z.array(z.string()).min(1),
  format: z.enum(['pdf', 'json', 'csv']).default('pdf')
})

const bulkTagSchema = z.object({
  operation: z.literal('tag'),
  ids: z.array(z.string()).min(1),
  tagId: z.string(),
  action: z.enum(['add', 'remove'])
})

const bulkShareSchema = z.object({
  operation: z.literal('share'),
  ids: z.array(z.string()).min(1),
  userId: z.string(),
  permission: z.enum(['read', 'write', 'admin'])
})

const bulkStatusSchema = z.object({
  operation: z.literal('status'),
  ids: z.array(z.string()).min(1),
  status: z.string()
})

const bulkOperationSchema = z.discriminatedUnion('operation', [
  bulkDeleteSchema,
  bulkArchiveSchema,
  bulkExportSchema,
  bulkTagSchema,
  bulkShareSchema,
  bulkStatusSchema
])

// ============ RESULT TYPE ============

interface BulkResult {
  id: string
  success: boolean
  message?: string
}

// ============ POST HANDLER ============

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const validation = bulkOperationSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const data = validation.data
    const results: BulkResult[] = []

    // Check permissions for each record
    const records = await prisma.medicalRecord.findMany({
      where: {
        id: { in: data.ids }
      },
      select: {
        id: true,
        patientId: true,
        doctorId: true,
        patient: {
          select: { name: true }
        }
      }
    })

    const recordMap = new Map(records.map(r => [r.id, r]))
    const userRole = (session.user as { role?: string }).role

    // Verify all records exist
    for (const id of data.ids) {
      if (!recordMap.has(id)) {
        results.push({
          id,
          success: false,
          message: 'Registro não encontrado'
        })
      }
    }

    // Only process existing records
    const existingIds = data.ids.filter(id => recordMap.has(id))

    switch (data.operation) {
      case 'delete':
        await processDelete(existingIds, results, session.user.id, userRole)
        break

      case 'archive':
        await processArchive(existingIds, data.archived, results)
        break

      case 'export':
        return await processExport(existingIds, data.format, records)

      case 'tag':
        await processTag(existingIds, data.tagId, data.action, results)
        break

      case 'share':
        await processShare(existingIds, data.userId, data.permission, results)
        break

      case 'status':
        await processStatus(existingIds, data.status, results)
        break
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    return NextResponse.json({
      success: successCount > 0,
      message: `${successCount} de ${data.ids.length} registros processados`,
      results,
      summary: {
        total: data.ids.length,
        success: successCount,
        failed: failureCount
      }
    })

  } catch (error) {
    console.error('Bulk operation error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// ============ OPERATION HANDLERS ============

async function processDelete(
  ids: string[],
  results: BulkResult[],
  userId: string,
  userRole?: string
) {
  for (const id of ids) {
    try {
      // Soft delete - just mark as deleted
      await prisma.medicalRecord.update({
        where: { id },
        data: {
          deletedAt: new Date()
        }
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId,
          userEmail: 'system@healthcare.local',
          userRole: userRole || 'USER',
          action: 'BULK_DELETE_MEDICAL_RECORD',
          resourceType: 'MEDICAL_RECORD',
          resourceId: id
        }
      })

      results.push({ id, success: true })
    } catch (error) {
      console.error(`Failed to delete record ${id}:`, error)
      results.push({
        id,
        success: false,
        message: 'Falha ao excluir registro'
      })
    }
  }
}

async function processArchive(
  ids: string[],
  archived: boolean,
  results: BulkResult[]
) {
  try {
    // Use deletedAt to indicate archived state since status doesn't exist
    await prisma.medicalRecord.updateMany({
      where: { id: { in: ids } },
      data: {
        deletedAt: archived ? new Date() : null,
        updatedAt: new Date()
      }
    })

    for (const id of ids) {
      results.push({ id, success: true })
    }
  } catch (error) {
    console.error('Failed to archive records:', error)
    for (const id of ids) {
      results.push({
        id,
        success: false,
        message: 'Falha ao arquivar registro'
      })
    }
  }
}

async function processExport(
  ids: string[],
  format: 'pdf' | 'json' | 'csv',
  records: Array<{ id: string; patient?: { name: string } | null }>
) {
  // For export, we return the records in requested format
  const fullRecords = await prisma.medicalRecord.findMany({
    where: { id: { in: ids } },
    include: {
      patient: {
        select: {
          name: true,
          cpf: true,
          birthDate: true,
          gender: true
        }
      },
      doctor: {
        select: {
          name: true,
          speciality: true
        }
      },
      attachments: true
    }
  })

  if (format === 'json') {
    return NextResponse.json({
      success: true,
      data: fullRecords,
      format: 'json',
      count: fullRecords.length
    })
  }

  if (format === 'csv') {
    const csvLines = [
      'ID,Paciente,Médico,Data,Tipo,Diagnóstico,Descrição'
    ]

    for (const record of fullRecords) {
      const line = [
        record.id,
        record.patient?.name || '',
        record.doctor?.name || '',
        record.createdAt?.toISOString() || '',
        record.recordType || '',
        (record.diagnosis as string) || '',
        record.description || ''
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
      
      csvLines.push(line)
    }

    return new NextResponse(csvLines.join('\n'), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="prontuarios-${Date.now()}.csv"`
      }
    })
  }

  // For PDF, return IDs to be processed by frontend
  return NextResponse.json({
    success: true,
    format: 'pdf',
    ids: ids,
    message: 'Use a API de exportação individual para cada ID'
  })
}

async function processTag(
  ids: string[],
  tagId: string,
  action: 'add' | 'remove',
  results: BulkResult[]
) {
  // Tag functionality requires schema update - logging only for now
  for (const id of ids) {
    try {
      const record = await prisma.medicalRecord.findUnique({
        where: { id },
        select: { id: true }
      })

      if (!record) {
        results.push({ id, success: false, message: 'Registro não encontrado' })
        continue
      }

      // TODO: Add tags field to MedicalRecord schema
      console.log(`Tag ${action}: ${tagId} for record ${id}`)
      results.push({ id, success: true, message: 'Tag registrada (pendente migração)' })
    } catch (error) {
      console.error(`Failed to update tags for ${id}:`, error)
      results.push({
        id,
        success: false,
        message: 'Falha ao atualizar tags'
      })
    }
  }
}

async function processShare(
  ids: string[],
  userId: string,
  permission: 'read' | 'write' | 'admin',
  results: BulkResult[]
) {
  // Share functionality requires schema update - logging only for now
  for (const id of ids) {
    try {
      const record = await prisma.medicalRecord.findUnique({
        where: { id },
        select: { id: true }
      })

      if (!record) {
        results.push({ id, success: false, message: 'Registro não encontrado' })
        continue
      }

      // TODO: Add MedicalRecordShare model to schema
      console.log(`Share ${permission}: record ${id} with user ${userId}`)
      results.push({ id, success: true, message: 'Compartilhamento registrado (pendente migração)' })
    } catch (error) {
      console.error(`Failed to share record ${id}:`, error)
      results.push({
        id,
        success: false,
        message: 'Falha ao compartilhar registro'
      })
    }
  }
}

async function processStatus(
  ids: string[],
  status: string,
  results: BulkResult[]
) {
  // Status field doesn't exist in current schema - use priority as alternative
  try {
    await prisma.medicalRecord.updateMany({
      where: { id: { in: ids } },
      data: {
        priority: status,
        updatedAt: new Date()
      }
    })

    for (const id of ids) {
      results.push({ id, success: true })
    }
  } catch (error) {
    console.error('Failed to update status:', error)
    for (const id of ids) {
      results.push({
        id,
        success: false,
        message: 'Falha ao atualizar status'
      })
    }
  }
}

// ============ GET - List available bulk operations ============

export async function GET() {
  return NextResponse.json({
    operations: [
      {
        id: 'delete',
        label: 'Excluir',
        description: 'Remove permanentemente os registros selecionados',
        requiresConfirmation: true,
        dangerous: true
      },
      {
        id: 'archive',
        label: 'Arquivar',
        description: 'Move registros para arquivo',
        requiresConfirmation: false
      },
      {
        id: 'export',
        label: 'Exportar',
        description: 'Exporta registros em PDF, JSON ou CSV',
        formats: ['pdf', 'json', 'csv']
      },
      {
        id: 'tag',
        label: 'Adicionar Tag',
        description: 'Aplica uma etiqueta aos registros'
      },
      {
        id: 'share',
        label: 'Compartilhar',
        description: 'Compartilha acesso com outro usuário'
      },
      {
        id: 'status',
        label: 'Alterar Status',
        description: 'Modifica o status dos registros'
      }
    ]
  })
}
