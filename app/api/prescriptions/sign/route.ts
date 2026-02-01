import { NextRequest, NextResponse } from 'next/server'
import { signPdfWithGotenberg } from '@/lib/pdf-signing-service'
import { withAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'

// POST /api/prescriptions/sign
// Body: { html: string, css?: string, filename?: string, password: string }
export const POST = withAuth(async (request, { user }) => {
  try {
    const { html, css, filename, password } = await request.json()
    if (!html) {
      return NextResponse.json({ error: 'HTML obrigatório' }, { status: 400 })
    }
    if (!password) {
      return NextResponse.json({ error: 'Senha do certificado obrigatória' }, { status: 400 })
    }

    // Buscar certificado digital ativo do usuário
    const userCertificate = await prisma.digitalCertificate.findFirst({
      where: { userId: user.id, isActive: true, notAfter: { gte: new Date() } },
      orderBy: { createdAt: 'desc' },
    })
    if (!userCertificate || !userCertificate.pfxFilePath) {
      return NextResponse.json({ error: 'Certificado digital A1 não configurado.' }, { status: 400 })
    }

    const pdf = await signPdfWithGotenberg({
      html,
      customCss: css,
      filename,
      certPath: userCertificate.pfxFilePath,
      certPassword: password,
    })
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
})
