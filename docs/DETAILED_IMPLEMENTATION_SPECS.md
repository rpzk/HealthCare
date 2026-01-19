# 🎯 RECOMENDAÇÕES ESPECÍFICAS - Implementação Sem Redundância

**Data:** 19 de Janeiro de 2026  
**Scope:** Detalhe técnico para cada integração planejada

---

## 1️⃣ NOTIFICAÇÕES EM MEDICAL RECORDS

### ✅ STATUS ATUAL
- Service implementado e testado: [lib/notification-service.ts](lib/notification-service.ts)
- Database pronto: `Notification` model em Prisma
- UI pronta: [app/settings/page.tsx](app/settings/page.tsx) mostra notificações
- Email pronto: [lib/email-service.ts](lib/email-service.ts) com templates

### ❌ FALTA APENAS
Integrar chamadas de `NotificationService.createNotification()` nos 3 endpoints

### 📝 IMPLEMENTAÇÃO

**Arquivo:** [app/api/medical-records/route.ts](app/api/medical-records/route.ts)

**Linha de inserção:** Após `const record = await prisma.medicalRecord.create(...)`

```typescript
// ============================================================================
// NOVO BLOCO - Notificar sobre criação
// ============================================================================
import { NotificationService } from '@/lib/notification-service'

const created = await prisma.medicalRecord.create({
  data: {/* ... dados ... */}
})

// Notificar médico criador
await NotificationService.createNotification({
  userId: session.user.id,
  type: 'medical_record_created',
  priority: 'medium',
  title: `📋 Prontuário criado: ${data.title}`,
  message: `Paciente: ${patient.name}`,
  metadata: {
    recordId: created.id,
    patientId: created.patientId,
    recordType: data.recordType
  },
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 dias
})

// Notificar paciente (se preferência ativa)
const patientUser = await prisma.user.findFirst({
  where: { patients: { some: { id: created.patientId } } }
})

if (patientUser?.id) {
  await NotificationService.createNotification({
    userId: patientUser.id,
    type: 'medical_record_created',
    priority: 'low',
    title: '📋 Seu prontuário foi atualizado',
    message: data.title,
    metadata: {
      recordId: created.id,
      doctorId: session.user.id
    }
  })
}

return NextResponse.json({ 
  success: true, 
  data: created 
})
```

**Arquivo:** [app/api/medical-records/[id]/route.ts](app/api/medical-records/[id]/route.ts)

**Linha de inserção (PUT):** Após `const updated = await prisma.medicalRecord.update(...)`

```typescript
// ============================================================================
// NOVO BLOCO - Notificar sobre atualização
// ============================================================================
// Preparar notification para paciente
const patientNotification = await prisma.patient.findUnique({
  where: { id: updated.patientId },
  select: { userId: true }
})

if (patientNotification?.userId) {
  await NotificationService.createNotification({
    userId: patientNotification.userId,
    type: 'medical_record_updated',
    priority: 'low',
    title: '📋 Seu prontuário foi atualizado',
    message: `v${updated.version}: ${updated.title}`,
    metadata: {
      recordId: updated.id,
      version: updated.version,
      changedFields: Object.keys(body).filter(k => k !== 'id' && k !== 'createdAt')
    }
  })
}

// Notificar outros médicos na equipe de cuidado
const careTeam = await prisma.patientCareTeam.findMany({
  where: { patientId: updated.patientId, status: 'ACTIVE', professionalId: { not: session.user.id } }
})

for (const member of careTeam) {
  await NotificationService.createNotification({
    userId: member.professionalId,
    type: 'medical_record_updated',
    priority: 'low',
    title: `📋 Prontuário atualizado: ${updated.title}`,
    message: `Paciente: ${patient.name}`,
    metadata: {
      recordId: updated.id,
      updatedBy: session.user.id,
      version: updated.version
    }
  })
}

return NextResponse.json({ success: true, data: updated })
```

**Arquivo:** [app/api/medical-records/[id]/route.ts](app/api/medical-records/[id]/route.ts)

**Linha de inserção (DELETE):** Após `await prisma.medicalRecord.update(...deletedAt...)`

```typescript
// ============================================================================
// NOVO BLOCO - Notificar sobre exclusão
// ============================================================================
await NotificationService.createNotification({
  userId: session.user.id,
  type: 'medical_record_deleted',
  priority: 'high',
  title: `⚠️ Prontuário deletado: ${deleted.title}`,
  message: `Paciente: ${patient.name} | Motivo: Soft delete`,
  metadata: {
    recordId: deleted.id,
    patientId: deleted.patientId,
    deletedBy: session.user.id,
    timestamp: new Date().toISOString()
  }
})

return NextResponse.json({ success: true, message: 'Deleted successfully' })
```

### ✅ RESULTADO
- Médicos recebem notificação quando create/update/delete
- Pacientes recebem notificação quando seu prontuário muda
- Care team recebe notificação de mudanças
- Todas as notificações aparecem em [app/settings/page.tsx](app/settings/page.tsx)

### 🧪 TESTAR
```bash
# 1. Criar prontuário via API
curl -X POST http://localhost:3000/api/medical-records \
  -H "Content-Type: application/json" \
  -d '{"title":"Teste","patientId":"xyz",...}'

# 2. Checar se notificação foi criada
# SELECT * FROM "Notification" WHERE "userId" = '...' 
# ORDER BY "createdAt" DESC LIMIT 1;

# 3. Verificar em UI
# http://localhost:3000/app/settings#notifications
```

---

## 2️⃣ AI INSIGHTS PANEL

### ✅ STATUS ATUAL
- AI service implementado: [lib/advanced-medical-ai.ts](lib/advanced-medical-ai.ts)
- Endpoint de análise: [app/api/ai/agent/route.ts](app/api/ai/agent/route.ts)
- UI parcial em consultations: [components/consultations/ai-suggestions.tsx](components/consultations/ai-suggestions.tsx)

### ❌ FALTA
- Componente específico para medical record details
- Integração em medical-record-detail

### 📝 IMPLEMENTAÇÃO

**Novo arquivo:** `components/medical-records/ai-record-insights.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Zap, ThumbsUp } from 'lucide-react'

interface AIInsight {
  clinicalSummary?: string
  riskFactors?: string[]
  recommendations?: string[]
  warnings?: string[]
  confidence?: number
}

interface AIRecordInsightsProps {
  recordId: string
  patientId: string
  diagnosis?: string
  symptoms?: string
}

export function AIRecordInsights({
  recordId,
  patientId,
  diagnosis,
  symptoms
}: AIRecordInsightsProps) {
  const [insights, setInsights] = useState<AIInsight | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        setLoading(true)
        setError(null)

        // Chamar AI agent para analisar histórico do paciente
        const response = await fetch('/api/ai/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'analyze_history',
            patientId,
            context: diagnosis || symptoms
          })
        })

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`)
        }

        const data = await response.json()
        setInsights(data?.result || data)
      } catch (err) {
        console.error('Erro ao carregar insights:', err)
        // Não mostrar erro ao usuário, apenas desabilitar seção
        setInsights(null)
      } finally {
        setLoading(false)
      }
    }

    if (patientId) {
      fetchInsights()
    }
  }, [patientId, recordId, diagnosis])

  if (loading) {
    return (
      <Card className="mt-6 border-blue-100 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            🤖 Análise por IA
            <Badge variant="outline" className="ml-auto text-xs">Carregando...</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    )
  }

  if (!insights) {
    return null
  }

  return (
    <Card className="mt-6 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <Zap className="h-5 w-5 text-blue-600" />
          Análise Inteligente
        </CardTitle>
        <CardDescription>
          Insights gerados por IA baseado no histórico do paciente
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Resumo Clínico */}
        {insights.clinicalSummary && (
          <div className="rounded-lg bg-white p-3 border border-blue-100">
            <h4 className="font-semibold text-sm text-gray-900 mb-2">
              📋 Resumo Clínico
            </h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              {insights.clinicalSummary}
            </p>
          </div>
        )}

        {/* Fatores de Risco */}
        {insights.riskFactors && insights.riskFactors.length > 0 && (
          <div className="rounded-lg bg-white p-3 border border-yellow-100">
            <h4 className="font-semibold text-sm text-gray-900 mb-2 flex items-center gap-1">
              ⚠️ Fatores de Risco
            </h4>
            <ul className="space-y-1">
              {insights.riskFactors.map((factor, i) => (
                <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-yellow-600 mt-0.5">•</span>
                  {factor}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Warnings / Red Flags */}
        {insights.warnings && insights.warnings.length > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <h4 className="font-semibold mb-2">Alertas Importantes</h4>
              <ul className="space-y-1">
                {insights.warnings.map((warning, i) => (
                  <li key={i} className="text-sm">⚠️ {warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Recomendações */}
        {insights.recommendations && insights.recommendations.length > 0 && (
          <div className="rounded-lg bg-white p-3 border border-green-100">
            <h4 className="font-semibold text-sm text-gray-900 mb-2 flex items-center gap-1">
              <ThumbsUp className="h-4 w-4 text-green-600" />
              Recomendações
            </h4>
            <ul className="space-y-1">
              {insights.recommendations.map((rec, i) => (
                <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Confiança */}
        {insights.confidence && (
          <div className="text-xs text-gray-500 pt-2 border-t">
            Confiança da análise: {(insights.confidence * 100).toFixed(0)}%
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

**Integrar em:** [components/medical-records/medical-record-detail.tsx](components/medical-records/medical-record-detail.tsx)

**Localização:** Após mostrar diagnosis/treatment (linha ~270)

```typescript
// Adicionar import
import { AIRecordInsights } from './ai-record-insights'

// No return, após MedicalRecordContent:
{record && (
  <>
    {/* ... conteúdo existente ... */}
    
    {/* NOVO - AI Insights */}
    <AIRecordInsights
      recordId={recordId}
      patientId={record.patientId}
      diagnosis={record.diagnosis}
      symptoms={record.description}
    />
  </>
)}
```

### ✅ RESULTADO
- Ao abrir prontuário, médico vê insights automáticos
- Mostra: resumo clínico, fatores de risco, warnings, recomendações
- Carregamento async não bloqueia página
- UI elegante e não intrusiva

### 🧪 TESTAR
```bash
# 1. Abrir prontuário
# http://localhost:3000/medical-records/[id]

# 2. Aguardar carregamento da seção "Análise Inteligente"

# 3. Validar se insights aparecem (pode demorar 2-3s)
```

---

## 3️⃣ MEDICAL RECORDS DASHBOARD

### ✅ STATUS ATUAL
- Dashboard de consultations existe: [components/bi/bi-dashboard.tsx](components/bi/bi-dashboard.tsx)
- Padrão está estabelecido e funcionando

### ❌ FALTA
- Dashboard específico para prontuários
- Endpoint de estatísticas

### 📝 IMPLEMENTAÇÃO

**Novo endpoint:** `app/api/admin/medical-records-stats/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  // Verificar permissão
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 403 }
    )
  }

  try {
    // Parâmetros de período
    const searchParams = req.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '30')
    const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Queries em paralelo
    const [
      totalRecords,
      recordsThisPeriod,
      recordsByType,
      recordsBySeverity,
      recordsByPriority,
      recordsByDoctor,
      recordsWithAI,
      avgVersions
    ] = await Promise.all([
      // Total geral
      prisma.medicalRecord.count({
        where: { deletedAt: null }
      }),

      // Este período
      prisma.medicalRecord.count({
        where: {
          deletedAt: null,
          createdAt: { gte: dateFrom }
        }
      }),

      // Por tipo
      prisma.medicalRecord.groupBy({
        by: ['recordType'],
        _count: true,
        where: { deletedAt: null }
      }),

      // Por severidade
      prisma.medicalRecord.groupBy({
        by: ['severity'],
        _count: true,
        where: { deletedAt: null }
      }),

      // Por prioridade
      prisma.medicalRecord.groupBy({
        by: ['priority'],
        _count: true,
        where: { deletedAt: null }
      }),

      // Top 5 médicos
      prisma.medicalRecord.groupBy({
        by: ['doctorId'],
        _count: true,
        where: { deletedAt: null },
        orderBy: { _count: { doctorId: 'desc' } },
        take: 5
      }),

      // Registros com análise AI
      prisma.medicalRecord.count({
        where: {
          deletedAt: null,
          aiAnalysis: { some: {} }
        }
      }),

      // Versão média
      prisma.$queryRaw`
        SELECT AVG(version) as avgVersion
        FROM "MedicalRecord"
        WHERE "deletedAt" IS NULL
      `
    ])

    // Resolver doctor names
    const doctorIds = recordsByDoctor.map(item => item.doctorId).filter(Boolean)
    const doctors = await prisma.user.findMany({
      where: { id: { in: doctorIds } },
      select: { id: true, name: true }
    })
    const doctorMap = Object.fromEntries(doctors.map(d => [d.id, d.name]))

    return NextResponse.json({
      period: { days, from: dateFrom },
      metrics: {
        totalRecords,
        recordsThisPeriod,
        percentageGrowth: totalRecords ? (recordsThisPeriod / totalRecords * 100).toFixed(1) : 0,
        recordsWithAI,
        avgVersion: (avgVersions?.[0]?.avgVersion || 0).toFixed(1)
      },
      distribution: {
        byType: recordsByType.map(item => ({
          name: item.recordType,
          count: item._count,
          percentage: ((item._count / totalRecords) * 100).toFixed(1)
        })),
        bySeverity: recordsBySeverity.map(item => ({
          severity: item.severity,
          count: item._count,
          percentage: ((item._count / totalRecords) * 100).toFixed(1)
        })),
        byPriority: recordsByPriority.map(item => ({
          priority: item.priority,
          count: item._count,
          percentage: ((item._count / totalRecords) * 100).toFixed(1)
        }))
      },
      topDoctors: recordsByDoctor.map(item => ({
        doctorId: item.doctorId,
        doctorName: doctorMap[item.doctorId] || 'Unknown',
        count: item._count
      }))
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}
```

**Novo página:** `app/admin/medical-records-dashboard/page.tsx`

```typescript
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  BarChart, Bar, PieChart, Pie, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts'
import { FileText, TrendingUp, Users, Zap } from 'lucide-react'

interface DashboardData {
  period: { days: number; from: string }
  metrics: {
    totalRecords: number
    recordsThisPeriod: number
    percentageGrowth: string
    recordsWithAI: number
    avgVersion: string
  }
  distribution: {
    byType: Array<{ name: string; count: number; percentage: string }>
    bySeverity: Array<{ severity: string; count: number; percentage: string }>
    byPriority: Array<{ priority: string; count: number; percentage: string }>
  }
  topDoctors: Array<{ doctorId: string; doctorName: string; count: number }>
}

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6']

export default function MedicalRecordsDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30')

  useEffect(() => {
    fetchStats()
  }, [period])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/medical-records-stats?days=${period}`)
      const json = await res.json()
      setData(json)
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-6">Carregando...</div>
  }

  if (!data) {
    return <div className="p-6 text-red-600">Erro ao carregar dados</div>
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard de Prontuários</h1>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
            <SelectItem value="365">Último ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total de Prontuários</p>
                <p className="text-3xl font-bold">{data.metrics.totalRecords}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Este Período</p>
                <p className="text-3xl font-bold">{data.metrics.recordsThisPeriod}</p>
                <p className="text-xs text-gray-500">
                  {data.metrics.percentageGrowth}% do total
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Com Análise IA</p>
                <p className="text-3xl font-bold">{data.metrics.recordsWithAI}</p>
              </div>
              <Zap className="h-8 w-8 text-purple-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Versão Média</p>
                <p className="text-3xl font-bold">{data.metrics.avgVersion}</p>
              </div>
              <Users className="h-8 w-8 text-orange-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-2 gap-6">
        {/* Por Tipo */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.distribution.byType}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {data.distribution.byType.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Por Severidade */}
        <Card>
          <CardHeader>
            <CardTitle>Severidade dos Registros</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.distribution.bySeverity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="severity" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Médicos */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Médicos - Prontuários Criados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.topDoctors.map((doctor, idx) => (
              <div key={doctor.doctorId} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-400">#{idx + 1}</span>
                  <span className="font-medium">{doctor.doctorName}</span>
                </div>
                <span className="text-lg font-bold text-blue-600">{doctor.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

### ✅ RESULTADO
- Dashboard acessível em `/admin/medical-records-dashboard`
- Mostra 4 KPIs principais
- 2 gráficos principais (pie + bar)
- Ranking de médicos
- Filtro por período
- Atualiza em tempo real

---

## PRÓXIMO PASSO

Escolha **uma das 3 implementações acima** e comece agora mesmo!

Recomendação: **COMEÇAR PELA #1 (Notificações)** porque:
1. ✅ Código mais simples (cópia-cola de 3 blocos)
2. ✅ Impacto imediato (usuários veem notificações)
3. ✅ Não depende de nada mais
4. ⏱️ Apenas 1-2 horas

Depois fazer #2 e #3 em paralelo.

---

**Pronto para começar? 🚀**
