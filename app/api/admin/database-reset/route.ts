import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

// Forçar runtime dinâmico para evitar execução durante build
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ResetRecord {
  id: string
  timestamp: string
  initiatedBy: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  exported: number
  deleted: number
  restored: number
  error?: string
}

const RESET_LOG_FILE = path.join(process.cwd(), 'uploads', 'reset-history.json')

function ensureResetLog() {
  const dir = path.dirname(RESET_LOG_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  if (!fs.existsSync(RESET_LOG_FILE)) {
    fs.writeFileSync(RESET_LOG_FILE, JSON.stringify([], null, 2))
  }
}

function getResetHistory(): ResetRecord[] {
  try {
    ensureResetLog()
    const content = fs.readFileSync(RESET_LOG_FILE, 'utf-8')
    return JSON.parse(content) as ResetRecord[]
  } catch {
    return []
  }
}

function saveResetRecord(record: ResetRecord) {
  try {
    ensureResetLog()
    const history = getResetHistory()
    history.push(record)
    // Manter só últimos 50 resets
    const recentHistory = history.slice(-50)
    fs.writeFileSync(RESET_LOG_FILE, JSON.stringify(recentHistory, null, 2))
  } catch (error) {
    console.error('Erro ao salvar registro de reset:', error)
  }
}

// GET - Obter histórico de resets
export async function GET(request: NextRequest) {
  try {
    const session = await auth() as any

    // Verificar autenticação
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Verificar se é ADMIN
    const userId = session.user.id
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem ver resets.' },
        { status: 403 }
      )
    }

    const history = getResetHistory()
    return NextResponse.json({
      success: true,
      history,
      count: history.length,
      lastReset: history[history.length - 1] || null
    })
  } catch (error) {
    console.error('Erro ao buscar histórico:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar histórico de resets' },
      { status: 500 }
    )
  }
}

// POST - Iniciar reset
export async function POST(request: NextRequest) {
  let resetId = ''

  try {
    const session = await auth() as any

    // Verificar autenticação
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Verificar se é ADMIN
    const userId = session.user.id
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, email: true }
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem fazer reset.' },
        { status: 403 }
      )
    }

    resetId = `reset-${Date.now()}`

    // Criar registro inicial
    const initialRecord: ResetRecord = {
      id: resetId,
      timestamp: new Date().toISOString(),
      initiatedBy: user.email || 'unknown',
      status: 'in_progress',
      exported: 0,
      deleted: 0,
      restored: 0,
    }
    saveResetRecord(initialRecord)

    // Contar dados antes do reset
    const stats = {
      users: await prisma.user.count({ where: { role: { not: 'ADMIN' } } }),
      patients: await prisma.patient.count(),
      consultations: await prisma.consultation.count(),
      prescriptions: await prisma.prescription.count(),
      examRequests: await prisma.examRequest.count(),
    }

    const totalToDelete = Object.values(stats).reduce((a, b) => a + b, 0)

    // Executar deleções
    console.log(`[RESET ${resetId}] Iniciando deleção de dados transacionais...`)

    // Deletar em ordem de dependência
    await prisma.examResult.deleteMany({})
    await prisma.examRequest.deleteMany({})
    await prisma.prescriptionItem.deleteMany({})
    await prisma.prescription.deleteMany({})
    await prisma.vitalSigns.deleteMany({})
    await prisma.medicalRecord.deleteMany({})
    await prisma.consultation.deleteMany({})
    
    // Deletar usuários não-admin
    await prisma.user.deleteMany({ where: { role: { not: 'ADMIN' } } })
    
    // Deletar pacientes
    await prisma.patient.deleteMany({})

    // Verificar que dados mestres não foram deletados
    const occupationCount = await prisma.occupation.count()
    const medicalCodeCount = await prisma.medicalCode.count()
    const medicationCount = await prisma.medication.count()

    const restorableCount = occupationCount + medicalCodeCount + medicationCount

    // Atualizar registro com sucesso
    const finalRecord: ResetRecord = {
      id: resetId,
      timestamp: new Date().toISOString(),
      initiatedBy: user.email || 'unknown',
      status: 'completed',
      exported: 0, // Exportação é feita via CLI
      deleted: totalToDelete,
      restored: restorableCount,
    }
    saveResetRecord(finalRecord)

    console.log(`[RESET ${resetId}] ✅ Reset concluído com sucesso`)

    return NextResponse.json({
      success: true,
      resetId,
      message: 'Reset iniciado com sucesso',
      stats: {
        deleted: totalToDelete,
        preserved: {
          occupations: occupationCount,
          medicalCodes: medicalCodeCount,
          medications: medicationCount,
          total: restorableCount
        },
        adminUsersRemaining: await prisma.user.count({ where: { role: 'ADMIN' } })
      }
    })
  } catch (error) {
    console.error(`[${resetId}] Erro no reset:`, error)

    // Registrar falha
    if (resetId) {
      const failureRecord: ResetRecord = {
        id: resetId,
        timestamp: new Date().toISOString(),
        initiatedBy: 'unknown',
        status: 'failed',
        exported: 0,
        deleted: 0,
        restored: 0,
        error: String(error),
      }
      saveResetRecord(failureRecord)
    }

    return NextResponse.json(
      {
        error: 'Erro ao executar reset',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

// DELETE - Limpar histórico (opcional)
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth() as any

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    ensureResetLog()
    fs.writeFileSync(RESET_LOG_FILE, JSON.stringify([], null, 2))

    return NextResponse.json({
      success: true,
      message: 'Histórico de resets limpo'
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao limpar histórico' },
      { status: 500 }
    )
  }
}
