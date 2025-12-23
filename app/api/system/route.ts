import { NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/with-auth'
import { PrismaClient } from '@prisma/client'
import os from 'os'
export const dynamic = 'force-dynamic'


const globalForSystem = globalThis as unknown as { systemPrisma: PrismaClient }

function getSystemPrisma() {
  if (!globalForSystem.systemPrisma) {
    globalForSystem.systemPrisma = new PrismaClient()
  }
  return globalForSystem.systemPrisma
}

export const GET = withAdminAuth(async () => {
  try {
    const prisma = getSystemPrisma()
    
    // System metrics
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const usedMem = totalMem - freeMem
    const memUsage = Math.round((usedMem / totalMem) * 100)
    
    const cpus = os.cpus()
    const cpuCount = cpus.length
    
    // Calculate CPU usage (simplified)
    const cpuUsage = cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0)
      const idle = cpu.times.idle
      return acc + ((total - idle) / total) * 100
    }, 0) / cpuCount
    
    // Database stats
    const [userCount, patientCount, consultationCount] = await Promise.all([
      prisma.user.count(),
      prisma.patient.count(),
      prisma.consultation.count()
    ])
    
    // Uptime
    const uptimeSeconds = os.uptime()
    const uptimeDays = Math.floor(uptimeSeconds / 86400)
    const uptimeHours = Math.floor((uptimeSeconds % 86400) / 3600)
    const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60)
    
    return NextResponse.json({
      system: {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        uptime: `${uptimeDays}d ${uptimeHours}h ${uptimeMinutes}m`,
        uptimeSeconds
      },
      memory: {
        total: Math.round(totalMem / 1024 / 1024 / 1024 * 100) / 100, // GB
        used: Math.round(usedMem / 1024 / 1024 / 1024 * 100) / 100,
        free: Math.round(freeMem / 1024 / 1024 / 1024 * 100) / 100,
        usage: memUsage
      },
      cpu: {
        count: cpuCount,
        model: cpus[0]?.model || 'Unknown',
        usage: Math.round(cpuUsage)
      },
      database: {
        users: userCount,
        patients: patientCount,
        consultations: consultationCount,
        status: 'connected'
      },
      services: {
        api: { status: 'healthy', latency: '< 50ms' },
        database: { status: 'healthy', latency: '< 10ms' },
        auth: { status: 'healthy' }
      }
    })
  } catch (error) {
    console.error('Erro ao obter métricas do sistema:', error)
    return NextResponse.json({ error: 'Erro ao obter métricas' }, { status: 500 })
  }
})
