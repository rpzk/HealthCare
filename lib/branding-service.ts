import { prisma } from '@/lib/prisma'

export async function getBranding() {
  const branding = await prisma.branding.findFirst()
  return branding || null
}

export type BrandingUpsertData = {
  clinicName?: string
  logoUrl?: string
  headerUrl?: string
  footerText?: string
  clinicPhone?: string
  clinicAddress?: string
  clinicCity?: string
  clinicState?: string
  clinicZipCode?: string
}

export async function upsertBranding(data: BrandingUpsertData) {
  const existing = await prisma.branding.findFirst()
  if (existing) {
    return prisma.branding.update({
      where: { id: existing.id },
      data,
    })
  }
  return prisma.branding.create({ data })
}

/** Dados unificados da clínica para documentos (Branding + fallback SystemSettings) */
export interface ClinicDataForDocuments {
  clinicName?: string
  clinicCnpj?: string
  clinicAddress?: string
  clinicCity?: string
  clinicState?: string
  clinicZipCode?: string
  clinicPhone?: string
  logoUrl?: string
  headerUrl?: string
  footerText?: string
}

/** Retorna dados da clínica para documentos: prioriza Branding, fallback em SystemSettings */
export async function getClinicDataForDocuments(): Promise<ClinicDataForDocuments> {
  const branding = await getBranding()
  const settings = await prisma.systemSetting.findMany({
    where: {
      key: {
        in: [
          'CLINIC_NAME',
          'CLINIC_TRADE_NAME',
          'CLINIC_CNPJ',
          'CLINIC_ADDRESS',
          'CLINIC_CITY',
          'CLINIC_STATE',
          'CLINIC_CEP',
          'CLINIC_PHONE',
        ],
      },
    },
  })
  const settingsMap: Record<string, string> = {}
  for (const s of settings) settingsMap[s.key] = s.value || ''

  return {
    clinicName: branding?.clinicName || settingsMap['CLINIC_TRADE_NAME'] || settingsMap['CLINIC_NAME'],
    clinicCnpj: settingsMap['CLINIC_CNPJ'],
    clinicAddress: branding?.clinicAddress || settingsMap['CLINIC_ADDRESS'],
    clinicCity: branding?.clinicCity || settingsMap['CLINIC_CITY'],
    clinicState: branding?.clinicState || settingsMap['CLINIC_STATE'],
    clinicZipCode: branding?.clinicZipCode || settingsMap['CLINIC_CEP'],
    clinicPhone: branding?.clinicPhone || settingsMap['CLINIC_PHONE'],
    logoUrl: branding?.logoUrl,
    headerUrl: branding?.headerUrl,
    footerText: branding?.footerText,
  }
}
