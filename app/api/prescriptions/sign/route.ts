import { NextRequest, NextResponse } from 'next/server'
import { signPdfWithGotenberg } from '@/lib/pdf-signing-service'

// Exemplo: POST /api/prescriptions/sign
// Body: { html: string, css?: string, filename?: string }
export async function POST(request: NextRequest) {
  try {
    const { html, css, filename } = await request.json()
    if (!html) {
      return NextResponse.json({ error: 'HTML obrigatório' }, { status: 400 })
    }
    const pdf = await signPdfWithGotenberg({ html, customCss: css, filename })
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename || 'prescricao-assinada.pdf'}"`,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao assinar PDF' }, { status: 500 })
  }
}
