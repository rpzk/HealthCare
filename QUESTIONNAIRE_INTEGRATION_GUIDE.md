# Guia de Integração - Dashboard de Análise de Questionários

Este guia fornece exemplos práticos para integrar o novo Dashboard de Análise de Questionários no seu fluxo de desenvolvimento.

---

## 1️⃣ Adicionar Link no Menu de Navegação

### Localizar o arquivo de navegação:
`components/ui/navigation.tsx` ou `components/sidebar.tsx`

### Adicionar a importação:
```tsx
import { BarChart3 } from 'lucide-react'
```

### Adicionar o item de menu (na seção admin):
```tsx
<NavItem
  href="/admin/questionnaire-analytics"
  icon={BarChart3}
  label="Análise de Questionários"
  description="Monitore questionários e notificações"
/>
```

---

## 2️⃣ Integrar Notificações ao Enviar Questionário

### Na API ou função que envia questionários:

**Localização típica:** `app/api/questionnaires/send/route.ts` ou similar

```typescript
import { QuestionnaireNotificationService } from '@/lib/questionnaire-notification-service'

export async function POST(req: NextRequest) {
  try {
    // ... seu código de validação ...

    // Criar o questionário
    const questionnaire = await prisma.patientQuestionnaire.create({
      data: {
        patientId,
        templateId,
        sentAt: new Date(),
        expiresAt: expirationDate,
        status: 'PENDING',
      },
    })

    // 🔔 NOVO: Notificar o profissional que enviou
    await QuestionnaireNotificationService.notifyQuestionnaireSent(
      session.user.id,  // ID do profissional que enviou
      patient.name,      // Nome do paciente
      template.name,     // Nome do questionário
      questionnaire.id   // ID do questionário criado
    )

    // ... resto do seu código ...

    return NextResponse.json({ success: true, questionnaire })
  } catch (error) {
    // ... tratamento de erro ...
  }
}
```

---

## 3️⃣ Integrar Notificações ao Responder Questionário

### Na API que marca como COMPLETED:

**Localização típica:** `app/api/questionnaires/[id]/complete/route.ts` ou `app/api/questionnaires/responses/route.ts`

```typescript
import { QuestionnaireNotificationService } from '@/lib/questionnaire-notification-service'

export async function POST(req: NextRequest) {
  try {
    // ... seu código de validação ...

    // Marcar como completo
    const questionnaire = await prisma.patientQuestionnaire.update({
      where: { id: questionnaireId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        progressPercent: 100,
      },
      include: {
        template: true,
        patient: true,
        sentBy: true,
      },
    })

    // 🔔 NOVO: Notificar o profissional que enviou
    await QuestionnaireNotificationService.notifyQuestionnaireCompleted(
      questionnaire.sentBy.id,      // ID do profissional que enviou
      questionnaire.patient.name,   // Nome do paciente
      questionnaire.template.name,  // Nome do questionário
      questionnaire.id,             // ID do questionário
      questionnaire.patientId       // ID do paciente
    )

    // 📧 Opcional: Enviar também por email (já implementado)
    if (questionnaire.sentBy.email) {
      await emailService.sendQuestionnaireCompletedNotification(
        questionnaire.sentBy.email,
        questionnaire.sentBy.name,
        questionnaire.patient.name,
        questionnaire.template.name,
        `/patients/${questionnaire.patientId}?tab=questionnaires`
      )
    }

    return NextResponse.json({ success: true, questionnaire })
  } catch (error) {
    // ... tratamento de erro ...
  }
}
```

---

## 4️⃣ Integrar Notificação de Análise IA

### Após a análise IA ser concluída:

**Localização típica:** `app/api/questionnaires/responses/[id]/analyze/route.ts`

```typescript
import { QuestionnaireNotificationService } from '@/lib/questionnaire-notification-service'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // ... seu código de análise IA ...

    // Depois que a análise terminou:
    const analysis = {
      concerns: [...],
      improvements: [...],
      recommendations: [...],
    }

    // Atualizar o banco com a análise
    const questionnaire = await prisma.patientQuestionnaire.update({
      where: { id: params.id },
      data: {
        aiAnalysis: analysis,
        aiAnalyzedAt: new Date(),
      },
      include: {
        template: true,
        patient: true,
        sentBy: true,
      },
    })

    // 🔔 NOVO: Notificar sobre análise pronta
    const hasConcerns = analysis.concerns?.some(c => c.severity === 'high') || false
    
    await QuestionnaireNotificationService.notifyAIAnalysisReady(
      questionnaire.sentBy.id,      // ID do profissional
      questionnaire.patient.name,   // Nome do paciente
      questionnaire.template.name,  // Nome do questionário
      questionnaire.id,             // ID do questionário
      questionnaire.patientId,      // ID do paciente
      hasConcerns                   // Se tem preocupações altas
    )

    return NextResponse.json({ success: true, analysis })
  } catch (error) {
    // ... tratamento de erro ...
  }
}
```

---

## 5️⃣ Integrar Notificação de Expiração

### Em um job/scheduler que verifica expiração:

**Localização:** `lib/jobs/check-expired-questionnaires.ts` (novo arquivo) ou `pages/api/cron/check-expired.ts`

```typescript
import { QuestionnaireNotificationService } from '@/lib/questionnaire-notification-service'

export async function checkExpiredQuestionnaires() {
  try {
    // Buscar questionários que venceram
    const now = new Date()
    const expiredQuestionnaires = await prisma.patientQuestionnaire.findMany({
      where: {
        status: 'PENDING',
        expiresAt: {
          lte: now,
        },
      },
      include: {
        template: true,
        patient: true,
        sentBy: true,
      },
    })

    // Marcar como expirados e notificar
    for (const q of expiredQuestionnaires) {
      await prisma.patientQuestionnaire.update({
        where: { id: q.id },
        data: { status: 'EXPIRED' },
      })

      // 🔔 Notificar
      await QuestionnaireNotificationService.notifyQuestionnaireExpired(
        q.sentBy.id,
        q.patient.name,
        q.template.name,
        q.id,
        q.patientId
      )
    }

    console.log(`${expiredQuestionnaires.length} questionários marcados como expirados`)
    return expiredQuestionnaires.length
  } catch (error) {
    console.error('Erro ao verificar questionários expirados:', error)
  }
}
```

---

## 6️⃣ Adicionar Widget ao Dashboard Principal

### Localizar a página do dashboard principal:
`app/admin/page.tsx` ou `app/dashboard/page.tsx`

### Adicionar a importação:
```tsx
import { QuestionnaireAlertWidget } from '@/components/questionnaires/questionnaire-alert-widget'
```

### Adicionar o componente no layout:
```tsx
export default async function DashboardPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1>Dashboard Principal</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna esquerda - Alertas e widgets */}
        <div className="lg:col-span-1 space-y-4">
          {/* 🔴 NOVO: Widget de Questionários */}
          <QuestionnaireAlertWidget />

          {/* ... outros widgets ... */}
        </div>

        {/* Coluna direita - Conteúdo principal */}
        <div className="lg:col-span-2">
          {/* ... seu conteúdo principal ... */}
        </div>
      </div>
    </div>
  )
}
```

---

## 7️⃣ Exemplo Completo: Fluxo de Envio

```typescript
// 1. Usuário envia questionário via componente
async function sendQuestionnaire(patientId: string, templateId: string) {
  const response = await fetch('/api/questionnaires/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patientId, templateId }),
  })
  
  // 🔔 Notificação criada automaticamente
  // Usuário pode ver em: /admin/questionnaire-analytics → Notificações
}

// 2. Paciente responde questionário
async function submitQuestionnaire(questionnaireId: string, answers: any[]) {
  const response = await fetch(`/api/questionnaires/${questionnaireId}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers }),
  })
  
  // 🔔 Notificação criada automaticamente
  // Profissional recebe: "${patientName} respondeu o questionário"
  // Link direto para revisar respostas
}

// 3. Sistema analisa com IA
async function analyzeQuestionnaire(questionnaireId: string) {
  const response = await fetch(
    `/api/questionnaires/responses/${questionnaireId}/analyze`,
    { method: 'POST' }
  )
  
  // 🔔 Notificação criada automaticamente
  // Se houver preocupações: ⚠️ "Análise IA - Com Preocupações"
  // Se normal: 🧠 "Análise IA Disponível"
  // Link direto para insights
}
```

---

## 8️⃣ Teste as Notificações Manualmente

### Via cURL:

```bash
# 1. Enviar questionário
curl -X POST http://localhost:3000/api/questionnaires/send \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "patient-123",
    "templateId": "template-456"
  }'

# 2. Verificar notificações
curl http://localhost:3000/api/questionnaires/notifications

# 3. Marcar como lida
curl -X PATCH http://localhost:3000/api/questionnaires/notifications/notif-id \
  -H "Content-Type: application/json"

# 4. Ver insights
curl http://localhost:3000/api/questionnaires/insights
```

---

## 9️⃣ Troubleshooting

### "Notificações não aparecem"
✅ Verificar:
1. Usuário está logado?
2. Usuário tem role DOCTOR/ADMIN/NURSE/THERAPIST?
3. A notification foi criada no banco? `SELECT * FROM Notification WHERE type LIKE 'QUESTIONNAIRE%'`

### "Dashboard está lento"
✅ Verificar:
1. Índices de banco de dados criados? (Ver `QUESTIONNAIRE_ANALYTICS_SCHEMA.md`)
2. Número de notificações > 10000? Executar limpeza:
   ```typescript
   await QuestionnaireNotificationService.cleanupOldNotifications(30)
   ```

### "Análise IA não dispara notificação"
✅ Verificar:
1. Campo `aiAnalyzedAt` está sendo preenchido?
2. `aiAnalysis` contém dados válidos?
3. `sentBy` relacionamento está correto?

---

## 🔟 Checklist de Implementação

- [ ] Link adicionado no menu de navegação
- [ ] Notificação integrada ao enviar questionário
- [ ] Notificação integrada ao responder questionário
- [ ] Notificação integrada após análise IA
- [ ] Widget adicionado ao dashboard principal
- [ ] Job de expiração configurado (se necessário)
- [ ] Índices de banco de dados criados
- [ ] Testado em mobile/tablet/desktop
- [ ] Testado com dados reais
- [ ] Documentação atualizada para usuários finais

---

## 📚 Referência Rápida

| Função | Localização | Uso |
|--------|------------|-----|
| `notifyQuestionnaireSent()` | `lib/questionnaire-notification-service.ts` | Quando questionário é enviado |
| `notifyQuestionnaireCompleted()` | `lib/questionnaire-notification-service.ts` | Quando paciente responde |
| `notifyQuestionnaireExpired()` | `lib/questionnaire-notification-service.ts` | Quando prazo expira |
| `notifyAIAnalysisReady()` | `lib/questionnaire-notification-service.ts` | Quando análise termina |
| API Analytics | `app/api/questionnaires/analytics/route.ts` | Obter métricas |
| API Notifications | `app/api/questionnaires/notifications/route.ts` | Listar notificações |
| API Insights | `app/api/questionnaires/insights/route.ts` | Obter insights |

---

**Status:** ✅ Pronto para Integração
**Data:** 2026-01-02
