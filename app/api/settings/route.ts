import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { settings, SettingCategory } from '@/lib/settings'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category') as SettingCategory

  if (category) {
    const data = await settings.getAllByCategory(category)
    return NextResponse.json(data)
  }

  return new NextResponse('Category required', { status: 400 })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const body = await req.json()
    const { key, value, category, description } = body

    if (!key || value === undefined) {
      return new NextResponse('Key and value are required', { status: 400 })
    }

    await settings.set(key, value, category, description)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving setting:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
