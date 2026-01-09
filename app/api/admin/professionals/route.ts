import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import {
  assertUserAcceptedTerms,
  getAudienceForRole,
  TermsNotAcceptedError,
  TermsNotConfiguredError,
} from '@/lib/terms-enforcement'

export const dynamic = 'force-dynamic'

// GET - Listar profissionais
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  try {
    await assertUserAcceptedTerms({
      prisma,
      userId: session.user.id,
      audience: getAudienceForRole(session.user.role),
      gates: ['ADMIN_PRIVILEGED'],
    })
  } catch (e) {
    if (e instanceof TermsNotAcceptedError) {
      return NextResponse.json(
        {
          error: e.message,
          code: e.code,
          missing: e.missingTerms.map((t) => ({ id: t.id, slug: t.slug, title: t.title, audience: t.audience })),
        },
        { status: 403 }
      )
    }
    if (e instanceof TermsNotConfiguredError) {
      return NextResponse.json({ error: e.message, code: e.code, missing: e.missing }, { status: 503 })
    }
    throw e
  }

  try {
    const professionals = await prisma.user.findMany({
      where: {
        role: {
          in: ['DOCTOR', 'NURSE', 'PHYSIOTHERAPIST', 'PSYCHOLOGIST', 'DENTIST', 'NUTRITIONIST', 'HEALTH_AGENT', 'TECHNICIAN', 'PHARMACIST', 'SOCIAL_WORKER']
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        crmNumber: true,
        createdAt: true,
        isActive: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ professionals })
  } catch (error) {
    console.error('Erro ao listar profissionais:', error)
    return NextResponse.json({ error: 'Erro ao listar profissionais' }, { status: 500 })
  }
}

// POST - Criar novo profissional
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  try {
    await assertUserAcceptedTerms({
      prisma,
      userId: session.user.id,
      audience: getAudienceForRole(session.user.role),
      gates: ['ADMIN_PRIVILEGED'],
    })
  } catch (e) {
    if (e instanceof TermsNotAcceptedError) {
      return NextResponse.json(
        {
          error: e.message,
          code: e.code,
          missing: e.missingTerms.map((t) => ({ id: t.id, slug: t.slug, title: t.title, audience: t.audience })),
        },
        { status: 403 }
      )
    }
    if (e instanceof TermsNotConfiguredError) {
      return NextResponse.json({ error: e.message, code: e.code, missing: e.missing }, { status: 503 })
    }
    throw e
  }

  try {
    const body = await request.json()
    const { name, email, role, crmNumber } = body

    // Validações
    if (!name || !email || !role) {
      return NextResponse.json(
        { error: 'Nome, email e role são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email já cadastrado' },
        { status: 400 }
      )
    }

    // Gerar ID único
    const userId = `user_${crypto.randomBytes(8).toString('hex')}`

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        id: userId,
        name,
        email,
        role,
        crmNumber: crmNumber || null,
        isActive: true,
      }
    })

    // Atribuir role como primária
    await prisma.userAssignedRole.create({
      data: {
        id: `role_${crypto.randomBytes(8).toString('hex')}`,
        userId: user.id,
        role: role,
        isPrimary: true,
        assignedBy: session.user.id as string,
        assignedAt: new Date()
      }
    })

    // Adicionar role PATIENT também para que possa ver seu próprio prontuário
    await prisma.userAssignedRole.create({
      data: {
        id: `role_${crypto.randomBytes(8).toString('hex')}`,
        userId: user.id,
        role: 'PATIENT',
        isPrimary: false,
        assignedBy: session.user.id as string,
        assignedAt: new Date()
      }
    })

    return NextResponse.json(
      {
        message: 'Profissional criado com sucesso',
        professional: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          crmNumber: user.crmNumber
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Erro ao criar profissional:', error)
    return NextResponse.json({ error: 'Erro ao criar profissional' }, { status: 500 })
  }
}

// PUT - Atualizar profissional
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  try {
    await assertUserAcceptedTerms({
      prisma,
      userId: session.user.id,
      audience: getAudienceForRole(session.user.role),
      gates: ['ADMIN_PRIVILEGED'],
    })
  } catch (e) {
    if (e instanceof TermsNotAcceptedError) {
      return NextResponse.json(
        {
          error: e.message,
          code: e.code,
          missing: e.missingTerms.map((t) => ({ id: t.id, slug: t.slug, title: t.title, audience: t.audience })),
        },
        { status: 403 }
      )
    }
    if (e instanceof TermsNotConfiguredError) {
      return NextResponse.json({ error: e.message, code: e.code, missing: e.missing }, { status: 503 })
    }
    throw e
  }

  try {
    const body = await request.json()
    const { id, name, crmNumber, isActive } = body

    if (!id) {
      return NextResponse.json({ error: 'ID do profissional é obrigatório' }, { status: 400 })
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        name: name || undefined,
        crmNumber: crmNumber || null,
        isActive: isActive !== undefined ? isActive : undefined
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        crmNumber: true,
        isActive: true
      }
    })

    return NextResponse.json({ message: 'Profissional atualizado', professional: user })
  } catch (error) {
    console.error('Erro ao atualizar profissional:', error)
    return NextResponse.json({ error: 'Erro ao atualizar profissional' }, { status: 500 })
  }
}
