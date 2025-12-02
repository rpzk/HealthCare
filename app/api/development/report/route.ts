import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Generate a printable HTML report of the patient's integral profile
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const patientId = searchParams.get('patientId')
  const userId = searchParams.get('userId') || session.user.id

  try {
    // Fetch patient info if patientId provided
    let patient = null
    if (patientId) {
      patient = await prisma.patient.findUnique({
        where: { id: patientId },
        select: { id: true, name: true, email: true, birthDate: true, cpf: true },
      })
    }

    // Fetch user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    })

    // Fetch stratum assessment
    const stratumAssessment = await prisma.stratumAssessment.findFirst({
      where: { userId },
      orderBy: { completedAt: 'desc' },
    })

    // Fetch strengths assessment with results
    const strengthsAssessmentRaw = await prisma.strengthAssessment.findFirst({
      where: { userId, status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
      include: {
        results: {
          where: { isTopFive: true },
          orderBy: { rank: 'asc' },
          include: {
            strength: true,
          },
        },
      },
    })

    // Fetch development plan
    const developmentPlan = await prisma.developmentPlan.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: {
        goals: {
          include: { actions: true },
        },
        milestones: true,
      },
    })

    // Transform strengths data
    const topStrengths = strengthsAssessmentRaw?.results?.map(r => ({
      code: r.strength.code,
      name: r.strength.name,
      virtue: r.strength.virtue,
      score: Math.round(r.score * 20), // Convert 0-5 to 0-100
    })) || []

    // Transform stratum data
    const stratumData = stratumAssessment ? {
      calculatedStratum: stratumAssessment.calculatedStratum || 'S1',
      timeSpanMonths: stratumAssessment.timeSpanMonths || 3,
      confidence: stratumAssessment.confidenceScore || 85,
      completedAt: stratumAssessment.completedAt || new Date(),
    } : null

    // Generate HTML report
    const html = generateReportHTML({
      patient,
      user,
      stratum: stratumData,
      strengths: topStrengths,
      plan: developmentPlan,
      generatedAt: new Date(),
    })

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  } catch (error) {
    console.error('Error generating profile report:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}

interface ReportData {
  patient: { id: string; name: string; email: string; birthDate: Date | null; cpf: string | null } | null
  user: { id: string; name: string | null; email: string | null } | null
  stratum: {
    calculatedStratum: string
    timeSpanMonths: number
    confidence: number
    completedAt: Date
  } | null
  strengths: Array<{
    code: string
    name: string
    virtue: string
    score: number
    description?: string
  }>
  plan: {
    title: string
    futureVision: string | null
    status: string
    goals: Array<{
      title: string
      category: string
      status: string
      progress: number
      actions: Array<{ title: string; completed: boolean }>
    }>
    milestones: Array<{
      title: string
      achieved: boolean
      achievedAt: Date | null
    }>
  } | null
  generatedAt: Date
}

const stratumDescriptions: Record<string, { name: string; description: string; healthTip: string }> = {
  'S1': {
    name: 'Operacional',
    description: 'Capacidade de planejar de 1 dia até 3 meses. Foco em tarefas concretas e procedimentos definidos.',
    healthTip: 'Orientações devem ser práticas e de curto prazo. Check-ups frequentes recomendados.',
  },
  'S2': {
    name: 'Supervisor',
    description: 'Capacidade de planejar de 3 meses até 1 ano. Consegue gerenciar fluxos e rotinas.',
    healthTip: 'Planos de tratamento com marcos mensais funcionam bem. Pode manter acompanhamento regular.',
  },
  'S3': {
    name: 'Gerente',
    description: 'Capacidade de planejar de 1 a 2 anos. Coordena projetos e desenvolve sistemas.',
    healthTip: 'Discussões sobre mudanças de estilo de vida são produtivas. Metas anuais possíveis.',
  },
  'S4': {
    name: 'Diretor',
    description: 'Capacidade de planejar de 2 a 5 anos. Visão estratégica de médio prazo.',
    healthTip: 'Pode engajar em prevenção de longo prazo. Entende impacto de escolhas atuais no futuro.',
  },
  'S5': {
    name: 'Vice-Presidente',
    description: 'Capacidade de planejar de 5 a 10 anos. Visão estratégica ampla.',
    healthTip: 'Discussões sobre legado e qualidade de vida na terceira idade são significativas.',
  },
  'S6': {
    name: 'CEO',
    description: 'Capacidade de planejar de 10 a 20 anos. Pensamento transformacional.',
    healthTip: 'Abordagem sistêmica de saúde. Impacto familiar e social das escolhas de saúde.',
  },
}

const virtueColors: Record<string, string> = {
  'Sabedoria': '#3B82F6',
  'Coragem': '#F97316',
  'Humanidade': '#EC4899',
  'Justiça': '#EAB308',
  'Temperança': '#22C55E',
  'Transcendência': '#8B5CF6',
}

function generateReportHTML(data: ReportData): string {
  const name = data.patient?.name || data.user?.name || 'Paciente'
  const stratumInfo = data.stratum ? stratumDescriptions[data.stratum.calculatedStratum] : null
  
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Perfil Integral - ${name}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f8f9fa;
      padding: 20px;
    }
    
    .report {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 50%, #F59E0B 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    
    .header h1 {
      font-size: 28px;
      margin-bottom: 8px;
    }
    
    .header p {
      opacity: 0.9;
      font-size: 16px;
    }
    
    .content {
      padding: 30px;
    }
    
    .section {
      margin-bottom: 30px;
      padding-bottom: 30px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .section:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }
    
    .section-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 15px;
      color: #1f2937;
    }
    
    .section-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 16px;
    }
    
    .stratum-card {
      background: linear-gradient(135deg, #3B82F6, #1D4ED8);
      color: white;
      border-radius: 12px;
      padding: 24px;
    }
    
    .stratum-level {
      font-size: 48px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    
    .stratum-name {
      font-size: 20px;
      opacity: 0.9;
      margin-bottom: 16px;
    }
    
    .stratum-description {
      opacity: 0.85;
      margin-bottom: 16px;
    }
    
    .stratum-tip {
      background: rgba(255,255,255,0.2);
      border-radius: 8px;
      padding: 12px;
      font-size: 14px;
    }
    
    .stratum-tip strong {
      display: block;
      margin-bottom: 4px;
    }
    
    .strengths-grid {
      display: grid;
      gap: 16px;
    }
    
    .strength-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      background: #f9fafb;
      border-radius: 8px;
      border-left: 4px solid;
    }
    
    .strength-rank {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: linear-gradient(135deg, #F59E0B, #D97706);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 14px;
      flex-shrink: 0;
    }
    
    .strength-content {
      flex: 1;
    }
    
    .strength-name {
      font-weight: 600;
      margin-bottom: 4px;
    }
    
    .strength-virtue {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 8px;
    }
    
    .progress-bar {
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
    }
    
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #8B5CF6, #EC4899);
      border-radius: 4px;
    }
    
    .goals-list {
      display: grid;
      gap: 12px;
    }
    
    .goal-item {
      padding: 16px;
      background: #f0fdf4;
      border-radius: 8px;
      border-left: 4px solid #22c55e;
    }
    
    .goal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    
    .goal-title {
      font-weight: 600;
    }
    
    .goal-progress {
      font-size: 14px;
      color: #16a34a;
    }
    
    .goal-category {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 8px;
    }
    
    .no-data {
      text-align: center;
      padding: 30px;
      color: #9ca3af;
    }
    
    .footer {
      background: #f3f4f6;
      padding: 20px 30px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
    }
    
    .print-button {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #8B5CF6;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
    }
    
    .print-button:hover {
      background: #7C3AED;
    }
    
    @media print {
      body {
        background: white;
        padding: 0;
      }
      
      .report {
        box-shadow: none;
        border-radius: 0;
      }
      
      .print-button {
        display: none;
      }
      
      .header {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      .stratum-card {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="report">
    <div class="header">
      <h1>✨ Perfil Integral de Desenvolvimento</h1>
      <p>${name}</p>
    </div>
    
    <div class="content">
      ${data.stratum ? `
      <div class="section">
        <div class="section-title">
          <div class="section-icon" style="background: #3B82F6;">🧠</div>
          Horizonte Temporal (Elliott Jaques)
        </div>
        <div class="stratum-card">
          <div class="stratum-level">${data.stratum.calculatedStratum}</div>
          <div class="stratum-name">${stratumInfo?.name || 'Nível'}</div>
          <div class="stratum-description">${stratumInfo?.description || ''}</div>
          <div class="stratum-tip">
            <strong>💡 Dica para Equipe de Saúde:</strong>
            ${stratumInfo?.healthTip || ''}
          </div>
        </div>
      </div>
      ` : ''}
      
      ${data.strengths.length > 0 ? `
      <div class="section">
        <div class="section-title">
          <div class="section-icon" style="background: #8B5CF6;">💎</div>
          Forças de Caráter (VIA Survey)
        </div>
        <div class="strengths-grid">
          ${data.strengths.slice(0, 5).map((strength, index) => `
          <div class="strength-item" style="border-color: ${virtueColors[strength.virtue] || '#8B5CF6'}">
            <div class="strength-rank">#${index + 1}</div>
            <div class="strength-content">
              <div class="strength-name">${strength.name}</div>
              <div class="strength-virtue">${strength.virtue}</div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${strength.score}%"></div>
              </div>
            </div>
          </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
      
      ${data.plan ? `
      <div class="section">
        <div class="section-title">
          <div class="section-icon" style="background: #22C55E;">🎯</div>
          Plano de Desenvolvimento: ${data.plan.title}
        </div>
        ${data.plan.futureVision ? `
        <p style="margin-bottom: 16px; padding: 16px; background: #fef3c7; border-radius: 8px; border-left: 4px solid #F59E0B;">
          <strong>🌟 Visão de Futuro:</strong> ${data.plan.futureVision}
        </p>
        ` : ''}
        ${data.plan.goals.length > 0 ? `
        <div class="goals-list">
          ${data.plan.goals.map(goal => `
          <div class="goal-item">
            <div class="goal-header">
              <div class="goal-title">${goal.title}</div>
              <div class="goal-progress">${goal.progress}%</div>
            </div>
            <div class="goal-category">${goal.category} • ${goal.status}</div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${goal.progress}%; background: linear-gradient(90deg, #22C55E, #16A34A);"></div>
            </div>
          </div>
          `).join('')}
        </div>
        ` : '<p class="no-data">Nenhuma meta definida ainda</p>'}
      </div>
      ` : ''}
      
      ${!data.stratum && data.strengths.length === 0 && !data.plan ? `
      <div class="no-data">
        <p style="font-size: 48px; margin-bottom: 16px;">✨</p>
        <p style="font-size: 18px; margin-bottom: 8px;">Perfil em construção</p>
        <p>Complete as avaliações para gerar seu perfil integral</p>
      </div>
      ` : ''}
    </div>
    
    <div class="footer">
      <p>Relatório gerado em ${data.generatedAt.toLocaleDateString('pt-BR')} às ${data.generatedAt.toLocaleTimeString('pt-BR')}</p>
      <p style="margin-top: 8px;">Sistema de Desenvolvimento Humano Integral • Healthcare System</p>
    </div>
  </div>
  
  <button class="print-button" onclick="window.print()">
    🖨️ Imprimir Relatório
  </button>
</body>
</html>`
}
