import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

export const dynamic = 'force-dynamic'

const PRESENTATIONS = {
  ti: {
    file: 'APRESENTACAO_TI.html',
    title: 'Apresentação Técnica - TI'
  },
  medicos: {
    file: 'APRESENTACAO_MEDICOS.html',
    title: 'Apresentação para Profissionais de Saúde'
  },
  pacientes: {
    file: 'APRESENTACAO_PACIENTES.html',
    title: 'Portal do Paciente'
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'ti'
    
    const presentation = PRESENTATIONS[type as keyof typeof PRESENTATIONS]
    if (!presentation) {
      return new NextResponse('Tipo de apresentação inválido. Use: ti, medicos, ou pacientes', { status: 400 })
    }
    
    const possiblePaths = [
      join(process.cwd(), 'docs', presentation.file),
      join('/app/docs', presentation.file),
    ]
    
    let htmlContent: string | null = null
    
    for (const filePath of possiblePaths) {
      if (existsSync(filePath)) {
        htmlContent = readFileSync(filePath, 'utf-8')
        break
      }
    }
    
    if (!htmlContent) {
      return new NextResponse(`Apresentação "${presentation.title}" não encontrada`, { status: 404 })
    }
    
    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Erro ao servir apresentação:', error)
    return new NextResponse('Erro interno', { status: 500 })
  }
}
