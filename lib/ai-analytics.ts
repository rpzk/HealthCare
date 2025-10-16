'use server'

import { prisma } from '@/lib/prisma'

export interface AIAnalytics {
  totalAnalyses: number
  symptomAnalyses: number
  drugInteractions: number
  medicalSummaries: number
  criticalAlerts: number
  accuracyRate: number
  topSymptoms: Array<{ symptom: string; count: number }>
  topDiagnoses: Array<{ diagnosis: string; count: number }>
  interactionsBySeverity: {
    mild: number
    moderate: number
    severe: number
  }
  dailyUsage: Array<{ date: string; analyses: number }>
  responseTime: {
    average: number
    fastest: number
    slowest: number
  }
}

export class AIAnalyticsService {
  // Buscar estatísticas completas de IA
  static async getAIAnalytics(dateFrom?: Date, dateTo?: Date): Promise<AIAnalytics> {
    const startDate = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 dias atrás
    const endDate = dateTo || new Date()

    try {
      // Criar tabela de logs de IA se não existir (simulação)
      const mockAnalytics: AIAnalytics = {
        totalAnalyses: 1247,
        symptomAnalyses: 856,
        drugInteractions: 234,
        medicalSummaries: 157,
        criticalAlerts: 23,
        accuracyRate: 94.7,
        topSymptoms: [
          { symptom: 'Dor de cabeça', count: 156 },
          { symptom: 'Febre', count: 134 },
          { symptom: 'Tosse', count: 98 },
          { symptom: 'Fadiga', count: 87 },
          { symptom: 'Dor abdominal', count: 76 }
        ],
        topDiagnoses: [
          { diagnosis: 'Infecção respiratória', count: 89 },
          { diagnosis: 'Enxaqueca', count: 67 },
          { diagnosis: 'Gastroenterite', count: 45 },
          { diagnosis: 'Hipertensão', count: 34 },
          { diagnosis: 'Diabetes', count: 23 }
        ],
        interactionsBySeverity: {
          mild: 145,
          moderate: 67,
          severe: 22
        },
        dailyUsage: this.generateDailyUsageData(30),
        responseTime: {
          average: 2.3,
          fastest: 0.8,
          slowest: 5.2
        }
      }

      return mockAnalytics
    } catch (error) {
      console.error('Erro ao buscar analytics de IA:', error)
      throw new Error('Erro ao buscar estatísticas de IA')
    }
  }

  // Registrar uso da IA (para estatísticas reais)
  static async logAIUsage(
    type: 'symptom_analysis' | 'drug_interaction' | 'medical_summary',
    patientId?: string,
    doctorId?: string,
    responseTime?: number,
    metadata?: any
  ) {
    try {
      // Em uma implementação real, salvaríamos em uma tabela ai_logs
      console.log('AI Usage logged:', {
        type,
        patientId,
        doctorId,
        responseTime,
        timestamp: new Date(),
        metadata
      })
      
      return true
    } catch (error) {
      console.error('Erro ao registrar uso da IA:', error)
      return false
    }
  }

  // Buscar estatísticas por médico
  static async getDoctorAIStats(doctorId: string) {
    try {
      // Mock data para estatísticas do médico
      return {
        totalUsage: 156,
        symptomAnalyses: 98,
        drugChecks: 34,
        summariesGenerated: 24,
        averageResponseTime: 2.1,
        accuracyFeedback: 96.2,
        favoriteFeatures: [
          { feature: 'Análise de Sintomas', usage: 63 },
          { feature: 'Interações Medicamentosas', usage: 22 },
          { feature: 'Resumos Automáticos', usage: 15 }
        ]
      }
    } catch (error) {
      console.error('Erro ao buscar stats do médico:', error)
      throw error
    }
  }

  // Gerar dados de uso diário (mock)
  private static generateDailyUsageData(days: number) {
    const data = []
    const today = new Date()
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      
      // Simular variação realista de uso
      const baseUsage = 35
      const variation = Math.random() * 20 - 10
      const weekendFactor = [0, 6].includes(date.getDay()) ? 0.6 : 1
      
      data.push({
        date: date.toISOString().split('T')[0],
        analyses: Math.max(0, Math.round((baseUsage + variation) * weekendFactor))
      })
    }
    
    return data
  }

  // Obter métricas de performance em tempo real
  static async getPerformanceMetrics() {
    return {
      aiServiceStatus: 'online',
      averageResponseTime: 2.3,
      successRate: 98.7,
      queueSize: 0,
      activeAnalyses: 3,
      todayUsage: 47,
      peakUsageToday: '14:30',
      systemLoad: 'low'
    }
  }

  // Buscar tendências de diagnósticos
  static async getDiagnosisTrends(period: 'week' | 'month' | 'quarter') {
    const mockTrends = {
      week: [
        { diagnosis: 'COVID-19', trend: '+15%', cases: 23 },
        { diagnosis: 'Gripe', trend: '+8%', cases: 45 },
        { diagnosis: 'Hipertensão', trend: '-3%', cases: 67 }
      ],
      month: [
        { diagnosis: 'Diabetes', trend: '+12%', cases: 156 },
        { diagnosis: 'Ansiedade', trend: '+25%', cases: 89 },
        { diagnosis: 'Artrite', trend: '-5%', cases: 34 }
      ],
      quarter: [
        { diagnosis: 'Obesidade', trend: '+18%', cases: 234 },
        { diagnosis: 'Depressão', trend: '+22%', cases: 178 },
        { diagnosis: 'DPOC', trend: '-8%', cases: 67 }
      ]
    }
    
    return mockTrends[period] || mockTrends.month
  }

  // Alertas e recomendações do sistema
  static async getSystemRecommendations() {
    return [
      {
        type: 'performance',
        priority: 'medium',
        title: 'Otimização de Performance',
        description: 'Considere cache de resultados frequentes para melhorar tempo de resposta',
        action: 'Implementar cache Redis'
      },
      {
        type: 'accuracy',
        priority: 'high',
        title: 'Feedback de Precisão',
        description: 'Taxa de precisão em 94.7% - considere treinamento adicional',
        action: 'Revisar casos com baixa precisão'
      },
      {
        type: 'usage',
        priority: 'low',
        title: 'Pico de Uso',
        description: 'Uso intenso detectado entre 14:00-16:00',
        action: 'Monitorar recursos do servidor'
      }
    ]
  }
}
