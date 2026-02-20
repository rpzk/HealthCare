/**
 * Recording Processor Service - Processamento avançado de gravações
 * Inclui transcodificação, geração de thumbnails, extração de áudio e metadados
 */

import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'

// ============ TIPOS ============

export interface ProcessingJob {
  id: string
  recordingId: string
  type: 'transcode' | 'thumbnail' | 'audio_extract' | 'encrypt' | 'analyze'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  error?: string
  startedAt?: Date
  completedAt?: Date
}

export interface TranscodeOptions {
  outputFormat: 'mp4' | 'webm' | 'mkv'
  resolution?: '1080p' | '720p' | '480p' | '360p'
  videoBitrate?: string
  audioBitrate?: string
  codec?: 'h264' | 'vp9' | 'av1'
  preset?: 'ultrafast' | 'fast' | 'medium' | 'slow'
}

export interface ThumbnailOptions {
  count: number
  width: number
  height: number
  format: 'jpg' | 'png' | 'webp'
  timestamps?: number[] // segundos específicos
}

export interface VideoMetadata {
  duration: number
  width: number
  height: number
  fps: number
  bitrate: number
  codec: string
  audioCodec: string
  audioChannels: number
  audioSampleRate: number
  fileSize: number
  format: string
}

export interface ProcessingResult {
  success: boolean
  outputPath?: string
  metadata?: VideoMetadata
  thumbnails?: string[]
  error?: string
}

// ============ CONSTANTES ============

const TEMP_DIR = '/tmp/healthcare-recordings'
const OUTPUT_DIR = 'uploads/recordings'

const RESOLUTION_MAP = {
  '1080p': { width: 1920, height: 1080 },
  '720p': { width: 1280, height: 720 },
  '480p': { width: 854, height: 480 },
  '360p': { width: 640, height: 360 }
}

const BITRATE_MAP = {
  '1080p': { video: '4000k', audio: '192k' },
  '720p': { video: '2500k', audio: '128k' },
  '480p': { video: '1000k', audio: '128k' },
  '360p': { video: '500k', audio: '96k' }
}

// ============ SERVIÇO PRINCIPAL ============

export class RecordingProcessorService {
  private static jobs: Map<string, ProcessingJob> = new Map()

  /**
   * Inicializar diretórios necessários
   */
  static async initialize(): Promise<void> {
    await fs.mkdir(TEMP_DIR, { recursive: true })
    await fs.mkdir(OUTPUT_DIR, { recursive: true })
    logger.info('[RecordingProcessor] Diretórios inicializados')
  }

  /**
   * Extrair metadados do vídeo usando ffprobe
   */
  static async extractMetadata(inputPath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      const args = [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        inputPath
      ]

      const ffprobe = spawn('ffprobe', args)
      let output = ''
      let error = ''

      ffprobe.stdout.on('data', (data) => {
        output += data.toString()
      })

      ffprobe.stderr.on('data', (data) => {
        error += data.toString()
      })

      ffprobe.on('close', (code) => {
        if (code !== 0) {
          logger.error('[RecordingProcessor] ffprobe falhou:', error)
          reject(new Error(`ffprobe falhou com código ${code}`))
          return
        }

        try {
          const data = JSON.parse(output)
          const videoStream = data.streams?.find((s: any) => s.codec_type === 'video')
          const audioStream = data.streams?.find((s: any) => s.codec_type === 'audio')
          const format = data.format

          resolve({
            duration: parseFloat(format.duration) || 0,
            width: videoStream?.width || 0,
            height: videoStream?.height || 0,
            fps: eval(videoStream?.r_frame_rate || '0') || 0,
            bitrate: parseInt(format.bit_rate) || 0,
            codec: videoStream?.codec_name || 'unknown',
            audioCodec: audioStream?.codec_name || 'unknown',
            audioChannels: audioStream?.channels || 0,
            audioSampleRate: parseInt(audioStream?.sample_rate) || 0,
            fileSize: parseInt(format.size) || 0,
            format: format.format_name || 'unknown'
          })
        } catch (e) {
          reject(new Error('Erro ao parsear metadados'))
        }
      })
    })
  }

  /**
   * Transcodificar vídeo para formato otimizado
   */
  static async transcode(
    inputPath: string,
    outputPath: string,
    options: TranscodeOptions
  ): Promise<ProcessingResult> {
    const jobId = crypto.randomUUID()
    const job: ProcessingJob = {
      id: jobId,
      recordingId: path.basename(inputPath),
      type: 'transcode',
      status: 'processing',
      progress: 0,
      startedAt: new Date()
    }
    this.jobs.set(jobId, job)

    return new Promise((resolve) => {
      const resolution = options.resolution || '720p'
      const { width, height } = RESOLUTION_MAP[resolution]
      const { video: videoBitrate, audio: audioBitrate } = BITRATE_MAP[resolution]

      const codecArgs: Record<string, string[]> = {
        h264: ['-c:v', 'libx264', '-profile:v', 'high', '-level:v', '4.1'],
        vp9: ['-c:v', 'libvpx-vp9', '-row-mt', '1'],
        av1: ['-c:v', 'libaom-av1', '-strict', 'experimental']
      }

      const args = [
        '-i', inputPath,
        '-y', // Sobrescrever saída
        ...codecArgs[options.codec || 'h264'],
        '-c:a', 'aac',
        '-b:v', options.videoBitrate || videoBitrate,
        '-b:a', options.audioBitrate || audioBitrate,
        '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
        '-preset', options.preset || 'medium',
        '-movflags', '+faststart', // Otimização para streaming
        '-threads', '0', // Auto-detect
        outputPath
      ]

      logger.info(`[RecordingProcessor] Iniciando transcodificação: ${inputPath}`)

      const ffmpeg = spawn('ffmpeg', args)
      let duration = 0

      ffmpeg.stderr.on('data', (data) => {
        const output = data.toString()
        
        // Extrair duração total
        const durationMatch = output.match(/Duration: (\d{2}):(\d{2}):(\d{2})/)
        if (durationMatch) {
          duration = parseInt(durationMatch[1]) * 3600 +
                     parseInt(durationMatch[2]) * 60 +
                     parseInt(durationMatch[3])
        }

        // Extrair progresso
        const timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2})/)
        if (timeMatch && duration > 0) {
          const currentTime = parseInt(timeMatch[1]) * 3600 +
                              parseInt(timeMatch[2]) * 60 +
                              parseInt(timeMatch[3])
          job.progress = Math.min(99, Math.round((currentTime / duration) * 100))
          this.jobs.set(jobId, job)
        }
      })

      ffmpeg.on('close', async (code) => {
        if (code === 0) {
          job.status = 'completed'
          job.progress = 100
          job.completedAt = new Date()
          this.jobs.set(jobId, job)

          logger.info(`[RecordingProcessor] Transcodificação concluída: ${outputPath}`)
          resolve({
            success: true,
            outputPath
          })
        } else {
          job.status = 'failed'
          job.error = `FFmpeg falhou com código ${code}`
          this.jobs.set(jobId, job)

          logger.error(`[RecordingProcessor] Transcodificação falhou: código ${code}`)
          resolve({
            success: false,
            error: job.error
          })
        }
      })

      ffmpeg.on('error', (err) => {
        job.status = 'failed'
        job.error = err.message
        this.jobs.set(jobId, job)

        logger.error(`[RecordingProcessor] Erro FFmpeg:`, err)
        resolve({
          success: false,
          error: err.message
        })
      })
    })
  }

  /**
   * Gerar thumbnails do vídeo
   */
  static async generateThumbnails(
    inputPath: string,
    outputDir: string,
    options: ThumbnailOptions
  ): Promise<ProcessingResult> {
    await fs.mkdir(outputDir, { recursive: true })

    const thumbnails: string[] = []
    const metadata = await this.extractMetadata(inputPath)
    const duration = metadata.duration

    // Calcular timestamps
    let timestamps = options.timestamps
    if (!timestamps || timestamps.length === 0) {
      timestamps = []
      const interval = duration / (options.count + 1)
      for (let i = 1; i <= options.count; i++) {
        timestamps.push(Math.floor(interval * i))
      }
    }

    for (let i = 0; i < timestamps.length; i++) {
      const timestamp = timestamps[i]
      const outputPath = path.join(outputDir, `thumb_${i + 1}.${options.format}`)

      const args = [
        '-i', inputPath,
        '-ss', timestamp.toString(),
        '-vframes', '1',
        '-vf', `scale=${options.width}:${options.height}:force_original_aspect_ratio=decrease`,
        '-y',
        outputPath
      ]

      await new Promise<void>((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', args)
        
        ffmpeg.on('close', (code) => {
          if (code === 0) {
            thumbnails.push(outputPath)
            resolve()
          } else {
            reject(new Error(`Falha ao gerar thumbnail ${i + 1}`))
          }
        })

        ffmpeg.on('error', reject)
      })
    }

    logger.info(`[RecordingProcessor] ${thumbnails.length} thumbnails gerados`)

    return {
      success: true,
      thumbnails
    }
  }

  /**
   * Extrair áudio do vídeo (para transcrição)
   */
  static async extractAudio(
    inputPath: string,
    outputPath: string,
    format: 'mp3' | 'wav' | 'aac' = 'mp3'
  ): Promise<ProcessingResult> {
    return new Promise((resolve) => {
      const codecMap = {
        mp3: ['-c:a', 'libmp3lame', '-q:a', '2'],
        wav: ['-c:a', 'pcm_s16le'],
        aac: ['-c:a', 'aac', '-b:a', '128k']
      }

      const args = [
        '-i', inputPath,
        '-vn', // Sem vídeo
        ...codecMap[format],
        '-y',
        outputPath
      ]

      const ffmpeg = spawn('ffmpeg', args)

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          logger.info(`[RecordingProcessor] Áudio extraído: ${outputPath}`)
          resolve({
            success: true,
            outputPath
          })
        } else {
          resolve({
            success: false,
            error: `Extração de áudio falhou com código ${code}`
          })
        }
      })

      ffmpeg.on('error', (err) => {
        resolve({
          success: false,
          error: err.message
        })
      })
    })
  }

  /**
   * Criptografar arquivo de gravação
   */
  static async encryptFile(
    inputPath: string,
    outputPath: string,
    key: Buffer
  ): Promise<ProcessingResult> {
    try {
      const iv = crypto.randomBytes(16)
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)

      const input = await fs.readFile(inputPath)
      const encrypted = Buffer.concat([
        iv,
        cipher.update(input),
        cipher.final()
      ])

      await fs.writeFile(outputPath, encrypted)

      logger.info(`[RecordingProcessor] Arquivo criptografado: ${outputPath}`)

      return {
        success: true,
        outputPath
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Descriptografar arquivo de gravação
   */
  static async decryptFile(
    inputPath: string,
    outputPath: string,
    key: Buffer
  ): Promise<ProcessingResult> {
    try {
      const encrypted = await fs.readFile(inputPath)
      const iv = encrypted.subarray(0, 16)
      const data = encrypted.subarray(16)

      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
      const decrypted = Buffer.concat([
        decipher.update(data),
        decipher.final()
      ])

      await fs.writeFile(outputPath, decrypted)

      return {
        success: true,
        outputPath
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Processar gravação completa (pipeline)
   */
  static async processRecording(
    recordingId: string,
    inputPath: string
  ): Promise<{
    metadata: VideoMetadata
    transcodedPath?: string
    thumbnails?: string[]
    audioPath?: string
  }> {
    logger.info(`[RecordingProcessor] Processando gravação: ${recordingId}`)

    // 1. Extrair metadados
    const metadata = await this.extractMetadata(inputPath)

    // 2. Atualizar registro no banco
    await prisma.telemedicineRecording.update({
      where: { id: recordingId },
      data: {
        duration: Math.round(metadata.duration),
        // resolution: `${metadata.width}x${metadata.height}`,
        format: metadata.format
      }
    })

    // 3. Gerar thumbnails
    const thumbDir = path.join(OUTPUT_DIR, recordingId, 'thumbnails')
    const thumbResult = await this.generateThumbnails(inputPath, thumbDir, {
      count: 5,
      width: 320,
      height: 180,
      format: 'jpg'
    })

    // 4. Transcodificar para MP4 otimizado
    const transcodedPath = path.join(OUTPUT_DIR, recordingId, 'video.mp4')
    await fs.mkdir(path.dirname(transcodedPath), { recursive: true })
    
    const transcodeResult = await this.transcode(inputPath, transcodedPath, {
      outputFormat: 'mp4',
      resolution: '720p',
      codec: 'h264',
      preset: 'medium'
    })

    // 5. Extrair áudio para transcrição
    const audioPath = path.join(OUTPUT_DIR, recordingId, 'audio.mp3')
    const audioResult = await this.extractAudio(inputPath, audioPath, 'mp3')

    // 6. Atualizar paths no banco
    if (transcodeResult.success) {
      await prisma.telemedicineRecording.update({
        where: { id: recordingId },
        data: {
          filePath: transcodedPath,
          status: 'COMPLETED'
        }
      })
    }

    return {
      metadata,
      transcodedPath: transcodeResult.success ? transcodedPath : undefined,
      thumbnails: thumbResult.thumbnails,
      audioPath: audioResult.success ? audioPath : undefined
    }
  }

  /**
   * Obter status do job de processamento
   */
  static getJobStatus(jobId: string): ProcessingJob | undefined {
    return this.jobs.get(jobId)
  }

  /**
   * Limpar arquivos temporários antigos
   */
  static async cleanupTempFiles(maxAgeHours: number = 24): Promise<number> {
    let cleaned = 0
    
    try {
      const files = await fs.readdir(TEMP_DIR)
      const now = Date.now()
      const maxAge = maxAgeHours * 60 * 60 * 1000

      for (const file of files) {
        const filePath = path.join(TEMP_DIR, file)
        const stats = await fs.stat(filePath)
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath)
          cleaned++
        }
      }

      logger.info(`[RecordingProcessor] ${cleaned} arquivos temporários removidos`)
    } catch (error) {
      logger.error('[RecordingProcessor] Erro ao limpar temporários:', error)
    }

    return cleaned
  }
}

export default RecordingProcessorService
