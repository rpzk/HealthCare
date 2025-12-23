import { prisma } from '@/lib/prisma'

export async function getBranding() {
  const branding = await prisma.branding.findFirst()
  return branding || null
}

export async function upsertBranding(data: {
  clinicName?: string
  logoUrl?: string
  headerUrl?: string
  footerText?: string
}) {
  const existing = await prisma.branding.findFirst()
  if (existing) {
    return prisma.branding.update({
      where: { id: existing.id },
      data,
    })
  }
  return prisma.branding.create({ data })
}
