import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    return NextResponse.json({
      message: 'Prisma import successful',
      prismaVersion: 'loaded',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      error: String(error),
      message: 'Failed to load Prisma'
    }, { status: 500 })
  }
}
