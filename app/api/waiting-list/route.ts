import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const WAITING_LIST_ALLOWED_ROLES = [
  'ADMIN',
  'DOCTOR',
  'NURSE',
  'RECEPTIONIST',
  'PHYSIOTHERAPIST',
  'PSYCHOLOGIST',
  'HEALTH_AGENT',
  'TECHNICIAN',
  'PHARMACIST',
  'DENTIST',
  'NUTRITIONIST',
  'SOCIAL_WORKER',
  'OTHER',
]

// GET /api/waiting-list
// Clinician view of waiting list items.
export const GET = withAuth(async (_request, { user }) => {
  const where = user.role === 'ADMIN' ? {} : { doctorId: user.id }

  const items = await prisma.waitingList.findMany({
    where,
    orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
    take: 50,
    include: {
      patient: {
        select: {
          id: true,
          name: true,
          cpf: true,
          phone: true,
          email: true,
        },
      },
      doctor: {
        select: {
          id: true,
          name: true,
          role: true,
          speciality: true,
        },
      },
    },
  })

  return NextResponse.json({ success: true, items })
}, { requireRole: WAITING_LIST_ALLOWED_ROLES })
