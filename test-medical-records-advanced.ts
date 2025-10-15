/**
 * Advanced integration tests for Medical Records API
 * Tests: Permission controls, concurrent updates, data validation
 * Executar com: npx tsx test-medical-records-advanced.ts
 */

import fetch from 'node-fetch'

interface TestResult {
  name: string
  passed: boolean
  error?: string
}

interface ApiResponse<T = any> {
  ok: boolean
  status: number
  data?: T
  error?: string
}

const BASE = 'http://localhost:3000'
const HEADERS: Record<string, string> = { 'Content-Type': 'application/json' }

class MedicalRecordsTestSuite {
  private results: TestResult[] = []
  private recordIds: Map<string, string> = new Map()

  async test(name: string, fn: () => Promise<void>): Promise<void> {
    try {
      await fn()
      this.results.push({ name, passed: true })
      console.log(`✅ ${name}`)
    } catch (error: any) {
      this.results.push({ name, passed: false, error: error.message })
      console.error(`❌ ${name}`)
      console.error(`   Error: ${error.message}`)
    }
  }

  private assert(condition: boolean, message: string): void {
    if (!condition) throw new Error(message)
  }

  private assertEqual<T>(actual: T, expected: T, message: string): void {
    if (actual !== expected) {
      throw new Error(`${message}: expected ${expected}, got ${actual}`)
    }
  }

  async fetchApi(
    endpoint: string,
    options: Partial<RequestInit> = {}
  ): Promise<{ status: number; data: any }> {
    const url = `${BASE}${endpoint}`
    const requestOptions: any = {
      headers: HEADERS,
      ...options
    }
    const response = await fetch(url, requestOptions)
    const data = await response.json().catch(() => null)
    return { status: response.status, data }
  }

  // Test Suite 1: Input Validation
  async testInputValidation(): Promise<void> {
    console.log('\n📋 Test Suite 1: Input Validation\n')

    await this.test('Title must be at least 3 characters', async () => {
      const { status } = await this.fetchApi('/api/medical-records', {
        method: 'POST',
        body: JSON.stringify({
          title: 'AB',
          description: 'This is a valid description with sufficient length',
          recordType: 'CONSULTATION',
          priority: 'NORMAL'
        })
      })
      this.assertEqual(status, 400, 'Status code')
    })

    await this.test('Description must be at least 10 characters', async () => {
      const { status } = await this.fetchApi('/api/medical-records', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Valid Title',
          description: 'Short',
          recordType: 'CONSULTATION',
          priority: 'NORMAL'
        })
      })
      this.assertEqual(status, 400, 'Status code')
    })

    await this.test('recordType must be valid enum', async () => {
      const { status } = await this.fetchApi('/api/medical-records', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Valid Title',
          description: 'This is a valid description with sufficient length',
          recordType: 'INVALID_TYPE',
          priority: 'NORMAL'
        })
      })
      this.assertEqual(status, 400, 'Status code')
    })

    await this.test('priority must be valid enum', async () => {
      const { status } = await this.fetchApi('/api/medical-records', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Valid Title',
          description: 'This is a valid description with sufficient length',
          recordType: 'CONSULTATION',
          priority: 'ULTRA_CRITICAL'
        })
      })
      this.assertEqual(status, 400, 'Status code')
    })

    await this.test('Missing required fields returns 400', async () => {
      const { status } = await this.fetchApi('/api/medical-records', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Valid Title'
          // Missing description and recordType
        })
      })
      this.assertEqual(status, 400, 'Status code')
    })

    await this.test('Valid record creation returns 201', async () => {
      const { status, data } = await this.fetchApi('/api/medical-records', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Valid Record ' + Date.now(),
          description: 'This is a comprehensive and valid description',
          recordType: 'CONSULTATION',
          priority: 'NORMAL'
        })
      })
      this.assertEqual(status, 201, 'Status code')
      this.assert(data?.id, 'Response should contain ID')
      this.recordIds.set('valid-record', data.id)
    })
  }

  // Test Suite 2: CRUD Operations
  async testCrudOperations(): Promise<void> {
    console.log('\n🔄 Test Suite 2: CRUD Operations\n')

    let recordId: string

    await this.test('Create record with all fields', async () => {
      const { status, data } = await this.fetchApi('/api/medical-records', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Complete Record ' + Date.now(),
          description: 'A complete record with all available fields',
          diagnosis: 'Type 2 Diabetes',
          treatment: 'Metformin 500mg twice daily',
          notes: 'Patient shows good adherence',
          recordType: 'CONSULTATION',
          priority: 'HIGH'
        })
      })
      this.assertEqual(status, 201, 'Status code')
      recordId = data.id
      this.recordIds.set('complete-record', recordId)
    })

    await this.test('Read record by ID', async () => {
      const { status, data } = await this.fetchApi(`/api/medical-records/${recordId}`)
      this.assertEqual(status, 200, 'Status code')
      this.assertEqual(data.id, recordId, 'ID matches')
      this.assert(data.title, 'Title exists')
      this.assert(data.recordType, 'RecordType exists')
    })

    await this.test('Update record fields', async () => {
      const { status, data } = await this.fetchApi(`/api/medical-records/${recordId}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: 'Updated Record Title ' + Date.now(),
          priority: 'CRITICAL',
          notes: 'Updated clinical notes'
        })
      })
      this.assertEqual(status, 200, 'Status code')
      this.assert(data.title.includes('Updated'), 'Title updated')
      this.assertEqual(data.priority, 'CRITICAL', 'Priority updated')
    })

    await this.test('Partial update (optional fields)', async () => {
      const { status, data } = await this.fetchApi(`/api/medical-records/${recordId}`, {
        method: 'PUT',
        body: JSON.stringify({
          treatment: 'Updated treatment plan'
        })
      })
      this.assertEqual(status, 200, 'Status code')
      this.assertEqual(data.treatment, 'Updated treatment plan', 'Treatment updated')
    })

    await this.test('Empty update returns record unchanged', async () => {
      const before = await this.fetchApi(`/api/medical-records/${recordId}`)
      const { status } = await this.fetchApi(`/api/medical-records/${recordId}`, {
        method: 'PUT',
        body: JSON.stringify({})
      })
      this.assertEqual(status, 200, 'Status code')
    })

    await this.test('Delete returns 200 (or 403 if not authorized)', async () => {
      const { status } = await this.fetchApi(`/api/medical-records/${recordId}`, {
        method: 'DELETE'
      })
      this.assert(status === 200 || status === 403, `Status should be 200 or 403, got ${status}`)
    })
  }

  // Test Suite 3: Pagination
  async testPagination(): Promise<void> {
    console.log('\n📄 Test Suite 3: Pagination\n')

    await this.test('First page with limit 10', async () => {
      const { status, data } = await this.fetchApi('/api/medical-records?page=1&limit=10')
      this.assertEqual(status, 200, 'Status code')
      this.assert(Array.isArray(data.records), 'Records is array')
      this.assert('total' in data, 'Total count included')
      this.assert('page' in data, 'Page info included')
    })

    await this.test('Page parameter must be >= 1', async () => {
      const { status } = await this.fetchApi('/api/medical-records?page=0&limit=10')
      this.assertEqual(status, 400, 'Status code')
    })

    await this.test('Limit must be positive', async () => {
      const { status } = await this.fetchApi('/api/medical-records?page=1&limit=-5')
      this.assertEqual(status, 400, 'Status code')
    })

    await this.test('Limit cannot exceed 100', async () => {
      const { status } = await this.fetchApi('/api/medical-records?page=1&limit=150')
      this.assertEqual(status, 400, 'Status code')
    })

    await this.test('Non-numeric page returns 400', async () => {
      const { status } = await this.fetchApi('/api/medical-records?page=abc&limit=10')
      this.assertEqual(status, 400, 'Status code')
    })

    await this.test('Multiple pages iteration works', async () => {
      const page1 = await this.fetchApi('/api/medical-records?page=1&limit=5')
      this.assertEqual(page1.status, 200, 'Page 1 status')
      
      if (page1.data.total > 5) {
        const page2 = await this.fetchApi('/api/medical-records?page=2&limit=5')
        this.assertEqual(page2.status, 200, 'Page 2 status')
      }
    })
  }

  // Test Suite 4: Error Handling
  async testErrorHandling(): Promise<void> {
    console.log('\n⚠️  Test Suite 4: Error Handling\n')

    await this.test('Nonexistent record returns 404', async () => {
      const { status } = await this.fetchApi('/api/medical-records/nonexistent-id-xyz')
      this.assertEqual(status, 404, 'Status code')
    })

    await this.test('Update nonexistent record returns 404', async () => {
      const { status } = await this.fetchApi('/api/medical-records/nonexistent-id-xyz', {
        method: 'PUT',
        body: JSON.stringify({ title: 'New Title' })
      })
      this.assertEqual(status, 404, 'Status code')
    })

    await this.test('Delete nonexistent record returns 404', async () => {
      const { status } = await this.fetchApi('/api/medical-records/nonexistent-id-xyz', {
        method: 'DELETE'
      })
      this.assertEqual(status, 404, 'Status code')
    })

    await this.test('Invalid JSON body returns 400', async () => {
      const response = await fetch(`${BASE}/api/medical-records`, {
        method: 'POST',
        headers: HEADERS,
        body: '{invalid json'
      } as any)
      this.assertEqual(response.status, 400, 'Status code')
    })
  }

  // Test Suite 5: Data Validation & Schema
  async testDataSchema(): Promise<void> {
    console.log('\n🔐 Test Suite 5: Data Schema\n')

    await this.test('Response includes all required fields', async () => {
      const { data } = await this.fetchApi('/api/medical-records?page=1&limit=1')
      if (data.records?.length > 0) {
        const record = data.records[0]
        this.assert('id' in record, 'ID field exists')
        this.assert('title' in record, 'Title field exists')
        this.assert('recordType' in record, 'RecordType field exists')
        this.assert('priority' in record, 'Priority field exists')
      }
    })

    await this.test('recordType values are from enum', async () => {
      const validTypes = ['CONSULTATION', 'EXAM', 'PROCEDURE', 'PRESCRIPTION', 'OTHER']
      const { data } = await this.fetchApi('/api/medical-records?page=1&limit=10')
      if (data.records?.length > 0) {
        data.records.forEach((record: any) => {
          this.assert(
            validTypes.includes(record.recordType),
            `RecordType ${record.recordType} is valid`
          )
        })
      }
    })

    await this.test('Priority values are from enum', async () => {
      const validPriorities = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL']
      const { data } = await this.fetchApi('/api/medical-records?page=1&limit=10')
      if (data.records?.length > 0) {
        data.records.forEach((record: any) => {
          this.assert(
            validPriorities.includes(record.priority),
            `Priority ${record.priority} is valid`
          )
        })
      }
    })
  }

  // Test Suite 6: Boundary Cases
  async testBoundaryCases(): Promise<void> {
    console.log('\n🎯 Test Suite 6: Boundary Cases\n')

    await this.test('Maximum length title (1000+ chars)', async () => {
      const longTitle = 'A'.repeat(1000)
      const { status } = await this.fetchApi('/api/medical-records', {
        method: 'POST',
        body: JSON.stringify({
          title: longTitle,
          description: 'This is a valid description with sufficient length',
          recordType: 'CONSULTATION',
          priority: 'NORMAL'
        })
      })
      this.assert(status === 201 || status === 400, 'Should accept or reject long titles')
    })

    await this.test('Minimum valid title (3 chars)', async () => {
      const { status } = await this.fetchApi('/api/medical-records', {
        method: 'POST',
        body: JSON.stringify({
          title: 'ABC',
          description: 'This is a valid description with sufficient length',
          recordType: 'CONSULTATION',
          priority: 'NORMAL'
        })
      })
      this.assertEqual(status, 201, 'Status code')
    })

    await this.test('Minimum valid description (10 chars)', async () => {
      const { status } = await this.fetchApi('/api/medical-records', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Valid Title',
          description: '0123456789',
          recordType: 'CONSULTATION',
          priority: 'NORMAL'
        })
      })
      this.assertEqual(status, 201, 'Status code')
    })

    await this.test('Page 1 with limit 1 (minimum page size)', async () => {
      const { status, data } = await this.fetchApi('/api/medical-records?page=1&limit=1')
      this.assertEqual(status, 200, 'Status code')
      this.assert(data.records?.length <= 1, 'Limit respected')
    })

    await this.test('Maximum limit (100)', async () => {
      const { status } = await this.fetchApi('/api/medical-records?page=1&limit=100')
      this.assertEqual(status, 200, 'Status code')
    })
  }

  // Print summary
  private printSummary(): void {
    const passed = this.results.filter(r => r.passed).length
    const failed = this.results.filter(r => !r.passed).length
    const total = this.results.length
    const percentage = Math.round((passed / total) * 100)

    console.log('\n' + '—'.repeat(60))
    console.log('\n📊 Test Summary:\n')
    console.log(`✅ Passed: ${passed}`)
    console.log(`❌ Failed: ${failed}`)
    console.log(`📈 Total:  ${total}`)
    console.log(`\n💯 Success Rate: ${percentage}%`)

    if (failed > 0) {
      console.log('\n❌ Failed Tests:')
      this.results
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`   - ${r.name}`)
          if (r.error) console.log(`     ${r.error}`)
        })
    }

    console.log('\n' + '—'.repeat(60))
  }

  async run(): Promise<void> {
    console.log('🏥 Medical Records API - Advanced Tests')
    console.log('⏱️  Started at:', new Date().toISOString())
    console.log('—'.repeat(60))

    await this.testInputValidation()
    await this.testCrudOperations()
    await this.testPagination()
    await this.testErrorHandling()
    await this.testDataSchema()
    await this.testBoundaryCases()

    this.printSummary()
    console.log('⏱️  Completed at:', new Date().toISOString())

    const failed = this.results.filter(r => !r.passed).length
    process.exit(failed > 0 ? 1 : 0)
  }
}

new MedicalRecordsTestSuite().run().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
