import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import type { Prisma, ExternalSourceType } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Session } from 'next-auth';

interface CustomSession {
  user?: (Session['user'] & { role?: string }) | undefined
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Verificar autenticação e permissão de admin
  const session = await getServerSession(req, res, authOptions) as CustomSession | null
  if (!session?.user || session.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito a administradores' })
  }

if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  const { sourceType } = req.query
  const where: Prisma.ExternalSourceUpdateWhereInput = {}
  if (typeof sourceType === 'string') {
    where.sourceType = sourceType as ExternalSourceType
  }
  const history = await prisma.externalSourceUpdate.findMany({ where, orderBy: { startedAt: 'desc' }, take: 50 })
  res.json({ ok: true, history })
}
