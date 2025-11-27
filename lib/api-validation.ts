/**
 * API Request Validation Helper
 * Padroniza validação de entrada em todas as APIs
 */

import { NextRequest, NextResponse } from 'next/server'
import { z, ZodSchema, ZodError } from 'zod'

export interface ValidationResult<T> {
  success: boolean
  data?: T
  error?: NextResponse
}

/**
 * Valida o body de uma requisição usando um schema Zod
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json()
    const result = schema.safeParse(body)
    
    if (!result.success) {
      return {
        success: false,
        error: NextResponse.json(
          { 
            error: 'Dados inválidos',
            details: formatZodErrors(result.error)
          },
          { status: 400 }
        )
      }
    }
    
    return { success: true, data: result.data }
  } catch (e) {
    return {
      success: false,
      error: NextResponse.json(
        { error: 'JSON inválido no corpo da requisição' },
        { status: 400 }
      )
    }
  }
}

/**
 * Valida query params usando um schema Zod
 */
export function validateQueryParams<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): ValidationResult<T> {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries())
  const result = schema.safeParse(params)
  
  if (!result.success) {
    return {
      success: false,
      error: NextResponse.json(
        { 
          error: 'Parâmetros inválidos',
          details: formatZodErrors(result.error)
        },
        { status: 400 }
      )
    }
  }
  
  return { success: true, data: result.data }
}

/**
 * Formata erros do Zod para resposta amigável
 */
function formatZodErrors(error: ZodError): Record<string, string[]> {
  const errors: Record<string, string[]> = {}
  
  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_root'
    if (!errors[path]) {
      errors[path] = []
    }
    errors[path].push(issue.message)
  }
  
  return errors
}

/**
 * Wrapper para handlers de API com validação automática
 */
export function withValidation<TBody, TQuery = unknown>(
  handler: (
    request: NextRequest,
    validatedData: { body?: TBody; query?: TQuery }
  ) => Promise<NextResponse>,
  options?: {
    bodySchema?: ZodSchema<TBody>
    querySchema?: ZodSchema<TQuery>
  }
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const validatedData: { body?: TBody; query?: TQuery } = {}
    
    // Validate body if schema provided
    if (options?.bodySchema && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const bodyResult = await validateRequestBody(request, options.bodySchema)
      if (!bodyResult.success) {
        return bodyResult.error!
      }
      validatedData.body = bodyResult.data
    }
    
    // Validate query if schema provided
    if (options?.querySchema) {
      const queryResult = validateQueryParams(request, options.querySchema)
      if (!queryResult.success) {
        return queryResult.error!
      }
      validatedData.query = queryResult.data
    }
    
    return handler(request, validatedData)
  }
}

// Common validation schemas for reuse
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export const idParamSchema = z.object({
  id: z.string().cuid('ID inválido'),
})

export const searchSchema = z.object({
  q: z.string().min(1, 'Termo de busca obrigatório').max(100, 'Termo muito longo'),
  limit: z.coerce.number().int().min(1).max(50).default(10),
})

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).refine(
  data => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate)
    }
    return true
  },
  { message: 'Data inicial deve ser anterior à data final' }
)
