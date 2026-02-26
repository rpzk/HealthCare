import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { getBranding, upsertBranding } from '@/lib/branding-service'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET é público para carregar branding na UI
export async function GET() {
  const branding = await getBranding()
  return Response.json(branding || {})
}

// POST requer autenticação ADMIN/OWNER
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }
  
  const userRole = session.user.role
  if (!['ADMIN', 'OWNER'].includes(userRole as string)) {
    return NextResponse.json({ error: 'Acesso negado. Apenas administradores podem alterar o branding.' }, { status: 403 })
  }
  const contentType = req.headers.get('content-type') || ''
  const isMultipart = contentType.includes('multipart/form-data')
  const brandingData: Parameters<typeof upsertBranding>[0] = {}

  if (isMultipart) {
    const form = await req.formData()
    brandingData.clinicName = form.get('clinicName')?.toString()
    brandingData.footerText = form.get('footerText')?.toString()
    brandingData.clinicPhone = form.get('clinicPhone')?.toString()
    brandingData.clinicAddress = form.get('clinicAddress')?.toString()
    brandingData.clinicCity = form.get('clinicCity')?.toString()
    brandingData.clinicState = form.get('clinicState')?.toString()
    brandingData.clinicZipCode = form.get('clinicZipCode')?.toString()

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

    const logo = form.get('logo') as File | null
    if (logo?.size) {
      const logoBuf = Buffer.from(await logo.arrayBuffer())
      const logoName = `logo_${Date.now()}_${logo.name}`
      const logoPath = path.join(uploadsDir, logoName)
      fs.writeFileSync(logoPath, logoBuf)
      brandingData.logoUrl = `/uploads/${logoName}`
    } else {
      const keepLogo = form.get('keepLogo')?.toString()
      if (keepLogo) brandingData.logoUrl = keepLogo
    }

    const headerImg = form.get('headerImage') as File | null
    if (headerImg?.size) {
      const headerBuf = Buffer.from(await headerImg.arrayBuffer())
      const headerName = `header_${Date.now()}_${headerImg.name}`
      const headerPath = path.join(uploadsDir, headerName)
      fs.writeFileSync(headerPath, headerBuf)
      brandingData.headerUrl = `/uploads/${headerName}`
    } else {
      const keepHeader = form.get('keepHeader')?.toString()
      if (keepHeader) brandingData.headerUrl = keepHeader
    }
  } else {
    const body = await req.json()
    Object.assign(brandingData, {
      clinicName: body.clinicName,
      footerText: body.footerText,
      logoUrl: body.logoUrl,
      headerUrl: body.headerUrl,
      clinicPhone: body.clinicPhone,
      clinicAddress: body.clinicAddress,
      clinicCity: body.clinicCity,
      clinicState: body.clinicState,
      clinicZipCode: body.clinicZipCode,
    })
  }

  const saved = await upsertBranding(brandingData)
  return Response.json(saved)
}
