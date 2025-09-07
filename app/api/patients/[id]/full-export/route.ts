import { NextRequest, NextResponse } from 'next/server'
import { withDoctorAuth } from '@/lib/with-auth'
import { PatientService } from '@/lib/patient-service'
import { auditLogger, AuditAction } from '@/lib/audit-logger'

export const GET = withDoctorAuth(async (_req: NextRequest, { params, user }) => {
  try {
    const patient = await PatientService.getPatientById(params.id)
    auditLogger.logSuccess(user.id, user.email, user.role, AuditAction.DATA_EXPORT, 'Patient', { patientId: params.id, mode: 'full' })
    return NextResponse.json({ patient })
  } catch (e:any) {
    auditLogger.logError(user.id, user.email, user.role, AuditAction.DATA_EXPORT, 'Patient', e.message, { patientId: params.id, mode: 'full' })
    return NextResponse.json({ error: 'Erro ao exportar paciente' }, { status: 500 })
  }
})
