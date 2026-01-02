# 🏗️ Arquitetura do Dashboard de Análise de Questionários

## 📐 Diagrama Geral

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER INTERFACE LAYER (Next.js)               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │      /admin/questionnaire-analytics (Page)              │   │
│  │                                                        │   │
│  │  ┌──────────────┬──────────────┬────────────────┐    │   │
│  │  │ 📊 Overview  │ 🔔 Alerts    │ 🧠 Insights    │    │   │
│  │  └──────────────┴──────────────┴────────────────┘    │   │
│  │                                                        │   │
│  │  ┌──────────────────────────────────────────┐        │   │
│  │  │   Questionnaire Components               │        │   │
│  │  ├──────────────────────────────────────────┤        │   │
│  │  │ • Analytics Dashboard                    │        │   │
│  │  │ • Notifications Panel                    │        │   │
│  │  │ • Insights Viewer                        │        │   │
│  │  │ • Alert Widget                           │        │   │
│  │  └──────────────────────────────────────────┘        │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                           ↓ (API Calls)
┌─────────────────────────────────────────────────────────────────┐
│                    API LAYER (Next.js Routes)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┬──────────────┬───────────────┐            │
│  │ Analytics API   │ Notify APIs   │ Insights API  │            │
│  ├─────────────────┼──────────────┼───────────────┤            │
│  │ GET /analytics  │ GET /notif    │ GET /insights │            │
│  │ Calcula:        │ PATCH /[id]   │ Extrai:       │            │
│  │ • Métricas      │ DELETE /[id]  │ • Concerns    │            │
│  │ • Tendências    │ PATCH /mark   │ • Improvements│            │
│  │ • Breakdown     │ GET /summary  │ • Patterns    │            │
│  └─────────────────┴──────────────┴───────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                           ↓ (Database)
┌─────────────────────────────────────────────────────────────────┐
│              SERVICE LAYER (Business Logic)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  QuestionnaireNotificationService                              │
│  ├── notifyQuestionnaireSent()                                 │
│  ├── notifyQuestionnaireCompleted()                            │
│  ├── notifyQuestionnaireExpired()                              │
│  ├── notifyAIAnalysisReady()                                   │
│  ├── notifyMultiple()                                          │
│  └── cleanupOldNotifications()                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                           ↓ (Prisma)
┌─────────────────────────────────────────────────────────────────┐
│                  DATABASE LAYER (PostgreSQL)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Tables:                                                        │
│  ├── PatientQuestionnaire                                      │
│  │   ├── id, patientId, templateId, status                    │
│  │   ├── sentAt, completedAt, expiresAt                       │
│  │   ├── aiAnalysis (JSON), aiAnalyzedAt                      │
│  │   └── progressPercent, answers[]                           │
│  │                                                             │
│  ├── Notification (reused)                                    │
│  │   ├── id, userId, type, title, message                    │
│  │   ├── read, createdAt, metadata (JSON)                    │
│  │   └── Índices: userId, type, read                         │
│  │                                                             │
│  └── QuestionnaireTemplate                                    │
│      ├── id, name, therapeuticSystem, categories[]            │
│      └── scoringLogic, themeColor, iconEmoji                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Fluxo de Dados

### **Fluxo 1: Envio de Questionário**
```
User clicks "Send Questionnaire"
        ↓
POST /api/questionnaires/send
        ↓
Create PatientQuestionnaire record
        ↓
QuestionnaireNotificationService.notifyQuestionnaireSent()
        ↓
Create Notification record
        ↓
notifyQuestionnaireSent notification appears in panel
```

### **Fluxo 2: Resposta de Questionário**
```
Patient completes questionnaire
        ↓
POST /api/questionnaires/[id]/submit
        ↓
Update PatientQuestionnaire status = COMPLETED
        ↓
QuestionnaireNotificationService.notifyQuestionnaireCompleted()
        ↓
Create Notification record
        ↓
Professional sees notification in real-time (polling 30s)
```

### **Fluxo 3: Análise IA**
```
Completed questionnaire in system
        ↓
Trigger AI Analysis (manual or automatic)
        ↓
POST /api/questionnaires/[id]/analyze
        ↓
OpenAI/Claude analyzes responses
        ↓
Update aiAnalysis (JSON), aiAnalyzedAt
        ↓
QuestionnaireNotificationService.notifyAIAnalysisReady()
        ↓
Create Notification + Insights
        ↓
Dashboard shows:
  • Center Notification (if new)
  • Insights Panel (if high priority)
  • Widget Alert (if critical)
```

### **Fluxo 4: Expiração**
```
Scheduled Job (cron) runs every hour
        ↓
Find PENDING questionnaires with expiresAt < now
        ↓
Update status = EXPIRED
        ↓
QuestionnaireNotificationService.notifyQuestionnaireExpired()
        ↓
Create Notification record
        ↓
Professional alerted via notification
```

---

## 🎯 Componente em Detalhe

### **Analytics Dashboard Flow**
```
Page Load
    ↓
useSuspense → Fetch /api/questionnaires/analytics?period=30d
    ↓
QuestionnaireAnalyticsDashboard Component
    ├── Render KPI Cards
    │   ├── Total Sent: 45
    │   ├── Completed: 38 (84%)
    │   ├── Pending: 5
    │   └── Avg Time: 12.3 min
    │
    ├── Render Trend Chart (LineChart)
    │   └── Data: [{date: "01/01", sent: 5, completed: 4}, ...]
    │
    ├── Render System Breakdown (PieChart)
    │   └── Data: [{system: "Ayurveda", count: 20, completion: 85%}, ...]
    │
    └── Render Status Distribution (BarChart)
        └── Data: [{status: "Completed", value: 38}, ...]
```

### **Notifications Panel Flow**
```
Page Load
    ↓
useEffect: Fetch /api/questionnaires/notifications?filter=unread
    ↓
setInterval: Refetch every 30s (polling)
    ↓
QuestionnaireNotificationsPanel Component
    ├── Display Count Badge (3 unread)
    │
    ├── Filter Tabs
    │   ├── Unread (default)
    │   ├── Read
    │   └── All
    │
    ├── Notification List
    │   ├── Each notification card shows:
    │   │   ├── Icon (based on type)
    │   │   ├── Title & Message
    │   │   ├── Patient name & date
    │   │   ├── Action buttons
    │   │   └── "Mark as read" / "Delete" / "View"
    │   │
    │   └── On button click:
    │       ├── PATCH /api/questionnaires/notifications/[id]
    │       └── Update state & UI
    │
    └── "Mark All Read" button
        └── PATCH /api/questionnaires/notifications/mark-all-read
```

### **Insights Panel Flow**
```
Page Load
    ↓
Fetch /api/questionnaires/insights?severity=all
    ↓
Extract from PatientQuestionnaire.aiAnalysis
    ├── analysis.concerns → type: CONCERN
    ├── analysis.improvements → type: IMPROVEMENT
    ├── analysis.patterns → type: PATTERN
    └── analysis.recommendations → type: RECOMMENDATION
    ↓
Group by severity (high > medium > low)
    ↓
QuestionnaireInsights Component
    ├── Display Priority Alert (if high count)
    │
    ├── Severity Filter Buttons
    │   ├── All
    │   ├── High (red)
    │   ├── Medium (yellow)
    │   └── Low (blue)
    │
    └── Insight Cards (filtered by severity)
        ├── Each card shows:
        │   ├── Icon & type label
        │   ├── Title & description
        │   ├── Severity badge with color
        │   ├── Patient name, questionnaire, date
        │   ├── Related metrics (if any)
        │   ├── Suggested action
        │   └── Link to patient/questionnaire
        │
        └── On "View Questionnaire" click:
            └── Navigate to patient profile
```

---

## 🔐 Authentication & Authorization

```
User Accesses /admin/questionnaire-analytics
        ↓
getServerSession(authOptions)
        ↓
Check if authenticated
    ├── NO → Redirect to /auth/signin
    └── YES → Continue
        ↓
        Check user.role
        ├── DOCTOR → Allow
        ├── ADMIN → Allow
        ├── NURSE → Allow
        ├── THERAPIST → Allow
        └── OTHER → Redirect to /forbidden
        ↓
        All API calls validate session again
        ├── GET → Only return user's data
        ├── PATCH → Only modify user's notifications
        └── DELETE → Only delete user's notifications
```

---

## 🗄️ Database Schema (Simplified)

```sql
-- Existing Table (Used)
TABLE PatientQuestionnaire {
  id: String @id @default(cuid())
  patientId: String
  templateId: String
  status: String // PENDING, IN_PROGRESS, COMPLETED, EXPIRED, CANCELLED
  sentAt: DateTime
  completedAt: DateTime?
  expiresAt: DateTime?
  progressPercent: Int
  aiAnalysis: Json?  // Stores analysis from AI
  aiAnalyzedAt: DateTime?
  
  // Relations
  template: QuestionnaireTemplate
  patient: Patient
  sentBy: User
  answers: QuestionnaireAnswer[]
}

-- Existing Table (Extended for notifications)
TABLE Notification {
  id: String @id @default(cuid())
  userId: String
  type: String  // Added: QUESTIONNAIRE_SENT, QUESTIONNAIRE_COMPLETED, etc
  title: String
  message: String
  read: Boolean @default(false)
  metadata: Json?  // Stores: patientName, questionnaireName, patientId, actionUrl
  createdAt: DateTime @default(now())
  
  user: User
}

-- Recommended Indexes
CREATE INDEX idx_patient_questionnaire_status 
  ON PatientQuestionnaire(status);
CREATE INDEX idx_patient_questionnaire_sent_at 
  ON PatientQuestionnaire(sentAt);
CREATE INDEX idx_patient_questionnaire_ai_analysis 
  ON PatientQuestionnaire(aiAnalysis);
  
CREATE INDEX idx_notification_user_id 
  ON Notification(userId);
CREATE INDEX idx_notification_read 
  ON Notification(read);
CREATE INDEX idx_notification_type 
  ON Notification(type);
```

---

## 📊 Data Structures

### **Metrics Response**
```typescript
{
  totalSent: 45,
  completed: 38,
  pending: 5,
  expired: 2,
  completionRate: 84.4,
  averageTime: 12.3,  // minutes
  trends: [
    { date: "2026-01-01", sent: 5, completed: 4 },
    // ...
  ],
  systemBreakdown: [
    { system: "Ayurveda", count: 20, completion: 85 },
    // ...
  ]
}
```

### **Notification Response**
```typescript
{
  id: "notif-123",
  type: "QUESTIONNAIRE_COMPLETED",
  title: "✅ Questionário Respondido",
  message: "João respondeu o questionário 'Avaliação de Saúde'",
  patientName: "João Silva",
  patientId: "patient-123",
  questionnaireName: "Avaliação de Saúde",
  questionnaireId: "q-123",
  read: false,
  createdAt: "2026-01-02T10:30:00Z",
  actionUrl: "/patients/patient-123?tab=questionnaires&id=q-123"
}
```

### **Insight Response**
```typescript
{
  id: "concern-q-123-0",
  type: "CONCERN",
  title: "Pressão Arterial Elevada Detectada",
  description: "O paciente relatou pressão sistólica de 145 mmHg...",
  severity: "high",
  patientName: "João Silva",
  patientId: "patient-123",
  questionnaireId: "q-123",
  questionnaireName: "Avaliação de Saúde",
  detectedAt: "2026-01-02T10:15:00Z",
  actionable: true,
  suggestedAction: "Monitore pressão arterial diariamente e considere consulta",
  relatedMetrics: {
    sistolica: 145,
    diastolica: 92,
    risco: "moderado"
  }
}
```

---

## ⚡ Performance Considerations

```
Request → Prisma Query → Database
    ↓
1. Filtering (where clause)
   └── Use indexed columns: status, sentAt, type, userId, read
   
2. Pagination (take: 100)
   └── Limit results to prevent timeout
   
3. Ordering (orderBy: createdAt DESC)
   └── Efficient with index on createdAt
   
4. Calculation (in-memory)
   └── Calculate trends/stats in Node.js (faster)
   
5. Response
   └── JSON serialization → API response
   
6. Client-side
   └── Memoization prevents re-renders
   └── Recharts optimized for large datasets
   └── Polling every 30-60s (not per second)
```

---

## 🔄 Real-time Updates Strategy

```
Option 1: Polling (Current Implementation) ✅
├── Every 30s: GET /api/questionnaires/notifications
├── Every 60s: GET /api/questionnaires/alerts/summary
└── On demand: GET /api/questionnaires/insights

Option 2: WebSockets (Future)
├── Persistent connection
├── Instant push updates
└── Better for large user base

Option 3: Server-Sent Events (Future)
├── One-way server → client
├── Good balance between simplicity & real-time
└── No websocket infrastructure needed
```

---

## 🎨 UI Component Hierarchy

```
QuestionnaireAnalyticsPage
├── Tabs
│   ├── Overview
│   │   └── QuestionnaireAnalyticsDashboard
│   │       ├── KPI Cards (4x)
│   │       ├── Trend Chart (LineChart)
│   │       ├── System Breakdown (PieChart)
│   │       └── Status Distribution (BarChart)
│   │
│   ├── Notifications
│   │   └── QuestionnaireNotificationsPanel
│   │       ├── Header with badge
│   │       ├── Filter tabs
│   │       ├── Action buttons
│   │       └── Notification list
│   │           └── Notification cards (map)
│   │
│   └── Insights
│       └── QuestionnaireInsights
│           ├── Alert banner (if high priority)
│           ├── Filter buttons
│           └── Insights list
│               └── Insight cards (map)
│
└── Suspense boundaries
    ├── DashboardSkeleton
    ├── NotificationsSkeleton
    └── InsightsSkeleton
```

---

**Last Updated:** 2026-01-02  
**Status:** ✅ Complete
