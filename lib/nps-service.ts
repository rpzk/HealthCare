/**
 * NPS (Net Promoter Score) Service
 * 
 * Gerencia pesquisas de satisfação pós-consulta com envio automático
 * via WhatsApp e análise de métricas.
 */

import { PrismaClient } from '@prisma/client'
import { WhatsAppService } from './whatsapp-service'

const prisma = new PrismaClient()

export interface NpsData {
  consultationId: string
  patientId: string
  doctorId: string
  score: number // 0-10
  feedback?: string
  wouldRecommend?: boolean
}

export class NpsService {
  /**
   * Calcula categoria NPS baseada no score
   */
  private static calculateCategory(score: number): 'DETRACTOR' | 'PASSIVE' | 'PROMOTER' {
    if (score <= 6) return 'DETRACTOR'
    if (score <= 8) return 'PASSIVE'
    return 'PROMOTER'
  }

  /**
   * Analisa sentiment do feedback (simplificado)
   */
  private static analyzeSentiment(feedback?: string): string {
    if (!feedback) return 'NEUTRAL'

    const text = feedback.toLowerCase()
    
    const positiveWords = ['ótimo', 'excelente', 'maravilhoso', 'perfeito', 'adorei', 'recomendo', 'satisfeito', 'feliz']
    const negativeWords = ['ruim', 'péssimo', 'horrível', 'demorou', 'insatisfeito', 'não gostei', 'problema']

    const positiveCount = positiveWords.filter(word => text.includes(word)).length
    const negativeCount = negativeWords.filter(word => text.includes(word)).length

    if (positiveCount > negativeCount) return 'POSITIVE'
    if (negativeCount > positiveCount) return 'NEGATIVE'
    return 'NEUTRAL'
  }

  /**
   * Extrai tags relevantes do feedback
   */
  private static extractTags(feedback?: string): string[] {
    if (!feedback) return []

    const text = feedback.toLowerCase()
    const tags: string[] = []

    const tagMap: Record<string, string[]> = {
      atendimento: ['atendimento', 'atender', 'atendeu', 'atencioso'],
      tempo_espera: ['espera', 'esperou', 'demorou', 'demora', 'atraso'],
      limpeza: ['limpo', 'limpeza', 'higiene', 'organizado'],
      profissionalismo: ['profissional', 'competente', 'experiente', 'cuidadoso'],
      comunicacao: ['explicou', 'comunicação', 'entendi', 'esclareceu'],
      recepcao: ['recepção', 'recepcionista', 'secretaria'],
      preco: ['caro', 'barato', 'preço', 'valor', 'cobrou'],
      infraestrutura: ['sala', 'consultório', 'equipamento', 'cadeira']
    }

    for (const [tag, keywords] of Object.entries(tagMap)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        tags.push(tag)
      }
    }

    return tags
  }

  /**
   * Registra resposta NPS
   */
  static async recordResponse(data: NpsData) {
    // Validar score
    if (data.score < 0 || data.score > 10) {
      throw new Error('Score deve estar entre 0 e 10')
    }

    // Verificar se já existe resposta para esta consulta
    const existing = await prisma.npsResponse.findUnique({
      where: { consultationId: data.consultationId }
    })

    if (existing) {
      throw new Error('Já existe uma resposta NPS para esta consulta')
    }

    const category = this.calculateCategory(data.score)
    const sentiment = this.analyzeSentiment(data.feedback)
    const tags = this.extractTags(data.feedback)

    const response = await prisma.npsResponse.create({
      data: {
        consultationId: data.consultationId,
        patientId: data.patientId,
        doctorId: data.doctorId,
        score: data.score,
        category,
        feedback: data.feedback,
        wouldRecommend: data.wouldRecommend ?? (data.score >= 9),
        sentiment,
        tags
      },
      include: {
        patient: {
          select: { id: true, name: true }
        },
        doctor: {
          select: { id: true, name: true }
        }
      }
    })

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        userId: data.patientId,
        userEmail: '',
        userRole: 'PATIENT',
        action: 'NPS_RESPONSE_RECORDED',
        resourceType: 'NpsResponse',
        resourceId: response.id,
        metadata: {
          score: data.score,
          category,
          doctorId: data.doctorId
        }
      }
    })

    // Alertar se for detrator
    if (category === 'DETRACTOR') {
      await this.notifyDetractor(response)
    }

    return response
  }

  /**
   * Envia pesquisa NPS via WhatsApp
   */
  static async sendNpsSurvey(consultationId: string): Promise<boolean> {
    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
      include: {
        patient: true,
        doctor: {
          select: { name: true }
        }
      }
    })

    if (!consultation || !consultation.patient.phone) {
      return false
    }

    // Verificar se já enviou
    const existing = await prisma.npsResponse.findUnique({
      where: { consultationId }
    })

    if (existing) {
      return false // Já enviou
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const surveyLink = `${baseUrl}/nps/${consultationId}`

    const message = `Olá, ${consultation.patient.name.split(' ')[0]}! 👋

Obrigado por sua consulta com Dr(a). ${consultation.doctor.name}.

Sua opinião é muito importante! Por favor, responda esta rápida pesquisa:

${surveyLink}

⭐ Em uma escala de 0 a 10, o quanto você recomendaria nossa clínica?

Leva apenas 30 segundos! 😊`

    const sent = await WhatsAppService.sendMessage({
      to: consultation.patient.phone,
      message
    })

    if (sent) {
      // Registrar envio
      await prisma.npsResponse.create({
        data: {
          consultationId,
          patientId: consultation.patientId,
          doctorId: consultation.doctorId,
          score: -1, // Placeholder até responder
          category: 'DETRACTOR', // Placeholder
          sentAt: new Date(),
          sentViaWhatsApp: true,
          respondedAt: new Date() // Será atualizado quando responder
        }
      }).catch(() => {
        // Ignorar erro se já existe (race condition)
      })
    }

    return sent
  }

  /**
   * Envia pesquisas NPS para consultas concluídas (cron job)
   */
  static async sendPendingSurveys(): Promise<number> {
    // Buscar consultas completadas nas últimas 24 horas sem NPS
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const consultations = await prisma.consultation.findMany({
      where: {
        status: 'COMPLETED',
        actualDate: {
          gte: yesterday
        },
        npsResponse: null
      },
      select: {
        id: true
      },
      take: 100 // Limitar para não sobrecarregar
    })

    let sent = 0

    for (const consultation of consultations) {
      try {
        const success = await this.sendNpsSurvey(consultation.id)
        if (success) sent++
        
        // Delay de 2 segundos entre envios
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (error) {
        console.error(`[NPS] Erro ao enviar para consulta ${consultation.id}:`, error)
      }
    }

    console.log(`[NPS] ${sent} pesquisas enviadas`)
    return sent
  }

  /**
   * Notifica gestores sobre detratores
   */
  private static async notifyDetractor(response: any): Promise<void> {
    // Criar notificação para o gestor
    await prisma.notification.create({
      data: {
        userId: response.doctorId,
        type: 'ALERT',
        title: '⚠️ NPS Baixo - Atenção Necessária',
        message: `Paciente ${response.patient.name} deu nota ${response.score}/10. ${response.feedback ? `Comentário: "${response.feedback}"` : ''}`
      }
    })

    console.log(`[NPS] Detrator identificado: ${response.patient.name} (Score: ${response.score})`)
  }

  /**
   * Calcula NPS score (% promotores - % detratores)
   */
  static async calculateNPS(doctorId?: string, startDate?: Date, endDate?: Date): Promise<number> {
    const where: any = {
      score: { gte: 0 } // Ignorar placeholders
    }

    if (doctorId) where.doctorId = doctorId
    if (startDate || endDate) {
      where.respondedAt = {}
      if (startDate) where.respondedAt.gte = startDate
      if (endDate) where.respondedAt.lte = endDate
    }

    const responses = await prisma.npsResponse.findMany({
      where,
      select: { category: true }
    })

    if (responses.length === 0) return 0

    const promoters = responses.filter(r => r.category === 'PROMOTER').length
    const detractors = responses.filter(r => r.category === 'DETRACTOR').length
    const total = responses.length

    const nps = ((promoters - detractors) / total) * 100

    return Math.round(nps)
  }

  /**
   * Estatísticas detalhadas
   */
  static async getStatistics(doctorId?: string, startDate?: Date, endDate?: Date) {
    const where: any = {
      score: { gte: 0 }
    }

    if (doctorId) where.doctorId = doctorId
    if (startDate || endDate) {
      where.respondedAt = {}
      if (startDate) where.respondedAt.gte = startDate
      if (endDate) where.respondedAt.lte = endDate
    }

    const [responses, byCategory, avgScore, sentimentCount] = await Promise.all([
      // Total de respostas
      prisma.npsResponse.count({ where }),

      // Por categoria
      prisma.npsResponse.groupBy({
        by: ['category'],
        where,
        _count: true
      }),

      // Score médio
      prisma.npsResponse.aggregate({
        where,
        _avg: { score: true }
      }),

      // Por sentiment
      prisma.npsResponse.groupBy({
        by: ['sentiment'],
        where,
        _count: true
      })
    ])

    const npsScore = await this.calculateNPS(doctorId, startDate, endDate)

    return {
      totalResponses: responses,
      npsScore,
      averageScore: avgScore._avg.score || 0,
      byCategory: byCategory.map(c => ({
        category: c.category,
        count: c._count,
        percentage: (c._count / responses) * 100
      })),
      bySentiment: sentimentCount.map(s => ({
        sentiment: s.sentiment,
        count: s._count
      }))
    }
  }

  /**
   * Trending tags (tags mais mencionadas)
   */
  static async getTrendingTags(doctorId?: string, limit: number = 10) {
    const where: any = {
      score: { gte: 0 },
      tags: { isEmpty: false }
    }

    if (doctorId) where.doctorId = doctorId

    const responses = await prisma.npsResponse.findMany({
      where,
      select: { tags: true }
    })

    // Contar tags
    const tagCounts: Record<string, number> = {}
    responses.forEach(r => {
      r.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      })
    })

    // Ordenar por contagem
    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag, count]) => ({ tag, count }))
  }
}
