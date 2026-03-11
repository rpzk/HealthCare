export const dynamic = 'force-dynamic'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { patientRegistrationAI } from '@/lib/patient-registration-ai'
import { encrypt } from '@/lib/crypto'
import { logger } from '@/lib/logger'

/**
 * 👥 API para Cadastro Automático de Pacientes
 * Upload de documentos cadastrais para criação automática
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'DOCTOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { documentContent } = await request.json()

    if (!documentContent || documentContent.length < 20) {
      return NextResponse.json({ 
        error: 'Conteúdo do documento muito pequeno' 
      }, { status: 400 })
    }

    // 🤖 Analisar documento cadastral
    const registrationData = await patientRegistrationAI.analyzePatientRegistrationDocument(documentContent)

    if (!registrationData.nome || registrationData.nome === 'Nome não identificado') {
      return NextResponse.json({ 
        error: 'Não foi possível identificar dados suficientes do paciente',
        extractedData: registrationData
      }, { status: 400 })
    }

    // ⚠️ APENAS ANÁLISE - NÃO CRIAR PACIENTES AUTOMATICAMENTE
    // Em produção, enviar para revisão manual antes de criar
    return NextResponse.json({
      success: false,
      message: 'Função de criação automática desativada. Revisar e criar manualmente.',
      extractedData: registrationData,
      action: 'MANUAL_REVIEW_REQUIRED'
    }, { status: 400 })

  } catch (error) {
    logger.error('Erro no cadastro automático:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}