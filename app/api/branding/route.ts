import { NextRequest } from 'next/server'
import path from 'path'
import fs from 'fs'
import { getBranding, upsertBranding } from '@/lib/branding-service'

export const dynamic = 'force-dynamic'

export async function GET() {
  const branding = await getBranding()
  return Response.json(branding || {})
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') || ''
  const isMultipart = contentType.includes('multipart/form-data')
  let clinicName: string | undefined
  let footerText: string | undefined
  let logoUrl: string | undefined
  let headerUrl: string | undefined

  if (isMultipart) {
    const form = await req.formData()
    clinicName = form.get('clinicName')?.toString()
    footerText = form.get('footerText')?.toString()
    // Save files into public/uploads
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

    const logo = form.get('logo') as File | null
    if (logo) {
      const logoBuf = Buffer.from(await logo.arrayBuffer())
      const logoName = `logo_${Date.now()}_${logo.name}`
      const logoPath = path.join(uploadsDir, logoName)
      fs.writeFileSync(logoPath, logoBuf)
      logoUrl = `/uploads/${logoName}`
    }

    const headerImg = form.get('headerImage') as File | null
    if (headerImg) {
      const headerBuf = Buffer.from(await headerImg.arrayBuffer())
      const headerName = `header_${Date.now()}_${headerImg.name}`
      const headerPath = path.join(uploadsDir, headerName)
      fs.writeFileSync(headerPath, headerBuf)
      headerUrl = `/uploads/${headerName}`
    }
  } else {
    const body = await req.json()
    clinicName = body.clinicName
    footerText = body.footerText
    logoUrl = body.logoUrl
    headerUrl = body.headerUrl
  }

  const saved = await upsertBranding({ clinicName, footerText, logoUrl, headerUrl })
  return Response.json(saved)
}
