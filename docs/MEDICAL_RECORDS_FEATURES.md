# Medical Records Features Documentation

## Overview

Three new features have been implemented for the medical records system, enhancing notifications, AI-powered insights, and dashboarding capabilities.

## 1. Notifications Integration

### Purpose
Real-time notifications for medical record operations (create, update, delete) to keep patients informed about their records.

### Location
- Service: `lib/notification-service.ts`
- Integration: `app/api/medical-records/route.ts` (POST/PUT/DELETE)

### Features

**Notification Types:**
- `medical_record_created`: When a new record is created
- `medical_record_updated`: When a record is modified (includes changed fields)
- `medical_record_deleted`: When a record is deleted (high priority)

**Priority Levels:**
- `high`: For deletions and critical updates
- `medium`: For standard updates
- `low`: For informational notifications

### Implementation Pattern

```typescript
import { NotificationService } from '@/lib/notification-service'

// In API route
try {
  const newRecord = await prisma.medicalRecord.create(...)
  
  // Fire notification (fire-and-forget)
  NotificationService.send({
    userId: patient.userId,
    type: 'medical_record_created',
    title: 'Novo Registro Médico',
    message: `Novo registro: ${newRecord.recordType}`,
    priority: 'high'
  }).catch(err => logger.error({ error: err }, 'Notification failed'))
} catch (error) {
  // Main API flow not blocked by notification failure
}
```

### Fire-and-Forget Pattern

Notifications don't block the main API response:
- Sent asynchronously with `.catch()` handler
- Failures logged but don't affect record operations
- Improves API response time

### API Endpoints Modified

**POST /api/medical-records** (CREATE)
- Sends `medical_record_created` notification
- Includes record type and severity

**PUT /api/medical-records/[id]** (UPDATE)
- Sends `medical_record_updated` notification
- Lists changed fields in message
- Medium priority

**DELETE /api/medical-records/[id]** (DELETE)
- Sends `medical_record_deleted` notification
- High priority alert
- Includes deletion reason if provided

### Usage Example

```bash
# Creating a record triggers notification
curl -X POST http://localhost:3000/api/medical-records \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "patientId": "patient-123",
    "recordType": "diagnosis",
    "diagnosis": "Hipertensão",
    "severity": "high"
  }'

# Patient receives notification:
# Title: "Novo Registro Médico"
# Message: "Novo registro: Diagnóstico adicionado ao seu perfil"
```

---

## 2. AI Record Insights

### Purpose
AI-powered analysis component that provides 5 types of insights for medical records to support clinical decision-making.

### Location
- Component: `components/medical-records/ai-record-insights.tsx` (340 lines)
- Integration: `components/medical-records/medical-record-detail.tsx`

### Insight Types

1. **Diagnosis Analysis**
   - Icon: Activity
   - Uses: `POST /api/ai/analyze`
   - Provides: Possible diagnoses, differential diagnosis
   - Confidence scoring

2. **Treatment Recommendations**
   - Icon: Pill
   - Uses: `POST /api/ai/analyze`
   - Provides: Treatment options, medication suggestions
   - Evidence-based recommendations

3. **Drug Interactions**
   - Icon: AlertTriangle
   - Uses: `POST /api/ai/drug-interactions`
   - Checks: Medication interactions
   - Severity levels: critical, high, moderate, minor

4. **Risk Assessment**
   - Icon: AlertTriangle
   - Uses: `POST /api/ai/recommendations`
   - Analyzes: Risk factors, comorbidities
   - Provides: Prevention strategies

5. **Medical Summary**
   - Icon: FileText
   - Uses: `POST /api/ai/recommendations`
   - Summarizes: Key clinical points
   - Highlights: Important findings

### Component Features

```typescript
<AIRecordInsights
  recordId="rec-123"
  recordType="diagnosis"
  diagnosis="Hypertension"
  treatment="Amlodipine 5mg"
  medications={['Amlodipine', 'Metformin']}
/>
```

**Props:**
- `recordId`: Record identifier
- `recordType`: 'diagnosis'|'treatment'|'exam'|'prescription'
- `diagnosis`: Diagnosis text (if applicable)
- `treatment`: Treatment text (if applicable)
- `medications`: Array of medication names

**Display:**
- Shows 2 insights initially
- "Expand" button to show all
- Severity badges: critical (red), high (orange), medium (yellow), low (blue)
- Loading states during API calls
- Error handling with graceful degradation

### Graceful Degradation

The component handles multiple failure scenarios:

```typescript
// Try all 3 APIs concurrently
const [diagnosis, interactions, recommendations] = await Promise.all([
  fetch('/api/ai/analyze').catch(() => null),
  fetch('/api/ai/drug-interactions').catch(() => null),
  fetch('/api/ai/recommendations').catch(() => null)
])

// Show whatever succeeded, hide whatever failed
if (diagnosis) renderDiagnosis()
if (interactions) renderInteractions()
if (recommendations) renderRecommendations()
```

### Usage Example

```typescript
// In medical record detail page
import AIRecordInsights from '@/components/medical-records/ai-record-insights'

export default function RecordDetail({ record }) {
  return (
    <div>
      {/* ... record details ... */}
      
      <AIRecordInsights
        recordId={record.id}
        recordType={record.type}
        diagnosis={record.diagnosis}
        treatment={record.treatment}
        medications={record.medications}
      />
    </div>
  )
}
```

---

## 3. Medical Records Dashboard

### Purpose
Comprehensive dashboard for medical records statistics with visualizations, trends, and quick access to top records.

### Location
- API: `app/api/medical-records/stats/route.ts` (200 lines)
- Page: `app/records/dashboard/page.tsx` (350 lines)

### Dashboard Sections

**1. Summary Cards**
- Total records count
- Critical severity count
- High severity count
- Average severity score

**2. Activity Timeline (Line Chart)**
- Daily record creation trends
- Severity distribution per day
- Respects period filter (7/30/90/365 days)
- Recharts visualization

**3. Priority Distribution (Pie Chart)**
- Record type breakdown
- Severity distribution
- Color-coded by severity
- Interactive legend

**4. Record Type Distribution (Bar Chart)**
- Records by type (diagnosis, treatment, exam, prescription)
- Respects user role (RBAC)
- Sorted by frequency

**5. Top Patients Leaderboard**
- Shows 5 most active patients
- Patient name and record count
- Admin/Doctor only (not visible to patients)
- Sorted by record count

**6. Recent Records Table**
- Last 10 records
- Quick view links
- Metadata: date, doctor, severity
- Search and sort capabilities

### Period Filtering

```
Available periods:
- 7 days
- 30 days (default)
- 90 days
- 365 days (1 year)
```

### RBAC Implementation

```typescript
// ADMIN - sees all records
if (session.user.role === 'ADMIN') {
  // No filtering
}

// DOCTOR - sees own records + patients' records
if (session.user.role === 'DOCTOR') {
  where: { OR: [
    { doctorId: session.user.id },
    { patient: { doctorIds: { has: session.user.id } } }
  ]}
}

// PATIENT - sees own records only
if (session.user.role === 'PATIENT') {
  where: { patientId: getPatientId(session.user) }
}
```

### API Endpoint

**GET /api/medical-records/stats**

```bash
curl -X GET "http://localhost:3000/api/medical-records/stats?period=30" \
  -H "Authorization: Bearer $TOKEN"

# Response
{
  "total": 42,
  "bySeverity": {
    "critical": 5,
    "high": 12,
    "medium": 18,
    "low": 7
  },
  "byType": {
    "diagnosis": 15,
    "treatment": 12,
    "exam": 10,
    "prescription": 5
  },
  "timeline": [
    {
      "date": "2026-01-19",
      "records": 5,
      "critical": 1,
      "high": 2,
      "medium": 2,
      "low": 0
    },
    ...
  ],
  "topPatients": [
    {
      "patientId": "p1",
      "patientName": "João Silva",
      "recordCount": 25
    },
    ...
  ],
  "recentRecords": [
    {
      "id": "rec1",
      "type": "diagnosis",
      "severity": "high",
      "createdAt": "2026-01-19T10:30:00Z",
      "createdBy": "Dr. Maria"
    },
    ...
  ]
}
```

### Dashboard Page

**URL:** `/app/records/dashboard`

**Features:**
- Period selector buttons (7/30/90/365 days)
- Responsive layout (desktop, tablet, mobile)
- Loading states while fetching data
- Error handling with fallback UI
- Real-time updates (configurable)
- Export capabilities (future enhancement)

### Usage Example

```bash
# Navigate to dashboard
curl http://localhost:3000/app/records/dashboard

# Change period
curl "http://localhost:3000/app/records/dashboard?period=90"
```

---

## Testing

Comprehensive test suites are included:

- `tests/features/notifications.test.ts` (35+ tests)
- `tests/features/ai-insights.test.ts` (40+ tests)
- `tests/features/dashboard-stats.test.ts` (50+ tests)

Run tests with:
```bash
npm run test:features
```

---

## Performance Considerations

### Notifications
- Fire-and-forget pattern: No blocking
- Async processing with error handling
- Suitable for real-time delivery

### AI Insights
- Concurrent API calls for 3 endpoints
- Graceful degradation if APIs fail
- Client-side loading states
- Caching potential via component memoization

### Dashboard
- Server-side aggregation (fast queries)
- 30-day default for performance
- Pagination for large datasets
- Chart rendering optimized with Recharts

---

## Known Issues & Workarounds

### Issue: Prisma `priority` field type mismatch
**Status:** Workaround applied
**Details:** Dashboard uses `severity` instead of `priority` field
**Resolution:** Regenerate Prisma client when Node.js is available
```bash
npm run db:generate
```

### Issue: AI API failures
**Status:** Handled gracefully
**Details:** Component continues to work if any AI API fails
**Resolution:** All 3 API calls have try/catch blocks

---

## Future Enhancements

1. **Notifications**
   - Email/SMS delivery options
   - Notification preferences per user
   - Digest notifications (daily/weekly)

2. **AI Insights**
   - Model selection (Ollama/OpenAI/Google)
   - Confidence thresholds customization
   - Historical trend analysis

3. **Dashboard**
   - Export to PDF/CSV
   - Scheduled reports
   - Custom period ranges
   - Data filtering and search
   - Real-time auto-refresh

---

## Troubleshooting

### Notifications not appearing
- Check `NotificationService` configuration
- Verify `userId` is correct
- Check database logs for errors

### AI Insights not loading
- Verify AI API endpoints are running
- Check CORS configuration for cross-origin calls
- Review browser console for errors
- Ensure user accepted AI terms

### Dashboard showing no data
- Verify user has medical records
- Check RBAC role assignment
- Ensure date range includes records
- Clear browser cache and refresh

---

## Configuration

### Notifications
```env
# Optional
NOTIFICATION_SERVICE_URL=http://localhost:3001
NOTIFICATION_MAX_RETRY=3
NOTIFICATION_TIMEOUT=5000
```

### AI Insights
```env
# Optional
AI_API_TIMEOUT=30000
AI_API_MAX_RETRY=2
AI_CONFIDENCE_THRESHOLD=0.5
```

### Dashboard
```env
# Optional
STATS_CACHE_TTL=300  # 5 minutes
DASHBOARD_PAGE_SIZE=100
DASHBOARD_MAX_TOP_PATIENTS=5
```

---

## Code Examples

### Manually send notification

```typescript
import { NotificationService } from '@/lib/notification-service'

await NotificationService.send({
  userId: 'patient-123',
  type: 'medical_record_created',
  title: 'Nova Registro',
  message: 'Um novo registro foi adicionado',
  priority: 'high'
})
```

### Fetch dashboard stats

```typescript
const response = await fetch('/api/medical-records/stats?period=30', {
  headers: { Authorization: `Bearer ${token}` }
})
const stats = await response.json()
console.log(`Total records: ${stats.total}`)
```

### Use AI insights component

```typescript
import AIRecordInsights from '@/components/medical-records/ai-record-insights'

<AIRecordInsights
  recordId="rec-123"
  recordType="diagnosis"
  diagnosis="Type 2 Diabetes"
  treatment="Metformin 500mg BID"
  medications={['Metformin', 'Lisinopril']}
/>
```
