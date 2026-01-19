import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'
import { z } from 'zod'

const registerSchema = z.object({
  // Dados da conta
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
  
  // Dados pessoais obrigatórios
  name: z.string().min(3, 'Nome completo é obrigatório'),
  cpf: z.string().regex(/^\d{11}$/, 'CPF deve conter 11 dígitos'),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de nascimento inválida (YYYY-MM-DD)'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER'], { errorMap: () => ({ message: 'Gênero inválido' }) }),
  phone: z.string().min(10, 'Telefone inválido'),
  
  // Dados opcionais
  address: z.object({
    street: z.string().optional(),
    number: z.string().optional(),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
  }).optional(),
  
  emergencyContact: z.object({
    name: z.string(),
    phone: z.string(),
    relation: z.string(),
  }).optional(),
  
  allergies: z.array(z.string()).optional(),
  bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
  
  // Termos de uso
  acceptedTerms: z.boolean().refine((val) => val === true, 'Você deve aceitar os termos de uso'),
})

type RegisterData = z.infer<typeof registerSchema>

/**
 * POST /api/auth/register-patient
 * Auto-cadastro de pacientes
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parseResult = registerSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { 
          error: 'Dados inválidos', 
          details: parseResult.error.flatten().fieldErrors 
        },
        { status: 400 }
      )
    }

    const data = parseResult.data

    // Verificar se email já existe
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (existingUserByEmail) {
      return NextResponse.json(
        { error: 'Este email já está cadastrado' },
        { status: 409 }
      )
    }

    // Verificar se CPF já existe
    const existingPatientByCpf = await prisma.patient.findFirst({
      where: { cpf: data.cpf },
    })

    if (existingPatientByCpf) {
      return NextResponse.json(
        { error: 'Este CPF já está cadastrado' },
        { status: 409 }
      )
    }

    // Hash da senha
    const hashedPassword = await hash(data.password, 12)

    // Criar User + Patient em transação
    const result = await prisma.$transaction(async (tx) => {
      // Criar usuário
      const user = await tx.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          name: data.name,
          role: 'PATIENT',
        },
      })

      // Criar paciente
      const patient = await tx.patient.create({
        data: {
          userId: user.id,
          name: data.name,
          email: data.email,
          cpf: data.cpf,
          birthDate: new Date(data.birthDate),
          gender: data.gender,
          phone: data.phone,
          bloodType: data.bloodType || null,
          allergies: data.allergies ? data.allergies.join(', ') : null,
          emergencyContact: data.emergencyContact ? JSON.stringify(data.emergencyContact) : null,
          address: null, // Endereço em formato antigo (descontinuado)
        },
      })

      // Criar endereço se fornecido
      if (data.address && (data.address.street || data.address.city)) {
        await tx.address.create({
          data: {
            patientId: patient.id,
            street: data.address.street || '',
            number: data.address.number || '',
            complement: data.address.complement || null,
            neighborhood: data.address.neighborhood || null,
            city: data.address.city || '',
            state: data.address.state || '',
            zipCode: data.address.zipCode || '',
            isPrimary: true,
          },
        })
      }

      return { user, patient }
    })

    // TODO: Enviar email de confirmação
    console.log('[Patient Registration] New patient registered:', {
      userId: result.user.id,
      patientId: result.patient.id,
      email: data.email,
      cpf: data.cpf,
    })

    // TODO: Implementar envio de email de boas-vindas
    // await sendWelcomeEmail(result.user.email, result.user.name)

    return NextResponse.json({
      success: true,
      message: 'Cadastro realizado com sucesso! Você já pode fazer login.',
      data: {
        userId: result.user.id,
        patientId: result.patient.id,
        email: result.user.email,
      },
    })
  } catch (error: any) {
    console.error('[Patient Registration] Error:', error)

    // Erro específico de constraint unique
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0]
      if (field === 'email') {
        return NextResponse.json(
          { error: 'Este email já está cadastrado' },
          { status: 409 }
        )
      }
      if (field === 'cpf') {
        return NextResponse.json(
          { error: 'Este CPF já está cadastrado' },
          { status: 409 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Erro ao criar cadastro. Tente novamente.' },
      { status: 500 }
    )
  }
}
