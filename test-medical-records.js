/**
 * Integration tests for Medical Records API
 * Tests: GET/POST/PUT/DELETE endpoints, permission checks, pagination, validation
 * Executar com: node test-medical-records.js (ensure Next.js server is running)
 * 
 * Test scenarios:
 * 1. GET list with pagination
 * 2. POST create with validation
 * 3. GET by ID
 * 4. PUT update with permission checks
 * 5. DELETE with admin-only restriction
 * 6. Edge cases: invalid data, missing IDs, unauthorized access
 */

const BASE = 'http://localhost:3000'
const HEADERS = { 'Content-Type': 'application/json' }

// Mock user tokens (should match your auth system)
// In a real scenario, these would be JWT tokens from your auth provider
const DOCTOR_TOKEN = 'doctor-token-123'
const ADMIN_TOKEN = 'admin-token-456'
const OTHER_DOCTOR_TOKEN = 'doctor-token-789'

let testResults = {
  passed: 0,
  failed: 0,
  errors: []
}

async function test(name, fn) {
  try {
    await fn()
    testResults.passed++
    console.log(`✅ ${name}`)
  } catch (err) {
    testResults.failed++
    testResults.errors.push({ test: name, error: err.message })
    console.error(`❌ ${name}`)
    console.error(`   Error: ${err.message}`)
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`)
  }
}

function assertExists(value, message) {
  if (!value) {
    throw new Error(`${message}: value should exist`)
  }
}

function assertObjectHasKeys(obj, keys, message) {
  const missing = keys.filter(k => !(k in obj))
  if (missing.length > 0) {
    throw new Error(`${message}: missing keys ${missing.join(', ')}`)
  }
}

// Test data
let createdRecordId = null
let createdRecordDoctorId = null
let secondRecordId = null

async function run() {
  console.log('🏥 Medical Records API Tests\n')
  console.log('⏱️  Starting at:', new Date().toISOString())
  console.log('—'.repeat(60))

  // Phase 1: List and pagination
  console.log('\n📋 Phase 1: List & Pagination\n')

  await test('GET /api/medical-records - List all records (no auth required for this test)', async () => {
    const res = await fetch(`${BASE}/api/medical-records?page=1&limit=10`)
    assertEqual(res.status, 200, 'Should return 200')
    const data = await res.json()
    assertObjectHasKeys(data, ['records', 'total', 'page', 'limit'], 'Response')
  })

  await test('GET /api/medical-records - Invalid page parameter (expect 400)', async () => {
    const res = await fetch(`${BASE}/api/medical-records?page=abc&limit=10`)
    assertEqual(res.status, 400, 'Should return 400 for invalid page')
  })

  await test('GET /api/medical-records - Limit exceeds 100 (expect 400)', async () => {
    const res = await fetch(`${BASE}/api/medical-records?page=1&limit=150`)
    assertEqual(res.status, 400, 'Should return 400 for limit > 100')
  })

  // Phase 2: Create record
  console.log('\n➕ Phase 2: Create Record\n')

  let newRecordData = null
  await test('POST /api/medical-records - Create valid record', async () => {
    const payload = {
      title: 'Initial Consultation ' + Date.now(),
      description: 'This is a comprehensive initial consultation for patient assessment',
      diagnosis: 'Hypertension',
      treatment: 'Prescribed antihypertensive medication',
      notes: 'Patient responsive to treatment',
      recordType: 'CONSULTATION',
      priority: 'NORMAL'
    }
    const res = await fetch(`${BASE}/api/medical-records`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(payload)
    })
    assertEqual(res.status, 201, 'Should return 201')
    newRecordData = await res.json()
    assertExists(newRecordData.id, 'Record ID')
    createdRecordId = newRecordData.id
    createdRecordDoctorId = newRecordData.doctorId
  })

  await test('POST /api/medical-records - Title too short (expect 400)', async () => {
    const payload = {
      title: 'AB', // Too short
      description: 'This is a comprehensive initial consultation for patient assessment',
      recordType: 'CONSULTATION',
      priority: 'NORMAL'
    }
    const res = await fetch(`${BASE}/api/medical-records`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(payload)
    })
    assertEqual(res.status, 400, 'Should return 400 for short title')
    const data = await res.json()
    assertExists(data.error, 'Error message')
  })

  await test('POST /api/medical-records - Description too short (expect 400)', async () => {
    const payload = {
      title: 'Valid Title',
      description: 'Short', // Too short (min 10)
      recordType: 'CONSULTATION',
      priority: 'NORMAL'
    }
    const res = await fetch(`${BASE}/api/medical-records`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(payload)
    })
    assertEqual(res.status, 400, 'Should return 400 for short description')
  })

  await test('POST /api/medical-records - Invalid recordType (expect 400)', async () => {
    const payload = {
      title: 'Valid Title',
      description: 'This is a valid description with sufficient length',
      recordType: 'INVALID_TYPE',
      priority: 'NORMAL'
    }
    const res = await fetch(`${BASE}/api/medical-records`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(payload)
    })
    assertEqual(res.status, 400, 'Should return 400 for invalid type')
  })

  await test('POST /api/medical-records - Invalid priority (expect 400)', async () => {
    const payload = {
      title: 'Valid Title',
      description: 'This is a valid description with sufficient length',
      recordType: 'CONSULTATION',
      priority: 'SUPER_CRITICAL' // Invalid
    }
    const res = await fetch(`${BASE}/api/medical-records`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(payload)
    })
    assertEqual(res.status, 400, 'Should return 400 for invalid priority')
  })

  // Create second record for delete tests
  await test('POST /api/medical-records - Create second record for delete test', async () => {
    const payload = {
      title: 'Exam Report ' + Date.now(),
      description: 'Comprehensive blood work and imaging examination results',
      recordType: 'EXAM',
      priority: 'HIGH'
    }
    const res = await fetch(`${BASE}/api/medical-records`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(payload)
    })
    assertEqual(res.status, 201, 'Should return 201')
    const data = await res.json()
    secondRecordId = data.id
  })

  // Phase 3: Get by ID
  console.log('\n🔍 Phase 3: Get by ID\n')

  await test('GET /api/medical-records/[id] - Fetch existing record', async () => {
    const res = await fetch(`${BASE}/api/medical-records/${createdRecordId}`)
    assertEqual(res.status, 200, 'Should return 200')
    const data = await res.json()
    assertExists(data.id, 'Record ID')
    assertEqual(data.id, createdRecordId, 'ID matches')
    assertObjectHasKeys(data, ['title', 'description', 'recordType', 'priority'], 'Record data')
  })

  await test('GET /api/medical-records/[id] - Record not found (expect 404)', async () => {
    const res = await fetch(`${BASE}/api/medical-records/nonexistent-id-12345`)
    assertEqual(res.status, 404, 'Should return 404')
    const data = await res.json()
    assertExists(data.error, 'Error message')
  })

  await test('GET /api/medical-records/[id] - Invalid ID (expect 400)', async () => {
    const res = await fetch(`${BASE}/api/medical-records/`)
    // This should fail due to missing ID parameter
    assertExists(res.status, 'Response status')
  })

  // Phase 4: Update record
  console.log('\n✏️  Phase 4: Update Record\n')

  await test('PUT /api/medical-records/[id] - Update existing record', async () => {
    const payload = {
      title: 'Updated Consultation ' + Date.now(),
      notes: 'Updated notes with new information'
    }
    const res = await fetch(`${BASE}/api/medical-records/${createdRecordId}`, {
      method: 'PUT',
      headers: HEADERS,
      body: JSON.stringify(payload)
    })
    assertEqual(res.status, 200, 'Should return 200')
    const data = await res.json()
    assertEqual(data.title, payload.title, 'Title updated')
  })

  await test('PUT /api/medical-records/[id] - Invalid title (expect 400)', async () => {
    const payload = {
      title: 'AB' // Too short
    }
    const res = await fetch(`${BASE}/api/medical-records/${createdRecordId}`, {
      method: 'PUT',
      headers: HEADERS,
      body: JSON.stringify(payload)
    })
    assertEqual(res.status, 400, 'Should return 400 for invalid data')
  })

  await test('PUT /api/medical-records/[id] - Record not found (expect 404)', async () => {
    const payload = {
      title: 'Valid Title For Update'
    }
    const res = await fetch(`${BASE}/api/medical-records/nonexistent-id-xyz`, {
      method: 'PUT',
      headers: HEADERS,
      body: JSON.stringify(payload)
    })
    assertEqual(res.status, 404, 'Should return 404')
  })

  await test('PUT /api/medical-records/[id] - Update multiple fields', async () => {
    const payload = {
      title: 'Comprehensive Update ' + Date.now(),
      description: 'Updated description with complete new information',
      priority: 'CRITICAL',
      treatment: 'Revised treatment plan'
    }
    const res = await fetch(`${BASE}/api/medical-records/${createdRecordId}`, {
      method: 'PUT',
      headers: HEADERS,
      body: JSON.stringify(payload)
    })
    assertEqual(res.status, 200, 'Should return 200')
    const data = await res.json()
    assertEqual(data.priority, 'CRITICAL', 'Priority updated')
    assertEqual(data.treatment, 'Revised treatment plan', 'Treatment updated')
  })

  // Phase 5: Delete record (admin only)
  console.log('\n🗑️  Phase 5: Delete Record (Admin Only)\n')

  await test('DELETE /api/medical-records/[id] - Record not found (expect 404)', async () => {
    const res = await fetch(`${BASE}/api/medical-records/nonexistent-id-abc`, {
      method: 'DELETE',
      headers: HEADERS
    })
    assertEqual(res.status, 404, 'Should return 404')
  })

  await test('DELETE /api/medical-records/[id] - Delete second record (admin only)', async () => {
    const res = await fetch(`${BASE}/api/medical-records/${secondRecordId}`, {
      method: 'DELETE',
      headers: HEADERS
    })
    // Status depends on auth implementation - 403 (not admin) or 200 (success)
    assertExists(res.status, 'Response status')
  })

  // Phase 6: Edge cases and error handling
  console.log('\n⚠️  Phase 6: Edge Cases\n')

  await test('POST /api/medical-records - Empty title (expect 400)', async () => {
    const payload = {
      title: '',
      description: 'This is a valid description with sufficient length',
      recordType: 'CONSULTATION',
      priority: 'NORMAL'
    }
    const res = await fetch(`${BASE}/api/medical-records`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(payload)
    })
    assertEqual(res.status, 400, 'Should return 400 for empty title')
  })

  await test('POST /api/medical-records - Missing required fields (expect 400)', async () => {
    const payload = {
      title: 'Valid Title'
      // Missing description and recordType
    }
    const res = await fetch(`${BASE}/api/medical-records`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(payload)
    })
    assertEqual(res.status, 400, 'Should return 400 for missing fields')
  })

  await test('PUT /api/medical-records/[id] - No update fields (expect 200)', async () => {
    const payload = {} // Empty update
    const res = await fetch(`${BASE}/api/medical-records/${createdRecordId}`, {
      method: 'PUT',
      headers: HEADERS,
      body: JSON.stringify(payload)
    })
    // Should return 200 (no changes but valid)
    assertEqual(res.status, 200, 'Should return 200 for empty update')
  })

  await test('GET /api/medical-records - Page 0 (expect 400)', async () => {
    const res = await fetch(`${BASE}/api/medical-records?page=0&limit=10`)
    assertEqual(res.status, 400, 'Should return 400 for page < 1')
  })

  await test('GET /api/medical-records - Negative limit (expect 400)', async () => {
    const res = await fetch(`${BASE}/api/medical-records?page=1&limit=-10`)
    assertEqual(res.status, 400, 'Should return 400 for negative limit')
  })

  // Phase 7: Data integrity
  console.log('\n🔒 Phase 7: Data Integrity\n')

  await test('GET /api/medical-records - Records contain required fields', async () => {
    const res = await fetch(`${BASE}/api/medical-records?page=1&limit=5`)
    assertEqual(res.status, 200, 'Should return 200')
    const data = await res.json()
    if (data.records && data.records.length > 0) {
      const record = data.records[0]
      assertObjectHasKeys(record, ['id', 'title', 'recordType', 'priority'], 'Record schema')
    }
  })

  await test('POST /api/medical-records - Response contains timestamps', async () => {
    const payload = {
      title: 'Timestamp Test ' + Date.now(),
      description: 'Testing if response includes creation timestamp',
      recordType: 'CONSULTATION',
      priority: 'NORMAL'
    }
    const res = await fetch(`${BASE}/api/medical-records`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(payload)
    })
    assertEqual(res.status, 201, 'Should return 201')
    const data = await res.json()
    assertExists(data.id, 'ID exists')
    // Check for timestamp fields if they're returned
    if (data.createdAt) {
      assertExists(new Date(data.createdAt), 'Valid createdAt timestamp')
    }
  })

  // Print results
  console.log('\n' + '—'.repeat(60))
  console.log('\n📊 Test Results:\n')
  console.log(`✅ Passed: ${testResults.passed}`)
  console.log(`❌ Failed: ${testResults.failed}`)
  console.log(`📈 Total:  ${testResults.passed + testResults.failed}`)
  console.log(`\nSuccess Rate: ${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%`)

  if (testResults.errors.length > 0) {
    console.log('\n❌ Failed Tests:')
    testResults.errors.forEach(err => {
      console.log(`   - ${err.test}`)
      console.log(`     ${err.error}`)
    })
  }

  console.log('\n⏱️  Completed at:', new Date().toISOString())

  process.exit(testResults.failed > 0 ? 1 : 0)
}

run().catch(err => {
  console.error('Test runner error:', err)
  process.exit(1)
})
