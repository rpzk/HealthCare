/**
 * API de Rotação de Chaves de Criptografia
 * 
 * Conformidade:
 * - NIST SP 800-57 - Recomendações de Gerenciamento de Chaves
 * - PCI DSS - Requisitos de rotação periódica
 * - LGPD Art. 46 - Medidas de segurança
 * 
 * Funcionalidades:
 * - Listar versões de chave ativas
 * - Iniciar rotação de campos criptografados
 * - Monitorar progresso de rotação
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  listKeyVersions,
  needsKeyRotation,
  rotateEncryption,
  generateKeyHash,
  decryptField,
  encryptField
} from '@/lib/encryption'

/**
 * GET - Estatísticas de criptografia e chaves
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const url = new URL(req.url)
    const type = url.searchParams.get('type')

    if (type === 'versions') {
      // Listar versões de chave
      const versions = listKeyVersions()
      
      // Buscar histórico do banco
      const dbVersions = await prisma.encryptionKeyVersion.findMany({
        orderBy: { version: 'desc' },
        include: {
          rotatedBy: {
            select: { id: true, name: true }
          }
        }
      })

      return NextResponse.json({
        memoryVersions: versions,
        databaseVersions: dbVersions
      })
    }

    if (type === 'status') {
      // Estatísticas de campos criptografados
      const [
        totalPatients,
        encryptedCPFs,
        totalRecords,
        recordsWithEncryptedDiagnosis
      ] = await Promise.all([
        prisma.patient.count(),
        prisma.patient.count({
          where: {
            cpf: {
              startsWith: 'enc::'
            }
          }
        }),
        prisma.medicalRecord.count({ where: { deletedAt: null } }),
        prisma.medicalRecord.count({
          where: {
            deletedAt: null,
            encryptedDiagnosis: {
              not: null
            }
          }
        })
      ])

      return NextResponse.json({
        statistics: {
          patients: {
            total: totalPatients,
            withEncryptedCPF: encryptedCPFs,
            percentEncrypted: totalPatients > 0 
              ? Math.round((encryptedCPFs / totalPatients) * 100) 
              : 0
          },
          medicalRecords: {
            total: totalRecords,
            withEncryptedDiagnosis: recordsWithEncryptedDiagnosis,
            percentEncrypted: totalRecords > 0 
              ? Math.round((recordsWithEncryptedDiagnosis / totalRecords) * 100) 
              : 0
          }
        },
        activeKeyVersion: listKeyVersions().find(v => v.status === 'ACTIVE')?.version || 'v1',
        lastRotation: await getLastRotationDate()
      })
    }

    // Padrão: resumo geral
    const versions = listKeyVersions()
    const activeVersion = versions.find(v => v.status === 'ACTIVE')

    return NextResponse.json({
      currentVersion: activeVersion?.version || 'v1',
      availableVersions: versions.length,
      rotationStatus: 'IDLE'
    })

  } catch (error) {
    console.error('[KeyRotation API] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar informações de chave' },
      { status: 500 }
    )
  }
}

/**
 * POST - Executar ações de rotação
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await req.json()
    const action = body.action as string

    if (action === 'register_version') {
      // Registrar nova versão de chave no banco
      const { version, algorithm } = body

      if (!version || !version.match(/^v\d+$/)) {
        return NextResponse.json(
          { error: 'Versão inválida. Use formato v1, v2, etc.' },
          { status: 400 }
        )
      }

      // Verificar se versão já existe
      const existing = await prisma.encryptionKeyVersion.findUnique({
        where: { keyIdentifier: version }
      })

      if (existing) {
        return NextResponse.json(
          { error: 'Versão já registrada' },
          { status: 409 }
        )
      }

      // Verificar se a chave está configurada no ambiente
      const memoryVersions = listKeyVersions()
      const memoryVersion = memoryVersions.find(v => v.version === version)

      if (!memoryVersion) {
        return NextResponse.json(
          { error: `Chave ${version} não encontrada no ambiente. Configure ENCRYPTION_KEY_${version.toUpperCase()}.` },
          { status: 400 }
        )
      }

      const keyVersion = await prisma.encryptionKeyVersion.create({
        data: {
          keyIdentifier: version,
          version: parseInt(version.replace('v', '')),
          status: 'ACTIVE',
          keyHash: memoryVersion.hashPrefix,
          algorithm: algorithm || 'aes-256-gcm',
          rotatedById: session.user.id
        }
      })

      // Log de auditoria
      await prisma.auditLog.create({
        data: {
          action: 'REGISTER_KEY_VERSION',
          resourceType: 'EncryptionKeyVersion',
          resourceId: keyVersion.id,
          userId: session.user.id,
          userEmail: session.user.email || '',
          userRole: session.user.role || 'ADMIN',
          metadata: { version }
        }
      })

      return NextResponse.json({ keyVersion }, { status: 201 })
    }

    if (action === 'rotate_patients') {
      // Rotacionar campos de pacientes
      const batchSize = body.batchSize || 100
      const targetVersion = body.targetVersion

      const patients = await prisma.patient.findMany({
        where: {
          cpf: {
            startsWith: 'enc::'
          }
        },
        select: {
          id: true,
          cpf: true,
          allergies: true,
          medicalHistory: true
        },
        take: batchSize
      })

      let rotated = 0
      let errors = 0

      for (const patient of patients) {
        try {
          const updates: any = {}

          // Rotacionar CPF se necessário
          if (patient.cpf && needsKeyRotation(patient.cpf, targetVersion)) {
            const rotatedCPF = rotateEncryption(patient.cpf)
            if (rotatedCPF) {
              updates.cpf = rotatedCPF
            }
          }

          // Rotacionar allergies se criptografado
          if (patient.allergies?.startsWith('enc')) {
            const rotatedAllergies = rotateEncryption(patient.allergies)
            if (rotatedAllergies) {
              updates.allergies = rotatedAllergies
            }
          }

          // Rotacionar medicalHistory se criptografado
          if (patient.medicalHistory?.startsWith('enc')) {
            const rotatedHistory = rotateEncryption(patient.medicalHistory)
            if (rotatedHistory) {
              updates.medicalHistory = rotatedHistory
            }
          }

          if (Object.keys(updates).length > 0) {
            await prisma.patient.update({
              where: { id: patient.id },
              data: updates
            })
            rotated++
          }
        } catch (err) {
          console.error(`Erro ao rotacionar paciente ${patient.id}:`, err)
          errors++
        }
      }

      // Log de auditoria
      await prisma.auditLog.create({
        data: {
          action: 'ROTATE_PATIENT_ENCRYPTION',
          resourceType: 'Patient',
          resourceId: 'batch',
          userId: session.user.id,
          userEmail: session.user.email || '',
          userRole: session.user.role || 'ADMIN',
          metadata: {
            batchSize,
            targetVersion,
            rotated,
            errors,
            remaining: patients.length - rotated - errors
          }
        }
      })

      return NextResponse.json({
        message: 'Rotação de pacientes executada',
        rotated,
        errors,
        processedBatch: patients.length
      })
    }

    if (action === 'rotate_records') {
      // Rotacionar campos de prontuários
      const batchSize = body.batchSize || 100
      const targetVersion = body.targetVersion

      const records = await prisma.medicalRecord.findMany({
        where: {
          deletedAt: null,
          OR: [
            { encryptedDiagnosis: { startsWith: 'enc' } },
            { encryptedTreatment: { startsWith: 'enc' } },
            { encryptedNotes: { startsWith: 'enc' } }
          ]
        },
        select: {
          id: true,
          encryptedDiagnosis: true,
          encryptedTreatment: true,
          encryptedNotes: true,
          encryptionKeyVersion: true
        },
        take: batchSize
      })

      let rotated = 0
      let errors = 0

      for (const record of records) {
        try {
          const updates: any = { encryptionKeyVersion: targetVersion || 'v1' }
          let hasUpdates = false

          if (record.encryptedDiagnosis && needsKeyRotation(record.encryptedDiagnosis, targetVersion)) {
            const rotatedValue = rotateEncryption(record.encryptedDiagnosis)
            if (rotatedValue) {
              updates.encryptedDiagnosis = rotatedValue
              hasUpdates = true
            }
          }

          if (record.encryptedTreatment && needsKeyRotation(record.encryptedTreatment, targetVersion)) {
            const rotatedValue = rotateEncryption(record.encryptedTreatment)
            if (rotatedValue) {
              updates.encryptedTreatment = rotatedValue
              hasUpdates = true
            }
          }

          if (record.encryptedNotes && needsKeyRotation(record.encryptedNotes, targetVersion)) {
            const rotatedValue = rotateEncryption(record.encryptedNotes)
            if (rotatedValue) {
              updates.encryptedNotes = rotatedValue
              hasUpdates = true
            }
          }

          if (hasUpdates) {
            await prisma.medicalRecord.update({
              where: { id: record.id },
              data: updates
            })
            rotated++
          }
        } catch (err) {
          console.error(`Erro ao rotacionar prontuário ${record.id}:`, err)
          errors++
        }
      }

      // Log de auditoria
      await prisma.auditLog.create({
        data: {
          action: 'ROTATE_RECORD_ENCRYPTION',
          resourceType: 'MedicalRecord',
          resourceId: 'batch',
          userId: session.user.id,
          userEmail: session.user.email || '',
          userRole: session.user.role || 'ADMIN',
          metadata: {
            batchSize,
            targetVersion,
            rotated,
            errors
          }
        }
      })

      return NextResponse.json({
        message: 'Rotação de prontuários executada',
        rotated,
        errors,
        processedBatch: records.length
      })
    }

    if (action === 'deprecate_version') {
      // Marcar versão como apenas descriptografia
      const { version } = body

      if (!version) {
        return NextResponse.json({ error: 'Versão obrigatória' }, { status: 400 })
      }

      const keyVersion = await prisma.encryptionKeyVersion.update({
        where: { keyIdentifier: version },
        data: {
          status: 'DECRYPT_ONLY',
          rotatedAt: new Date(),
          rotatedById: session.user.id,
          rotationReason: body.reason || 'Rotação periódica de segurança'
        }
      })

      // Log de auditoria
      await prisma.auditLog.create({
        data: {
          action: 'DEPRECATE_KEY_VERSION',
          resourceType: 'EncryptionKeyVersion',
          resourceId: keyVersion.id,
          userId: session.user.id,
          userEmail: session.user.email || '',
          userRole: session.user.role || 'ADMIN',
          metadata: { version, reason: body.reason }
        }
      })

      return NextResponse.json({ keyVersion })
    }

    return NextResponse.json({ error: 'Ação não reconhecida' }, { status: 400 })

  } catch (error) {
    console.error('[KeyRotation API] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao processar requisição' },
      { status: 500 }
    )
  }
}

/**
 * Helper: Obter data da última rotação
 */
async function getLastRotationDate(): Promise<Date | null> {
  const lastRotation = await prisma.encryptionKeyVersion.findFirst({
    where: {
      rotatedAt: { not: null }
    },
    orderBy: { rotatedAt: 'desc' },
    select: { rotatedAt: true }
  })

  return lastRotation?.rotatedAt || null
}
