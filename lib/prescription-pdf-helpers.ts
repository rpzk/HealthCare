/**
 * Helpers para gerar PDF de prescrição a partir dos dados do banco.
 * Usado pela rota de PDF e pela rota de assinatura PAdES.
 * 
 * ATUALIZADO (2026): Conformidade CFM + Portaria 344/98
 */

import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'
import { generatePrescriptionPdf } from '@/lib/documents/pdf-generator'
import { generateCFMPrescriptionPdf, PrescriptionType as CFMPrescriptionType } from '@/lib/documents/cfm-prescription-generator'
import { classifyPrescriptionType, calculateExpirationDate } from '@/lib/documents/prescription-classifier'
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
  const clinicSettings = await prisma.systemSetting.findMany({
    where: { key: { in: ['clinic_name', 'clinic_address', 'clinic_phone', 'clinic_cnpj', 'clinic_city'] } },
  })
  const settingsMap: Record<string, string> = {}
  for (const s of clinicSettings) settingsMap[s.key] = s.value

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
    address: settingsMap['clinic_address'] || 'Endereço não cadastrado',
    city: settingsMap['clinic_city'] || undefined,
    specialty: prescription.doctor.speciality || undefined,
    email: prescription.doctor.email || undefined,
    clinicName: settingsMap['clinic_name'] || undefined,
    clinicCnpj: settingsMap['clinic_cnpj'] || undefined,
    phone: settingsMap['clinic_phone'] || undefined,
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
 * Usa dados já carregados do banco.
 * 
 * ATUALIZADO (2026): Usa gerador CFM-compliant
 */
export async function generatePrescriptionPdfBuffer(
  prescription: NonNullable<PrescriptionWithRelations>,
  baseUrl: string
): Promise<Buffer> {
  try {
    const { doc, verificationUrl } = await buildPrescriptionDocumentFromDb(prescription, baseUrl)
    
    // Detectar tipo de prescrição automaticamente
    const medicationNames = doc.medications.map(m => m.name)
    const detectedType = classifyPrescriptionType(medicationNames)
    
    // Mapear tipo do Prisma para tipo do gerador CFM
    const cfmType: CFMPrescriptionType = prescription.prescriptionType as CFMPrescriptionType || detectedType
    
    // Calcular validade automaticamente
    const expiresAt = prescription.expiresAt || calculateExpirationDate(cfmType, prescription.createdAt)
    
    // Usar gerador CFM-compliant
    return await generateCFMPrescriptionPdf(doc, {
      prescriptionType: cfmType,
      controlNumber: prescription.controlNumber || undefined,
      uf: prescription.uf || prescription.doctor.licenseState || 'SP',
      viaNumber: prescription.viaNumber || 1,
      expiresAt,
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
