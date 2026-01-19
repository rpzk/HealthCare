# 🔗 PLANO DE INTEGRAÇÃO - Prontuários + Notificações + IA

**Status:** Pronto para implementação  
**Data:** 19 de Janeiro de 2026  
**Escopo:** Conectar sistemas já existentes sem duplicação

---

## 1️⃣ INTEGRAÇÃO: Notificações em Medical Records

### 📍 Localização: [app/api/medical-records/route.ts](app/api/medical-records/route.ts)

**O que fazer:**
- POST → Notificar quando novo registro criado
- PATCH → Notificar quando atualizado
- DELETE → Notificar quando deletado

**Código a adicionar (linhas ~150):**

```typescript
// No POST handler após criar record:
import { NotificationService } from '@/lib/notification-service'

const record = await prisma.medicalRecord.create({...})

// Notificar médico criador
await NotificationService.createNotification({
  userId: session.user.id,
  type: 'medical_record_created',
  priority: 'medium',
  title: `Prontuário criado: ${data.title}`,
  message: `Para o paciente ${patient.name}`,
  metadata: { recordId: record.id, patientId: record.patientId }
})

// Notificar paciente (se configurado)
if (notifyPatient && record.patient?.userId) {
  await NotificationService.createNotification({
    userId: record.patient.userId,
    type: 'medical_record_created',
    priority: 'low',
    title: 'Novo prontuário',
    message: record.title,
    metadata: { recordId: record.id }
  })
}
```

### 📍 Localização: [app/api/medical-records/[id]/route.ts](app/api/medical-records/[id]/route.ts)

**O que fazer:**
- PUT → Notificar quando atualizado
- DELETE → Notificar quando deletado

**Adicionar (linhas ~200):**

```typescript
// No PUT handler após update:
await NotificationService.createNotification({
  userId: session.user.id,
  type: 'medical_record_updated',
  priority: 'medium',
  title: `Prontuário atualizado: ${record.title}`,
  message: `Versão ${record.version}`,
  metadata: { recordId: id, patientId: record.patientId, version: record.version }
})

// Notificar paciente da atualização
if (record.patient?.userId) {
  await NotificationService.createNotification({
    userId: record.patient.userId,
    type: 'medical_record_updated',
    priority: 'low',
    title: 'Seu prontuário foi atualizado',
    message: record.title,
    metadata: { recordId: id }
  })
}

// No DELETE handler:
await NotificationService.createNotification({
  userId: session.user.id,
  type: 'medical_record_deleted',
  priority: 'high',
  title: `Prontuário deletado: ${record.title}`,
  message: `Registro de ${patient.name}`,
  metadata: { recordId: id, patientId: record.patientId }
})
```

**Resultado esperado:**
- Notificações aparecem em [app/settings/page.tsx](app/settings/page.tsx) na aba Notificações
- Podem ser filtradas por prioridade
- Expiram após X dias (configurável)

---

## 2️⃣ INTEGRAÇÃO: AI Insights Panel em Medical Record Detail

### 📍 Localização: [components/medical-records/medical-record-detail.tsx](components/medical-records/medical-record-detail.tsx)

**O que fazer:**
- Adicionar seção "AI Insights" que chama MedicalAgentService
- Mostrar: análise de histórico, tendências, recomendações

**Novo componente a criar:**
`components/medical-records/ai-record-insights.tsx` (200 linhas)

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface AIRecordInsightsProps {
  recordId: string
  patientId: string
  diagnosis?: string
}

export function AIRecordInsights({ recordId, patientId, diagnosis }: AIRecordInsightsProps) {
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchInsights()
  }, [recordId, patientId])

  const fetchInsights = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/ai/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze_history',
          patientId,
          context: diagnosis
        })
      })

      if (!res.ok) throw new Error('Falha ao carregar insights')
      const data = await res.json()
      setInsights(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao analisar')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="mt-6">
        <CardHeader><CardTitle>Análise IA</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) return null

  return (
    <Card className="mt-6 border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🤖 Análise por IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights?.clinicalSummary && (
          <div>
            <h4 className="font-medium text-sm">Resumo Clínico</h4>
            <p className="text-sm text-gray-700">{insights.clinicalSummary}</p>
          </div>
        )}
        
        {insights?.recommendations && (
          <div>
            <h4 className="font-medium text-sm">Recomendações</h4>
            <ul className="text-sm text-gray-700 list-disc pl-5">
              {insights.recommendations.map((rec: string, i: number) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

**Adicionar em medical-record-detail.tsx:**

```typescript
import { AIRecordInsights } from './ai-record-insights'

// No return, após mostrar diagnosis/treatment:
<AIRecordInsights 
  recordId={recordId} 
  patientId={record.patientId}
  diagnosis={record.diagnosis}
/>
```

**Resultado esperado:**
- Quando médico visualiza prontuário, vê insights da IA
- Análise é carregada async (não bloqueia página)
- Mostra: resumo clínico + recomendações

---

## 3️⃣ INTEGRAÇÃO: Dashboard de Prontuários

### 📍 Localização: Nova página em `app/admin/medical-records-dashboard/page.tsx`

**O que fazer:**
- Criar dashboard com estatísticas de prontuários
- Gráficos de: tipos, severidade, prioridade
- Distribuição por médico/paciente
- Uso de AI insights

**Novo arquivo (300 linhas):**

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

export default function MedicalRecordsDashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      const res = await fetch('/api/admin/medical-records-stats')
      const data = await res.json()
      setStats(data)
      setLoading(false)
    }
    fetchStats()
  }, [])

  if (loading) return <div>Carregando...</div>

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Dashboard de Prontuários</h1>

      {/* Métricas principais */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">{stats.totalRecords}</div>
            <p className="text-sm text-gray-500">Total de Prontuários</p>
          </CardContent>
        </Card>
        {/* Mais cards... */}
      </div>

      {/* Gráficos */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Tipo</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart data={stats.byType}>
              <Pie dataKey="count" fill="#3b82f6" label />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registros por Severidade</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.bySeverity}>
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
  )
}
```

**Novo endpoint API:**
`app/api/admin/medical-records-stats/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const [totalRecords, byType, bySeverity, byDoctor] = await Promise.all([
    prisma.medicalRecord.count({ where: { deletedAt: null } }),
    prisma.medicalRecord.groupBy({
      by: ['recordType'],
      _count: true,
      where: { deletedAt: null }
    }),
    prisma.medicalRecord.groupBy({
      by: ['severity'],
      _count: true,
      where: { deletedAt: null }
    }),
    prisma.medicalRecord.groupBy({
      by: ['doctorId'],
      _count: true,
      where: { deletedAt: null }
    })
  ])

  return NextResponse.json({
    totalRecords,
    byType: byType.map(item => ({ name: item.recordType, count: item._count })),
    bySeverity: bySeverity.map(item => ({ severity: item.severity, count: item._count })),
    byDoctor: byDoctor.map(item => ({ doctorId: item.doctorId, count: item._count }))
  })
}
```

**Resultado esperado:**
- Dashboard acessível em `/admin/medical-records-dashboard`
- 4 gráficos principais
- Dados em tempo real
- Admin pode monitorar uso

---

## 4️⃣ INTEGRAÇÃO: Salvar SOAP como Prontuário

### 📍 Localização: [lib/soap-persistence.ts](lib/soap-persistence.ts) (já existe!)

**Status:** ✅ JÁ IMPLEMENTADO

**Apenas melhorar para:**
- Salvar com diagnosis mais completo
- Notificar médico após salvar

**Modificar em [app/api/ai/soap/save/route.ts](app/api/ai/soap/save/route.ts):**

```typescript
// Após salvar SOAP como medical record:
import { NotificationService } from '@/lib/notification-service'

const saved = await saveSoapAsMedicalRecord({ patientId, doctorId, soap: parsed.data })

// Notificar médico
await NotificationService.createNotification({
  userId: doctorId,
  type: 'medical_record_created',
  priority: 'medium',
  title: 'SOAP salvo como prontuário',
  message: `Evolução do paciente ${patientName}`,
  metadata: { recordId: saved.id, patientId }
})

// Notificar paciente
if (patient?.userId) {
  await NotificationService.createNotification({
    userId: patient.userId,
    type: 'medical_record_created',
    priority: 'low',
    title: 'Sua evolução foi registrada',
    message: 'Consulta registrada no seu prontuário',
    metadata: { recordId: saved.id }
  })
}

return NextResponse.json({ ok: true, recordId: saved.id })
```

---

## 5️⃣ ENHANCEMENT: Quick Actions Panel

### 📍 Localização: [app/records/page.tsx](app/records/page.tsx) (linhas 140+)

**O que adicionar:**
- Botão para gerar análise IA
- Botão para exportar
- Botão para compartilhar com paciente

```typescript
// Nos action buttons de cada card:
<Button 
  size="sm"
  variant="outline"
  onClick={() => analyzeWithAI(record.id)}
>
  <Zap className="h-4 w-4 mr-2" />
  Analisar
</Button>

<Button 
  size="sm"
  variant="outline"
  onClick={() => exportToPDF(record.id)}
>
  <Download className="h-4 w-4 mr-2" />
  PDF
</Button>
```

---

## 📊 SUMMARY DO TRABALHO

| Tarefa | Prioridade | Tempo Est. | Dificuldade |
|--------|-----------|-----------|------------|
| Integrar NotificationService | 🔴 ALTA | 1h | Baixa |
| Criar AIRecordInsights component | 🟡 MÉDIA | 1.5h | Baixa |
| Criar MedicalRecordsDashboard | 🟡 MÉDIA | 2h | Média |
| Melhorar SOAP save com notificações | 🟡 MÉDIA | 30min | Baixa |
| Adicionar quick actions | 🟢 BAIXA | 1h | Baixa |

**Total:** ~6.5 horas de desenvolvimento  
**Sem código redundante:** Reutiliza 100% dos serviços existentes

---

## ✅ PRÉ-CHECKLIST ANTES DE INICIAR

- [ ] Todos os serviços existentes funcionando (test localmente)
- [ ] Notificações em DB com estrutura correta
- [ ] Email service configurado
- [ ] AI endpoints respondendo
- [ ] Permissões RBAC verificadas em todos os endpoints

---

Documento criado: 19/01/2026 14:40 UTC
