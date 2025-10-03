import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import type { Prisma, ExternalSourceType } from '@prisma/client'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  const { sourceType } = req.query
  const where: Prisma.ExternalSourceUpdateWhereInput = {}
  if (typeof sourceType === 'string') {
    where.sourceType = sourceType as ExternalSourceType
  }
  const history = await prisma.externalSourceUpdate.findMany({ where, orderBy: { startedAt: 'desc' }, take: 50 })
  res.json({ ok: true, history })
}
