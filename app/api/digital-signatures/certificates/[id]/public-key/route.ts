import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const id = params?.id
    if (!id) return NextResponse.json({ error: 'ID não informado' }, { status: 400 })

    const cert = await prisma.digitalCertificate.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        publicKeyPem: true,
        serialNumber: true,
        certificateType: true,
      },
    })

    if (!cert) {
      return NextResponse.json({ error: 'Certificado não encontrado' }, { status: 404 })
    }

    if (session.user.role !== 'ADMIN' && cert.userId !== session.user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = cert.publicKeyPem || ''
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="public-key-${cert.serialNumber}.pem"`,
      },
    })
  } catch (error: any) {
    console.error('Erro ao baixar chave pública:', error)
    return NextResponse.json({ error: error?.message || 'Erro ao baixar chave' }, { status: 500 })
  }
}
