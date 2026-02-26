/**
 * Helpers para gerar PDF de prescrição a partir dos dados do banco.
 * Usado pela rota de PDF e pela rota de assinatura PAdES.
 * 
 * ATUALIZADO (2026): Conformidade CFM + Portaria 344/98
 */

import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'
import { getClinicDataForDocuments } from '@/lib/branding-service'
import { classifyPrescriptionType, calculateExpirationDate } from '@/lib/documents/prescription-classifier'
import { generatePrescriptionPdfViaGotenberg } from '@/lib/documents/prescription-pdf-gotenberg'
import { logger } from '@/lib/logger'
import type {
  PrescriptionDocument,
  MedicationItem,
  DoctorInfo,
  PatientInfo,
  PharmaceuticalForm,
  AdministrationRoute,
} from '@/lib/documents/types'

type PrescriptionWithRelations = Awaited<
  ReturnType<
    typeof prisma.prescription.findUnique<{
      where: { id: string }
      include: {
        patient: { include: { userAccount: { select: { id: true } } } }
        doctor: { include: { person: { select: { cpf: true } } } }
        items: { include: { medication: { select: { name: true } } } }
      }
    }>
  >
>

export async function buildPrescriptionDocumentFromDb(
  prescription: NonNullable<PrescriptionWithRelations>,
  baseUrl: string
): Promise<{ doc: PrescriptionDocument; verificationUrl: string }> {
  const clinic = await getClinicDataForDocuments()

  let doctorCpf: string | undefined
  try {
    const raw = prescription.doctor.person?.cpf || null
    doctorCpf = (raw && decrypt(raw)) || undefined
  } catch {
    doctorCpf = undefined
  }
  let patientCpf: string
  try {
    const raw = prescription.patient.cpf || null
    patientCpf = (raw && decrypt(raw)) || raw || 'Não informado'
  } catch {
    patientCpf = prescription.patient.cpf || 'Não informado'
  }

  const doctorInfo: DoctorInfo = {
    name: prescription.doctor.name,
    crm: prescription.doctor.crmNumber || prescription.doctor.licenseNumber || '',
    crmState: prescription.doctor.licenseState || 'SP',
    address: clinic.clinicAddress || 'Endereço não cadastrado',
    city: clinic.clinicCity || undefined,
    specialty: prescription.doctor.speciality || undefined,
    email: prescription.doctor.email || undefined,
    clinicName: clinic.clinicName || undefined,
    clinicCnpj: clinic.clinicCnpj || undefined,
    phone: clinic.clinicPhone || undefined,
    logoUrl: clinic.logoUrl
      ? clinic.logoUrl.startsWith('/')
        ? `${baseUrl.replace(/\/$/, '')}${clinic.logoUrl}`
        : clinic.logoUrl
      : undefined,
    cpf: doctorCpf,
  }

  const patientInfo: PatientInfo = {
    name: prescription.patient.name,
    documentNumber: patientCpf,
    documentType: 'CPF',
    cpf: patientCpf,
    address: prescription.patient.address || undefined,
    phone: prescription.patient.phone || undefined,
    birthDate: prescription.patient.birthDate || undefined,
  }

  const medications: MedicationItem[] = prescription.items.map(item => ({
    genericName: item.medication?.name || item.customName || prescription.medication || 'Medicamento',
    name: item.medication?.name || item.customName || prescription.medication || 'Medicamento',
    concentration: item.dosage || '---',
    pharmaceuticalForm: 'comprimido' as PharmaceuticalForm,
    quantity: item.quantity || 1,
    quantityUnit: 'unidade(s)',
    unit: 'unidade(s)',
    dosage: item.dosage || prescription.dosage || '---',
    route: 'oral' as AdministrationRoute,
    frequency: item.frequency || prescription.frequency || '---',
    duration: item.duration || prescription.duration || '---',
    instructions: item.instructions || prescription.instructions || undefined,
  }))

  if (medications.length === 0 && prescription.medication) {
    medications.push({
      genericName: prescription.medication,
      name: prescription.medication,
      concentration: '---',
      pharmaceuticalForm: 'comprimido',
      quantity: 1,
      quantityUnit: 'unidade(s)',
      unit: 'unidade(s)',
      dosage: prescription.dosage || '---',
      route: 'oral',
      frequency: prescription.frequency || '---',
      duration: prescription.duration || '---',
      instructions: prescription.instructions || undefined,
    })
  }

  const verificationUrl = `${baseUrl}/validar/${prescription.id}`
  const doc: PrescriptionDocument = {
    type: 'PRESCRIPTION',
    prescriptionId: prescription.id,
    doctor: doctorInfo,
    patient: patientInfo,
    medications,
    usageType: 'INTERNAL',
    issuedAt: prescription.createdAt,
    date: prescription.createdAt,
    notes: prescription.instructions || undefined,
    verificationUrl,
  }
  return { doc, verificationUrl }
}

/**
 * Gera o buffer do PDF da prescrição (sem assinatura).
 * Usa HTML + Gotenberg exclusivamente. Sem fallback.
 */
export async function generatePrescriptionPdfBuffer(
  prescription: NonNullable<PrescriptionWithRelations>,
  baseUrl: string
): Promise<Buffer> {
  try {
    const { doc, verificationUrl } = await buildPrescriptionDocumentFromDb(prescription, baseUrl)
    const medicationNames = doc.medications.map((m) => m.name || m.genericName)
    const detectedType = classifyPrescriptionType(medicationNames)
    const prescriptionType =
      prescription.prescriptionType && prescription.prescriptionType !== 'SIMPLE'
        ? prescription.prescriptionType
        : detectedType
    const expiresAt = prescription.expiresAt || calculateExpirationDate(prescriptionType, prescription.createdAt)

    return await generatePrescriptionPdfViaGotenberg(doc, {
      prescriptionType,
      verificationUrl,
      expiresAt,
      controlNumber: prescription.controlNumber || undefined,
      uf: prescription.uf || prescription.doctor.licenseState || 'SP',
      viaNumber: prescription.viaNumber || 1,
      justification: prescription.justification || undefined,
      buyerName: prescription.buyerName || undefined,
      buyerDocument: prescription.buyerDocument || undefined,
      buyerAddress: prescription.buyerAddress || undefined,
      buyerPhone: prescription.buyerPhone || undefined,
    })
  } catch (err) {
    logger.error({ err, prescriptionId: prescription.id }, 'Erro ao gerar PDF (helper)')
    throw err
  }
}

/** Tipo para consulta com prescrições (usado para PDF agregado da consulta) */
type ConsultationWithPrescriptions = NonNullable<
  Awaited<
    ReturnType<
      typeof prisma.consultation.findUnique<{
        where: { id: string }
        include: {
          patient: { select: { id: true; name: true; cpf: true; birthDate: true; phone: true } }
          doctor: {
            select: {
              id: true
              name: true
              crmNumber: true
              licenseNumber: true
              licenseState: true
              speciality: true
              email: true
              person: { select: { cpf: true } }
            }
          }
          prescriptions: {
            where: { consultationId: string }
            orderBy: { createdAt: 'asc' }
            include: {
              items: {
                include: {
                  medication: { select: { id: true; name: true } }
                }
              }
            }
          }
        }
      }>
    >
  >
>

/**
 * Constrói PrescriptionDocument a partir de uma consulta (prescrições agregadas).
 * Usado para gerar PDF com o mesmo layout CFM da página de prescrições.
 */
export async function buildPrescriptionDocumentFromConsultation(
  consultation: ConsultationWithPrescriptions,
  baseUrl: string,
  consultationId: string
): Promise<{ doc: PrescriptionDocument; verificationUrl: string }> {
  const clinic = await getClinicDataForDocuments()

  let doctorCpf: string | undefined
  try {
    const raw = consultation.doctor?.person?.cpf || null
    doctorCpf = (raw && decrypt(raw)) || undefined
  } catch {
    doctorCpf = undefined
  }
  let patientCpf: string
  try {
    const raw = consultation.patient?.cpf || null
    patientCpf = (raw && decrypt(raw)) || raw || 'Não informado'
  } catch {
    patientCpf = consultation.patient?.cpf || 'Não informado'
  }

  const doctorInfo: DoctorInfo = {
    name: consultation.doctor?.name || '—',
    crm: consultation.doctor?.crmNumber || consultation.doctor?.licenseNumber || '',
    crmState: consultation.doctor?.licenseState || 'SP',
    address: clinic.clinicAddress || 'Endereço não cadastrado',
    city: clinic.clinicCity || undefined,
    specialty: consultation.doctor?.speciality || undefined,
    email: consultation.doctor?.email || undefined,
    clinicName: clinic.clinicName || undefined,
    clinicCnpj: clinic.clinicCnpj || undefined,
    phone: clinic.clinicPhone || undefined,
    logoUrl: clinic.logoUrl
      ? clinic.logoUrl.startsWith('/')
        ? `${baseUrl.replace(/\/$/, '')}${clinic.logoUrl}`
        : clinic.logoUrl
      : undefined,
    cpf: doctorCpf,
  }

  const patientInfo: PatientInfo = {
    name: consultation.patient?.name || '—',
    documentNumber: patientCpf,
    documentType: 'CPF',
    cpf: patientCpf,
    address: undefined,
    phone: consultation.patient?.phone || undefined,
    birthDate: consultation.patient?.birthDate || undefined,
  }

  const medications: MedicationItem[] = []
  for (const p of consultation.prescriptions) {
    if (Array.isArray(p.items) && p.items.length > 0) {
      for (const it of p.items) {
        const name = it.medication?.name || it.medicationName || it.customName || p.medication || 'Medicamento'
        medications.push({
          genericName: name,
          name,
          concentration: it.dosage || p.dosage || '---',
          pharmaceuticalForm: 'comprimido' as PharmaceuticalForm,
          quantity: it.quantity || 1,
          quantityUnit: 'unidade(s)',
          unit: 'unidade(s)',
          dosage: it.dosage || p.dosage || '---',
          route: 'oral' as AdministrationRoute,
          frequency: it.frequency || p.frequency || '---',
          duration: it.duration || p.duration || '---',
          instructions: it.instructions || p.instructions || undefined,
        })
      }
    } else {
      medications.push({
        genericName: p.medication || 'Medicamento',
        name: p.medication || 'Medicamento',
        concentration: '---',
        pharmaceuticalForm: 'comprimido',
        quantity: 1,
        quantityUnit: 'unidade(s)',
        unit: 'unidade(s)',
        dosage: p.dosage || '---',
        route: 'oral',
        frequency: p.frequency || '---',
        duration: p.duration || '---',
        instructions: p.instructions || undefined,
      })
    }
  }

  const verificationUrl = `${baseUrl}/api/consultations/${consultationId}/documents/prescriptions/pdf/verify`
  const doc: PrescriptionDocument = {
    type: 'PRESCRIPTION',
    prescriptionId: `consultation-${consultationId}`,
    doctor: doctorInfo,
    patient: patientInfo,
    medications,
    usageType: 'INTERNAL',
    issuedAt: consultation.actualDate ? new Date(consultation.actualDate) : new Date(),
    date: consultation.actualDate ? new Date(consultation.actualDate) : new Date(),
    notes: undefined,
    verificationUrl,
  }
  return { doc, verificationUrl }
}

/**
 * Gera o buffer do PDF da prescrição agregada da consulta (sem assinatura).
 * Usa HTML + Gotenberg exclusivamente.
 */
export async function generateConsultationPrescriptionPdfBuffer(
  consultation: ConsultationWithPrescriptions,
  baseUrl: string,
  consultationId: string
): Promise<Buffer> {
  const { doc, verificationUrl } = await buildPrescriptionDocumentFromConsultation(
    consultation,
    baseUrl,
    consultationId
  )
  if (doc.medications.length === 0) {
    throw new Error('Nenhuma prescrição encontrada na consulta')
  }

  const medicationNames = doc.medications.map((m) => m.name || m.genericName)
  const prescriptionType = classifyPrescriptionType(medicationNames)
  const issuedAt = doc.issuedAt || new Date()
  const expiresAt = calculateExpirationDate(prescriptionType, issuedAt)

  return await generatePrescriptionPdfViaGotenberg(doc, {
    prescriptionType,
    verificationUrl,
    expiresAt,
    uf: consultation.doctor?.licenseState || 'SP',
    viaNumber: 1,
  })
}
