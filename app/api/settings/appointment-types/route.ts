import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPatientAuth, withAdminAuthUnlimited } from '@/lib/advanced-auth-v2'

interface ServiceType {
  id: string
  name: string
  icon: string
  description: string
  roles: string[]
  isActive?: boolean
}

// Tipos de atendimento padrão
const DEFAULT_SERVICES: ServiceType[] = [
  { 
    id: 'consulta-medica', 
    name: 'Consulta Médica', 
    icon: '👨‍⚕️', 
    description: 'Atendimento com médico',
    roles: ['DOCTOR'],
    isActive: true
  },
  { 
    id: 'consulta-enfermagem', 
    name: 'Consulta de Enfermagem', 
    icon: '👩‍⚕️', 
    description: 'Atendimento com enfermeiro(a)',
    roles: ['NURSE'],
    isActive: true
  },
]

const SETTING_KEY = 'appointment_types'

// GET /api/settings/appointment-types - Retorna tipos de atendimento configurados
export const GET = withPatientAuth(async (req, { user }) => {
  try {
    // Tentar buscar configuração do sistema
    const setting = await prisma.systemSetting.findUnique({
      where: { key: SETTING_KEY }
    })

    if (setting && setting.value) {
      try {
        const services = JSON.parse(setting.value) as ServiceType[]
        // Filtrar apenas serviços ativos
        const activeServices = services.filter(s => s.isActive !== false)
        return NextResponse.json({ services: activeServices })
      } catch {
        // Se falhar ao parsear, retornar padrão
      }
    }

    // Retornar serviços padrão se não houver configuração
    return NextResponse.json({ services: DEFAULT_SERVICES })
  } catch (error) {
    console.error('Erro ao buscar tipos de atendimento:', error)
    return NextResponse.json({ services: DEFAULT_SERVICES })
  }
})

// POST /api/settings/appointment-types - Salvar tipos de atendimento (admin only)
export const POST = withAdminAuthUnlimited(async (req, { user }) => {
  try {
    const body = await req.json()
    const { services } = body as { services: ServiceType[] }

    if (!services || !Array.isArray(services)) {
      return NextResponse.json(
        { error: 'Lista de serviços inválida' },
        { status: 400 }
      )
    }

    // Validar cada serviço
    for (const service of services) {
      if (!service.id || !service.name || !service.roles || !Array.isArray(service.roles)) {
        return NextResponse.json(
          { error: 'Cada serviço deve ter id, name e roles' },
          { status: 400 }
        )
      }
    }

    // Salvar ou atualizar a configuração
    await prisma.systemSetting.upsert({
      where: { key: SETTING_KEY },
      update: { 
        value: JSON.stringify(services),
        updatedAt: new Date()
      },
      create: {
        key: SETTING_KEY,
        value: JSON.stringify(services),
        description: 'Tipos de atendimento disponíveis para agendamento',
        category: 'SYSTEM',
      }
    })

    return NextResponse.json({ 
      success: true, 
      services,
      message: 'Tipos de atendimento salvos com sucesso'
    })
  } catch (error) {
    console.error('Erro ao salvar tipos de atendimento:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})

// DELETE /api/settings/appointment-types - Reset para padrão (admin only)
export const DELETE = withAdminAuthUnlimited(async (req, { user }) => {
  try {
    await prisma.systemSetting.delete({
      where: { key: SETTING_KEY }
    }).catch(() => {
      // Ignorar se não existir
    })

    return NextResponse.json({ 
      success: true, 
      services: DEFAULT_SERVICES,
      message: 'Configuração resetada para padrão'
    })
  } catch (error) {
    console.error('Erro ao resetar tipos de atendimento:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})
