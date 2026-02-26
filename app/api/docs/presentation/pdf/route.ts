import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { convertHtmlToPdf } from '@/lib/pdf-signing-service'

export const dynamic = 'force-dynamic'

const PRESENTATIONS = {
  ti: {
    file: 'APRESENTACAO_TI.html',
    filename: 'HealthCare-Apresentacao-TI.pdf',
    auth: false,
    /** CSS para converter slide-at-a-time em páginas sequenciais, modo paisagem e sem margens */
    pdfCss: `
      @page {
        size: A4 landscape;
        margin: 0;
      }

      body { overflow: visible !important; }
      .slides-container { overflow: visible !important; height: auto !important; }
      .slide { display: flex !important; flex-direction: column; justify-content: center; align-items: center; page-break-after: always; min-height: 100vh !important; }
      .slide:last-child { page-break-after: auto; }
      #progress-bar, #slide-counter, #nav-hint { display: none !important; }

      body::after {
        content: '© 2026 RP HealthTech Solutions. Documento Confidencial. Todos os direitos reservados. Proibida a cópia ou distribuição sem autorização.';
        position: fixed;
        bottom: 0.5cm;
        left: 0;
        right: 0;
        text-align: center;
        font-size: 10px;
        color: #64748b;
      }
    `,
  },
  infra: {
    file: 'APRESENTACAO_INFRAESTRUTURA.html',
    filename: 'HealthCare-Apresentacao-Infraestrutura.pdf',
    auth: true,
    /** Modo paisagem, sem margens e quebra de página entre seções */
    pdfCss: `
      @page {
        size: A4 landscape;
        margin: 0;
      }

      .slide { page-break-after: always; }
      .slide:last-child { page-break-after: auto; }

      body::after {
        content: '© 2026 RP HealthTech Solutions. Documento Confidencial. Todos os direitos reservados. Proibida a cópia ou distribuição sem autorização.';
        position: fixed;
        bottom: 0.5cm;
        left: 0;
        right: 0;
        text-align: center;
        font-size: 10px;
        color: #64748b;
      }
    `,
  },
} as const

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = (searchParams.get('type') || 'ti') as keyof typeof PRESENTATIONS

    const presentation = PRESENTATIONS[type]
    if (!presentation) {
      return new NextResponse(
        JSON.stringify({ error: 'Tipo inválido. Use: ti ou infra' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (presentation.auth) {
      const session = await getServerSession(authOptions)
      if (!session?.user) {
        return new NextResponse('Não autenticado', { status: 401 })
      }
      const allowed = ['ADMIN', 'OWNER'].includes(session.user.role)
      if (!allowed) {
        return new NextResponse(
          'Acesso negado. Apenas administradores podem baixar esta apresentação.',
          { status: 403 }
        )
      }
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
      return new NextResponse(
        `Apresentação não encontrada: ${presentation.file}`,
        { status: 404 }
      )
    }

    const pdfBuffer = await convertHtmlToPdf(htmlContent, {
      customCss: presentation.pdfCss,
      marginPt: 0,
    })

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${presentation.filename}"`,
        'Cache-Control': 'private, no-cache, max-age=0',
      },
    })
  } catch (error) {
    console.error('Erro ao gerar PDF da apresentação:', error)
    const msg =
      error instanceof Error ? error.message : 'Erro interno ao gerar PDF'
    return new NextResponse(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
