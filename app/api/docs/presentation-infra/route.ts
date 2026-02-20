import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import fs from 'fs'
import path from 'path'

/**
 * GET /api/docs/presentation-infra
 * 
 * Serve a apresentação de infraestrutura (CONFIDENCIAL)
 * Acesso restrito apenas a ADMIN e OWNER
 */
export async function GET() {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return new NextResponse('Não autenticado', { status: 401 })
    }

    // Verificar se é admin ou owner
    const allowedRoles = ['ADMIN', 'OWNER']
    if (!allowedRoles.includes(session.user.role)) {
      return new NextResponse(
        'Acesso negado. Esta apresentação contém informações confidenciais e está disponível apenas para administradores.',
        { status: 403 }
      )
    }

    // Ler o arquivo HTML
    const filePath = path.join(process.cwd(), 'docs', 'APRESENTACAO_INFRAESTRUTURA.html')
    
    if (!fs.existsSync(filePath)) {
      return new NextResponse('Apresentação não encontrada', { status: 404 })
    }

    const htmlContent = fs.readFileSync(filePath, 'utf-8')

    // Registrar acesso no log de auditoria
    console.log(`[AUDIT] Apresentação de infraestrutura acessada por: ${session.user.email} (${session.user.role})`)

    // Retornar HTML
    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    })
  } catch (error) {
    console.error('Erro ao servir apresentação de infraestrutura:', error)
    return new NextResponse('Erro ao carregar apresentação', { status: 500 })
  }
}
