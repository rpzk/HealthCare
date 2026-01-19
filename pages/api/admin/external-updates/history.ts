import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  const { sourceType } = req.query
  const where: any = {}
  if (sourceType) where.sourceType = sourceType
  const history = await (prisma as any).externalSourceUpdate.findMany({ where, orderBy: { startedAt: 'desc' }, take: 50 })
  res.json({ ok: true, history })
}
