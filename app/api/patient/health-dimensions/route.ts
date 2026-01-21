import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = session.user.id
    const userEmail = session.user.email

    const whereClause: any = { OR: [{ userId }] }
    if (userEmail) whereClause.OR.push({ email: userEmail })

    const patient = await prisma.patient.findFirst({ where: whereClause, select: { id: true } })

    if (!patient) return NextResponse.json({ dimensions: [] })

    const latestVital = await prisma.vitalSigns.findFirst({
      where: { patientId: patient.id },
      orderBy: { recordedAt: 'desc' }
    })

    const dimensions: Array<{ name: string; score: number; trend: 'up' | 'down' | 'stable'; status: string; details: string[] }> = []

    if (latestVital) {
      const { systolicBP, diastolicBP, oxygenSaturation, heartRate, bmi, temperature } = latestVital

      // Cardiovascular
      let cvScore = 80
      const cvDetails: string[] = []
      if ((systolicBP ?? 0) >= 140 || (diastolicBP ?? 0) >= 90) { cvScore = 40; cvDetails.push('Pressão elevada') }
      else if ((systolicBP ?? 0) >= 130 || (diastolicBP ?? 0) >= 85) { cvScore = 60; cvDetails.push('Pré-hipertensão') }
      else cvDetails.push('Pressão em faixa adequada')
      if ((heartRate ?? 0) > 100 || (heartRate ?? 0) < 55) { cvScore -= 10; cvDetails.push('FC fora da faixa') }
      dimensions.push({ name: 'Cardiovascular', score: Math.max(20, Math.min(100, cvScore)), trend: 'stable', status: cvScore >= 70 ? 'Bom' : 'Atenção', details: cvDetails })

      // Respiratório
      let respScore = 85
      const respDetails: string[] = []
      if ((oxygenSaturation ?? 100) < 92) { respScore = 40; respDetails.push('SpO₂ < 92%') }
      else if ((oxygenSaturation ?? 100) < 95) { respScore = 65; respDetails.push('SpO₂ entre 92-94%') }
      else respDetails.push('SpO₂ adequada')
      dimensions.push({ name: 'Respiratório', score: respScore, trend: 'stable', status: respScore >= 70 ? 'Bom' : 'Atenção', details: respDetails })

      // Metabólico
      let metabolicScore = 80
      const metabolicDetails: string[] = []
      const bmiValue = bmi ?? null
      if (bmiValue) {
        if (bmiValue >= 30) { metabolicScore = 50; metabolicDetails.push('IMC em obesidade') }
        else if (bmiValue >= 25) { metabolicScore = 65; metabolicDetails.push('IMC em sobrepeso') }
        else if (bmiValue < 18.5) { metabolicScore = 60; metabolicDetails.push('IMC abaixo do ideal') }
        else metabolicDetails.push('IMC adequado')
      } else {
        metabolicDetails.push('IMC não informado')
      }
      dimensions.push({ name: 'Metabólico', score: metabolicScore, trend: 'stable', status: metabolicScore >= 70 ? 'Bom' : 'Atenção', details: metabolicDetails })

      // Temperatura / Infecções
      let tempScore = 85
      const tempDetails: string[] = []
      if ((temperature ?? 0) >= 38) { tempScore = 40; tempDetails.push('Febre') }
      else if ((temperature ?? 0) >= 37.5) { tempScore = 65; tempDetails.push('Febrícula') }
      else tempDetails.push('Temperatura normal')
      dimensions.push({ name: 'Inflamatório', score: tempScore, trend: 'stable', status: tempScore >= 70 ? 'Bom' : 'Atenção', details: tempDetails })
    }

    return NextResponse.json({ dimensions })
  } catch (error) {
    logger.error('Error fetching health dimensions:', error)
    return NextResponse.json({ error: 'Erro ao carregar dimensões de saúde' }, { status: 500 })
  }
}