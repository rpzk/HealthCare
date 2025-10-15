# Medical Records API - Complete Documentation

**API Version**: 1.0.0  
**Base URL**: `http://localhost:3000/api/medical-records`  
**Authentication**: Required (via `withAuth` middleware)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Endpoints](#endpoints)
4. [Data Models](#data-models)
5. [Status Codes](#status-codes)
6. [Error Handling](#error-handling)
7. [Validation Rules](#validation-rules)
8. [Permission Model](#permission-model)
9. [Examples](#examples)
10. [Rate Limiting](#rate-limiting)

---

## Overview

The Medical Records API provides CRUD operations for managing patient medical records. All endpoints require authentication and enforce role-based access control.

**Key Features**:
- ✅ Full CRUD operations (Create, Read, Update, Delete)
- ✅ Zod schema validation on all inputs
- ✅ Role-based permission checks
- ✅ Pagination support
- ✅ Comprehensive error handling
- ✅ Descriptive validation error messages

---

## Authentication

### Requirements
- All endpoints require a valid authentication token
- Token is validated via `withAuth` middleware
- Tokens must include user `id` and `role`

### User Roles
- `ADMIN` - Full access to all operations
- `DOCTOR` - Can manage own records
- `PATIENT` - Limited read access (future)
- `NURSE` - Assistant-level access (future)

### Token Format
```
Header: Authorization: Bearer <token>
```

---

## Endpoints

### 1. List Medical Records

```http
GET /api/medical-records?page=1&limit=10
```

**Description**: Retrieve paginated list of medical records

**Query Parameters**:
| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| `page` | integer | 1 | ≥1 | Page number |
| `limit` | integer | 10 | 1-100 | Records per page |

**Request Example**:
```bash
curl -X GET "http://localhost:3000/api/medical-records?page=1&limit=10" \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json"
```

**Response (200 OK)**:
```json
{
  "records": [
    {
      "id": "uuid-1234",
      "title": "Initial Consultation",
      "description": "Comprehensive initial assessment...",
      "diagnosis": "Hypertension",
      "treatment": "Antihypertensive medication",
      "notes": "Patient responsive",
      "recordType": "CONSULTATION",
      "priority": "NORMAL",
      "doctorId": "doctor-uuid",
      "patientId": "patient-uuid",
      "createdAt": "2025-10-15T10:00:00Z",
      "updatedAt": "2025-10-15T10:00:00Z"
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 10
}
```

**Errors**:
- `400` - Invalid pagination parameters
- `401` - Unauthorized
- `500` - Server error

---

### 2. Create Medical Record

```http
POST /api/medical-records
```

**Description**: Create a new medical record

**Request Body** (JSON):
```json
{
  "title": "Initial Consultation",
  "description": "This is a comprehensive description of the medical consultation",
  "diagnosis": "Type 2 Diabetes",
  "treatment": "Metformin 500mg twice daily",
  "notes": "Patient shows good adherence to treatment",
  "recordType": "CONSULTATION",
  "priority": "HIGH"
}
```

**Request Example**:
```bash
curl -X POST "http://localhost:3000/api/medical-records" \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Initial Consultation",
    "description": "Comprehensive description with sufficient length",
    "recordType": "CONSULTATION",
    "priority": "NORMAL"
  }'
```

**Response (201 Created)**:
```json
{
  "id": "uuid-5678",
  "title": "Initial Consultation",
  "description": "Comprehensive description with sufficient length",
  "diagnosis": null,
  "treatment": null,
  "notes": null,
  "recordType": "CONSULTATION",
  "priority": "NORMAL",
  "doctorId": "current-doctor-uuid",
  "patientId": null,
  "createdAt": "2025-10-15T10:30:00Z",
  "updatedAt": "2025-10-15T10:30:00Z"
}
```

**Errors**:
- `400` - Invalid input data
- `401` - Unauthorized
- `500` - Server error

---

### 3. Get Medical Record by ID

```http
GET /api/medical-records/{id}
```

**Description**: Retrieve a specific medical record

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Record identifier |

**Request Example**:
```bash
curl -X GET "http://localhost:3000/api/medical-records/uuid-5678" \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json"
```

**Response (200 OK)**:
```json
{
  "id": "uuid-5678",
  "title": "Initial Consultation",
  "description": "Comprehensive description...",
  "diagnosis": "Type 2 Diabetes",
  "treatment": "Metformin 500mg",
  "notes": "Patient responsive",
  "recordType": "CONSULTATION",
  "priority": "HIGH",
  "doctorId": "doctor-uuid",
  "patientId": "patient-uuid",
  "createdAt": "2025-10-15T10:30:00Z",
  "updatedAt": "2025-10-15T10:30:00Z"
}
```

**Errors**:
- `400` - Invalid ID format
- `401` - Unauthorized
- `404` - Record not found
- `500` - Server error

---

### 4. Update Medical Record

```http
PUT /api/medical-records/{id}
```

**Description**: Update an existing medical record (partial updates supported)

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Record identifier |

**Request Body** (JSON - all fields optional):
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "diagnosis": "Updated diagnosis",
  "treatment": "Updated treatment plan",
  "notes": "Updated clinical notes",
  "recordType": "EXAM",
  "priority": "CRITICAL"
}
```

**Request Example**:
```bash
curl -X PUT "http://localhost:3000/api/medical-records/uuid-5678" \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "priority": "CRITICAL",
    "treatment": "Updated treatment plan"
  }'
```

**Response (200 OK)**:
```json
{
  "id": "uuid-5678",
  "title": "Initial Consultation",
  "description": "Comprehensive description...",
  "diagnosis": "Type 2 Diabetes",
  "treatment": "Updated treatment plan",
  "notes": "Patient responsive",
  "recordType": "CONSULTATION",
  "priority": "CRITICAL",
  "doctorId": "doctor-uuid",
  "patientId": "patient-uuid",
  "createdAt": "2025-10-15T10:30:00Z",
  "updatedAt": "2025-10-15T10:45:00Z"
}
```

**Permission Check**:
- ✅ Doctor can update own records (doctorId matches)
- ✅ Admin can update any record
- ❌ Others get 403 Forbidden

**Errors**:
- `400` - Invalid input data
- `401` - Unauthorized
- `403` - Permission denied
- `404` - Record not found
- `500` - Server error

---

### 5. Delete Medical Record

```http
DELETE /api/medical-records/{id}
```

**Description**: Delete a medical record (admin only)

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Record identifier |

**Request Example**:
```bash
curl -X DELETE "http://localhost:3000/api/medical-records/uuid-5678" \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json"
```

**Response (200 OK)**:
```json
{
  "message": "Prontuário deletado com sucesso",
  "id": "uuid-5678"
}
```

**Permission Check**:
- ✅ Admin can delete any record
- ❌ Doctor cannot delete (get 403)
- ❌ Non-authenticated get 401

**Errors**:
- `401` - Unauthorized
- `403` - Permission denied (not admin)
- `404` - Record not found
- `500` - Server error

---

## Data Models

### Medical Record

```typescript
interface MedicalRecord {
  id: string                              // UUID
  title: string                           // min 3 chars, max 255
  description: string                     // min 10 chars, optional
  diagnosis: string | null                // optional
  treatment: string | null                // optional
  notes: string | null                    // optional
  recordType: RecordType                  // enum
  priority: Priority                      // enum
  doctorId: string                        // UUID of creating doctor
  patientId: string | null                // UUID of patient, optional
  createdAt: ISO8601DateTime             // timestamp
  updatedAt: ISO8601DateTime             // timestamp
}
```

### Record Type (Enum)
```typescript
type RecordType = 'CONSULTATION' | 'EXAM' | 'PROCEDURE' | 'PRESCRIPTION' | 'OTHER'
```

### Priority (Enum)
```typescript
type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'
```

---

## Status Codes

| Code | Meaning | Use Case |
|------|---------|----------|
| 200 | OK | Successful GET, PUT, DELETE |
| 201 | Created | Successful POST |
| 400 | Bad Request | Invalid input data, validation error |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Authenticated but no permission (e.g., non-admin delete) |
| 404 | Not Found | Record ID doesn't exist |
| 500 | Server Error | Unexpected server error |

---

## Error Handling

### Error Response Format

```json
{
  "error": "Descriptive error message",
  "details": {
    "field": "error description"
  }
}
```

### Validation Error Example

```json
{
  "error": "Dados inválidos: title: String must contain at least 3 character(s); description: String must contain at least 10 character(s)"
}
```

### Permission Error Example

```json
{
  "error": "Permissão negada: você não pode editar este prontuário"
}
```

---

## Validation Rules

### Title
- ✅ Required field
- ✅ Type: string
- ✅ Minimum length: 3 characters
- ❌ Empty strings rejected
- ❌ Strings < 3 chars rejected

### Description
- ✅ Optional field
- ✅ Type: string
- ✅ Minimum length: 10 characters (if provided)
- ❌ Strings < 10 chars rejected

### Record Type
- ✅ Required field
- ✅ Type: enum
- ✅ Valid values: CONSULTATION, EXAM, PROCEDURE, PRESCRIPTION, OTHER
- ❌ Invalid values rejected

### Priority
- ✅ Required field
- ✅ Type: enum
- ✅ Valid values: LOW, NORMAL, HIGH, CRITICAL
- ❌ Invalid values rejected

### Optional Fields (diagnosis, treatment, notes)
- ✅ Can be omitted or null
- ✅ Type: string
- ✅ No length constraints

---

## Permission Model

### Access Control Matrix

| Operation | Doctor | Admin | Non-Auth | Guest |
|-----------|--------|-------|----------|-------|
| List | ✅ | ✅ | ❌ | ❌ |
| Create | ✅ | ✅ | ❌ | ❌ |
| Read own | ✅ | ✅ | ❌ | ❌ |
| Read all | ❌ | ✅ | ❌ | ❌ |
| Update own | ✅ | ✅ | ❌ | ❌ |
| Update other | ❌ | ✅ | ❌ | ❌ |
| Delete | ❌ | ✅ | ❌ | ❌ |

### Permission Logic

**Doctor**:
- Can list all records
- Can create records
- Can update own records (doctorId matches)
- Cannot update other doctors' records
- Cannot delete records

**Admin**:
- Can perform all operations
- Can list all records
- Can create records
- Can update any record
- Can delete any record

---

## Examples

### Complete Workflow

#### 1. Create a Record
```bash
curl -X POST "http://localhost:3000/api/medical-records" \
  -H "Authorization: Bearer doctor-token" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Follow-up Consultation",
    "description": "Patient follow-up consultation for diabetes management",
    "diagnosis": "Type 2 Diabetes",
    "treatment": "Continue current medication regimen",
    "notes": "Patient reports good compliance",
    "recordType": "CONSULTATION",
    "priority": "NORMAL"
  }'
```

#### 2. Retrieve the Created Record
```bash
RECORD_ID="uuid-from-create-response"
curl -X GET "http://localhost:3000/api/medical-records/$RECORD_ID" \
  -H "Authorization: Bearer doctor-token"
```

#### 3. Update the Record
```bash
curl -X PUT "http://localhost:3000/api/medical-records/$RECORD_ID" \
  -H "Authorization: Bearer doctor-token" \
  -H "Content-Type: application/json" \
  -d '{
    "priority": "HIGH",
    "notes": "Patient requires closer monitoring"
  }'
```

#### 4. List All Records
```bash
curl -X GET "http://localhost:3000/api/medical-records?page=1&limit=20" \
  -H "Authorization: Bearer doctor-token"
```

#### 5. Delete the Record (Admin Only)
```bash
curl -X DELETE "http://localhost:3000/api/medical-records/$RECORD_ID" \
  -H "Authorization: Bearer admin-token"
```

---

## Rate Limiting

**Current Status**: Not implemented (Phase 2)

**Planned**:
- Per-user rate limit: 100 requests per minute
- Per-IP rate limit: 1000 requests per minute
- Per-record rate limit: 10 updates per minute

---

## Changelog

### Version 1.0.0 (October 15, 2025)
- ✅ Initial API release
- ✅ CRUD operations
- ✅ Zod validation
- ✅ Permission checks
- ✅ Pagination support

---

## Support

For issues or questions:
1. Check [TEST_MEDICAL_RECORDS.md](./TEST_MEDICAL_RECORDS.md) for testing guide
2. Review [PHASE_1_SUMMARY.md](./PHASE_1_SUMMARY.md) for implementation details
3. Contact development team

---

**Last Updated**: October 15, 2025  
**Next Review**: October 22, 2025
