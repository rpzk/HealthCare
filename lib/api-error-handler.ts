/**
 * API Error Handler Utilities
 * 
 * Provides type-safe error handling for API routes
 */

import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { Prisma } from '@prisma/client'

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: Record<string, any>
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    logger.warn(`API Error [${error.statusCode}]`, error, error.details)
    return NextResponse.json(
      { error: error.message, ...(error.details && { details: error.details }) },
      { status: error.statusCode }
    )
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    logger.error('Database error', error, { code: error.code })
    
    if (error.code === 'P2002') {
      const field = (error.meta?.target as string[] | undefined)?.[0]
      return NextResponse.json(
        { error: `${field} already exists` },
        { status: 409 }
      )
    }

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Record not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Database operation failed' },
      { status: 500 }
    )
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    logger.error('Database validation error', error)
    return NextResponse.json(
      { error: 'Invalid database query' },
      { status: 400 }
    )
  }

  if (error instanceof SyntaxError) {
    logger.error('JSON parse error', error)
    return NextResponse.json(
      { error: 'Invalid JSON in request body' },
      { status: 400 }
    )
  }

  if (error instanceof Error) {
    logger.error('Unhandled error', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }

  logger.error('Unknown error type', new Error('Unknown error'), { error })
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}
