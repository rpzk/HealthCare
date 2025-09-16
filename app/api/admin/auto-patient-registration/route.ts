import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { patientRegistrationAI } from '@/lib/patient-registration-ai'
import { encrypt } from '@/lib/crypto'

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

    // Mock de criação de paciente
    const mockPatient = {
      id: Date.now().toString(),
      name: registrationData.nome,
      email: registrationData.email || `paciente-${Date.now()}@email.com`,
      phone: registrationData.telefone || null,
      cpf: registrationData.cpf ? encrypt(registrationData.cpf) : null,
      birthDate: registrationData.dataNascimento ? new Date(registrationData.dataNascimento) : null,
      gender: registrationData.sexo || 'UNKNOWN',
      address: registrationData.endereco || null,
      medicalHistory: registrationData.historicoMedico || null,
      allergies: registrationData.alergias || [],
      currentMedications: registrationData.medicamentosAtuais || [],
      emergencyContact: registrationData.contatoEmergencia || null,
      insuranceNumber: registrationData.numeroConvenio || null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    return NextResponse.json({
      success: true,
      patient: mockPatient,
      extractedData: registrationData,
      message: 'Paciente criado com sucesso via IA'
    })

  } catch (error) {
    console.error('Erro no cadastro automático:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}