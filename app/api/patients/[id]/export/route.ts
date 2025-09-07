import { NextRequest, NextResponse } from 'next/server'
import { withDoctorAuth } from '@/lib/with-auth'
import { PatientService } from '@/lib/patient-service'
import { auditLogger, AuditAction } from '@/lib/audit-logger'

export const GET = withDoctorAuth(async (req: NextRequest, { params, user }) => {
  try {
    const patient = await PatientService.getPatientById(params.id)
    // Anonimizar campos sensíveis
    const exported = {
      id: patient.id,
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      riskLevel: patient.riskLevel,
      stats: patient._count,
      anonymized: true
    }
    auditLogger.logSuccess(user.id, user.email, user.role, AuditAction.DATA_EXPORT, 'Patient', { patientId: params.id })
    return NextResponse.json(exported)
  } catch (e: any) {
    auditLogger.logError(user.id, user.email, user.role, AuditAction.DATA_EXPORT, 'Patient', e.message, { patientId: params.id })
    return NextResponse.json({ error: 'Erro ao exportar' }, { status: 500 })
  }
})
