import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { patientRegistrationAI } from '@/lib/patient-registration-ai'
import { prisma } from '@/lib/prisma'

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
        error: 'Não foi possível extrair o nome do paciente do documento'
      }, { status: 400 })
    }

    // 🏥 Criar ou atualizar paciente
    const result = await createOrUpdatePatientSafe(registrationData)

    return NextResponse.json({
      success: true,
      patient: result.patient,
      action: result.action,
      confidence: result.confidence,
      extractedData: registrationData,
      message: result.action === 'created' 
        ? `Paciente ${registrationData.nome} criado com sucesso!`
        : `Dados do paciente ${registrationData.nome} atualizados!`
    })

  } catch (error) {
    console.error('Erro no cadastro automático:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
}

/**
 * 📋 Listar pacientes cadastrados automaticamente
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'DOCTOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    
    // Buscar pacientes recentes
    const patients = await prisma.patient.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        cpf: true,
        email: true,
        phone: true,
        birthDate: true,
        createdAt: true,
        address: true,
        medicalHistory: true
      }
    })

    return NextResponse.json({
      patients,
      total: patients.length
    })

  } catch (error) {
    console.error('Erro ao listar pacientes:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
}

/**
 * 🔍 Função segura para criar/atualizar paciente
 */
async function createOrUpdatePatientSafe(registrationData: any) {
  let patient = null
  let action: 'created' | 'updated' = 'created'

  // Buscar paciente existente
  if (registrationData.cpf) {
    const cleanCpf = registrationData.cpf.replace(/\D/g, '')
    patient = await prisma.patient.findUnique({
      where: { cpf: cleanCpf }
    })
  }

  if (!patient && registrationData.nome) {
    patient = await prisma.patient.findFirst({
      where: {
        name: {
          contains: registrationData.nome.split(' ')[0],
          mode: 'insensitive'
        }
      }
    })
  }

  const patientData = {
    name: registrationData.nome,
    email: registrationData.email || `temp_${Date.now()}@example.com`,
    cpf: registrationData.cpf?.replace(/\D/g, '') || null,
    phone: registrationData.telefone || registrationData.celular,
    birthDate: registrationData.dataNascimento || new Date('1900-01-01'),
    gender: convertGender(registrationData.sexo),
    address: formatAddress(registrationData.endereco),
    allergies: registrationData.alergias?.join(', '),
    emergencyContact: registrationData.contatoEmergencia?.nome,
    medicalHistory: formatMedicalHistory(registrationData),
    currentMedications: registrationData.medicamentosUso?.join(', '),
    insuranceNumber: registrationData.convenio?.numero
  }

  if (patient) {
    // Atualizar existente
    patient = await prisma.patient.update({
      where: { id: patient.id },
      data: {
        ...patientData,
        email: patientData.email || patient.email,
        cpf: patientData.cpf || patient.cpf
      }
    })
    action = 'updated'
  } else {
    // Criar novo
    patient = await prisma.patient.create({
      data: {
        ...patientData,
        email: patientData.email,
        cpf: patientData.cpf
      }
    })
    action = 'created'
  }

  const confidence = calculateConfidence(registrationData)
  return { patient, action, confidence }
}

/**
 * 👥 Converte gênero
 */
function convertGender(sexo?: string): 'MALE' | 'FEMALE' | 'OTHER' {
  if (!sexo) return 'OTHER'
  const s = sexo.toLowerCase()
  if (s.includes('m') || s.includes('masculino')) return 'MALE'
  if (s.includes('f') || s.includes('feminino')) return 'FEMALE'
  return 'OTHER'
}

/**
 * 🏠 Formatar endereço
 */
function formatAddress(endereco?: any): string {
  if (!endereco) return ''
  const parts = [
    endereco.logradouro,
    endereco.numero,
    endereco.bairro,
    endereco.cidade,
    endereco.cep
  ].filter(Boolean)
  return parts.join(', ')
}

/**
 * 📋 Formatar histórico médico
 */
function formatMedicalHistory(data: any): string {
  const history = []
  if (data.tipoSanguineo) history.push(`Tipo sanguíneo: ${data.tipoSanguineo}`)
  if (data.alergias?.length) history.push(`Alergias: ${data.alergias.join(', ')}`)
  if (data.convenio) history.push(`Convênio: ${data.convenio.nome}`)
  return history.join('\n')
}

/**
 * 🎯 Calcular confiança
 */
function calculateConfidence(data: any): number {
  let score = 0
  if (data.nome && data.nome !== 'Nome não identificado') score += 30
  if (data.cpf) score += 30
  if (data.dataNascimento) score += 20
  if (data.telefone || data.celular) score += 10
  if (data.email) score += 10
  return Math.min(score, 100) / 100
}
