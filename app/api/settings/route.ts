import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { settings, SettingCategory } from '@/lib/settings'
import { settingsQuerySchema, createSettingSchema } from '@/lib/validation-schemas-api'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const params = Object.fromEntries(searchParams.entries())
  
  // Validate query parameters
  const parseResult = settingsQuerySchema.safeParse(params)
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Parâmetros inválidos', details: parseResult.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { category } = parseResult.data
  const data = await settings.getAllByCategory(category)
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const body = await req.json()
    
    // Validate request body
    const parseResult = createSettingSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    
    const { key, value, category, description } = parseResult.data

    await settings.set(key, value, category, description)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error saving setting:', error)
    const message = error.message || 'Unknown error'
    
    // Erro específico de tabela inexistente (Postgres)
    if (message.includes('relation') && message.includes('does not exist')) {
      return NextResponse.json({ 
        success: false, 
        error: 'A tabela de configurações não foi encontrada no banco de dados. É necessário executar as migrações (deploy).' 
      }, { status: 503 })
    }

    if (message.includes('Database not ready')) {
      return NextResponse.json({ 
        success: false, 
        error: 'O cliente do banco de dados está desatualizado. É necessário reiniciar a aplicação (deploy).' 
      }, { status: 503 })
    }

    return NextResponse.json({ 
      success: false, 
      error: `Erro interno: ${message}` 
    }, { status: 500 })
  }
}
