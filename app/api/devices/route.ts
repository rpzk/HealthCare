import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// GET - Listar dispositivos conectados
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')

    if (!patientId) {
      return NextResponse.json(
        { error: 'ID do paciente é obrigatório' },
        { status: 400 }
      )
    }

    const devices = await prisma.connectedDevice.findMany({
      where: {
        patientId,
        isActive: true
      },
      include: {
        readings: {
          take: 1,
          orderBy: { measuredAt: 'desc' }
        },
        _count: {
          select: { readings: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Enriquecer com estatísticas
    const enrichedDevices = devices.map(device => ({
      ...device,
      totalReadings: device._count.readings,
      lastReading: device.readings[0] || null,
      readings: undefined,
      _count: undefined
    }))

    return NextResponse.json(enrichedDevices)
  } catch (error) {
    logger.error('Error fetching devices:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar dispositivos' },
      { status: 500 }
    )
  }
}

// POST - Registrar novo dispositivo
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const {
      patientId,
      deviceType,
      deviceName,
      manufacturer,
      model,
      serialNumber,
      dataSource,
      syncFrequency,
      autoSync,
      notifyOnAbnormal
    } = body

    if (!patientId || !deviceType || !deviceName || !dataSource) {
      return NextResponse.json(
        { error: 'Dados obrigatórios faltando' },
        { status: 400 }
      )
    }

    // Verificar se paciente existe
    const patient = await prisma.patient.findUnique({
      where: { id: patientId }
    })

    if (!patient) {
      return NextResponse.json(
        { error: 'Paciente não encontrado' },
        { status: 404 }
      )
    }

    // Criar dispositivo
    const device = await prisma.connectedDevice.create({
      data: {
        patientId,
        deviceType,
        deviceName,
        manufacturer,
        model,
        serialNumber,
        dataSource,
        syncFrequency,
        autoSync: autoSync ?? true,
        notifyOnAbnormal: notifyOnAbnormal ?? true,
        connectionStatus: 'DISCONNECTED'
      }
    })

    return NextResponse.json(device, { status: 201 })
  } catch (error) {
    logger.error('Error creating device:', error)
    return NextResponse.json(
      { error: 'Erro ao registrar dispositivo' },
      { status: 500 }
    )
  }
}

// DELETE - Remover dispositivo
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get('deviceId')

    if (!deviceId) {
      return NextResponse.json(
        { error: 'ID do dispositivo é obrigatório' },
        { status: 400 }
      )
    }

    // Soft delete - desativar
    await prisma.connectedDevice.update({
      where: { id: deviceId },
      data: { isActive: false }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error deleting device:', error)
    return NextResponse.json(
      { error: 'Erro ao remover dispositivo' },
      { status: 500 }
    )
  }
}
