import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// POST - Criar/resetar conta demo
export async function POST(request: NextRequest) {
  try {
    const demoEmail = 'demo@clinica.com'
    const demoPassword = 'demo123'
    const hashedPassword = await bcrypt.hash(demoPassword, 12)

    // Verificar se já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: demoEmail }
    })

    if (existingUser) {
      // Resetar senha
      await prisma.user.update({
        where: { email: demoEmail },
        data: { password: hashedPassword }
      })

      return NextResponse.json({
        success: true,
        message: 'Conta demo resetada',
        credentials: {
          email: demoEmail,
          password: demoPassword
        }
      })
    }

    // Criar usuário demo como DOCTOR
    const demoUser = await prisma.user.create({
      data: {
        email: demoEmail,
        name: 'Dr. Demo',
        role: 'DOCTOR',
        password: hashedPassword,
        speciality: 'Clínico Geral',
        licenseNumber: '123456',
        licenseType: 'CRM',
        licenseState: 'SP',
        isActive: true
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Conta demo criada com sucesso',
      credentials: {
        email: demoEmail,
        password: demoPassword
      },
      user: {
        id: demoUser.id,
        name: demoUser.name,
        role: demoUser.role
      }
    })

  } catch (error) {
    console.error('Error creating demo account:', error)
    return NextResponse.json(
      { error: 'Erro ao criar conta demo' },
      { status: 500 }
    )
  }
}

// GET - Verificar status da conta demo
export async function GET() {
  try {
    const demoEmail = 'demo@clinica.com'
    
    const demoUser = await prisma.user.findUnique({
      where: { email: demoEmail },
      select: {
        id: true,
        name: true,
        role: true,
        isActive: true,
        patient: { select: { id: true } }
      }
    })

    return NextResponse.json({
      exists: !!demoUser,
      user: demoUser ? {
        ...demoUser,
        hasPatientProfile: !!demoUser.patient
      } : null,
      credentials: demoUser ? {
        email: demoEmail,
        password: 'demo123'
      } : null
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao verificar conta demo' },
      { status: 500 }
    )
  }
}
