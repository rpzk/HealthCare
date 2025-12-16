# 🚀 Guia de Implementação - Novo Dashboard do Paciente

**Status:** Prototype criado em `/minha-saude/novo-dashboard`  
**Tempo Estimado:** 4-6 semanas  
**Prioridade:** CRÍTICA - Core da transformação UX

---

## 📋 Índice

1. [Setup Inicial](#setup)
2. [Componentes Necessários](#componentes)
3. [Banco de Dados](#banco-de-dados)
4. [APIs](#apis)
5. [Integração](#integração)
6. [Testes](#testes)
7. [Deploy](#deploy)

---

## <a name="setup"></a>🔧 1. Setup Inicial

### Verificar Protótipo Atual
```bash
# O componente prototype está em:
/home/umbrel/HealthCare/app/minha-saude/novo-dashboard/page.tsx

# Para visualizar:
http://localhost:3000/minha-saude/novo-dashboard
```

### Dependências Necessárias
```bash
# Já instaladas ✅
npm list @radix-ui/react-tabs
npm list @radix-ui/react-progress
npm list sonner
npm list lucide-react

# Instalar se necessário:
npm install @recharts/recharts  # Para gráficos de progresso
npm install framer-motion       # Para animações
```

---

## <a name="componentes"></a>💎 2. Componentes Necessários

### Estrutura de Componentes

```
components/
├── patient-dashboard/
│   ├── personal-state.tsx         # SEÇÃO 1
│   │   ├── mood-selector.tsx
│   │   ├── wellness-score.tsx
│   │   └── motivational-message.tsx
│   │
│   ├── daily-priorities.tsx        # SEÇÃO 2
│   │   ├── priority-task-card.tsx
│   │   └── priority-sorter.ts
│   │
│   ├── progress-section.tsx        # SEÇÃO 3
│   │   ├── streak-display.tsx
│   │   ├── aptitude-cards.tsx
│   │   └── badge-showcase.tsx
│   │
│   ├── development-hub.tsx         # SEÇÃO 4
│   │   ├── health-profile.tsx
│   │   ├── development-plan.tsx
│   │   ├── learning-modules.tsx
│   │   └── community-hub.tsx
│   │
│   ├── health-timeline.tsx         # SEÇÃO 5
│   │   ├── timeline-event.tsx
│   │   └── event-connector.tsx
│   │
│   └── index.tsx                   # Orchestrator
```

---

## <a name="banco-de-dados"></a>🗄️ 3. Banco de Dados

### Atualizar Schema Prisma

```prisma
// prisma/schema.prisma

model PatientMoodLog {
  id          String   @id @default(cuid())
  patientId   String
  patient     Patient  @relation(fields: [patientId], references: [id], onDelete: Cascade)
  
  mood        Int      @default(3)  // 1-5
  energy      Int?                  // 1-10
  sleep       Int?                  // Horas
  stress      Int?                  // 1-10
  notes       String?   @db.Text
  
  recordedAt  DateTime @default(now())
  createdAt   DateTime @default(now())
  
  @@index([patientId, recordedAt])
}

model PatientAptitude {
  id          String   @id @default(cuid())
  patientId   String
  patient     Patient  @relation(fields: [patientId], references: [id], onDelete: Cascade)
  
  name        String
  description String   @db.Text
  icon        String   // emoji
  category    String   // "physical", "behavioral", "mental"
  
  discoveredAt DateTime @default(now())
  createdAt   DateTime @default(now())
  
  @@unique([patientId, name])
  @@index([patientId, category])
}

model PatientBadge {
  id          String   @id @default(cuid())
  patientId   String
  patient     Patient  @relation(fields: [patientId], references: [id], onDelete: Cascade)
  
  name        String
  description String   @db.Text
  icon        String
  rarity      String   // "common", "rare", "epic", "legendary"
  
  condition   String   @db.Json  // Critério de desbloqueio
  unlockedAt  DateTime @default(now())
  
  @@unique([patientId, name])
  @@index([patientId])
}

model PatientDevelopmentPlan {
  id          String   @id @default(cuid())
  patientId   String
  patient     Patient  @relation(fields: [patientId], references: [id], onDelete: Cascade)
  
  phase       Int
  title       String
  description String   @db.Text
  objective   String
  
  startDate   DateTime @default(now())
  targetDate  DateTime?
  completedAt DateTime?
  
  @@unique([patientId, phase])
  @@index([patientId])
}

model PatientHealthEvent {
  id          String   @id @default(cuid())
  patientId   String
  patient     Patient  @relation(fields: [patientId], references: [id], onDelete: Cascade)
  
  type        String   // "vital", "consultation", "prescription", "exam"
  entityId    String
  title       String
  description String   @db.Text
  impact      String?  // "positive", "negative", "neutral"
  
  eventDate   DateTime
  createdAt   DateTime @default(now())
  
  @@index([patientId, eventDate])
}

model PatientJournal {
  id          String   @id @default(cuid())
  patientId   String
  patient     Patient  @relation(fields: [patientId], references: [id], onDelete: Cascade)
  
  week        Int
  year        Int
  
  reflection  String   @db.Text
  questions   String   @db.Json
  answers     String   @db.Json
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([patientId, week, year])
}
```

### Executar Migração

```bash
cd /home/umbrel/HealthCare

# Gerar migração
npx prisma migrate dev --name add_patient_development_tables

# Ou push direto em dev
npx prisma db push

# Regenerar client
npx prisma generate
```

---

## <a name="apis"></a>📡 4. APIs

### Criar Endpoints

```typescript
// app/api/patient/state.ts
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const patient = await prisma.patient.findFirst({
      where: { userId: session.user.id }
    })

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    // Buscar último mood
    const lastMood = await prisma.patientMoodLog.findFirst({
      where: { patientId: patient.id },
      orderBy: { recordedAt: 'desc' }
    })

    // Buscar últimas 7 moods para trend
    const recentMoods = await prisma.patientMoodLog.findMany({
      where: { patientId: patient.id },
      orderBy: { recordedAt: 'desc' },
      take: 7
    })

    // Calcular trend
    const trend = calculateMoodTrend(recentMoods)

    // Calcular wellness score (0-100)
    const wellnessScore = calculateWellnessScore(lastMood)

    // Gerar mensagem motivacional via IA
    const message = await generateMotivationalMessage(patient.id, wellnessScore, trend)

    return NextResponse.json({
      mood: lastMood?.mood || 3,
      energy: lastMood?.energy || 5,
      wellnessScore,
      trend,
      message
    })
  } catch (error) {
    console.error('Error in patient state:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// app/api/patient/priorities.ts
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const patient = await resolvePatientFromSession(session)

    if (!patient) {
      return NextResponse.json([])
    }

    // Buscar medicamentos de hoje
    const medications = await getMedicationsForToday(patient.id)

    // Buscar consultas próximas
    const upcomingConsultations = await getUpcomingConsultations(patient.id, 3)

    // Buscar metas pessoais
    const goals = await getPersonalGoals(patient.id)

    // Compilar e priorizar
    const allPriorities = [
      ...medications.map(m => ({
        type: 'medication',
        priority: 1,
        ...m
      })),
      ...upcomingConsultations.map((c, i) => ({
        type: 'consultation',
        priority: i + 2,
        ...c
      })),
      ...goals.map((g, i) => ({
        type: 'goal',
        priority: i + 3,
        ...g
      }))
    ]

    return NextResponse.json({ priorityTasks: allPriorities })
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

// app/api/patient/aptitudes.ts
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const patient = await resolvePatientFromSession(session)

  const aptitudes = await prisma.patientAptitude.findMany({
    where: { patientId: patient.id },
    orderBy: { discoveredAt: 'desc' }
  })

  return NextResponse.json({ aptitudes })
}

// app/api/patient/badges.ts
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const patient = await resolvePatientFromSession(session)

  const badges = await prisma.patientBadge.findMany({
    where: { patientId: patient.id },
    orderBy: { unlockedAt: 'desc' }
  })

  return NextResponse.json({ badges })
}

// app/api/patient/timeline.ts
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const patient = await resolvePatientFromSession(session)

  const events = await prisma.patientHealthEvent.findMany({
    where: { patientId: patient.id },
    orderBy: { eventDate: 'desc' },
    take: 20
  })

  return NextResponse.json({ events })
}

// app/api/patient/mood.ts (POST)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const patient = await resolvePatientFromSession(session)
  const body = await req.json()

  const moodLog = await prisma.patientMoodLog.create({
    data: {
      patientId: patient.id,
      mood: body.mood,
      energy: body.energy,
      stress: body.stress,
      sleep: body.sleep,
      notes: body.notes
    }
  })

  // Trigger detecção de aptidões
  detectNewAptitudes(patient.id)

  // Trigger geração de insights
  generateHealthInsights(patient.id)

  return NextResponse.json({ success: true, moodLog })
}
```

---

## <a name="integração"></a>🔗 5. Integração

### Conectar Componentes aos APIs

```typescript
// components/patient-dashboard/index.tsx

'use client'

import { useEffect, useState } from 'react'
import { PersonalState } from './personal-state'
import { DailyPriorities } from './daily-priorities'
import { ProgressSection } from './progress-section'
import { DevelopmentHub } from './development-hub'
import { HealthTimeline } from './health-timeline'

export function PatientDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    try {
      const [state, priorities, aptitudes, badges, timeline, plan] = await Promise.all([
        fetch('/api/patient/state').then(r => r.json()),
        fetch('/api/patient/priorities').then(r => r.json()),
        fetch('/api/patient/aptitudes').then(r => r.json()),
        fetch('/api/patient/badges').then(r => r.json()),
        fetch('/api/patient/timeline').then(r => r.json()),
        fetch('/api/patient/development-plan').then(r => r.json())
      ])

      setData({
        state,
        priorities,
        aptitudes,
        badges,
        timeline,
        plan
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingState />

  return (
    <div className="space-y-8">
      <PersonalState data={data.state} onMoodChange={() => loadAllData()} />
      <DailyPriorities priorities={data.priorities} />
      <ProgressSection aptitudes={data.aptitudes} badges={data.badges} />
      <DevelopmentHub plan={data.plan} />
      <HealthTimeline events={data.timeline} />
    </div>
  )
}
```

---

## <a name="testes"></a>🧪 6. Testes

### Unit Tests

```typescript
// tests/patient-dashboard.test.ts

import { describe, it, expect } from 'vitest'
import { calculateWellnessScore } from '@/lib/patient-wellness'
import { calculateMoodTrend } from '@/lib/patient-mood'

describe('Patient Dashboard', () => {
  
  it('should calculate wellness score correctly', () => {
    const score = calculateWellnessScore({
      mood: 5,
      energy: 8,
      sleep: 7,
      stress: 2
    })
    
    expect(score).toBeGreaterThan(70)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('should detect mood trend', () => {
    const moods = [3, 3, 4, 4, 5, 5, 5]
    const trend = calculateMoodTrend(moods)
    
    expect(trend).toBe('improving')
  })

  it('should rank priorities correctly', () => {
    const priorities = [
      { type: 'goal', priority: 3 },
      { type: 'medication', priority: 1 },
      { type: 'consultation', priority: 2 }
    ]
    
    const sorted = priorities.sort((a, b) => a.priority - b.priority)
    expect(sorted[0].type).toBe('medication')
  })
})
```

### E2E Tests

```bash
# tests/e2e/patient-dashboard.spec.ts

import { test, expect } from '@playwright/test'

test.describe('Patient Dashboard', () => {
  
  test('should display mood selector', async ({ page }) => {
    await page.goto('/minha-saude/novo-dashboard')
    
    const moodButtons = await page.locator('button[data-mood]').all()
    expect(moodButtons.length).toBe(5)
  })

  test('should allow mood selection and save', async ({ page }) => {
    await page.goto('/minha-saude/novo-dashboard')
    
    await page.click('button[data-mood="4"]')
    await expect(page.locator('text=Registrado')).toBeVisible()
  })

  test('should display priorities for today', async ({ page }) => {
    await page.goto('/minha-saude/novo-dashboard')
    
    const priorityCard = page.locator('[data-testid="priority-1"]')
    await expect(priorityCard).toBeVisible()
  })
})
```

---

## <a name="deploy"></a>🚀 7. Deploy

### Checklist Pré-Deploy

- [ ] Todos os testes passando
- [ ] TypeScript sem erros
- [ ] Performance testada (lighthouse score > 80)
- [ ] Mobile responsiveness validada
- [ ] Dados de teste populados
- [ ] APIs funcionando em staging
- [ ] Analytics implementado
- [ ] Error tracking configurado

### Processo de Deploy

```bash
# 1. Mergar branch para main
git checkout main
git pull origin main
git merge feature/new-patient-dashboard

# 2. Executar testes
npm run test:unit
npm run test:e2e

# 3. Build de produção
npm run build

# 4. Deploy em staging
npm run deploy:staging

# 5. Validação manual em staging
# ... testes manuais ...

# 6. Deploy em produção
npm run deploy:production

# 7. Monitorar
npm run logs:production
```

### Feature Flag (Recomendado)

```typescript
// lib/feature-flags.ts

export const FEATURE_FLAGS = {
  NEW_PATIENT_DASHBOARD: process.env.NEXT_PUBLIC_NEW_DASHBOARD === 'true',
  MOOD_TRACKING: process.env.NEXT_PUBLIC_MOOD_TRACKING === 'true',
  DEVELOPMENT_HUB: process.env.NEXT_PUBLIC_DEV_HUB === 'true',
  BADGES_SYSTEM: process.env.NEXT_PUBLIC_BADGES === 'true'
}

// Uso
if (FEATURE_FLAGS.NEW_PATIENT_DASHBOARD) {
  return <NewDashboard />
} else {
  return <OldDashboard />
}
```

### .env para Deploy

```bash
# .env.production

# Feature Flags
NEXT_PUBLIC_NEW_DASHBOARD=true
NEXT_PUBLIC_MOOD_TRACKING=true
NEXT_PUBLIC_DEV_HUB=true
NEXT_PUBLIC_BADGES=true

# AI Service (para insights)
OPENAI_API_KEY=sk_...
ANTHROPIC_API_KEY=sk_...

# Analytics
MIXPANEL_TOKEN=...
SENTRY_DSN=...
```

---

## 📊 KPIs para Monitorar

### Após Deploy

| KPI | Linha Base | Meta | Timeline |
|-----|-----------|------|----------|
| **Daily Active Users** | ? | +50% | 4 semanas |
| **Avg Session Duration** | 3 min | 10 min | 6 semanas |
| **Mood Log Entries/dia** | 0 | 500+ | 2 semanas |
| **Badge Unlock Rate** | 0% | 40%+ | 4 semanas |
| **NPS Score** | ? | +20 pts | 8 semanas |
| **Feature Adoption** | 0% | 70%+ | 6 semanas |
| **Error Rate** | - | < 0.1% | Ongoing |

---

## 🎯 Próximos Passos

1. **Semana 1:** Implementar Section 1 (Personal State)
2. **Semana 2:** Implementar Section 2 (Daily Priorities)
3. **Semana 3:** Implementar Sections 3-4 (Progress + Development)
4. **Semana 4:** Implementar Section 5 (Timeline)
5. **Semana 5:** Testes e otimizações
6. **Semana 6:** Deploy e monitoramento

---

## 📚 Referências

- Prototype: `/app/minha-saude/novo-dashboard/page.tsx`
- Análise completa: `/docs/ANALISE_UX_UI_JORNADA_PACIENTE.md`
- Design system: Ver paleta de cores no documento de análise

---

**Status:** 🟢 Pronto para começar implementação  
**Responsável:** [Engineering Team]  
**Data de Criação:** 15 de dezembro de 2025  
**Última Atualização:** 15 de dezembro de 2025
