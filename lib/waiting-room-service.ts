/**
 * Waiting Room Service - Sala de espera virtual com Redis
 */

import Redis from 'ioredis'
import prisma from '@/lib/prisma'
import { WhatsAppService } from './whatsapp-service'
import { SystemSettingsService } from './system-settings-service'
import { logger } from '@/lib/logger'

let redis: Redis | null = null

async function getRedisClient(): Promise<Redis | null> {
  if (redis) return redis

  try {
    const config = await SystemSettingsService.getRedisConfig()
    redis = new Redis({
      host: config.host,
      port: config.port,
      password: config.password || undefined,
      lazyConnect: true,
      retryStrategy: () => null,
    })

    await redis.connect()
    return redis
  } catch (error) {
    logger.warn('Redis não disponível para sala de espera:', error)
    return null
  }
}

export interface WaitingPatient {
  patientId: string
  patientName: string
  doctorId: string
  consultationId?: string
  priority: number
  joinedAt: Date
  estimatedWaitTime?: number
}

export class WaitingRoomService {
  private static QUEUE_KEY_PREFIX = 'waiting:room:'

  /**
   * Adicionar paciente à fila
   */
  static async joinWaitingRoom(data: {
    patientId: string
    doctorId: string
    consultationId?: string
    priority?: number
  }): Promise<void> {
    const client = await getRedisClient()
    if (!client) {
      throw new Error('Redis não disponível')
    }

    const key = `${this.QUEUE_KEY_PREFIX}${data.doctorId}`
    const score = data.priority || Date.now()

    const payload = JSON.stringify({
      patientId: data.patientId,
      consultationId: data.consultationId,
      joinedAt: new Date().toISOString(),
    })

    try {
      await client.zadd(key, score, payload)
    } catch (error) {
      logger.error('Erro ao adicionar paciente à fila:', error)
      throw new Error('Erro ao entrar na sala de espera')
    }
  }

  /**
   * Remover paciente da fila
   */
  static async leaveWaitingRoom(patientId: string, doctorId: string): Promise<void> {
    const client = await getRedisClient()
    if (!client) return

    const key = `${this.QUEUE_KEY_PREFIX}${doctorId}`

    try {
      const members = await client.zrange(key, 0, -1)
      for (const member of members) {
        const data = JSON.parse(member)
        if (data.patientId === patientId) {
          await client.zrem(key, member)
          break
        }
      }
    } catch (error) {
      logger.error('Erro ao remover paciente da fila:', error)
    }
  }

  /**
   * Obter próximo paciente
   */
  static async getNextPatient(doctorId: string): Promise<WaitingPatient | null> {
    const client = await getRedisClient()
    if (!client) return null

    const key = `${this.QUEUE_KEY_PREFIX}${doctorId}`

    try {
      const result = await client.zrange(key, 0, 0, 'WITHSCORES')
      if (result.length === 0) return null

      const payload = JSON.parse(result[0])
      const score = parseFloat(result[1])

      const patient = await prisma.patient.findUnique({
        where: { id: payload.patientId },
      })

      if (!patient) return null

      return {
        patientId: patient.id,
        patientName: patient.name,
        doctorId,
        consultationId: payload.consultationId,
        priority: score,
        joinedAt: new Date(payload.joinedAt),
      }
    } catch (error) {
      logger.error('Erro ao obter próximo paciente:', error)
      return null
    }
  }

  /**
   * Listar todos os pacientes na fila
   */
  static async getWaitingList(doctorId: string): Promise<WaitingPatient[]> {
    const client = await getRedisClient()
    if (!client) return []

    const key = `${this.QUEUE_KEY_PREFIX}${doctorId}`

    try {
      const results = await client.zrange(key, 0, -1, 'WITHSCORES')
      const patients: WaitingPatient[] = []

      for (let i = 0; i < results.length; i += 2) {
        const payload = JSON.parse(results[i])
        const score = parseFloat(results[i + 1])

        const patient = await prisma.patient.findUnique({
          where: { id: payload.patientId },
        })

        if (patient) {
          patients.push({
            patientId: patient.id,
            patientName: patient.name,
            doctorId,
            consultationId: payload.consultationId,
            priority: score,
            joinedAt: new Date(payload.joinedAt),
          })
        }
      }

      return patients
    } catch (error) {
      logger.error('Erro ao listar fila:', error)
      return []
    }
  }

  /**
   * Obter posição do paciente na fila
   */
  static async getPatientPosition(
    patientId: string,
    doctorId: string
  ): Promise<{ position: number; total: number; estimatedWait: number } | null> {
    const client = await getRedisClient()
    if (!client) return null

    const key = `${this.QUEUE_KEY_PREFIX}${doctorId}`

    try {
      const members = await client.zrange(key, 0, -1)
      let position = -1

      for (let i = 0; i < members.length; i++) {
        const data = JSON.parse(members[i])
        if (data.patientId === patientId) {
          position = i + 1
          break
        }
      }

      if (position === -1) return null

      // Estimar tempo de espera (15 min por paciente à frente)
      const estimatedWait = (position - 1) * 15

      return {
        position,
        total: members.length,
        estimatedWait,
      }
    } catch (error) {
      logger.error('Erro ao obter posição:', error)
      return null
    }
  }

  /**
   * Notificar paciente que é sua vez
   */
  static async notifyPatientReady(
    patientId: string,
    doctorId: string,
    meetingLink: string
  ): Promise<boolean> {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    })

    const doctor = await prisma.user.findUnique({
      where: { id: doctorId },
    })

    if (!patient || !doctor) {
      return false
    }

    // Enviar notificação via WhatsApp
    if (patient.phone) {
      const message = `🏥 *Sua vez chegou!*

Olá, ${patient.name}!

Dr(a). ${doctor.name} está pronto para atendê-lo(a).

🔗 Link da consulta:
${meetingLink}

Por favor, entre na consulta agora.

_Mensagem automática - HealthCare System_`

      await WhatsAppService.sendMessage({
        to: patient.phone,
        message,
      })
    }

    // Remover da fila
    await this.leaveWaitingRoom(patientId, doctorId)

    return true
  }
}
