/**
 * 🧠 API para AI Analytics e Anomaly Detection Dashboard
 */

import { NextResponse } from 'next/server'
import { withAdminAuthUnlimited } from '@/lib/advanced-auth'
import { aiAnomalyDetector } from '@/lib/ai-anomaly-detector'
import { createRedisRateLimiter } from '@/lib/redis-integration'
import { logger } from '@/lib/logger'

const handler = withAdminAuthUnlimited(async (request) => {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  try {
    switch (action) {
      case 'ai-analytics-overview':
        return NextResponse.json(await getAIAnalyticsOverview())
      
      case 'anomaly-detection-stats':
        return NextResponse.json(await getAnomalyDetectionStats())
      
      case 'real-time-threats':
        return NextResponse.json(await getRealTimeThreats())
      
      case 'user-behavior-analysis':
        return NextResponse.json(await getUserBehaviorAnalysis())
      
      case 'performance-metrics':
        return NextResponse.json(await getPerformanceMetrics())
      
      default:
        return NextResponse.json(await getAllAIAnalytics())
    }
  } catch (error) {
    logger.error('AI Analytics API Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch AI analytics' },
      { status: 500 }
    )
  }
})

/**
 * 📊 Visão geral completa de AI Analytics
 */
async function getAllAIAnalytics() {
  const [overview, anomalies, threats, behavior, performance] = await Promise.all([
    getAIAnalyticsOverview(),
    getAnomalyDetectionStats(),
    getRealTimeThreats(),
    getUserBehaviorAnalysis(),
    getPerformanceMetrics()
  ])

  return {
    overview,
    anomalies,
    threats,
    behavior,
    performance,
    timestamp: Date.now()
  }
}

/**
 * 🧠 Visão geral do sistema de AI Analytics
 */
async function getAIAnalyticsOverview() {
  const detectorStats = aiAnomalyDetector.getDetectorStats()
  const redisStats = await createRedisRateLimiter().getStats()

  return {
    aiSystem: {
      status: 'OPERATIONAL',
      userProfilesLearned: detectorStats.userProfilesCount,
      anomaliesDetected: detectorStats.recentEventsCount,
      threatLevel: redisStats.blockedUsers > 10 ? 'HIGH' : 
                   redisStats.blockedUsers > 5 ? 'MEDIUM' : 'LOW'
    },
    redisIntegration: {
      connected: redisStats.redisConnected,
      distributedRateLimit: redisStats.redisConnected ? 'ACTIVE' : 'FALLBACK',
      activeUsers: redisStats.activeUsers,
      blockedUsers: redisStats.blockedUsers
    },
    securityMetrics: {
      totalSecurityEvents: detectorStats.recentEventsCount,
      // Sem dados simulados: se não houver fonte real, não reportar números fictícios.
      criticalAlertsLast24h: null,
      averageResponseTime: null,
      systemUptime: null
    }
  }
}

/**
 * 🚨 Estatísticas de detecção de anomalias
 */
async function getAnomalyDetectionStats() {
  const detectorStats = aiAnomalyDetector.getDetectorStats()
  
  return {
    detectionEngine: {
      status: 'ACTIVE',
      totalPatternsLearned: detectorStats.userProfilesCount,
      confidenceLevel: null,
      falsePositiveRate: null
    },
    anomalyTypes: {
      rateSpikeDetections: null,
      unusualHoursActivity: null,
      suspiciousIPActivity: detectorStats.suspiciousIPsCount,
      failedAuthBursts: null,
      endpointAbuse: null
    },
    mlMetrics: {
      modelAccuracy: null,
      learningRate: null,
      lastModelUpdate: null,
      nextModelUpdate: null
    }
  }
}

/**
 * ⚡ Ameaças em tempo real
 */
async function getRealTimeThreats() {
  const redisStats = await createRedisRateLimiter().getStats()
  
  return {
    activeThreats: [],
    threatSummary: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      totalBlocked: redisStats.blockedUsers
    },
    recentBlocks: []
  }
}

/**
 * 👤 Análise de comportamento de usuários
 */
async function getUserBehaviorAnalysis() {
  const detectorStats = aiAnomalyDetector.getDetectorStats()
  
  return {
    behaviorProfiles: {
      totalProfiles: detectorStats.userProfilesCount,
      profilesUpdatedToday: null,
      averageAccuracyScore: null,
      behaviorPatternsLearned: null
    },
    userSegments: {
      normalUsers: null,
      flaggedUsers: null,
      suspiciousUsers: null
    },
    activityPatterns: {
      peakHours: null,
      averageSessionDuration: null,
      mostAccessedEndpoints: [],
      deviceTypes: null
    }
  }
}

/**
 * ⚡ Métricas de performance do sistema
 */
async function getPerformanceMetrics() {
  const redisStats = await createRedisRateLimiter().getStats()
  
  return {
    systemPerformance: {
      averageResponseTime: null,
      p95ResponseTime: null,
      p99ResponseTime: null,
      errorRate: null,
      throughput: null
    },
    redisPerformance: {
      connected: redisStats.redisConnected,
      averageLatency: null,
      hitRate: null,
      memoryUsage: null,
      fallbackUsage: redisStats.memoryFallbackEntries
    },
    aiPerformance: {
      averageAnalysisTime: null,
      anomaliesProcessed: detectorStatsFromAnomalyDetectorSafe(),
      modelPredictionAccuracy: null,
      learningEfficiency: null
    },
    resourceUtilization: {
      cpuUsage: null,
      memoryUsage: null,
      diskUsage: null,
      networkThroughput: null
    }
  }
}

function detectorStatsFromAnomalyDetectorSafe(): number {
  try {
    const s = aiAnomalyDetector.getDetectorStats()
    return s?.recentEventsCount || 0
  } catch {
    return 0
  }
}

export { handler as GET }
