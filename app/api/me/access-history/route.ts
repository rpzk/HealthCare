/**
 * API de Histórico de Acessos LGPD
 * Permite que o paciente veja quem acessou seus dados
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

// GET - Listar quem acessou os dados do paciente
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { patient: true }
    })

    if (!user?.patient) {
      return NextResponse.json({ error: 'Usuário não é um paciente' }, { status: 404 })
    }

    const patientId = user.patient.id

    // Filtro de data
    const dateFilter: { gte?: Date; lte?: Date } = {}
    if (startDate) dateFilter.gte = new Date(startDate)
    if (endDate) dateFilter.lte = new Date(endDate)

    const where = {
      resourceId: patientId,
      resourceType: { in: ['Patient', 'MedicalRecord', 'Consultation', 'Prescription', 'ExamRequest', 'Referral'] },
      action: { in: ['READ', 'VIEW', 'ACCESS', 'EXPORT', 'UPDATE', 'CREATE'] },
      ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
    }

    const [accessLogs, totalCount] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        select: {
          id: true,
          userId: true,
          userEmail: true,
          userRole: true,
          action: true,
          resourceType: true,
          ipAddress: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.auditLog.count({ where })
    ])

    // Buscar nomes dos usuários
    const userIds = [...new Set(accessLogs.map(log => log.userId).filter(Boolean))] as string[]
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, role: true, speciality: true }
    })
    const userMap = new Map(users.map(u => [u.id, u]))

    // Formatar logs
    const formattedLogs = accessLogs.map(log => {
      const accessUser = log.userId ? userMap.get(log.userId) : null
      return {
        id: log.id,
        data: log.createdAt,
        acao: translateAction(log.action),
        tipoRecurso: translateResourceType(log.resourceType),
        acessadoPor: accessUser ? {
          nome: accessUser.name || 'Usuário',
          funcao: translateRole(accessUser.role),
          especialidade: accessUser.speciality
        } : { nome: 'Sistema', funcao: 'Automático', especialidade: null },
        ip: maskIp(log.ipAddress)
      }
    })

    // Estatísticas 30 dias
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const stats = await prisma.auditLog.groupBy({
      by: ['action'],
      where: { ...where, createdAt: { gte: thirtyDaysAgo } },
      _count: true
    })

    const uniqueAccessors = await prisma.auditLog.findMany({
      where: { ...where, createdAt: { gte: thirtyDaysAgo } },
      select: { userId: true },
      distinct: ['userId']
    })

    logger.info({ patientId, accessLogsCount: formattedLogs.length }, 'Histórico de acessos LGPD consultado')

    return NextResponse.json({
      acessos: formattedLogs,
      paginacao: {
        pagina: page,
        limite: limit,
        total: totalCount,
        totalPaginas: Math.ceil(totalCount / limit)
      },
      estatisticas: {
        ultimos30Dias: {
          totalAcessos: stats.reduce((sum, s) => sum + s._count, 0),
          profissionaisUnicos: uniqueAccessors.length,
          porTipo: stats.map(s => ({ tipo: translateAction(s.action), quantidade: s._count }))
        }
      },
      _info: {
        descricao: 'Relatório de acessos aos seus dados de saúde',
        baseLegal: 'Art. 18, I da LGPD',
        retencao: 'Logs mantidos por 5 anos'
      }
    })

  } catch (error) {
    logger.error({ error }, 'Erro ao buscar histórico de acessos')
    return NextResponse.json({ error: 'Erro ao buscar histórico' }, { status: 500 })
  }
}

function translateAction(action: string): string {
  const t: Record<string, string> = {
    'READ': 'Visualização', 'VIEW': 'Visualização', 'ACCESS': 'Acesso',
    'EXPORT': 'Exportação', 'UPDATE': 'Atualização', 'CREATE': 'Criação', 'DELETE': 'Exclusão'
  }
  return t[action] || action
}

function translateResourceType(type: string | null): string {
  if (!type) return 'Dados gerais'
  const t: Record<string, string> = {
    'Patient': 'Dados pessoais', 'MedicalRecord': 'Prontuário', 'Consultation': 'Consulta',
    'Prescription': 'Receita', 'ExamRequest': 'Exame', 'Referral': 'Encaminhamento'
  }
  return t[type] || type
}

function translateRole(role: string | null): string {
  if (!role) return 'Usuário'
  const t: Record<string, string> = {
    'ADMIN': 'Administrador', 'DOCTOR': 'Médico', 'NURSE': 'Enfermeiro',
    'RECEPTIONIST': 'Recepcionista', 'PATIENT': 'Paciente', 'MANAGER': 'Gerente'
  }
  return t[role] || role
}

function maskIp(ip: string | null): string {
  if (!ip) return 'Não registrado'
  const parts = ip.split('.')
  return parts.length === 4 ? `${parts[0]}.${parts[1]}.***.***` : '***'
}
