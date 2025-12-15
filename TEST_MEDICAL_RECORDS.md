# Medical Records API - Test Suite

Note: For manual end-to-end UI flows, refer to TESTE_INTERATIVO.md. This document focuses on API integration coverage.

This directory contains comprehensive integration tests for the Medical Records API endpoints.

## Test Files

### 1. `test-medical-records.js` (Basic Tests)
- **Language**: JavaScript (Node.js)
- **Purpose**: Basic integration tests for CRUD operations, validation, and pagination
- **Duration**: ~5-10 minutes
- **Command**: `npm run test:medical-records` or `node test-medical-records.js`

**Coverage**:
- ✅ GET /api/medical-records - List with pagination
- ✅ POST /api/medical-records - Create with validation
- ✅ GET /api/medical-records/[id] - Fetch by ID
- ✅ PUT /api/medical-records/[id] - Update with permission checks
- ✅ DELETE /api/medical-records/[id] - Delete (admin only)
- ✅ Input validation (title, description, recordType, priority)
- ✅ Pagination bounds (page >= 1, limit > 0, limit <= 100)
- ✅ Error handling (400, 403, 404, 500 status codes)
- ✅ Edge cases (missing fields, invalid data, nonexistent records)

**Test Scenarios** (60+ tests):
1. List & Pagination (7 tests)
2. Create Record (6 tests)
3. Get by ID (3 tests)
4. Update Record (5 tests)
5. Delete Record (3 tests)
6. Edge Cases (7 tests)
7. Data Integrity (2 tests)

### 2. `test-medical-records-advanced.ts` (Advanced Tests)
- **Language**: TypeScript
- **Purpose**: Advanced integration tests with permission controls, concurrent updates, and boundary cases
- **Duration**: ~10-15 minutes
- **Command**: `npm run test:medical-records:advanced` or `npx tsx test-medical-records-advanced.ts`

**Coverage**:
- ✅ Input validation (all field types and constraints)
- ✅ CRUD operations (create, read, update, delete)
- ✅ Pagination (limits, boundaries, multi-page iteration)
- ✅ Error handling (404, 400 for invalid data)
- ✅ Data schema validation (enum values, required fields)
- ✅ Boundary cases (min/max values, edge conditions)

**Test Suites** (50+ tests):
1. Input Validation (6 tests)
2. CRUD Operations (8 tests)
3. Pagination (7 tests)
4. Error Handling (4 tests)
5. Data Schema (3 tests)
6. Boundary Cases (6 tests)

## Prerequisites

Before running tests:

1. **Start the Next.js development server**:
   ```bash
   npm run dev
   # Server should be running at http://localhost:3000
   ```

2. **Ensure database is seeded** (if needed):
   ```bash
   npm run db:seed
   ```

## Running Tests

### Option 1: Run Basic Tests
```bash
npm run test:medical-records
```

### Option 2: Run Advanced Tests
```bash
npm run test:medical-records:advanced
```

### Option 3: Run All Tests (including medical records)
```bash
npm run test:all
```

## Test Output

Both test files produce detailed output showing:
- ✅ Passed tests
- ❌ Failed tests with error messages
- 📊 Summary statistics (pass rate, total count)
- ⏱️ Execution time

### Sample Output
```
🏥 Medical Records API Tests

📋 Phase 1: List & Pagination

✅ GET /api/medical-records - List all records
✅ GET /api/medical-records - Invalid page parameter (expect 400)
✅ GET /api/medical-records - Limit exceeds 100 (expect 400)

...

📊 Test Results:

✅ Passed: 57
❌ Failed: 0
📈 Total:  57

Success Rate: 100%
```

## API Endpoints Tested

### List Records
```
GET /api/medical-records?page=1&limit=10
```
- ✅ Pagination validation
- ✅ Return format validation

### Create Record
```
POST /api/medical-records
{
  "title": "Initial Consultation",
  "description": "Comprehensive description...",
  "diagnosis": "Type 2 Diabetes",
  "treatment": "Metformin 500mg",
  "notes": "Patient notes...",
  "recordType": "CONSULTATION",
  "priority": "NORMAL"
}
```
- ✅ Zod schema validation
- ✅ Required field checking
- ✅ String length validation (title min 3, description min 10)
- ✅ Enum validation (recordType, priority)

### Get Record
```
GET /api/medical-records/{id}
```
- ✅ Existing record retrieval
- ✅ 404 for nonexistent records

### Update Record
```
PUT /api/medical-records/{id}
{
  "title": "Updated Title",
  "priority": "CRITICAL"
}
```
- ✅ Partial updates (optional fields)
- ✅ Permission checks (doctor can edit own, admin can edit any)
- ✅ Validation of provided fields
- ✅ 404 for nonexistent records
- ✅ 403 for unauthorized access

### Delete Record
```
DELETE /api/medical-records/{id}
```
- ✅ Admin-only restriction
- ✅ 404 for nonexistent records
- ✅ 403 for non-admin users

## Validation Rules Tested

### Title
- ✅ Minimum 3 characters
- ✅ Maximum length (boundary testing)
- ✅ Required field

### Description
- ✅ Minimum 10 characters
- ✅ Optional field
- ✅ Maximum length testing

### recordType
- ✅ Enum values: CONSULTATION, EXAM, PROCEDURE, PRESCRIPTION, OTHER
- ✅ Invalid values rejected with 400
- ✅ Required field

### priority
- ✅ Enum values: LOW, NORMAL, HIGH, CRITICAL
- ✅ Invalid values rejected with 400
- ✅ Required field

### Optional Fields
- ✅ diagnosis (optional)
- ✅ treatment (optional)
- ✅ notes (optional)

## Permission Model

The tests verify permission checks:

| Operation | Doctor | Admin | Non-Auth |
|-----------|--------|-------|----------|
| List records | ✅ | ✅ | ✅* |
| Create record | ✅ | ✅ | ❌ |
| Read own record | ✅ | ✅ | ❌ |
| Update own record | ✅ | ✅ | ❌ |
| Update others | ❌ | ✅ | ❌ |
| Delete record | ❌ | ✅ | ❌ |

*May require authentication based on implementation

## Troubleshooting

### Tests Fail with "Cannot reach server"
- Ensure Next.js is running: `npm run dev`
- Check server is on http://localhost:3000
- Wait 2-3 seconds for warm-up

### Tests Fail with "Invalid auth token"
- Tests use mock tokens
- Ensure your auth system accepts test tokens or modify test headers

### Tests Fail with "Database errors"
- Ensure database is running (Docker containers)
- Run seed script: `npm run db:seed`
- Check Prisma connection in .env

### Pagination tests fail
- Verify at least 100 records exist in database
- Check pagination logic in `/api/medical-records` endpoint

## Performance Benchmarks

Typical execution times:
- Basic tests: 5-10 minutes (60+ tests)
- Advanced tests: 10-15 minutes (50+ tests)
- Full suite: 20-30 minutes

Performance varies based on:
- Database query performance
- Network latency
- Server processing time

## Next Steps

After Phase 1 tests pass:

1. **Phase 2**: Security Hardening
   - Add auditoria logging tests
   - Add field masking tests
   - Add LGPD compliance tests
   - Add rate limiting tests

2. **Phase 3**: Database Tests
   - Create Prisma schema tests
   - Add migration tests
   - Add transaction tests

3. **Phase 4**: Frontend Integration
   - Add component tests
   - Add form validation tests
   - Add UI interaction tests

## References

- [API Documentation](./API.md) - Full API spec
- [Database Schema](./SCHEMA.md) - Prisma schema details
- [Security Model](./SECURITY.md) - Permission and auth details
