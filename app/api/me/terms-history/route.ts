/**
 * API de Histórico de Aceites de Termos LGPD
 * Permite que o usuário veja todos os termos que aceitou
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

// GET - Listar histórico de termos aceitos
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

    // Buscar aceites de termos
    const [termAcceptances, totalCount] = await Promise.all([
      prisma.termAcceptance.findMany({
        where: { userId: session.user.id },
        orderBy: { acceptedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.termAcceptance.count({ where: { userId: session.user.id } })
    ])

    // Formatar para exibição
    const formattedAcceptances = termAcceptances.map(term => ({
      id: term.id,
      termo: term.termTitle || term.termSlug,
      slug: term.termSlug,
      versao: term.termVersion,
      dataAceite: term.acceptedAt,
      ip: maskIp(term.ipAddress),
      conteudo: term.termContent ? 'Disponível' : 'Não armazenado'
    }))

    // Estatísticas
    const stats = {
      totalTermosAceitos: totalCount,
      ultimoAceite: termAcceptances.length > 0 ? termAcceptances[0].acceptedAt : null,
      termoMaisRecente: termAcceptances.length > 0 ? termAcceptances[0].termTitle : null
    }

    logger.info({ userId: session.user.id, count: formattedAcceptances.length }, 'Histórico de termos consultado')

    return NextResponse.json({
      aceites: formattedAcceptances,
      paginacao: {
        pagina: page,
        limite: limit,
        total: totalCount,
        totalPaginas: Math.ceil(totalCount / limit)
      },
      estatisticas: stats,
      _info: {
        descricao: 'Histórico de termos de uso e políticas aceitas',
        baseLegal: 'Art. 18, I da LGPD - Direito de acesso',
        nota: 'Você pode revogar consentimentos específicos nas configurações de privacidade'
      }
    })

  } catch (error) {
    logger.error({ error }, 'Erro ao buscar histórico de termos')
    return NextResponse.json({ error: 'Erro ao buscar histórico' }, { status: 500 })
  }
}

function maskIp(ip: string | null): string {
  if (!ip) return 'Não registrado'
  const parts = ip.split('.')
  return parts.length === 4 ? `${parts[0]}.${parts[1]}.***.***` : '***'
}
