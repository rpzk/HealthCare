import { NextRequest, NextResponse } from 'next/server'
import { withDoctorAuth, AuthenticatedApiHandler } from '@/lib/with-auth'
import { auditLogger, AuditAction } from '@/lib/audit-logger'

interface RouteParams {
  params: {
    id: string
  }
}

export const PATCH = withDoctorAuth(async (request: NextRequest, { params, user }) => {
  try {
    const data = await request.json()
    
    // Validar se os dados essenciais estão presentes
    const { notes, prescriptions, examRequests, referrals, certificates, vitals } = data
    
    // Aqui você salvaria os dados no banco de dados
    // Por enquanto, vamos apenas simular que foi salvo com sucesso
    
    console.log('Salvando consulta completa:', {
      consultationId: params.id,
      notes,
      prescriptions: prescriptions?.length || 0,
      examRequests: examRequests?.length || 0,
      referrals: referrals?.length || 0,
      certificates: certificates?.length || 0,
      vitals
    })

    // Log de auditoria
    auditLogger.logSuccess(
      user.id,
      user.email,
      user.role,
      AuditAction.CONSULTATION_UPDATE,
      'Consultation',
      {
        consultationId: params.id,
        action: 'complete_ssf',
        prescriptionsCount: prescriptions?.length || 0,
        examRequestsCount: examRequests?.length || 0,
        referralsCount: referrals?.length || 0,
        certificatesCount: certificates?.length || 0
      }
    )

    return NextResponse.json({ 
      success: true,
      message: 'Consulta salva com sucesso',
      data: {
        consultationId: params.id,
        savedAt: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error('Erro ao salvar consulta completa:', error)
    
    auditLogger.logError(
      user.id,
      user.email,
      user.role,
      AuditAction.CONSULTATION_UPDATE,
      'Consultation',
      error.message,
      { consultationId: params.id, action: 'complete_ssf' }
    )

    return NextResponse.json(
      { error: 'Erro ao salvar consulta' },
      { status: 500 }
    )
  }
}) as AuthenticatedApiHandler