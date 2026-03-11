/**
 * API para gerar/obter PDF de prescrição
 * 
 * Esta rota verifica se a prescrição tem um documento assinado (SignedDocument).
 * Se tiver, retorna o PDF assinado.
 * Se não tiver, gera um PDF de visualização (sem assinatura digital).
 * 
 * O paciente e o médico podem acessar. Admin também.
 * 
 * @route GET /api/prescriptions/[id]/pdf
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { generatePrescriptionPdfBuffer } from '@/lib/prescription-pdf-helpers'
import { verifyPrescriptionShareToken } from '@/lib/prescription-share-token'
import fs from 'fs/promises'
import path from 'path'

export const runtime = 'nodejs'

/** Retorna página HTML de erro quando o cliente é um navegador (evita tela preta com JSON). */
function pdfErrorResponse(request: NextRequest, message: string, status: 401 | 403 | 404 | 500) {
  const accept = request.headers.get('accept') || ''
  const wantsHtml = accept.includes('text/html') || (!accept.includes('application/json') && !accept.includes('application/pdf'))
  if (wantsHtml) {
    const title = status === 401 ? 'Não autenticado' : status === 403 ? 'Acesso não autorizado' : status === 404 ? 'Prescrição não encontrada' : 'Erro ao carregar o documento'
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #f5f5f5; margin: 0; padding: 2rem; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #fff; padding: 2rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); max-width: 420px; text-align: center; }
    h1 { margin: 0 0 0.5rem; font-size: 1.25rem; color: #1a1a1a; }
    p { margin: 0 0 1.5rem; color: #555; font-size: 0.95rem; }
    a { color: #2563eb; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
    <p><a href="/">Voltar ao início</a></p>
  </div>
</body>
</html>`
    return new NextResponse(html, {
      status,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
  return NextResponse.json({ error: message }, { status })
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const prescriptionId = params.id
    const token = request.nextUrl.searchParams.get('token') || request.nextUrl.searchParams.get('share') || ''

    // Acesso por link compartilhado (token válido = não exige login)
    const allowedByToken = !!token && verifyPrescriptionShareToken(token, prescriptionId)

    let session: Awaited<ReturnType<typeof auth>> = null
    if (!allowedByToken) {
      session = await auth()
      if (!session?.user?.id) {
        return pdfErrorResponse(request, 'É necessário fazer login para acessar este documento.', 401)
      }
    }

    // Buscar prescrição com dados necessários
    const prescription = await prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        patient: {
          include: {
            userAccount: { select: { id: true } }
          }
        },
        doctor: {
          include: {
            person: { select: { cpf: true } }
          }
        },
        items: {
          include: {
            medication: { select: { name: true } }
          }
        }
      }
    })

    if (!prescription) {
      return pdfErrorResponse(request, 'Prescrição não encontrada.', 404)
    }

    if (!allowedByToken && session?.user) {
      const userId = session.user.id
      const userRole = session.user.role
      const isDoctor = prescription.doctorId === userId
      const isPatientUser = prescription.patient.userAccount?.id === userId
      const isAdmin = ['ADMIN', 'OWNER'].includes(userRole || '')
      if (!isDoctor && !isPatientUser && !isAdmin) {
        return pdfErrorResponse(request, 'Você não tem permissão para acessar esta prescrição.', 403)
      }
    }

    // Verificar se há documento assinado
    const signedDoc = await prisma.signedDocument.findFirst({
      where: {
        documentType: 'PRESCRIPTION',
        documentId: prescriptionId
      },
      orderBy: { signedAt: 'desc' }
    })

    // Se há PDF assinado, retorná-lo
    if (signedDoc) {
      const uploadsDir = path.join(process.cwd(), 'uploads', 'documents', 'prescription')
      const filepath = path.join(uploadsDir, `${prescriptionId}.pdf`)
      
      try {
        const pdfBuffer = await fs.readFile(filepath)
        return new NextResponse(pdfBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="receita-${prescriptionId}.pdf"`,
            'Content-Length': pdfBuffer.length.toString(),
            'Cache-Control': 'private, max-age=3600',
            'X-Document-Signed': 'true',
            'X-Signed-At': signedDoc.signedAt.toISOString(),
          }
        })
      } catch {
        // PDF não encontrado no disco, vai gerar on-demand
        logger.warn(`PDF assinado não encontrado: ${filepath}`)
      }
    }

    // Gerar PDF on-demand (sem assinatura digital) via Gotenberg
    // useStamp=true: carimbo do médico, sem QR code (QR só em prescrições assinadas digitalmente)
    const baseUrl = request.headers.get('x-forwarded-host')
      ? `https://${request.headers.get('x-forwarded-host')}`
      : request.headers.get('host')
        ? `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}`
        : ''

    const pdfBuffer = await generatePrescriptionPdfBuffer(prescription, baseUrl, { useStamp: true })

    logger.info('PDF de prescrição gerado on-demand', { prescriptionId, signed: false })

    // Converter Buffer para Uint8Array para o NextResponse
    const pdfData = new Uint8Array(pdfBuffer)

    return new NextResponse(pdfData, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="receita-${prescriptionId}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'private, no-cache',
        'X-Document-Signed': 'false',
        'X-Warning': 'Documento sem assinatura digital - apenas visualização'
      }
    })

  } catch (error) {
    logger.error('Erro ao gerar PDF de prescrição:', error)
    return pdfErrorResponse(request, 'Erro interno ao gerar o PDF. Tente novamente ou use o link de verificação.', 500)
  }
}
