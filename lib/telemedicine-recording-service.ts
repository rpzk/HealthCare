/**
 * Telemedicine Recording Service
 * 
 * Gerencia gravações de teleconsultas com armazenamento seguro,
 * controle de acesso e conformidade LGPD.
 */

import { prisma } from '@/lib/prisma'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

export interface RecordingMetadata {
  consultationId: string
  doctorId: string
  patientId: string
  duration: number
  fileSize: number
  format: string
  patientConsent: boolean
}

export interface RecordingChunk {
  data: Buffer
  timestamp: number
  sequenceNumber: number
}

export class TelemedicineRecordingService {
  private static UPLOAD_DIR = process.env.RECORDINGS_PATH || './uploads/recordings'
  private static MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024 // 2GB
  private static ALLOWED_FORMATS = ['webm', 'mp4', 'mkv']

  /**
   * Inicializa serviço de gravação
   */
  static async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.UPLOAD_DIR, { recursive: true })
      console.log('[Recording] Diretório de gravações criado:', this.UPLOAD_DIR)
    } catch (error) {
      console.error('[Recording] Erro ao criar diretório:', error)
      throw error
    }
  }

  /**
   * Inicia uma nova gravação
   */
  static async startRecording(
    consultationId: string,
    patientConsent: boolean
  ): Promise<string> {
    if (!patientConsent) {
      throw new Error('Gravação requer consentimento do paciente')
    }

    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
      include: { patient: true, doctor: true }
    })

    if (!consultation) {
      throw new Error('Consulta não encontrada')
    }

    // Verificar se já existe gravação ativa
    const existingRecording = await prisma.telemedicineRecording.findFirst({
      where: {
        consultationId,
        status: 'RECORDING'
      }
    })

    if (existingRecording) {
      return existingRecording.id
    }

    // Criar registro de gravação
    const recording = await prisma.telemedicineRecording.create({
      data: {
        consultationId,
        doctorId: consultation.doctorId,
        patientId: consultation.patientId,
        status: 'RECORDING',
        startedAt: new Date(),
        patientConsent: true,
        consentTimestamp: new Date(),
        format: 'webm'
      }
    })

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        userId: consultation.doctorId,
        userEmail: '', // TODO: get from user
        userRole: 'DOCTOR',
        action: 'RECORDING_STARTED',
        resourceType: 'TelemedicineRecording',
        resourceId: recording.id,
        metadata: {
          consultationId,
          patientId: consultation.patientId,
          patientConsent: true
        }
      }
    })

    return recording.id
  }

  /**
   * Salva chunk de gravação
   */
  static async saveRecordingChunk(
    recordingId: string,
    chunk: Buffer,
    sequenceNumber: number
  ): Promise<void> {
    const recording = await prisma.telemedicineRecording.findUnique({
      where: { id: recordingId }
    })

    if (!recording || recording.status !== 'RECORDING') {
      throw new Error('Gravação não encontrada ou não ativa')
    }

    // Criar diretório temporário para chunks
    const tempDir = path.join(this.UPLOAD_DIR, 'temp', recordingId)
    await fs.mkdir(tempDir, { recursive: true })

    // Salvar chunk
    const chunkPath = path.join(tempDir, `chunk-${sequenceNumber.toString().padStart(6, '0')}.webm`)
    await fs.writeFile(chunkPath, chunk)
  }

  /**
   * Finaliza gravação e concatena chunks
   */
  static async stopRecording(
    recordingId: string,
    duration: number
  ): Promise<string> {
    const recording = await prisma.telemedicineRecording.findUnique({
      where: { id: recordingId }
    })

    if (!recording) {
      throw new Error('Gravação não encontrada')
    }

    const tempDir = path.join(this.UPLOAD_DIR, 'temp', recordingId)
    const finalFileName = `recording-${recordingId}-${Date.now()}.webm`
    const finalPath = path.join(this.UPLOAD_DIR, finalFileName)

    try {
      // Listar e ordenar chunks
      const files = await fs.readdir(tempDir)
      const chunks = files
        .filter(f => f.startsWith('chunk-'))
        .sort()

      // Concatenar chunks em arquivo final
      const writeStream = await fs.open(finalPath, 'w')
      
      for (const chunk of chunks) {
        const chunkPath = path.join(tempDir, chunk)
        const data = await fs.readFile(chunkPath)
        await writeStream.write(data)
      }

      await writeStream.close()

      // Obter tamanho do arquivo
      const stats = await fs.stat(finalPath)
      const fileSize = stats.size

      if (fileSize > this.MAX_FILE_SIZE) {
        throw new Error('Arquivo de gravação excede tamanho máximo permitido')
      }

      // Gerar hash para integridade
      const fileHash = await this.generateFileHash(finalPath)

      // Atualizar registro
      const updatedRecording = await prisma.telemedicineRecording.update({
        where: { id: recordingId },
        data: {
          status: 'COMPLETED',
          endedAt: new Date(),
          duration,
          filePath: finalPath,
          fileName: finalFileName,
          fileSize,
          fileHash
        }
      })

      // Limpar chunks temporários
      await fs.rm(tempDir, { recursive: true, force: true })

      // Log de auditoria
      await prisma.auditLog.create({
        data: {
          userId: recording.doctorId,
          userEmail: '',
          userRole: 'DOCTOR',
          action: 'RECORDING_COMPLETED',
          resourceType: 'TelemedicineRecording',
          resourceId: recordingId,
          metadata: {
            duration,
            fileSize,
            fileName: finalFileName
          }
        }
      })

      return finalPath

    } catch (error) {
      // Em caso de erro, marcar como failed
      await prisma.telemedicineRecording.update({
        where: { id: recordingId },
        data: { status: 'FAILED' }
      })

      throw error
    }
  }

  /**
   * Cancela gravação em andamento
   */
  static async cancelRecording(recordingId: string): Promise<void> {
    const recording = await prisma.telemedicineRecording.findUnique({
      where: { id: recordingId }
    })

    if (!recording) {
      throw new Error('Gravação não encontrada')
    }

    // Limpar chunks temporários
    const tempDir = path.join(this.UPLOAD_DIR, 'temp', recordingId)
    await fs.rm(tempDir, { recursive: true, force: true })

    // Atualizar status
    await prisma.telemedicineRecording.update({
      where: { id: recordingId },
      data: { status: 'CANCELLED' }
    })

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        userId: recording.doctorId,
        userEmail: '',
        userRole: 'DOCTOR',
        action: 'RECORDING_CANCELLED',
        resourceType: 'TelemedicineRecording',
        resourceId: recordingId,
        metadata: {}
      }
    })
  }

  /**
   * Lista gravações de uma consulta
   */
  static async getConsultationRecordings(consultationId: string) {
    return await prisma.telemedicineRecording.findMany({
      where: { consultationId },
      include: {
        doctor: {
          select: { id: true, name: true }
        },
        patient: {
          select: { id: true, name: true }
        }
      },
      orderBy: { startedAt: 'desc' }
    })
  }

  /**
   * Obtém URL temporária para reprodução
   */
  static async getRecordingUrl(
    recordingId: string,
    userId: string
  ): Promise<string> {
    const recording = await prisma.telemedicineRecording.findUnique({
      where: { id: recordingId }
    })

    if (!recording) {
      throw new Error('Gravação não encontrada')
    }

    // Verificar permissão (apenas médico e paciente da consulta)
    if (recording.doctorId !== userId && recording.patientId !== userId) {
      throw new Error('Acesso não autorizado')
    }

    if (recording.status !== 'COMPLETED') {
      throw new Error('Gravação não disponível')
    }

    // Gerar token temporário (válido por 1 hora)
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    await prisma.recordingAccessToken.create({
      data: {
        recordingId,
        userId,
        token,
        expiresAt
      }
    })

    // Log de acesso
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail: '',
        userRole: 'DOCTOR',
        action: 'RECORDING_ACCESSED',
        resourceType: 'TelemedicineRecording',
        resourceId: recordingId,
        metadata: { expiresAt }
      }
    })

    return `/api/recordings/${recordingId}/stream?token=${token}`
  }

  /**
   * Valida token de acesso
   */
  static async validateAccessToken(
    recordingId: string,
    token: string
  ): Promise<boolean> {
    const accessToken = await prisma.recordingAccessToken.findFirst({
      where: {
        recordingId,
        token,
        expiresAt: { gte: new Date() }
      }
    })

    return !!accessToken
  }

  /**
   * Exclui gravação (soft delete)
   */
  static async deleteRecording(
    recordingId: string,
    userId: string
  ): Promise<void> {
    const recording = await prisma.telemedicineRecording.findUnique({
      where: { id: recordingId }
    })

    if (!recording) {
      throw new Error('Gravação não encontrada')
    }

    // Apenas médico pode excluir
    if (recording.doctorId !== userId) {
      throw new Error('Acesso não autorizado')
    }

    // Soft delete
    await prisma.telemedicineRecording.update({
      where: { id: recordingId },
      data: {
        status: 'DELETED',
        deletedAt: new Date()
      }
    })

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail: '',
        userRole: 'DOCTOR',
        action: 'RECORDING_DELETED',
        resourceType: 'TelemedicineRecording',
        resourceId: recordingId,
        metadata: {}
      }
    })
  }

  /**
   * Exclui permanentemente gravação (GDPR/LGPD)
   */
  static async permanentlyDeleteRecording(recordingId: string): Promise<void> {
    const recording = await prisma.telemedicineRecording.findUnique({
      where: { id: recordingId }
    })

    if (!recording || !recording.filePath) {
      return
    }

    // Excluir arquivo físico
    try {
      await fs.unlink(recording.filePath)
    } catch (error) {
      console.error('[Recording] Erro ao excluir arquivo:', error)
    }

    // Excluir tokens de acesso
    await prisma.recordingAccessToken.deleteMany({
      where: { recordingId }
    })

    // Excluir registro
    await prisma.telemedicineRecording.delete({
      where: { id: recordingId }
    })
  }

  /**
   * Gera hash SHA-256 de arquivo
   */
  private static async generateFileHash(filePath: string): Promise<string> {
    const fileBuffer = await fs.readFile(filePath)
    const hash = crypto.createHash('sha256')
    hash.update(fileBuffer)
    return hash.digest('hex')
  }

  /**
   * Limpeza automática de gravações antigas (LGPD - direito ao esquecimento)
   */
  static async cleanupOldRecordings(daysToKeep: number = 365): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const oldRecordings = await prisma.telemedicineRecording.findMany({
      where: {
        createdAt: { lt: cutoffDate },
        status: { in: ['COMPLETED', 'DELETED'] }
      }
    })

    let deletedCount = 0

    for (const recording of oldRecordings) {
      try {
        await this.permanentlyDeleteRecording(recording.id)
        deletedCount++
      } catch (error) {
        console.error(`[Recording] Erro ao excluir gravação ${recording.id}:`, error)
      }
    }

    console.log(`[Recording] ${deletedCount} gravações antigas excluídas`)
    return deletedCount
  }
}
