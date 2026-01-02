import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import forge from 'node-forge'
import crypto from 'crypto'

/**
 * POST /api/certificates/upload-a1
 * 
 * Upload de certificado A1 (.pfx) do médico
 * 
 * Body (multipart/form-data):
 * - file: arquivo .pfx
 * - password: senha do certificado
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const password = formData.get('password') as string

    if (!file || !password) {
      return NextResponse.json(
        { error: 'Arquivo .pfx e senha são obrigatórios' },
        { status: 400 }
      )
    }

    // Validar extensão
    if (!file.name.endsWith('.pfx') && !file.name.endsWith('.p12')) {
      return NextResponse.json(
        { error: 'Apenas arquivos .pfx ou .p12 são aceitos' },
        { status: 400 }
      )
    }

    // Ler arquivo
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Validar certificado e extrair informações
    let certificateInfo
    try {
      const pfxBase64 = buffer.toString('base64')
      const pfxAsn1 = forge.util.decode64(pfxBase64)
      const asn1 = forge.asn1.fromDer(pfxAsn1)
      const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, password)
      
      // Obter certificado
      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[
        forge.pki.oids.certBag
      ]
      
      if (!certBags || certBags.length === 0) {
        throw new Error('Certificado não encontrado no arquivo')
      }
      
      const certificate = certBags[0].cert
      if (!certificate) {
        throw new Error('Certificado inválido')
      }
      
      // Verificar validade
      const now = new Date()
      if (now < certificate.validity.notBefore || now > certificate.validity.notAfter) {
        return NextResponse.json(
          { error: 'Certificado expirado ou ainda não válido' },
          { status: 400 }
        )
      }
      
      // Extrair informações
      const subject = certificate.subject.attributes
        .map((attr: any) => `${attr.shortName}=${attr.value}`)
        .join(', ')
      
      const issuer = certificate.issuer.attributes
        .map((attr: any) => `${attr.shortName}=${attr.value}`)
        .join(', ')
      
      // Certificado em PEM
      const certPem = forge.pki.certificateToPem(certificate)
      
      // Chave pública em PEM
      const publicKeyPem = forge.pki.publicKeyToPem(certificate.publicKey)
      
      certificateInfo = {
        subject,
        issuer,
        serialNumber: certificate.serialNumber,
        notBefore: certificate.validity.notBefore,
        notAfter: certificate.validity.notAfter,
        certPem,
        publicKeyPem,
      }
      
    } catch (error) {
      console.error('Erro ao validar certificado:', error)
      return NextResponse.json(
        {
          error: 'Erro ao processar certificado',
          details: error instanceof Error ? error.message : 'Senha incorreta ou arquivo inválido',
        },
        { status: 400 }
      )
    }

    // Salvar arquivo .pfx no servidor (usar volume persistente /uploads)
    const uploadsDir = path.join(process.cwd(), 'uploads', 'certificates')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }
    
    const fileName = `${session.user.id}_${Date.now()}.pfx`
    const filePath = path.join(uploadsDir, fileName)
    await writeFile(filePath, buffer)

    // Hash da senha (para validação futura)
    const passwordHash = crypto
      .createHash('sha256')
      .update(password)
      .digest('hex')

    // Desativar certificados antigos do usuário
    await prisma.digitalCertificate.updateMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    })

    // Salvar no banco de dados
    const cert = await prisma.digitalCertificate.create({
      data: {
        userId: session.user.id,
        certificateType: 'A1',
        issuer: certificateInfo.issuer,
        subject: certificateInfo.subject,
        serialNumber: certificateInfo.serialNumber,
        notBefore: certificateInfo.notBefore,
        notAfter: certificateInfo.notAfter,
        certificatePem: certificateInfo.certPem,
        publicKeyPem: certificateInfo.publicKeyPem,
        pfxFilePath: filePath,
        pfxPasswordHash: passwordHash,
        isHardwareToken: false,
        isActive: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Certificado carregado com sucesso',
      certificate: {
        id: cert.id,
        subject: cert.subject,
        issuer: cert.issuer,
        validFrom: cert.notBefore,
        validTo: cert.notAfter,
        serialNumber: cert.serialNumber,
      },
    })

  } catch (error) {
    console.error('[Upload A1] Erro:', error)
    return NextResponse.json(
      {
        error: 'Erro ao fazer upload do certificado',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/certificates/upload-a1
 * 
 * Lista certificados do usuário
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const certificates = await prisma.digitalCertificate.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
        certificateType: true,
        subject: true,
        issuer: true,
        serialNumber: true,
        notBefore: true,
        notAfter: true,
        isActive: true,
        lastUsedAt: true,
        usageCount: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ certificates })

  } catch (error) {
    console.error('[List Certificates] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao listar certificados' },
      { status: 500 }
    )
  }
}
