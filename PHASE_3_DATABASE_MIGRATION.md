# Phase 3: Database Schema - Prisma Migration Guide

## Overview

Phase 3 migrates Phase 2 security features from in-memory storage to persistent database using Prisma and PostgreSQL.

## Changes Made to Schema

### 1. MedicalRecord Model Enhancements

```prisma
model MedicalRecord {
  // ... existing fields ...
  
  // NEW: Phase 2 Security Features
  version        Int        @default(1)        // Optimistic locking
  deletedAt      DateTime?                     // Soft-delete (LGPD: restoration)
  priority       String     @default("NORMAL") // LOW, NORMAL, HIGH, CRITICAL
  
  // NEW: Indexes for performance
  @@index([patientId])
  @@index([doctorId])
  @@index([recordType])
  @@index([createdAt])
  @@index([deletedAt])
}
```

**New Fields**:
- `version` - Optimistic locking counter for concurrent update handling
- `deletedAt` - Soft-delete timestamp (null = active, non-null = deleted)
- `priority` - Record priority level (not previously stored)

**New Indexes**:
- `patientId` - Query records by patient
- `doctorId` - Query records by doctor
- `recordType` - Query by type (CONSULTATION, EXAM, etc.)
- `createdAt` - Query by creation date
- `deletedAt` - Filter active/deleted records efficiently

### 2. AuditLog Model Enhancements

```prisma
model AuditLog {
  // ... core tracking ...
  action        String      // CREATE, READ, UPDATE, DELETE, ERROR
  resourceType  String      // MEDICAL_RECORD, PATIENT, USER, etc.
  resourceId    String      // ID of resource being audited
  
  // ... user attribution ...
  userId        String
  userEmail     String
  userRole      String
  
  // ... operation details ...
  success       Boolean
  errorMessage  String?
  
  // NEW: Phase 2 Security (before/after snapshots)
  changes       Json?       // Array of field changes
  metadata      Json?       // Context data (IP, user-agent, reason)
  
  // NEW: Indexes for queries
  @@index([userId, createdAt])
  @@index([action, createdAt])
  @@index([resourceId, createdAt])
  @@index([resourceType, createdAt])
  @@index([success, createdAt])
}
```

**Enhanced Fields**:
- `changes` - JSON array storing before/after snapshots for updates
- `metadata` - JSON object for additional context (IP address, user agent, deletion reason)
- `resourceType` - Standardized resource type instead of generic "resource"
- `action` - Standardized actions (CREATE, READ, UPDATE, DELETE, ERROR)

**New Indexes**:
- `[resourceId, createdAt]` - Audit trail for specific record
- `[resourceType, createdAt]` - Audit trail by resource type
- `[success, createdAt]` - Error tracking and security incidents

### 3. New: RateLimitLog Model

```prisma
model RateLimitLog {
  id        String   @id @default(cuid())
  userId    String
  operation String   // CREATE, READ, UPDATE, DELETE
  timestamp DateTime @default(now())
  expiresAt DateTime? // TTL for cleanup
  
  @@index([userId, operation, timestamp])
  @@index([expiresAt])
}
```

**Purpose**: Persist rate limit attempts for:
- Distributed rate limiting across multiple servers (Phase 3 Redis migration)
- Historical rate limit analysis
- Detecting abuse patterns

**Note**: In production, this will be replaced by Redis with TTL for better performance.

## Migration Instructions

### Step 1: Apply Prisma Migration

```bash
# Create migration
npx prisma migrate dev --name add-phase2-security-schema

# OR if using existing dev database
npx prisma db push
```

### Step 2: Update Existing Data (Post-Migration Script)

```typescript
// scripts/phase3-migrate-data.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migratePhase3() {
  // 1. Initialize version field for existing records
  await prisma.medicalRecord.updateMany({
    where: { version: undefined },
    data: { version: 1 }
  })
  
  // 2. Ensure deletedAt is null for active records
  await prisma.medicalRecord.updateMany({
    where: { deletedAt: null },
    data: { deletedAt: null }
  })
  
  // 3. Migrate priority from implicit to explicit
  await prisma.medicalRecord.updateMany({
    where: { priority: null },
    data: { priority: 'NORMAL' }
  })
  
  console.log('✅ Phase 3 data migration complete')
}

migratePhase3()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

### Step 3: Generate Prisma Client

```bash
npx prisma generate
```

## Implementation in Services

### Update MedicalRecordsService Mock → Real Prisma

**Current (Mock)**:
```typescript
// lib/medical-records-service-mock.ts
const records = new Map() // In-memory storage

export class MedicalRecordsService {
  static async createMedicalRecord(data: CreateMedicalRecordInput) {
    // Creates in memory
  }
}
```

**New (Prisma)**:
```typescript
// lib/medical-records-service.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export class MedicalRecordsService {
  static async createMedicalRecord(data: CreateMedicalRecordInput) {
    return prisma.medicalRecord.create({
      data: {
        ...data,
        version: 1
      }
    })
  }
  
  static async getMedicalRecordById(id: string) {
    return prisma.medicalRecord.findUnique({
      where: { id },
      // Exclude soft-deleted records by default
      select: { deletedAt: false }
    })
  }
  
  static async updateMedicalRecord(id: string, data: UpdateMedicalRecordInput) {
    return prisma.medicalRecord.update({
      where: { id, version: data.version || 1 },
      data: {
        ...data,
        version: { increment: 1 }
      }
    })
  }
  
  static async deleteMedicalRecord(id: string) {
    // Soft-delete: set deletedAt instead of removing
    return prisma.medicalRecord.update({
      where: { id },
      data: { deletedAt: new Date() }
    })
  }
}
```

### Audit Service Database Integration

**Current (Console only)**:
```typescript
async logCreate(recordId, data, userId, userRole) {
  console.log('[Medical Records Audit]', { action: 'CREATE', recordId })
}
```

**New (Prisma)**:
```typescript
async logCreate(recordId, data, userId, userRole, metadata?) {
  return prisma.auditLog.create({
    data: {
      action: 'CREATE',
      resourceType: 'MEDICAL_RECORD',
      resourceId: recordId,
      userId,
      userEmail: '...', // from auth context
      userRole,
      success: true,
      changes: Object.entries(data).map(([field, value]) => ({
        field,
        before: null,
        after: value
      })),
      metadata: metadata || {}
    }
  })
}

async getRecordAuditTrail(recordId: string) {
  return prisma.auditLog.findMany({
    where: {
      resourceId: recordId,
      resourceType: 'MEDICAL_RECORD'
    },
    orderBy: { createdAt: 'desc' }
  })
}
```

### Rate Limiting Service Database Integration

**Current (In-memory)**:
```typescript
const rateLimits = new Map() // In-memory storage

checkRateLimit(userId, operation) {
  // Checks in-memory map
}
```

**New (Prisma with Redis Phase 3)**:
```typescript
// Phase 3a: Prisma (before Redis migration)
async checkRateLimit(userId: string, operation: string) {
  const oneMinuteAgo = new Date(Date.now() - 60000)
  
  const count = await prisma.rateLimitLog.count({
    where: {
      userId,
      operation,
      timestamp: { gte: oneMinuteAgo }
    }
  })
  
  const limit = 10 // for CREATE
  
  if (count >= limit) {
    return { allowed: false, retryAfter: 60 }
  }
  
  // Log this request
  await prisma.rateLimitLog.create({
    data: { userId, operation, expiresAt: new Date(Date.now() + 86400000) }
  })
  
  return { allowed: true, remaining: limit - count - 1 }
}

// Phase 3b: Redis (after migration for distributed systems)
import { Redis } from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

async checkRateLimit(userId: string, operation: string) {
  const key = `rate-limit:${userId}:${operation}:${Math.floor(Date.now() / 60000)}`
  const count = await redis.incr(key)
  
  if (count === 1) {
    await redis.expire(key, 60) // 60 second expiry
  }
  
  const limit = 10 // for CREATE
  
  if (count > limit) {
    return { allowed: false, retryAfter: 60 }
  }
  
  return { allowed: true, remaining: limit - count }
}
```

## Soft-Delete Pattern

### Querying Active Records

```typescript
// Only include non-deleted records
const records = await prisma.medicalRecord.findMany({
  where: { deletedAt: null }
})

// OR using custom helper
async function getActiveMedicalRecords(filter) {
  return prisma.medicalRecord.findMany({
    where: {
      ...filter,
      deletedAt: null
    }
  })
}
```

### Soft-Delete Operation

```typescript
// Instead of delete, set deletedAt
async deleteMedicalRecord(id: string) {
  return prisma.medicalRecord.update({
    where: { id },
    data: { deletedAt: new Date() }
  })
}
```

### Restore from Soft-Delete

```typescript
// LGPD: Right to be forgotten can be undone
async restoreMedicalRecord(id: string) {
  return prisma.medicalRecord.update({
    where: { id },
    data: { deletedAt: null }
  })
}
```

## Performance Considerations

### Index Strategy

1. **`patientId`** - Filter records by patient (PRIMARY)
2. **`doctorId`** - Filter records by doctor
3. **`recordType`** - Filter by type (CONSULTATION, EXAM, etc.)
4. **`createdAt`** - Time-range queries and sorting
5. **`deletedAt`** - Efficient soft-delete filtering

### Query Optimization

```typescript
// GOOD: Indexes used
await prisma.medicalRecord.findMany({
  where: {
    patientId: 'pat-123',
    deletedAt: null,
    createdAt: { gte: startDate, lte: endDate }
  }
})

// BAD: No index on diagnosis
await prisma.medicalRecord.findMany({
  where: {
    diagnosis: 'Hipertensão' // Full text search requires separate index
  }
})
```

### Future Optimization (Phase 4)

```prisma
model MedicalRecord {
  // ... existing ...
  
  // Add full-text search index
  @@fulltext([title, description, diagnosis])
}
```

## Rollback Plan

If migration fails:

```bash
# Rollback to previous migration
npx prisma migrate resolve --rolled-back "add-phase2-security-schema"

# Verify state
npx prisma db push

# Reapply
npx prisma migrate dev --name add-phase2-security-schema
```

## Testing Post-Migration

```typescript
// tests/phase3-migration.test.ts
describe('Phase 3 Database Schema', () => {
  test('MedicalRecord has soft-delete', async () => {
    const record = await prisma.medicalRecord.create({/* ... */})
    await prisma.medicalRecord.update({
      where: { id: record.id },
      data: { deletedAt: new Date() }
    })
    const deleted = await prisma.medicalRecord.findUnique({
      where: { id: record.id }
    })
    expect(deleted.deletedAt).not.toBeNull()
  })
  
  test('AuditLog records before/after changes', async () => {
    const log = await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        resourceId: 'rec-123',
        changes: [{ field: 'diagnosis', before: 'X', after: 'Y' }],
        // ...
      }
    })
    expect(log.changes).toHaveLength(1)
    expect(log.changes[0].before).toBe('X')
  })
  
  test('RateLimitLog tracks operations', async () => {
    await prisma.rateLimitLog.create({
      data: { userId: 'user-1', operation: 'CREATE' }
    })
    const count = await prisma.rateLimitLog.count({
      where: { userId: 'user-1', operation: 'CREATE' }
    })
    expect(count).toBeGreaterThan(0)
  })
})
```

## Timeline

- **✅ Phase 1**: 5 endpoints + tests
- **✅ Phase 2**: Security hardening (in-memory)
- **Phase 3a**: Prisma database integration (THIS DOCUMENT)
- **Phase 3b**: Redis rate limiting
- **Phase 4**: Frontend UI

## Next Steps

1. ✅ Apply Prisma migration
2. ✅ Update MedicalRecordsService to use Prisma
3. ✅ Update audit service to use database
4. ✅ Update rate limiting to use database
5. ✅ Run tests with real database
6. ✅ Document Phase 3 in main README

---

**Phase 3 Implementation Guide Complete** 🚀
