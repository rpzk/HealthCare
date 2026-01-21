import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { withDoctorAuth, AuthenticatedApiHandler } from '@/lib/with-auth'
import { auditLogger, AuditAction } from '@/lib/audit-logger'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

interface RouteParams {
  params: {
    id: string
  }
}

export const PATCH = withDoctorAuth(async (request: NextRequest, { params, user }) => {
  try {
    const data = await request.json()
    
    const { notes, prescriptions, examRequests, referrals, certificates, vitals, diagnoses, biData } = data
    
    // Verificar se a consulta existe
    const consultation = await prisma.consultation.findUnique({
      where: { id: params.id }
    })
    
    if (!consultation) {
      return NextResponse.json({ error: 'Consulta não encontrada' }, { status: 404 })
    }

    // Preparar dados SOAP para salvar
    const soapData = notes || {}
    
    // Atualizar a consulta com os dados SOAP e sinais vitais
    await prisma.consultation.update({
      where: { id: params.id },
      data: {
        // SOAP fields
        chiefComplaint: soapData.subjective || null,
        history: soapData.subjective || null, // Also store in history
        physicalExam: soapData.objective || null,
        assessment: soapData.assessment || null,
        plan: soapData.plan || null,
        notes: JSON.stringify({
          soap: soapData,
          vitals: vitals,
          biData: biData,
          diagnoses: diagnoses || []
        }),
        // BI fields
        scheduledDemand: biData?.scheduledDemand || false,
        immediateDemand: biData?.immediateDemand || false,
        orientationOnly: biData?.orientationOnly || false,
        urgencyWithObs: biData?.urgencyWithObs || false,
        continuedCare: biData?.continuedCare || false,
        prescriptionRenewal: biData?.prescriptionRenewal || false,
        examEvaluation: biData?.examEvaluation || false,
        homeVisit: biData?.homeVisit || false,
        mentalHealth: biData?.mentalHealth || false,
        alcoholUser: biData?.alcoholUser || false,
        drugUser: biData?.drugUser || false,
        hypertension: biData?.hypertension || false,
        diabetes: biData?.diabetes || false,
        leprosy: biData?.leprosy || false,
        tuberculosis: biData?.tuberculosis || false,
        prenatal: biData?.prenatal || false,
        postpartum: biData?.postpartum || false,
        stdAids: biData?.stdAids || false,
        preventive: biData?.preventive || false,
        childCare: biData?.childCare || false,
        laboratory: biData?.laboratory || false,
        radiology: biData?.radiology || false,
        ultrasound: biData?.ultrasound || false,
        obstetricUltrasound: biData?.obstetricUltrasound || false,
        mammography: biData?.mammography || false,
        ecg: biData?.ecg || false,
        pathology: biData?.pathology || false,
        updatedAt: new Date()
      }
    })

    // Salvar prescrições
    if (prescriptions && prescriptions.length > 0) {
      for (const rx of prescriptions) {
        await prisma.prescription.create({
          data: {
            patientId: consultation.patientId,
            doctorId: user.id,
            consultationId: params.id,
            medication: rx.medication,
            dosage: rx.dosage || '',
            frequency: rx.frequency || '',
            duration: rx.duration || '',
            instructions: rx.instructions || '',
            status: 'ACTIVE'
          }
        })
      }
    }

    // Salvar solicitações de exames
    if (examRequests && examRequests.length > 0) {
      for (const exam of examRequests) {
        await prisma.examRequest.create({
          data: {
            patientId: consultation.patientId,
            doctorId: user.id,
            consultationId: params.id,
            examType: exam.examType || 'LABORATORY',
            description: exam.description || '',
            urgency: 'ROUTINE',
            status: 'REQUESTED'
          }
        })
      }
    }

    // Diagnósticos são salvos no campo notes como JSON
    // O modelo Diagnosis requer MedicalCode que é mais complexo
    // Por ora os diagnósticos ficam no notes da consulta

    // Salvar encaminhamentos (sem consultationId - modelo não tem essa relação)
    if (referrals && referrals.length > 0) {
      for (const ref of referrals) {
        await prisma.referral.create({
          data: {
            patientId: consultation.patientId,
            doctorId: user.id,
            specialty: ref.specialty,
            description: ref.description || '',
            priority: ref.priority || 'NORMAL',
            status: 'PENDING'
          }
        })
      }
    }

    // Log de auditoria
    auditLogger.logSuccess(
      user.id,
      user.email,
      user.role,
      AuditAction.CONSULTATION_UPDATE,
      'Consultation',
      {
        consultationId: params.id,
        action: 'save_complete',
        prescriptionsCount: prescriptions?.length || 0,
        examRequestsCount: examRequests?.length || 0,
        referralsCount: referrals?.length || 0,
        diagnosesCount: diagnoses?.length || 0
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
    logger.error('Erro ao salvar consulta completa:', error)
    
    auditLogger.logError(
      user.id,
      user.email,
      user.role,
      AuditAction.CONSULTATION_UPDATE,
      'Consultation',
      error.message,
      { consultationId: params.id, action: 'save_complete' }
    )

    return NextResponse.json(
      { error: 'Erro ao salvar consulta: ' + error.message },
      { status: 500 }
    )
  }
}) as AuthenticatedApiHandler