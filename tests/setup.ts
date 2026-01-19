/**
 * Vitest Setup File
 * 
 * Configures global test environment setup
 */

import { beforeAll, afterEach, vi } from 'vitest'

// Setup environment variables for tests
beforeAll(() => {
  process.env.NODE_ENV = 'test'
  process.env.AI_QUEUE_FORCE_MEMORY = 'true'
  process.env.RATE_LIMITER_FORCE_MEMORY = 'true'
})

// Clear all mocks after each test
afterEach(() => {
  vi.clearAllMocks()
})

// Mock window for tests
global.window = {
  crypto: {
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256)
      }
      return arr
    }
  }
} as any

// Mock fetch for tests
if (!global.fetch) {
  global.fetch = vi.fn()
}
