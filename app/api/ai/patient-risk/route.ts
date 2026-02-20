import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ============ TIPOS ============

interface RiskFactor {
  name: string
  value: string
  impact: 'positive' | 'negative' | 'neutral'
  weight: number
}

interface PatientRiskAssessment {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  riskScore: number
  factors: Omit<RiskFactor, 'weight'>[]
  recommendations: string[]
}

// ============ CONSTANTES ============

// Condições crônicas de alto risco
const HIGH_RISK_CONDITIONS = [
  'diabetes', 'hipertensão', 'cardiopatia', 'insuficiência cardíaca',
  'doença renal crônica', 'dpoc', 'asma grave', 'câncer', 'hiv',
  'cirrose', 'alzheimer', 'parkinson', 'epilepsia', 'transplante'
]

// Medicamentos de alto risco
const HIGH_RISK_MEDICATIONS = [
  'anticoagulante', 'warfarina', 'insulina', 'quimioterapia',
  'imunossupressor', 'opioides', 'digoxina', 'lítio', 'metotrexato'
]

// Faixas etárias de risco
const AGE_RISK_THRESHOLDS = {
  elderly: 65,
  veryElderly: 80,
  pediatric: 12
}

// ============ FUNÇÕES AUXILIARES ============

function calculateAge(birthDate: Date): number {
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  
  return age
}

function assessAgeRisk(age: number): RiskFactor | null {
  if (age >= AGE_RISK_THRESHOLDS.veryElderly) {
    return {
      name: 'Idade avançada',
      value: `${age} anos (muito idoso)`,
      impact: 'negative',
      weight: 25
    }
  }
  
  if (age >= AGE_RISK_THRESHOLDS.elderly) {
    return {
      name: 'Idade',
      value: `${age} anos (idoso)`,
      impact: 'negative',
      weight: 15
    }
  }
  
  if (age < AGE_RISK_THRESHOLDS.pediatric) {
    return {
      name: 'Idade',
      value: `${age} anos (pediátrico)`,
      impact: 'neutral',
      weight: 5
    }
  }
  
  return {
    name: 'Idade',
    value: `${age} anos`,
    impact: 'positive',
    weight: -5
  }
}

function assessChronicConditions(conditions: string[]): RiskFactor[] {
  const factors: RiskFactor[] = []
  
  const normalizedConditions = conditions.map(c => c.toLowerCase())
  
  const highRiskFound = HIGH_RISK_CONDITIONS.filter(condition =>
    normalizedConditions.some(c => c.includes(condition))
  )
  
  if (highRiskFound.length > 0) {
    factors.push({
      name: 'Condições crônicas de risco',
      value: `${highRiskFound.length} condição(ões)`,
      impact: 'negative',
      weight: highRiskFound.length * 10
    })
  }
  
  // Multimorbidade
  if (conditions.length > 3) {
    factors.push({
      name: 'Multimorbidade',
      value: `${conditions.length} condições`,
      impact: 'negative',
      weight: 15
    })
  }
  
  if (conditions.length === 0) {
    factors.push({
      name: 'Condições crônicas',
      value: 'Nenhuma registrada',
      impact: 'positive',
      weight: -10
    })
  }
  
  return factors
}

function assessMedicationRisk(medications: string[]): RiskFactor[] {
  const factors: RiskFactor[] = []
  
  const normalizedMeds = medications.map(m => m.toLowerCase())
  
  const highRiskMeds = HIGH_RISK_MEDICATIONS.filter(med =>
    normalizedMeds.some(m => m.includes(med))
  )
  
  if (highRiskMeds.length > 0) {
    factors.push({
      name: 'Medicamentos de alto risco',
      value: `${highRiskMeds.length} medicamento(s)`,
      impact: 'negative',
      weight: highRiskMeds.length * 8
    })
  }
  
  // Polifarmácia
  if (medications.length >= 5) {
    factors.push({
      name: 'Polifarmácia',
      value: `${medications.length} medicamentos`,
      impact: 'negative',
      weight: Math.min(medications.length * 3, 20)
    })
  }
  
  return factors
}

function assessVitalsRisk(vitals: { systolic?: number; diastolic?: number; glucose?: number }): RiskFactor[] {
  const factors: RiskFactor[] = []
  
  // Pressão arterial
  if (vitals.systolic && vitals.diastolic) {
    if (vitals.systolic >= 180 || vitals.diastolic >= 120) {
      factors.push({
        name: 'Pressão arterial',
        value: `${vitals.systolic}/${vitals.diastolic} mmHg (crise hipertensiva)`,
        impact: 'negative',
        weight: 25
      })
    } else if (vitals.systolic >= 140 || vitals.diastolic >= 90) {
      factors.push({
        name: 'Pressão arterial',
        value: `${vitals.systolic}/${vitals.diastolic} mmHg (elevada)`,
        impact: 'negative',
        weight: 10
      })
    } else if (vitals.systolic < 120 && vitals.diastolic < 80) {
      factors.push({
        name: 'Pressão arterial',
        value: `${vitals.systolic}/${vitals.diastolic} mmHg (normal)`,
        impact: 'positive',
        weight: -5
      })
    }
  }
  
  // Glicemia
  if (vitals.glucose) {
    if (vitals.glucose >= 400) {
      factors.push({
        name: 'Glicemia',
        value: `${vitals.glucose} mg/dL (crítico)`,
        impact: 'negative',
        weight: 25
      })
    } else if (vitals.glucose >= 200) {
      factors.push({
        name: 'Glicemia',
        value: `${vitals.glucose} mg/dL (elevada)`,
        impact: 'negative',
        weight: 15
      })
    } else if (vitals.glucose >= 70 && vitals.glucose <= 100) {
      factors.push({
        name: 'Glicemia',
        value: `${vitals.glucose} mg/dL (normal)`,
        impact: 'positive',
        weight: -5
      })
    }
  }
  
  return factors
}

function assessAppointmentHistory(
  appointmentCount: number,
  missedCount: number,
  lastVisitDays: number | null
): RiskFactor[] {
  const factors: RiskFactor[] = []
  
  // Taxa de não comparecimento
  if (appointmentCount > 0) {
    const noShowRate = (missedCount / appointmentCount) * 100
    
    if (noShowRate >= 30) {
      factors.push({
        name: 'Adesão ao tratamento',
        value: `${Math.round(noShowRate)}% de faltas`,
        impact: 'negative',
        weight: 15
      })
    } else if (noShowRate <= 10) {
      factors.push({
        name: 'Adesão ao tratamento',
        value: 'Excelente comparecimento',
        impact: 'positive',
        weight: -5
      })
    }
  }
  
  // Tempo desde última consulta
  if (lastVisitDays !== null) {
    if (lastVisitDays > 365) {
      factors.push({
        name: 'Última consulta',
        value: `Há mais de ${Math.floor(lastVisitDays / 365)} ano(s)`,
        impact: 'negative',
        weight: 10
      })
    } else if (lastVisitDays <= 90) {
      factors.push({
        name: 'Acompanhamento',
        value: 'Regular nos últimos 3 meses',
        impact: 'positive',
        weight: -5
      })
    }
  }
  
  return factors
}

function calculateRiskLevel(totalScore: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (totalScore >= 50) return 'HIGH'
  if (totalScore >= 25) return 'MEDIUM'
  return 'LOW'
}

function generateRecommendations(
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH',
  factors: RiskFactor[]
): string[] {
  const recommendations: string[] = []
  
  const negativeFactors = factors.filter(f => f.impact === 'negative')
  
  // Recomendações baseadas no nível de risco
  if (riskLevel === 'HIGH') {
    recommendations.push('Considerar acompanhamento mais frequente')
    recommendations.push('Avaliar necessidade de referenciamento a especialista')
  }
  
  // Recomendações específicas
  for (const factor of negativeFactors) {
    if (factor.name.includes('Pressão arterial')) {
      recommendations.push('Monitorar pressão arterial regularmente')
    }
    if (factor.name.includes('Glicemia')) {
      recommendations.push('Revisar controle glicêmico e ajustar tratamento')
    }
    if (factor.name.includes('Polifarmácia')) {
      recommendations.push('Realizar revisão de medicamentos (reconciliação)')
    }
    if (factor.name.includes('Adesão')) {
      recommendations.push('Investigar barreiras ao comparecimento')
    }
    if (factor.name.includes('Última consulta')) {
      recommendations.push('Agendar consulta de reavaliação')
    }
  }
  
  // Remover duplicatas e limitar
  return [...new Set(recommendations)].slice(0, 5)
}

// ============ HANDLER ============

export async function GET(request: NextRequest) {
  try {
    // Autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar role
    const allowedRoles = ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Obter patientId
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')

    if (!patientId) {
      return NextResponse.json({ error: 'patientId é obrigatório' }, { status: 400 })
    }

    // Buscar dados do paciente
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        name: true,
        birthDate: true,
        allergies: true,
        medicalHistory: true,
        prescriptions: {
          where: { status: 'ACTIVE' },
          select: {
            items: {
              select: {
                medication: {
                  select: { name: true }
                }
              }
            }
          }
        },
        consultations: {
          orderBy: { scheduledDate: 'desc' },
          take: 20,
          select: {
            id: true,
            status: true,
            scheduledDate: true
          }
        },
        vitalSigns: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            systolicBP: true,
            diastolicBP: true,
            bloodGlucose: true
          }
        }
      }
    })

    if (!patient) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
    }

    // Coletar fatores de risco
    const allFactors: RiskFactor[] = []

    // 1. Idade
    const age = calculateAge(new Date(patient.birthDate))
    const ageFactor = assessAgeRisk(age)
    if (ageFactor) {
      allFactors.push(ageFactor)
    }

    // 2. Condições crônicas
    const conditions = patient.medicalHistory 
      ? patient.medicalHistory.split(',').map(c => c.trim()).filter(Boolean)
      : []
    allFactors.push(...assessChronicConditions(conditions))

    // 3. Medicamentos
    const medications = patient.prescriptions.flatMap(p => 
      p.items.map(i => i.medication?.name || '')
    ).filter(Boolean)
    allFactors.push(...assessMedicationRisk(medications))

    // 4. Sinais vitais recentes
    if (patient.vitalSigns.length > 0) {
      const vitals = patient.vitalSigns[0]
      allFactors.push(...assessVitalsRisk({
        systolic: vitals.systolicBP ?? undefined,
        diastolic: vitals.diastolicBP ?? undefined,
        glucose: vitals.bloodGlucose ?? undefined
      }))
    }

    // 5. Histórico de consultas
    const totalAppointments = patient.consultations.length
    const missedAppointments = patient.consultations.filter(
      (a: { status: string }) => a.status === 'NO_SHOW' || a.status === 'CANCELLED'
    ).length
    
    const lastCompletedVisit = patient.consultations.find((a: { status: string }) => a.status === 'COMPLETED')
    const daysSinceLastVisit = lastCompletedVisit 
      ? Math.floor((Date.now() - new Date(lastCompletedVisit.scheduledDate).getTime()) / (1000 * 60 * 60 * 24))
      : null
    
    allFactors.push(...assessAppointmentHistory(
      totalAppointments,
      missedAppointments,
      daysSinceLastVisit
    ))

    // Calcular score total
    const riskScore = Math.max(0, allFactors.reduce((sum, f) => sum + f.weight, 0))
    const normalizedScore = Math.min(100, riskScore)

    // Determinar nível de risco
    const riskLevel = calculateRiskLevel(normalizedScore)

    // Gerar recomendações
    const recommendations = generateRecommendations(riskLevel, allFactors)

    // Montar resposta
    const response: PatientRiskAssessment = {
      riskLevel,
      riskScore: normalizedScore,
      factors: allFactors.map(({ weight, ...factor }) => factor),
      recommendations
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Erro na análise de risco:', error)
    return NextResponse.json(
      { error: 'Erro ao processar análise de risco' },
      { status: 500 }
    )
  }
}
