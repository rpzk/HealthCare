import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'
import fs from 'fs/promises'

export const runtime = 'nodejs'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const id = params?.id
    if (!id) {
      return NextResponse.json({ error: 'ID não informado' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const { isActive, revokeReason } = body ?? {}

    const cert = await prisma.digitalCertificate.findUnique({ where: { id } })
    if (!cert) {
      return NextResponse.json({ error: 'Certificado não encontrado' }, { status: 404 })
    }

    // Somente admin ou dono do certificado pode alterar
    if (session.user.role !== 'ADMIN' && cert.userId !== session.user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const updates: any = {}
    if (typeof isActive === 'boolean') {
      updates.isActive = isActive
      if (!isActive) {
        updates.revokedAt = new Date()
        updates.revokedReason = revokeReason || 'Desativado manualmente'
      } else {
        updates.revokedAt = null
        updates.revokedReason = null
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nenhuma alteração informada' }, { status: 400 })
    }

    const updated = await prisma.digitalCertificate.update({
      where: { id },
      data: updates,
      select: {
        id: true,
        userId: true,
        certificateType: true,
        issuer: true,
        subject: true,
        serialNumber: true,
        notBefore: true,
        notAfter: true,
        isActive: true,
        revokedAt: true,
        revokedReason: true,
        updatedAt: true,
      }
    })

    return NextResponse.json({ success: true, certificate: updated })
  } catch (error: any) {
    logger.error('Erro ao atualizar certificado digital:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao atualizar certificado' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/digital-signatures/certificates/[id]
 * Desativa o certificado e remove o arquivo .pfx do disco (o registro permanece para histórico).
 * Médico: apenas seus certificados. Admin: qualquer certificado.
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const id = params?.id
    if (!id) {
      return NextResponse.json({ error: 'ID não informado' }, { status: 400 })
    }

    const cert = await prisma.digitalCertificate.findUnique({ where: { id } })
    if (!cert) {
      return NextResponse.json({ error: 'Certificado não encontrado' }, { status: 404 })
    }

    const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'OWNER'
    if (!isAdmin && cert.userId !== session.user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    let pfxPath: string | null = cert.pfxFilePath
    if (pfxPath) {
      try {
        await fs.unlink(pfxPath)
        logger.info('[DigitalCertificate] Arquivo .pfx removido', { id, path: pfxPath })
      } catch (unlinkErr: any) {
        if (unlinkErr?.code !== 'ENOENT') {
          logger.warn('[DigitalCertificate] Erro ao remover .pfx (ignorado)', { id, err: unlinkErr?.message })
        }
      }
    }

    await prisma.digitalCertificate.update({
      where: { id },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokedReason: 'Removido pelo usuário',
        pfxFilePath: null,
        pfxPasswordHash: null,
      },
    })

    return NextResponse.json({ success: true, message: 'Certificado removido' })
  } catch (error: any) {
    logger.error('Erro ao remover certificado digital:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao remover certificado' },
      { status: 500 }
    )
  }
}
