/**
 * API request/response types
 */

import { z } from 'zod'

export type ApiResponse<T = any> = {
  success: boolean
  data?: T
  error?: string
  message?: string
  meta?: {
    page?: number
    limit?: number
    total?: number
    hasMore?: boolean
  }
}

export type ApiErrorResponse = {
  error: string
  message?: string
  statusCode: number
  timestamp: string
}

export interface PaginationParams {
  page?: number
  limit?: number
  skip?: number
  take?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface ApiRequestContext {
  userId: string
  userRole: string
  sessionId: string
  timestamp: string
}

export type ValidationError = {
  field: string
  message: string
  code: string
}

export interface ValidationResult<T> {
  success: boolean
  data?: T
  errors?: ValidationError[]
}
