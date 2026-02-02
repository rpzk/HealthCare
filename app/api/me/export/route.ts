/**
 * API de Portabilidade de Dados LGPD (Art. 18, V)
 * Permite que o paciente exporte todos os seus dados pessoais
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

// GET - Exportar todos os dados do paciente
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'

    // Buscar o paciente vinculado ao usuário
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { patient: true }
    })

    if (!user?.patient) {
      return NextResponse.json({ 
        error: 'Usuário não é um paciente registrado' 
      }, { status: 404 })
    }

    const patientId = user.patient.id

    // Buscar todos os dados do paciente
    const [
      patient,
      consultations,
      prescriptions,
      examRequests,
      medicalRecords,
      medicalCertificates,
      referrals,
      vitalSigns,
      diagnoses,
      npsResponses,
      termAcceptances,
      biometricConsents
    ] = await Promise.all([
      // Dados pessoais
      prisma.patient.findUnique({
        where: { id: patientId },
        include: {
          addresses: true,
          household: true
        }
      }),
      // Consultas
      prisma.consultation.findMany({
        where: { patientId },
        select: {
          id: true,
          scheduledDate: true,
          status: true,
          type: true,
          chiefComplaint: true,
          history: true,
          physicalExam: true,
          assessment: true,
          plan: true,
          notes: true,
          createdAt: true,
          doctor: {
            select: { name: true, speciality: true }
          }
        },
        orderBy: { scheduledDate: 'desc' }
      }),
      // Prescrições
      prisma.prescription.findMany({
        where: { patientId },
        include: {
          items: {
            select: {
              medication: { select: { name: true } },
              customName: true,
              dosage: true,
              frequency: true,
              duration: true,
              instructions: true
            }
          },
          doctor: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      // Solicitações de exames
      prisma.examRequest.findMany({
        where: { patientId },
        select: {
          id: true,
          examType: true,
          description: true,
          status: true,
          createdAt: true,
          doctor: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      // Prontuários
      prisma.medicalRecord.findMany({
        where: { patientId, deletedAt: null },
        select: {
          id: true,
          recordType: true,
          title: true,
          description: true,
          diagnosis: true,
          treatment: true,
          notes: true,
          createdAt: true,
          doctor: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      // Atestados
      prisma.medicalCertificate.findMany({
        where: { patientId },
        select: {
          id: true,
          type: true,
          days: true,
          startDate: true,
          cidCode: true,
          cidDescription: true,
          content: true,
          createdAt: true,
          doctor: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      // Encaminhamentos
      prisma.referral.findMany({
        where: { patientId },
        select: {
          id: true,
          specialty: true,
          description: true,
          urgencyLevel: true,
          status: true,
          createdAt: true,
          doctor: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      // Sinais vitais
      prisma.vitalSigns.findMany({
        where: { patientId },
        select: {
          id: true,
          systolicBP: true,
          diastolicBP: true,
          heartRate: true,
          temperature: true,
          weight: true,
          height: true,
          oxygenSaturation: true,
          bloodGlucose: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      }),
      // Diagnósticos
      prisma.diagnosis.findMany({
        where: { patientId },
        select: {
          id: true,
          status: true,
          certainty: true,
          notes: true,
          onsetDate: true,
          resolvedDate: true,
          primaryCode: { select: { code: true, description: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      // Respostas NPS
      prisma.npsResponse.findMany({
        where: { patientId },
        select: {
          id: true,
          score: true,
          feedback: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      // Aceites de termos
      prisma.termAcceptance.findMany({
        where: { userId: session.user.id },
        select: {
          id: true,
          termSlug: true,
          termTitle: true,
          termVersion: true,
          acceptedAt: true,
          ipAddress: true
        },
        orderBy: { acceptedAt: 'desc' }
      }),
      // Consentimentos biométricos
      prisma.patientBiometricConsent.findMany({
        where: { patientId },
        select: {
          id: true,
          dataType: true,
          isGranted: true,
          grantedAt: true,
          revokedAt: true,
          purpose: true
        },
        orderBy: { createdAt: 'desc' }
      })
    ])

    if (!patient) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
    }

    // Descriptografar CPF se existir
    let cpfDecrypted = null
    if (patient.cpf) {
      try {
        cpfDecrypted = decrypt(patient.cpf)
      } catch {
        cpfDecrypted = '[PROTEGIDO]'
      }
    }

    // Montar objeto de exportação
    const exportData = {
      _metadata: {
        exportDate: new Date().toISOString(),
        format: 'LGPD Data Export',
        version: '1.0',
        requestedBy: session.user.email,
        legalBasis: 'Art. 18, V - Direito à portabilidade dos dados'
      },
      dadosPessoais: {
        nome: patient.name,
        cpf: cpfDecrypted,
        dataNascimento: patient.birthDate,
        genero: patient.gender,
        email: patient.email,
        telefone: patient.phone,
        tipoSanguineo: patient.bloodType,
        alergias: patient.allergies,
        enderecos: patient.addresses?.map((addr) => ({
          logradouro: addr.street,
          numero: addr.number,
          complemento: addr.complement,
          bairro: addr.neighborhood,
          cidade: addr.city,
          estado: addr.state,
          cep: addr.zipCode
        })) || []
      },
      historicoMedico: {
        consultas: consultations.map((c) => ({
          data: c.scheduledDate,
          status: c.status,
          tipo: c.type,
          queixaPrincipal: c.chiefComplaint,
          anamnese: c.history,
          exameFisico: c.physicalExam,
          avaliacao: c.assessment,
          plano: c.plan,
          medico: c.doctor?.name
        })),
        prescricoes: prescriptions.map((p) => ({
          data: p.createdAt,
          medico: p.doctor?.name,
          medicamentos: p.items?.map((i) => ({
            nome: i.medication?.name || i.customName,
            dosagem: i.dosage,
            frequencia: i.frequency,
            duracao: i.duration,
            instrucoes: i.instructions
          }))
        })),
        examesSolicitados: examRequests.map((e) => ({
          tipo: e.examType,
          descricao: e.description,
          status: e.status,
          data: e.createdAt,
          medico: e.doctor?.name
        })),
        prontuarios: medicalRecords.map((m) => ({
          tipo: m.recordType,
          titulo: m.title,
          descricao: m.description,
          diagnostico: m.diagnosis,
          tratamento: m.treatment,
          observacoes: m.notes,
          data: m.createdAt,
          medico: m.doctor?.name
        })),
        atestados: medicalCertificates.map((c) => ({
          tipo: c.type,
          dias: c.days,
          dataInicio: c.startDate,
          cid: c.cidCode ? `${c.cidCode} - ${c.cidDescription}` : null,
          conteudo: c.content,
          data: c.createdAt,
          medico: c.doctor?.name
        })),
        encaminhamentos: referrals.map((r) => ({
          especialidade: r.specialty,
          descricao: r.description,
          urgencia: r.urgencyLevel,
          status: r.status,
          data: r.createdAt,
          medico: r.doctor?.name
        })),
        diagnosticos: diagnoses.map((d) => ({
          cid: d.primaryCode ? `${d.primaryCode.code} - ${d.primaryCode.description}` : null,
          status: d.status,
          certeza: d.certainty,
          observacoes: d.notes,
          dataInicio: d.onsetDate,
          dataResolucao: d.resolvedDate
        })),
        sinaisVitais: vitalSigns.map((v) => ({
          data: v.createdAt,
          pressaoArterial: v.systolicBP && v.diastolicBP ? `${v.systolicBP}/${v.diastolicBP} mmHg` : null,
          frequenciaCardiaca: v.heartRate ? `${v.heartRate} bpm` : null,
          temperatura: v.temperature ? `${v.temperature} °C` : null,
          peso: v.weight ? `${v.weight} kg` : null,
          altura: v.height ? `${v.height} cm` : null,
          saturacaoO2: v.oxygenSaturation ? `${v.oxygenSaturation}%` : null,
          glicemia: v.bloodGlucose ? `${v.bloodGlucose} mg/dL` : null
        }))
      },
      consentimentos: {
        termosAceitos: termAcceptances.map((t) => ({
          termo: t.termTitle,
          versao: t.termVersion,
          dataAceite: t.acceptedAt,
          ip: t.ipAddress
        })),
        consentimentosBiometricos: biometricConsents.map((c) => ({
          tipoDado: c.dataType,
          concedido: c.isGranted,
          dataConcesao: c.grantedAt,
          dataRevogacao: c.revokedAt,
          finalidade: c.purpose
        }))
      },
      avaliacoes: npsResponses.map((n) => ({
        nota: n.score,
        feedback: n.feedback,
        data: n.createdAt
      }))
    }

    // Registrar auditoria
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userEmail: session.user.email || '',
        userRole: session.user.role || 'PATIENT',
        action: 'LGPD_DATA_EXPORT',
        resourceType: 'Patient',
        resourceId: patientId,
        success: true,
        metadata: {
          format,
          recordCounts: {
            consultas: consultations.length,
            prescricoes: prescriptions.length,
            exames: examRequests.length,
            prontuarios: medicalRecords.length,
            atestados: medicalCertificates.length
          }
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    logger.info({ patientId, format, duration: Date.now() - startTime }, 'Exportação LGPD realizada')

    return NextResponse.json(exportData, {
      headers: {
        'Content-Disposition': `attachment; filename="meus_dados_lgpd_${new Date().toISOString().split('T')[0]}.json"`,
        'X-LGPD-Export': 'true'
      }
    })

  } catch (error) {
    logger.error({ error }, 'Erro na exportação LGPD')
    return NextResponse.json({ error: 'Erro ao exportar dados' }, { status: 500 })
  }
}
