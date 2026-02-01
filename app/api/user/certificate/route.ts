import { withAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// GET /api/user/certificate
export const GET = withAuth(async (_req, { user }) => {
  const cert = await prisma.digitalCertificate.findFirst({
    where: { userId: user.id, isActive: true, notAfter: { gte: new Date() } },
    select: { id: true }
  })
  return NextResponse.json({ hasCertificate: !!cert })
})
