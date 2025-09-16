import { NextRequest, NextResponse } from 'next/server'
import { withRbac } from '@/lib/with-auth'
import { auditLogger, AuditAction } from '@/lib/audit-logger'
import { startSpan } from '@/lib/tracing'

export const POST = withRbac('patient.anonymize', async (req: NextRequest, { params, user }) => {
  try {
    await startSpan('patient.anonymize', () => {
      // Mock de anonimização - em produção real, isso seria persistido no banco
      console.log(`Anonimizando paciente ${params.id}`)
      return Promise.resolve({
        id: params.id,
        name: 'ANONYMIZED',
        email: `anon-${params.id}@local`,
        phone: null,
        cpf: null,
        medicalHistory: null,
        allergies: null,
        currentMedications: null,
        emergencyContact: null,
        address: null,
        insuranceNumber: null
      })
    })
    
    auditLogger.logSuccess(user.id, user.email, user.role, AuditAction.DATA_EXPORT, 'Patient', { action: 'anonymize', patientId: params.id })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    auditLogger.logError(user.id, user.email, user.role, AuditAction.DATA_EXPORT, 'Patient', e.message, { action: 'anonymize', patientId: params.id })
    return NextResponse.json({ error: 'Falha ao anonimizar' }, { status: 500 })
  }
})