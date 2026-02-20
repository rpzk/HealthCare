import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import TenantService, { PLAN_LIMITS } from '@/lib/tenant-service'
import { z } from 'zod'

// Schema de validação para criar tenant
const createTenantSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
  domain: z.string().optional(),
  plan: z.enum(['free', 'basic', 'professional', 'enterprise']).optional()
})

/**
 * GET /api/tenants - Retorna informações do tenant atual
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeStats = searchParams.get('stats') === 'true'
    const slug = searchParams.get('slug')

    // Se especificou slug, busca esse tenant
    if (slug) {
      const tenant = await TenantService.getTenantByDomainOrSlug(slug)
      if (!tenant) {
        return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 404 })
      }

      const result: Record<string, unknown> = {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        domain: tenant.domain,
        logoUrl: tenant.logoUrl,
        plan: tenant.plan,
        status: tenant.status,
        createdAt: tenant.createdAt
      }

      if (includeStats) {
        const limits = await TenantService.checkResourceLimits(tenant.id)
        result.limits = limits
        result.planLimits = PLAN_LIMITS[tenant.plan]
      }

      return NextResponse.json({ tenant: result })
    }

    // Busca tenant do usuário atual
    const tenant = await TenantService.getTenantForUser(session.user.id)
    
    if (!tenant) {
      return NextResponse.json({ 
        tenant: null,
        message: 'Operando em modo single-tenant'
      })
    }

    const result: Record<string, unknown> = {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      domain: tenant.domain,
      logoUrl: tenant.logoUrl,
      plan: tenant.plan,
      status: tenant.status,
      createdAt: tenant.createdAt
    }

    if (includeStats) {
      const limits = await TenantService.checkResourceLimits(tenant.id)
      result.limits = limits
      result.planLimits = PLAN_LIMITS[tenant.plan]
    }

    return NextResponse.json({ tenant: result })

  } catch (error) {
    console.error('Tenant fetch error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/tenants - Cria um novo tenant
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const validation = createTenantSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { name, slug, domain, plan } = validation.data

    // Verifica se slug já existe
    const existing = await TenantService.getTenantByDomainOrSlug(slug)
    if (existing && existing.id !== 'default') {
      return NextResponse.json(
        { error: 'Slug já está em uso' },
        { status: 409 }
      )
    }

    // Cria tenant
    const tenant = await TenantService.createTenant({
      name,
      slug,
      plan: plan as 'free' | 'basic' | 'professional' | 'enterprise',
      ownerId: session.user.id,
      domain
    })

    return NextResponse.json({ tenant }, { status: 201 })

  } catch (error) {
    console.error('Tenant create error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/tenants/plans - Lista planos disponíveis
 */
export async function OPTIONS() {
  return NextResponse.json({
    plans: Object.entries(PLAN_LIMITS).map(([plan, limits]) => ({
      id: plan,
      name: plan.charAt(0).toUpperCase() + plan.slice(1),
      limits
    }))
  })
}
