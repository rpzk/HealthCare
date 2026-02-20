import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const body = await req.json()
    const {
      name,
      address,
      number,
      complement,
      neighborhood,
      city,
      state,
      zipCode,
      microArea,
      familyType
    } = body

    const household = await prisma.household.create({
      data: {
        name,
        address,
        number,
        complement,
        neighborhood,
        city,
        state,
        zipCode,
        microArea,
        familyType
      }
    })

    return NextResponse.json(household)
  } catch (error) {
    logger.error('[HOUSEHOLD_CREATE]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
