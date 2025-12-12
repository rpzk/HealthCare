#!/usr/bin/env tsx
import { prisma } from '@/lib/prisma'

const defaults = [
  {
    readingType: 'BLOOD_PRESSURE_SYSTOLIC',
    criticalLow: 80,
    warningLow: 90,
    normalMin: 100,
    normalMax: 129,
    warningHigh: 139,
    criticalHigh: 160,
  },
  {
    readingType: 'BLOOD_PRESSURE_DIASTOLIC',
    criticalLow: 50,
    warningLow: 60,
    normalMin: 70,
    normalMax: 84,
    warningHigh: 89,
    criticalHigh: 100,
  },
  {
    readingType: 'HEART_RATE',
    criticalLow: 45,
    warningLow: 55,
    normalMin: 60,
    normalMax: 100,
    warningHigh: 110,
    criticalHigh: 130,
  },
  {
    readingType: 'OXYGEN_SATURATION',
    criticalLow: 88,
    warningLow: 92,
    normalMin: 95,
    normalMax: 100,
  },
  {
    readingType: 'BODY_TEMPERATURE',
    criticalLow: 35,
    warningLow: 35.5,
    normalMin: 36,
    normalMax: 37.2,
    warningHigh: 37.5,
    criticalHigh: 38,
  },
  {
    readingType: 'BLOOD_GLUCOSE', // mg/dL
    criticalLow: 50,
    warningLow: 70,
    normalMin: 80,
    normalMax: 140,
    warningHigh: 180,
    criticalHigh: 250,
  },
]

async function main() {
  for (const d of defaults) {
    const existing = await prisma.readingThreshold.findFirst({
      where: {
        patientId: null,
        readingType: d.readingType as any,
        context: null,
      },
    })

    if (existing) {
      await prisma.readingThreshold.update({
        where: { id: existing.id },
        // cast to any because readingType is an enum in Prisma generated types
        data: d as any,
      })
      console.log(`Updated threshold for ${d.readingType}`)
    } else {
      await prisma.readingThreshold.create({
        data: {
          ...(d as any),
          patientId: null,
          context: null,
        } as any
      })
      console.log(`Seeded threshold for ${d.readingType}`)
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
