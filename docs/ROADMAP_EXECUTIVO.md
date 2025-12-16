# 🗓️ ROADMAP EXECUTIVO - Implementação do Novo Dashboard

## 📋 STATUS ATUAL

```
✅ Análise Completa       (2,500+ linhas)
✅ Protótipo Funcional    (613 linhas)
✅ Especificação Técnica  (Completa)
✅ Design System          (Definido)
✅ Personas & Jornadas    (6 personas mapeadas)

📍 PRÓXIMO: Aprovação executiva & Planejamento de Sprint
```

---

## 🚀 FASE 0: APROVAÇÃO & PLANEJAMENTO (Semana 1-2)

### Ações Imediatas

**[HOJE] Apresentação Executiva**
```
Apresentar para:
  • Product Manager
  • CPO (Chief Product Officer)
  • Tech Lead
  • 1 diretor clínico (para validar)

Material:
  • SUMARIO_EXECUTIVO_UX_TRANSFORMACAO.md
  • Demo do protótipo (novo-dashboard/page.tsx)
  • PERSONAS_JORNADAS_USUARIO.md (impacto por tipo paciente)

Resultado esperado:
  ✅ Aprovação para Fase 1
  ✅ Alocação de recursos
  ✅ Timeline confirmada
```

**[DIA 2-3] Planning Sprint 1**
```
Equipe necessária:
  • 1 Senior Frontend Engineer (Lead)
  • 1 Backend Engineer
  • 1 Database Engineer (ou Dev+DBA)
  • 1 UI/UX Designer (refinamento)

Tarefas sprint 1:
  1. Setup branch + CI/CD (2h)
  2. Schema Prisma (4h)
  3. Migration (1h)
  4. API endpoints básicas (8h)
  5. Componentes 50% (8h)
  6. Testes (4h)

Total sprint 1: ~27 horas engenharia
Duração: 1 semana
```

---

## 📅 FASE 1: INFRAESTRUTURA (Semana 2-3)

### 1.1 Database Setup

**Tarefa 1.1.1: Criar Prisma Schema**

```sql
# Tabelas novas a criar:

model PatientMoodLog {
  id                String      @id @default(cuid())
  patientId         String
  mood              Int         @db.SmallInt // 1-5
  energy            Int         @db.SmallInt // 1-5
  stress            Int         @db.SmallInt // 1-5
  sleep             Int         @db.SmallInt // 1-5
  notes             String?     @db.Text
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  
  patient           Patient     @relation(fields: [patientId], references: [id], onDelete: Cascade)
  
  @@index([patientId, createdAt])
}

model PatientAptitude {
  id                String      @id @default(cuid())
  patientId         String
  name              String      // "Coração Estável", "Ativo e Dedicado"
  description       String      @db.Text
  icon              String      // "heart", "flame", etc
  category          String      // "health", "behavior", "emotional"
  discoveredAt      DateTime    @default(now())
  score             Float       @default(0) // 0-100
  
  patient           Patient     @relation(fields: [patientId], references: [id], onDelete: Cascade)
  
  @@index([patientId, category])
}

model PatientBadge {
  id                String      @id @default(cuid())
  patientId         String
  name              String      // "Iniciante", "Comprometido", "Épico"
  rarity            String      @db.Enum // COMMON, RARE, EPIC, LEGENDARY
  icon              String
  unlockedAt        DateTime    @default(now())
  progress          Float       @default(100) // % completion
  
  patient           Patient     @relation(fields: [patientId], references: [id], onDelete: Cascade)
  
  @@index([patientId, rarity, unlockedAt])
}

model PatientDevelopmentPlan {
  id                String      @id @default(cuid())
  patientId         String
  title             String      // "Seu plano de 90 dias"
  description       String      @db.Text
  startDate         DateTime
  targetDate        DateTime
  phases            String      @db.Json // Array de fases
  currentPhase      Int         @default(1)
  progress          Float       @default(0) // %
  status            String      @db.Enum // ACTIVE, PAUSED, COMPLETED
  
  patient           Patient     @relation(fields: [patientId], references: [id], onDelete: Cascade)
  
  @@index([patientId, status])
}

model PatientHealthEvent {
  id                String      @id @default(cuid())
  patientId         String
  title             String
  description       String      @db.Text
  type              String      // "medication", "consultation", "exam", "vital", "milestone"
  eventDate         DateTime
  impact            String?     // "PA melhorou 12%", "Nova aptidão"
  causalité         String?     // Linkage: "Desde medicação ajustada..."
  vitalsSnapshot    Json?       // Snapshot de dados na hora
  
  patient           Patient     @relation(fields: [patientId], references: [id], onDelete: Cascade)
  
  @@index([patientId, eventDate])
}

model PatientWellnessScore {
  id                String      @id @default(cuid())
  patientId         String
  score             Float       // 0-100
  moodComponent     Float       // % do score
  adherenceComponent Float      // % do score
  vitalComponent    Float       // % do score
  emotionalComponent Float      // % do score
  calculatedAt      DateTime    @default(now())
  
  patient           Patient     @relation(fields: [patientId], references: [id], onDelete: Cascade)
  
  @@index([patientId, calculatedAt])
}

model PatientJournal {
  id                String      @id @default(cuid())
  patientId         String
  weekStarting      DateTime
  reflection        String      @db.Text
  insights          String?     @db.Text
  goals             String?     @db.Json
  createdAt         DateTime    @default(now())
  
  patient           Patient     @relation(fields: [patientId], references: [id], onDelete: Cascade)
  
  @@index([patientId, weekStarting])
}

# Adicionar a Patient model:
model Patient {
  id                          String      @id @default(cuid())
  // ... campos existentes ...
  
  moodLogs                    PatientMoodLog[]
  aptitudes                   PatientAptitude[]
  badges                      PatientBadge[]
  developmentPlan             PatientDevelopmentPlan[]
  healthEvents                PatientHealthEvent[]
  wellnessScores              PatientWellnessScore[]
  journals                    PatientJournal[]
}
```

**Tarefa 1.1.2: Executar Migration**
```bash
# Gerar migration
npx prisma migrate dev --name "add_wellness_dashboard_tables"

# Resultado esperado:
# ✅ Migration criada
# ✅ Prisma client regenerado
# ✅ DB sincronia completa
```

**Tarefa 1.1.3: Seed Initial Data (Paciente Demo)**
```typescript
// scripts/seed-wellness-demo.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Demo patient (João - já deve existir)
  const patient = await prisma.patient.findFirst({
    where: { name: "João Silva Demo" },
  });

  if (!patient) {
    console.log("⚠️ Patient not found, creating demo patient");
    // Create demo patient
  }

  // Create mood logs (últimos 30 dias)
  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    await prisma.patientMoodLog.create({
      data: {
        patientId: patient.id,
        mood: Math.floor(Math.random() * 3) + 3, // 3-5
        energy: Math.floor(Math.random() * 3) + 3,
        stress: Math.floor(Math.random() * 2) + 1, // 1-3
        sleep: Math.floor(Math.random() * 2) + 4, // 4-5
        createdAt: date,
      },
    });
  }

  // Create aptitudes
  await prisma.patientAptitude.createMany({
    data: [
      {
        patientId: patient.id,
        name: "Coração Estável",
        description: "Sua pressão arterial está 15% melhor que o baseline",
        icon: "heart",
        category: "health",
        score: 85,
      },
      {
        patientId: patient.id,
        name: "Ativo e Dedicado",
        description: "Você cumpre 95% das metas propostas",
        icon: "flame",
        category: "behavior",
        score: 95,
      },
    ],
  });

  // Create badges
  await prisma.patientBadge.createMany({
    data: [
      {
        patientId: patient.id,
        name: "Iniciante",
        rarity: "COMMON",
        icon: "sprout",
        progress: 100,
      },
      {
        patientId: patient.id,
        name: "Comprometido",
        rarity: "RARE",
        icon: "star",
        progress: 75,
      },
    ],
  });

  // Create wellness scores
  await prisma.patientWellnessScore.create({
    data: {
      patientId: patient.id,
      score: 72,
      moodComponent: 18,
      adherenceComponent: 25,
      vitalComponent: 20,
      emotionalComponent: 9,
    },
  });

  console.log("✅ Seed completed");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

**Estimativa:** 4 horas

---

## 📡 FASE 2: BACKEND APIs (Semana 3-4)

### 2.1 API Endpoints

**Endpoint 1: GET /api/patient/wellness/state**

```typescript
// app/api/patient/wellness/state/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patientId = session.user.id;

    // Get latest mood
    const latestMood = await prisma.patientMoodLog.findFirst({
      where: { patientId },
      orderBy: { createdAt: "desc" },
    });

    // Get wellness score
    const wellnessScore = await prisma.patientWellnessScore.findFirst({
      where: { patientId },
      orderBy: { calculatedAt: "desc" },
    });

    // Get yesterday's mood for comparison
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayScore = await prisma.patientWellnessScore.findFirst({
      where: {
        patientId,
        calculatedAt: {
          lt: yesterday,
        },
      },
      orderBy: { calculatedAt: "desc" },
    });

    const scoreChange = wellnessScore
      ? wellnessScore.score - (yesterdayScore?.score || wellnessScore.score)
      : 0;

    // Generate motivational message based on mood
    const motivationalMessages = {
      1: "Você está passando por um momento difícil. Respire fundo! 💙",
      2: "Dia normal. Pequenos passos levam a grandes resultados! 👣",
      3: "Você está bem! Continue assim! 😊",
      4: "Ótimo dia! Sua dedicação está funcionando! 🌟",
      5: "Extraordinário! Você é uma inspiração! ✨",
    };

    return NextResponse.json({
      success: true,
      data: {
        mood: latestMood?.mood || 3,
        wellnessScore: wellnessScore?.score || 50,
        scoreChange,
        scoreChangePercentage: ((scoreChange / wellnessScore?.score) * 100).toFixed(1),
        motivationalMessage: motivationalMessages[latestMood?.mood || 3],
        trend: scoreChange > 0 ? "up" : scoreChange < 0 ? "down" : "stable",
        lastUpdated: latestMood?.createdAt || new Date(),
      },
    });
  } catch (error) {
    console.error("Error fetching wellness state:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

**Endpoint 2: GET /api/patient/wellness/priorities**

```typescript
// app/api/patient/wellness/priorities/route.ts

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patientId = session.user.id;

    // Fetch priorities from various sources
    const [medications, appointments, goals] = await Promise.all([
      // Today's medications
      prisma.medication.findMany({
        where: {
          patientId,
          frequency: "daily", // Simplified
        },
        take: 3,
      }),

      // Upcoming appointments (next 7 days)
      prisma.appointment.findMany({
        where: {
          patientId,
          startTime: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        },
        take: 3,
        orderBy: { startTime: "asc" },
      }),

      // Personal goals
      prisma.personalGoal.findMany({
        where: { patientId, status: "ACTIVE" },
        take: 2,
      }),
    ]);

    // Smart ranking: medications > appointments > goals
    const priorities = [
      ...medications.map((m, idx) => ({
        type: "medication",
        priority: idx + 1,
        title: `${m.name} ${m.dosage}`,
        description: `Por quê: ${m.indication}`,
        time: m.scheduledTime,
        urgency: "HIGH",
        icon: "pill",
        actions: [
          { label: "Já tomei", action: "complete" },
          { label: "Lembrar depois", action: "snooze" },
        ],
      })),
      ...appointments.map((a, idx) => ({
        type: "appointment",
        priority: medications.length + idx + 1,
        title: `${a.doctor.name}`,
        description: `${new Date(a.startTime).toLocaleDateString()} às ${new Date(a.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        time: a.startTime,
        urgency: idx === 0 ? "HIGH" : "MEDIUM",
        icon: "calendar",
        actions: [
          { label: "Confirmar", action: "confirm" },
          { label: "Adiar", action: "reschedule" },
        ],
      })),
      ...goals.map((g, idx) => ({
        type: "goal",
        priority: medications.length + appointments.length + idx + 1,
        title: g.title,
        description: `Meta para hoje: ${g.dailyTarget}`,
        progress: g.todayProgress,
        urgency: "MEDIUM",
        icon: "target",
        actions: [
          { label: "Registrar progresso", action: "log" },
          { label: "Ver detalhes", action: "view" },
        ],
      })),
    ];

    return NextResponse.json({
      success: true,
      data: priorities,
    });
  } catch (error) {
    console.error("Error fetching priorities:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

**Endpoint 3: GET /api/patient/wellness/aptitudes**

```typescript
// Retorna aptidões descobertas automaticamente
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const patientId = session.user.id;

    const aptitudes = await prisma.patientAptitude.findMany({
      where: { patientId },
      orderBy: { score: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: aptitudes,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

**Endpoint 4: POST /api/patient/wellness/mood**

```typescript
// Registra humor do paciente
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const { mood, energy, stress, sleep, notes } = await req.json();

    const moodLog = await prisma.patientMoodLog.create({
      data: {
        patientId: session.user.id,
        mood,
        energy,
        stress,
        sleep,
        notes,
      },
    });

    // Recalculate wellness score
    const wellnessScore = calculateWellnessScore(mood, energy, stress, sleep);
    
    await prisma.patientWellnessScore.create({
      data: {
        patientId: session.user.id,
        score: wellnessScore,
        moodComponent: (mood / 5) * 100,
        adherenceComponent: 25, // Placeholder
        vitalComponent: 25, // Placeholder
        emotionalComponent: (energy / 5) * 100,
      },
    });

    return NextResponse.json({
      success: true,
      data: moodLog,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function calculateWellnessScore(
  mood: number,
  energy: number,
  stress: number,
  sleep: number
): number {
  // Wellness = (mood + energy + sleep) / 3 * 20, ajustado por stress
  const base = ((mood + energy + sleep) / 3 / 5) * 60;
  const stressAdjustment = ((5 - stress) / 5) * 40;
  return base + stressAdjustment;
}
```

**Estimativa:** 12 horas

---

## 🎨 FASE 3: FRONTEND COMPONENTS (Semana 4-5)

### 3.1 Componentes

```typescript
// Estrutura de pastas:

components/wellness/
├── WellnessHero.tsx          // Mood selector + wellness score
├── DailyPriorities.tsx       // Smart-ranked tasks
├── ProgressSection.tsx       // Streaks + badges
├── DevelopmentHub.tsx        // Tabs: profile, plan, learn, community
├── HealthTimeline.tsx        // Timeline com causalité
├── MoodSelector.tsx          // Emoji selector
├── BadgeCard.tsx             // Individual badge display
├── MotivationalMessage.tsx   // Personalized messaging
└── AptitudeCard.tsx          // Aptitude display

// Integração no novo-dashboard:

export default async function NovoDashboard() {
  return (
    <div className="space-y-6">
      <WellnessHero />
      <DailyPriorities />
      <ProgressSection />
      <DevelopmentHub />
      <HealthTimeline />
    </div>
  );
}
```

**Estimativa:** 20 horas

---

## ✅ FASE 4: TESTES & QA (Semana 5-6)

### Tipos de Testes

```typescript
// Unit tests (Vitest)
describe("WellnessScore", () => {
  it("should calculate score correctly", () => {
    const score = calculateWellnessScore(5, 5, 1, 5);
    expect(score).toBeGreaterThan(80);
  });
});

// E2E tests (Playwright)
describe("Patient Dashboard", () => {
  it("should allow patient to select mood and see wellness score update", async ({
    page,
  }) => {
    await page.goto("/minha-saude/novo-dashboard");
    await page.click("[data-testid='mood-selector-happy']");
    await expect(page.locator("[data-testid='wellness-score']")).toContainText(
      "72%"
    );
  });
});
```

**Estimativa:** 8 horas

---

## 📊 FASE 5: DEPLOYMENT & MONITORING (Semana 6)

### Feature Flags

```typescript
// Feature flag for gradual rollout
const featureFlags = {
  NOVO_DASHBOARD_ENABLED: process.env.FEATURE_NOVO_DASHBOARD === "true",
  WELLNESS_SCORING_V2: process.env.FEATURE_WELLNESS_V2 === "true",
};

export function usNewDashboard(patientId: string) {
  if (!featureFlags.NOVO_DASHBOARD_ENABLED) {
    return "/minha-saude"; // Old dashboard
  }
  return "/minha-saude/novo-dashboard"; // New dashboard
}
```

### Monitoring

```typescript
// Segment / Mixpanel tracking
import { track } from "@/lib/analytics";

track("mood_selected", {
  patientId,
  mood,
  timestamp: new Date(),
});

track("task_completed", {
  patientId,
  taskType: "medication",
  timestamp: new Date(),
});
```

---

## 📈 TIMELINE CONSOLIDADO

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      ROADMAP 6 SEMANAS                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ SEMANA 1 (Aprovação + Planning)                                         │
│ ├─ [DIA 1] Apresentação Executiva                                       │
│ ├─ [DIA 2-3] Planning Sprint 1                                          │
│ ├─ [DIA 4-5] Setup ambiente dev                                        │
│ └─ 📊 Resultado: Aprovação + Recursos alocados                         │
│                                                                         │
│ SEMANA 2-3 (Database Infrastructure)                                    │
│ ├─ Schema Prisma                                                       │
│ ├─ Migration                                                           │
│ ├─ Seed data                                                           │
│ ├─ 🔄 Testes básicos de DB                                             │
│ └─ 📊 Resultado: DB pronta, seed completo                              │
│                                                                         │
│ SEMANA 3-4 (Backend APIs)                                               │
│ ├─ GET /wellness/state                                                 │
│ ├─ GET /wellness/priorities                                            │
│ ├─ GET /wellness/aptitudes                                             │
│ ├─ POST /wellness/mood                                                 │
│ ├─ GET /wellness/timeline                                              │
│ ├─ 🧪 Tests (unit + integration)                                       │
│ └─ 📊 Resultado: 5 endpoints funcional                                 │
│                                                                         │
│ SEMANA 4-5 (Frontend Components)                                        │
│ ├─ WellnessHero + MoodSelector                                         │
│ ├─ DailyPriorities                                                     │
│ ├─ ProgressSection + BadgeCard                                         │
│ ├─ DevelopmentHub (tabs)                                               │
│ ├─ HealthTimeline                                                      │
│ ├─ 🎨 Integrar com design system                                       │
│ ├─ 📱 Testes responsividade                                            │
│ └─ 📊 Resultado: Components prontos + integrados                       │
│                                                                         │
│ SEMANA 5-6 (Testes + Deploy)                                            │
│ ├─ 🧪 Unit tests (80%+ coverage)                                       │
│ ├─ 🎭 E2E tests (happy path)                                           │
│ ├─ 🚀 Feature flag setup                                               │
│ ├─ 📊 Monitoring setup                                                 │
│ ├─ 🌍 Deploy staging                                                   │
│ ├─ ✅ QA approval                                                       │
│ ├─ 🚀 Deploy prod (10% rollout)                                        │
│ └─ 📊 Resultado: MVP live para subset pacientes                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 SUCCESS CRITERIA (Fase 1 MVP)

**Técnico:**
- ✅ 0 TypeScript errors
- ✅ 100% database schema migrated
- ✅ 5 API endpoints returning correct data
- ✅ All components render without errors
- ✅ 80%+ unit test coverage
- ✅ E2E tests for main user flows pass
- ✅ Lighthouse score > 80
- ✅ Mobile responsiveness validated

**Produto:**
- ✅ Mood tracking end-to-end functional
- ✅ Priorities showing real patient data
- ✅ Aptitudes auto-detected and displayed
- ✅ Wellness score calculating and updating
- ✅ Timeline showing health events
- ✅ Feature flag working (10% rollout)

**Usuário:**
- ✅ 3 pilot patients testing (1 week)
- ✅ NPS score > 7/10
- ✅ Completion rate > 70% (users complete all 5 sections)
- ✅ Session duration +50% vs old dashboard
- ✅ Return rate (daily) > 60%

---

## 🎁 PRÓXIMAS FASES (Após MVP)

### Fase 2: AI/ML Services (Semanas 7-8)
```
• Auto-detection de aptidões via vitals + dados comportamentais
• Mood trend analysis + predictive insights
• Personalized recommendations engine
• Motivational message generation (LLM-based)
```

### Fase 3: Community & Social (Semanas 8-9)
```
• Community hub implementation
• Peer challenges & leaderboards
• Success story sharing
• Group support features
```

### Fase 4: Advanced Personalization (Semanas 10-12)
```
• Custom development plans
• Micro-learning modules
• Adaptive UI based on user behavior
• Progressive disclosure
```

---

## 💰 RESOURCE ALLOCATION

### Equipe Sprint 1

```
Frontend Engineer (Senior):    30h  (Lead)
Backend Engineer:              20h
Database Engineer:             10h
UI/UX Designer:                8h  (refinement)
QA Engineer:                   12h
Product Manager:               5h
──────────────────────────────
Total:                         85h (~2 weeks full-time for 4-5 people)
```

### Infrastructure

```
✅ Database: PostgreSQL (existing)
✅ Cache: Redis (existing)
✅ Frontend: Next.js (existing)
✅ Deployment: Docker (existing)
✅ Monitoring: Need setup (Datadog/New Relic recommended)
```

---

## ⚠️ RISCOS & MITIGAÇÃO

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|--------|-----------|
| DB migration issues | Média | Alto | Backup full DB antes; teste migration em staging primeiro |
| Performance degradation | Baixa | Alto | Load testing em staging; caching strategy definida |
| User adoption baixa | Média | Médio | Comunicação clara; phased rollout com feedback loop |
| Scope creep | Alta | Médio | Strict MVP scope; features adicionais em Phase 2 |
| Timeline slip | Média | Médio | Daily standups; buffer de 1 semana planejado |

---

## 📞 PRÓXIMAS AÇÕES

**Imediato (Hoje):**
- [ ] Agendar apresentação executiva
- [ ] Confirmar resource availability
- [ ] Setup dev environment para phase 1

**Semana 1:**
- [ ] Apresentação + Aprovação
- [ ] Sprint planning detalhado
- [ ] Branch criada (development)

**Semana 2:**
- [ ] Database schema finalizado
- [ ] Migration executada
- [ ] Seed data completo

**Semana 3:**
- [ ] Primeiros 3 endpoints live
- [ ] Testes unitários passando
- [ ] Code review setup

---

**Documento Atualizado:** 15 de dezembro, 2025
**Próxima Review:** 22 de dezembro, 2025 (Fim da Semana 1)
