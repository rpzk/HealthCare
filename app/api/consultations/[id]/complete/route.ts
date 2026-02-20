import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { withDoctorAuth, AuthenticatedApiHandler } from '@/lib/with-auth'
import { auditLogger, AuditAction } from '@/lib/audit-logger'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { MedicalCertificateService } from '@/lib/medical-certificate-service'
import { autoFillBI } from '@/lib/bi-auto-classifier'

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

    // Auto-preencher BI/SSF a partir do contexto clínico (sem exigir cliques extras)
    const autoBi = autoFillBI(biData, {
      soap: soapData,
      diagnoses: diagnoses || [],
      prescriptions: prescriptions || [],
      examRequests: examRequests || [],
    })
    
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
          biData: autoBi,
          diagnoses: diagnoses || []
        }),
        // BI fields
        scheduledDemand: autoBi.scheduledDemand,
        immediateDemand: autoBi.immediateDemand,
        orientationOnly: autoBi.orientationOnly,
        urgencyWithObs: autoBi.urgencyWithObs,
        continuedCare: autoBi.continuedCare,
        prescriptionRenewal: autoBi.prescriptionRenewal,
        examEvaluation: autoBi.examEvaluation,
        homeVisit: autoBi.homeVisit,
        mentalHealth: autoBi.mentalHealth,
        alcoholUser: autoBi.alcoholUser,
        drugUser: autoBi.drugUser,
        hypertension: autoBi.hypertension,
        diabetes: autoBi.diabetes,
        leprosy: autoBi.leprosy,
        tuberculosis: autoBi.tuberculosis,
        prenatal: autoBi.prenatal,
        postpartum: autoBi.postpartum,
        stdAids: autoBi.stdAids,
        preventive: autoBi.preventive,
        childCare: autoBi.childCare,
        laboratory: autoBi.laboratory,
        radiology: autoBi.radiology,
        ultrasound: autoBi.ultrasound,
        obstetricUltrasound: autoBi.obstetricUltrasound,
        mammography: autoBi.mammography,
        ecg: autoBi.ecg,
        pathology: autoBi.pathology,
        updatedAt: new Date()
      }
    })

    // Salvar prescrições (evitar duplicar em saves repetidos)
    if (prescriptions && prescriptions.length > 0) {
      const existing = await prisma.prescription.findMany({
        where: { consultationId: params.id, doctorId: user.id },
        select: { medication: true, dosage: true, frequency: true, duration: true, instructions: true },
      })
      const keyOf = (v: any) => [
        String(v?.medication || '').trim().toLowerCase(),
        String(v?.dosage || '').trim().toLowerCase(),
        String(v?.frequency || '').trim().toLowerCase(),
        String(v?.duration || '').trim().toLowerCase(),
        String(v?.instructions || '').trim().toLowerCase(),
      ].join('|')
      const seen = new Set(existing.map(keyOf))

      for (const rx of prescriptions) {
        const key = keyOf(rx)
        if (!key || key.startsWith('|||')) continue
        if (seen.has(key)) continue
        seen.add(key)

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

    // Salvar solicitações de exames (evitar duplicar em saves repetidos)
    if (examRequests && examRequests.length > 0) {
      const existing = await prisma.examRequest.findMany({
        where: { consultationId: params.id, doctorId: user.id },
        select: { examType: true, description: true },
      })
      const keyOf = (v: any) => [
        String(v?.examType || '').trim().toLowerCase(),
        String(v?.description || '').trim().toLowerCase(),
      ].join('|')
      const seen = new Set(existing.map(keyOf))

      for (const exam of examRequests) {
        const key = keyOf(exam)
        if (!key || key === '|') continue
        if (seen.has(key)) continue
        seen.add(key)

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

    // Salvar encaminhamentos (associados à consulta) e evitar duplicar
    if (referrals && referrals.length > 0) {
      const existing = await prisma.referral.findMany({
        where: { consultationId: params.id, doctorId: user.id },
        select: { specialty: true, description: true, priority: true },
      })
      const keyOf = (v: any) => [
        String(v?.specialty || '').trim().toLowerCase(),
        String(v?.description || '').trim().toLowerCase(),
        String(v?.priority || '').trim().toLowerCase(),
      ].join('|')
      const seen = new Set(existing.map(keyOf))

      for (const ref of referrals) {
        const key = keyOf(ref)
        if (!key || key === '||') continue
        if (seen.has(key)) continue
        seen.add(key)

        await prisma.referral.create({
          data: {
            patientId: consultation.patientId,
            doctorId: user.id,
            consultationId: params.id,
            specialty: ref.specialty,
            description: ref.description || '',
            priority: ref.priority || 'NORMAL',
            status: 'PENDING'
          }
        })
      }
    }

    // Emitir atestados desta consulta (se houver) e evitar duplicar por conteúdo/tipo
    if (certificates && certificates.length > 0) {
      const existing = await prisma.medicalCertificate.findMany({
        where: { consultationId: params.id, doctorId: user.id },
        select: { type: true, content: true, days: true },
      })
      const keyOf = (v: any) => [
        String(v?.type || '').trim().toLowerCase(),
        String(v?.content || '').trim(),
        String(v?.days ?? '').trim(),
      ].join('|')
      const seen = new Set(existing.map(keyOf))

      for (const cert of certificates) {
        const content = String(cert?.description || '').trim()
        if (!content) continue

        // Mapear valores antigos para enum atual (compatibilidade)
        const rawType = String(cert?.type || '').trim()
        const type = rawType === 'COMPARECIMENTO'
          ? 'TIME_OFF'
          : rawType === 'OTHER'
            ? 'CUSTOM'
            : rawType

        const key = keyOf({ type, content, days: cert?.days })
        if (seen.has(key)) continue
        seen.add(key)

        await MedicalCertificateService.issueCertificate({
          patientId: consultation.patientId,
          doctorId: user.id,
          consultationId: params.id,
          type: type as any,
          days: cert?.days ? Number(cert.days) : undefined,
          startDate: new Date(),
          includeCid: false,
          content,
          observations: undefined,
          title: 'ATESTADO MÉDICO',
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