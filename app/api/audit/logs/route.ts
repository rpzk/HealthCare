import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuthUnlimited } from '@/lib/advanced-auth-v2'

// GET /api/audit/logs?limit=50&userId=...&action=...
export const GET = withAdminAuthUnlimited(async (req: NextRequest, { user }) => {
  try {
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    const userId = searchParams.get('userId') || undefined
    const action = searchParams.get('action') || undefined
    const resource = searchParams.get('resource') || undefined

    // Mock de logs de auditoria
    const mockLogs = [
      {
        id: '1',
        userId: 'admin-1',
        userEmail: 'admin@healthcare.com',
        userRole: 'ADMIN',
        action: 'LOGIN',
        resource: 'Auth',
        resourceId: null,
        details: { ip: '127.0.0.1', userAgent: 'Mozilla/5.0' },
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        success: true,
        errorMessage: null,
        createdAt: new Date('2024-01-15T09:00:00Z')
      },
      {
        id: '2',
        userId: 'admin-1',
        userEmail: 'admin@healthcare.com',
        userRole: 'ADMIN',
        action: 'VIEW',
        resource: 'Patient',
        resourceId: 'patient-1',
        details: { patientName: 'Maria Santos' },
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        success: true,
        errorMessage: null,
        createdAt: new Date('2024-01-15T09:05:00Z')
      },
      {
        id: '3',
        userId: 'admin-1',
        userEmail: 'admin@healthcare.com',
        userRole: 'ADMIN',
        action: 'CREATE',
        resource: 'Consultation',
        resourceId: 'consultation-1',
        details: { patientId: 'patient-1', scheduledDate: '2024-01-20T10:00:00Z' },
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        success: true,
        errorMessage: null,
        createdAt: new Date('2024-01-15T09:10:00Z')
      }
    ]

    // Aplicar filtros
    let filteredLogs = mockLogs
    if (userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === userId)
    }
    if (action) {
      filteredLogs = filteredLogs.filter(log => log.action === action)
    }
    if (resource) {
      filteredLogs = filteredLogs.filter(log => log.resource === resource)
    }

    // Aplicar limite
    const logs = filteredLogs.slice(0, limit)

    return NextResponse.json({ logs, count: logs.length })
  } catch (e: any) {
    return NextResponse.json({ error: 'Erro ao recuperar logs', message: e.message }, { status: 500 })
  }
})