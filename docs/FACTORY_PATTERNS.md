# Factory Patterns Documentation

## Overview

Three factory patterns have been implemented to improve code architecture and enable automatic environment-aware selection between production and development implementations.

## 1. BackupOrchestrator Factory

### Purpose
Unified interface for system and certificate backup management, coordinating between `backup-service.ts` and `certificate-backup-service.ts`.

### Location
`lib/backup-orchestrator.ts` (335 lines)

### Key Features

**Unified Backup Types:**
- `'system'`: Database + files + cloud backup
- `'certificates'`: Certificate-specific backup  
- `'all'`: Both system and certificate backups

**Main Methods:**

```typescript
// Execute backups
BackupOrchestrator.runBackup(type)         // 'system'|'certificates'|'all'
BackupOrchestrator.runSystemBackup()       // System backup only
BackupOrchestrator.runCertificateBackup()  // Certificate backup only

// Maintenance
BackupOrchestrator.cleanupOldBackups()     // Apply retention policy
BackupOrchestrator.testRestore(type)       // Validate backup integrity
BackupOrchestrator.restoreCertificateBackup(path) // Restore specific backup

// Monitoring
BackupOrchestrator.getBackupStatus()       // Health check

// Scheduling helpers
scheduledDailyBackup()    // Cron-compatible daily execution
scheduledWeeklyCleanup()  // Cron-compatible weekly cleanup
```

### API Integration

**Endpoint:** `POST /api/admin/backup`

```bash
# Execute unified backup
curl -X POST http://localhost:3000/api/admin/backup \
  -H "Content-Type: application/json" \
  -d '{"type": "all", "testRestore": true}'

# Response
{
  "success": true,
  "systemBackup": {
    "success": true,
    "backupPath": "/backups/system-20260119.tar.gz",
    "duration": 5000
  },
  "certificateBackup": {
    "success": true,
    "backupPath": "/backups/certificates-20260119.tar.gz",
    "certificateCount": 45
  },
  "timestamp": "2026-01-19T10:30:00Z",
  "duration": 8000
}
```

### Usage Example

```typescript
import { BackupOrchestrator } from '@/lib/backup-orchestrator'

// Run all backups
const result = await BackupOrchestrator.runBackup('all')

// Test restore
const restoreTest = await BackupOrchestrator.testRestore('system')

// Schedule daily
setInterval(scheduledDailyBackup, 24 * 60 * 60 * 1000)
```

---

## 2. AIQueueFactory

### Purpose
Auto-select between BullMQ (production) and in-memory queue (development) based on environment and Redis availability.

### Location
`lib/ai-queue-factory.ts` (320 lines)

### Queue Selection Logic

| Environment | Redis Available | Queue Type |
|-------------|-----------------|-----------|
| Production  | Yes            | BullMQ (distributed) |
| Production  | No             | In-Memory (fallback) |
| Development | -              | In-Memory (default) |
| Testing     | -              | In-Memory (forced)   |

### Supported Job Types

```typescript
type AIJobType =
  | 'symptom_analysis'
  | 'transcribe_and_generate_soap'
  | 'transcribe_and_generate_soap_draft'
  | 'drug_interaction_check'
  | 'medical_summary'
  | 'vital_signs_analysis'
```

### Main Methods

```typescript
// Get queue instance (auto-selected)
const queue = await AIQueueFactory.getQueue()

// Helper functions
const { id } = await enqueueAIJob('symptom_analysis', { symptoms: [...] })
const status = await getAIJobStatus(jobId)
const cancelled = await cancelAIJob(jobId)
```

### API Integration

**Endpoints Modified:**
- `POST /api/ai/transcribe/upload` - Uses `enqueueAIJob` instead of direct BullMQ
- `GET /api/ai/jobs/[id]` - Uses `getAIJobStatus` factory method
- `POST /api/admin/backups/entity/patient/pdf` - Uses `enqueueAIJob`

### Usage Example

```typescript
import { enqueueAIJob, getAIJobStatus } from '@/lib/ai-queue-factory'

// Enqueue job
const { id } = await enqueueAIJob('symptom_analysis', {
  symptoms: ['fever', 'cough'],
  patientId: 'patient-123'
})

// Poll status
const status = await getAIJobStatus(id)
console.log(`Job ${id} is ${status.status}`)

// Cancel if needed
await cancelAIJob(id)
```

### Environment Configuration

```bash
# Development (uses in-memory by default)
NODE_ENV=development
# Optional override
AI_QUEUE_FORCE_MEMORY=true

# Production (uses Redis/BullMQ)
NODE_ENV=production
REDIS_HOST=redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=***
```

---

## 3. RateLimiterFactory

### Purpose
Auto-select between Redis (distributed) and in-memory (single-instance) rate limiting based on environment and Redis availability.

### Location
`lib/rate-limiter-factory.ts` (370 lines)

### Rate Limiter Selection

| Environment | Redis Available | Limiter Type |
|-------------|-----------------|--------------|
| Production  | Yes            | Redis (sliding window) |
| Production  | No             | In-Memory (fallback) |
| Development | -              | In-Memory (default) |
| Middleware  | -              | In-Memory (fast)     |

### Preset Configurations

```typescript
RateLimitPresets.strict    // 100 req/min (for sensitive APIs)
RateLimitPresets.standard  // 300 req/min (default)
RateLimitPresets.relaxed   // 1000 req/min (for public APIs)
RateLimitPresets.sensitive // 10 req/hour (for account operations)
```

### Main Methods

```typescript
// Get limiter instance
const limiter = await RateLimiterFactory.getRateLimiter()

// Check rate limit
const result = await checkRateLimit('user-123', {
  windowMs: 60 * 1000,    // 1 minute
  maxRequests: 300,
  keyPrefix: 'api'
})

// Reset limit
await resetRateLimit('user-123')

// Get info
const info = await RateLimiterFactory.getRateLimiterInfo()
```

### API Integration

**Modified Endpoint:**
- `middleware.ts` - Now uses `RateLimiterFactory` with `RateLimitPresets.standard`

### Usage Example

```typescript
import { checkRateLimit, RateLimitPresets } from '@/lib/rate-limiter-factory'

// Check strict limit for sensitive endpoint
const result = await checkRateLimit(clientKey, RateLimitPresets.strict)

if (!result.allowed) {
  return new Response(
    JSON.stringify({ error: 'Rate limit exceeded' }),
    { 
      status: 429,
      headers: {
        'Retry-After': Math.ceil((result.resetAt.getTime() - Date.now()) / 1000).toString()
      }
    }
  )
}
```

### Environment Configuration

```bash
# Development (uses in-memory by default)
NODE_ENV=development
# Optional override
RATE_LIMITER_FORCE_MEMORY=true

# Production (uses Redis)
NODE_ENV=production
REDIS_HOST=redis.example.com
REDIS_PORT=6379
```

---

## Integration Points

### Middleware
```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const clientKey = getClientKey(request)
  const rateLimitResult = await checkRateLimit(clientKey, {
    ...RateLimitPresets.standard,
    keyPrefix: 'middleware'
  })
  
  if (!rateLimitResult.allowed) {
    return new NextResponse('Too many requests', { status: 429 })
  }
}
```

### Backup Management
```typescript
// /api/admin/backup/route.ts
if (action === 'UNIFIED_BACKUP') {
  const result = await BackupOrchestrator.runBackup(type)
  return NextResponse.json(result)
}
```

### AI Job Processing
```typescript
// /api/ai/transcribe/upload/route.ts
if (enqueue) {
  const job = await enqueueAIJob('transcribe_and_generate_soap', {
    filePath: saved.relPath,
    patientId,
    doctorId
  })
  return NextResponse.json({ jobId: job.id })
}
```

---

## Testing

Comprehensive test suites are included for all factory patterns:

- `tests/factories/backup-orchestrator.test.ts` (40+ tests)
- `tests/factories/ai-queue-factory.test.ts` (35+ tests)
- `tests/factories/rate-limiter-factory.test.ts` (45+ tests)

Run tests with:
```bash
npm run test:factories
```

---

## Benefits

### ✅ Environment Awareness
- Automatically select best implementation based on environment
- No manual configuration needed for development

### ✅ Graceful Degradation
- Production still works without Redis (fallback to in-memory)
- Development works out-of-the-box without external dependencies

### ✅ Type Safety
- Full TypeScript interfaces for all implementations
- Clear error messages

### ✅ Consistency
- Unified API across different implementations
- Easier to switch implementations later

### ✅ Testability
- Easy to mock in tests
- In-memory implementations perfect for integration tests

---

## Migration Guide

### For Existing Code

**Before (Direct BullMQ):**
```typescript
import { enqueueAI } from '@/lib/ai-bullmq-queue'
const job = await enqueueAI('symptom_analysis', data)
```

**After (Factory Pattern):**
```typescript
import { enqueueAIJob } from '@/lib/ai-queue-factory'
const { id } = await enqueueAIJob('symptom_analysis', data)
```

**Before (Manual rate limiting):**
```typescript
const { allowed } = checkRateLimitMemory(request)
```

**After (Factory Pattern):**
```typescript
const result = await checkRateLimit(clientKey, config)
```

---

## Monitoring

### Queue Health
```typescript
const queue = await AIQueueFactory.getQueue()
const healthy = await queue.isHealthy()
```

### Rate Limiter Health
```typescript
const limiter = await RateLimiterFactory.getRateLimiter()
const healthy = await limiter.isHealthy()
```

### Backup Status
```typescript
const status = await BackupOrchestrator.getBackupStatus()
```

---

## Troubleshooting

### Queue not working in development
- Ensure `Node.js` and `Redis` are installed (optional for development)
- Set `AI_QUEUE_FORCE_MEMORY=true` to force in-memory

### Rate limiting too strict
- Use `RateLimitPresets.relaxed` for public endpoints
- Use `RateLimitPresets.standard` for general APIs
- Use `RateLimitPresets.strict` for sensitive operations

### Backups failing
- Check disk space for backup storage
- Verify database connectivity
- Check CloudFlare/S3 credentials for cloud backups

---

## Future Enhancements

1. **Metrics Collection** - Add prometheus metrics for queue/rate limiter stats
2. **Circuit Breaker** - Implement circuit breaker for failing services
3. **Caching** - Add caching layer for rate limit checks
4. **Webhooks** - Add webhook support for backup completion notifications
