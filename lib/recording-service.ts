/**
 * Recording Service - Gerenciamento de gravações de teleconsultas
 * Usa modelo TelemedicineRecording do Prisma
 */

import prisma from '@/lib/prisma'
import { StorageService } from './storage-service'
import { auditLogger, AuditAction } from './audit-logger'

export interface RecordingMetadata {
  consultationId: string
  duration: number
  fileSize: number
  format: string
  resolution?: string
  startedAt: Date
  endedAt: Date
}

export class RecordingService {
  /**
   * Criar nova gravação
   */
  static async createRecording(
    videoBlob: Buffer,
    metadata: RecordingMetadata,
    userId: string
  ) {
    // 1. Buscar consulta
    const consultation = await prisma.consultation.findUnique({
      where: { id: metadata.consultationId },
      include: {
        patient: true,
        doctor: true,
      },
    })

    if (!consultation) {
      throw new Error('Consulta não encontrada')
    }

    // 2. Upload do vídeo
    const filename = `consultation-${metadata.consultationId}-${Date.now()}.${metadata.format}`
    const uploadResult = await StorageService.uploadRecording(videoBlob, {
      filename,
      contentType: `video/${metadata.format}`,
      encrypt: true,
      metadata: {
        consultationId: metadata.consultationId,
        patientId: consultation.patientId,
        doctorId: consultation.doctorId,
        duration: metadata.duration.toString(),
      },
    })

    // 3. Criar registro no banco
    const recording = await prisma.telemedicineRecording.create({
      data: {
        consultationId: metadata.consultationId,
        doctorId: consultation.doctorId,
        patientId: consultation.patientId,
        status: 'COMPLETED',
        startedAt: metadata.startedAt,
        endedAt: metadata.endedAt,
        duration: metadata.duration,
        filePath: uploadResult.key,
        fileName: filename,
        fileSize: uploadResult.size,
        fileHash: uploadResult.key,
        format: metadata.format,
        patientConsent: true,
        consentTimestamp: new Date(),
      },
    })

    // 4. Log de auditoria
    auditLogger.log(
      userId,
      consultation.doctor.email,
      consultation.doctor.role,
      'CONSULTATION_CREATE' as any,
      'TelemedicineRecording',
      {
        details: {
          recordingId: recording.id,
          consultationId: metadata.consultationId,
          duration: metadata.duration,
          fileSize: uploadResult.size,
        },
        success: true,
      }
    )

    return {
      id: recording.id,
      storageKey: uploadResult.key,
      duration: metadata.duration,
      fileSize: uploadResult.size,
      createdAt: recording.createdAt,
    }
  }

  /**
   * Obter URL assinada para reprodução
   */
  static async getRecordingUrl(recordingId: string, userId: string, userRole: string) {
    const recording = await prisma.telemedicineRecording.findUnique({
      where: { id: recordingId },
      include: {
        consultation: true,
      },
    })

    if (!recording || recording.deletedAt) {
      throw new Error('Gravação não encontrada')
    }

    // Verificar permissões
    const hasAccess =
      recording.doctorId === userId ||
      recording.patientId === userId ||
      userRole === 'ADMIN'

    if (!hasAccess) {
      throw new Error('Acesso negado')
    }

    // Gerar URL assinada
    if (!recording.filePath) {
      throw new Error('Arquivo não disponível')
    }

    const url = await StorageService.getSignedRecordingUrl(recording.filePath)

    return url
  }

  /**
   * Listar gravações de uma consulta
   */
  static async listConsultationRecordings(consultationId: string) {
    const recordings = await prisma.telemedicineRecording.findMany({
      where: {
        consultationId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return recordings.map((r) => ({
      id: r.id,
      duration: r.duration,
      fileSize: r.fileSize,
      format: r.format,
      createdAt: r.createdAt,
    }))
  }

  /**
   * Excluir gravação (soft delete)
   */
  static async deleteRecording(recordingId: string, userId: string, userRole: string) {
    const recording = await prisma.telemedicineRecording.findUnique({
      where: { id: recordingId },
    })

    if (!recording) {
      throw new Error('Gravação não encontrada')
    }

    // Apenas médico ou admin pode excluir
    const canDelete = recording.doctorId === userId || userRole === 'ADMIN'

    if (!canDelete) {
      throw new Error('Acesso negado')
    }

    await prisma.telemedicineRecording.update({
      where: { id: recordingId },
      data: {
        deletedAt: new Date(),
      },
    })

    return { success: true }
  }

  /**
   * Obter estatísticas de gravações
   */
  static async getRecordingStats(doctorId?: string) {
    const where = doctorId ? { doctorId, deletedAt: null } : { deletedAt: null }

    const recordings = await prisma.telemedicineRecording.findMany({
      where,
      select: {
        duration: true,
        fileSize: true,
        format: true,
      },
    })

    const totalDuration = recordings.reduce((sum, r) => sum + (r.duration || 0), 0)
    const totalSize = recordings.reduce((sum, r) => sum + (r.fileSize || 0), 0)

    const formatDistribution = recordings.reduce((acc, r) => {
      acc[r.format] = (acc[r.format] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      totalRecordings: recordings.length,
      totalDuration,
      totalSize,
      averageDuration: recordings.length > 0 ? Math.round(totalDuration / recordings.length) : 0,
      averageSize: recordings.length > 0 ? Math.round(totalSize / recordings.length) : 0,
      formatDistribution,
    }
  }
}
