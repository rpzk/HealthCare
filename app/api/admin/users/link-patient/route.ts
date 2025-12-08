import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Vincular usuário a paciente (criar novo ou vincular existente)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await req.json()
    const { userId, action, patientId, patientData } = body

    // Verificar se usuário existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { patient: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Verificar se já está vinculado
    if (user.patientId) {
      return NextResponse.json({ 
        error: 'Este usuário já está vinculado a um paciente' 
      }, { status: 400 })
    }

    let linkedPatientId: string

    if (action === 'create') {
      // Criar novo paciente
      const { name, cpf, birthDate, gender, phone, address } = patientData

      if (!name) {
        return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
      }

      // Verificar se CPF já existe
      if (cpf) {
        const existingPatient = await prisma.patient.findFirst({
          where: { cpf }
        })
        if (existingPatient) {
          return NextResponse.json({ 
            error: 'Já existe um paciente com este CPF' 
          }, { status: 400 })
        }
      }

      // Validar data de nascimento (obrigatória)
      if (!birthDate) {
        return NextResponse.json({ 
          error: 'Data de nascimento é obrigatória' 
        }, { status: 400 })
      }

      // Criar paciente
      const newPatient = await prisma.patient.create({
        data: {
          name,
          cpf: cpf || null,
          birthDate: new Date(birthDate),
          gender: gender || 'OTHER',
          phone: phone || null,
          email: user.email,
          userId: userId, // Vincular ao usuário
        }
      })

      linkedPatientId = newPatient.id

      // Atualizar usuário com o patientId
      await prisma.user.update({
        where: { id: userId },
        data: { patientId: newPatient.id }
      })

    } else if (action === 'link') {
      // Vincular paciente existente
      if (!patientId) {
        return NextResponse.json({ error: 'ID do paciente é obrigatório' }, { status: 400 })
      }

      const patient = await prisma.patient.findUnique({
        where: { id: patientId }
      })

      if (!patient) {
        return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
      }

      // Verificar se paciente já está vinculado a outro usuário
      if (patient.userId && patient.userId !== userId) {
        return NextResponse.json({ 
          error: 'Este paciente já está vinculado a outro usuário' 
        }, { status: 400 })
      }

      linkedPatientId = patientId

      // Atualizar paciente com o userId
      await prisma.patient.update({
        where: { id: patientId },
        data: { userId: userId }
      })

      // Atualizar usuário com o patientId
      await prisma.user.update({
        where: { id: userId },
        data: { patientId: patientId }
      })

    } else {
      return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      patientId: linkedPatientId,
      message: 'Paciente vinculado com sucesso' 
    })

  } catch (error) {
    console.error('Erro ao vincular paciente:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
