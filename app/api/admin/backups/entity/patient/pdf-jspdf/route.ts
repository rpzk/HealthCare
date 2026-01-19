import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import prisma from '@/lib/prisma'
import { PatientRecordPDFGenerator } from '@/lib/patient-record-pdf-generator'
import path from 'path'
import { promises as fs } from 'fs'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  try {
    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'ID do paciente obrigatório' }, { status: 400 })
    }

    // Fetch patient data
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        consultations: { orderBy: { scheduledDate: 'desc' }, take: 20 },
        prescriptions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            items: {
              include: {
                medication: { select: { name: true } },
              },
            },
          },
        },
        medicalRecords: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    })

    if (!patient) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
    }

    // Generate PDF using jsPDF
    const doc = PatientRecordPDFGenerator.generate({
      patient: {
        name: patient.name,
        cpf: patient.cpf,
        email: patient.email,
        birthDate: patient.birthDate,
        phone: patient.phone,
      },
      appointments: patient.consultations.map(a => ({
        date: a.scheduledDate,
        status: a.status,
        notes: a.notes,
      })),
      prescriptions: patient.prescriptions.map(p => {
        const meds =
          p.items && p.items.length > 0
            ? p.items
                .map((item) => {
                  const name = item.medication?.name || item.customName || p.medication
                  const details = [item.dosage, item.frequency, item.duration].filter(Boolean).join(' | ')
                  return details ? `${name} (${details})` : name
                })
                .join('; ')
            : [p.medication, p.dosage, p.frequency, p.duration].filter(Boolean).join(' | ')

        return {
          createdAt: p.createdAt,
          medications: meds,
          notes: p.instructions,
        }
      }),
      medicalRecords: patient.medicalRecords.map(r => ({
        createdAt: r.createdAt,
        chiefComplaint: r.title || r.description,
        diagnosis: r.diagnosis,
        treatment: r.treatment,
      })),
    })

    // Save to disk
    const base = process.env.BACKUPS_DIR || '/app/backups'
    await fs.mkdir(base, { recursive: true })
    const ts = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)
    const sanitizedName = patient.name.replace(/[^a-zA-Z0-9]/g, '_')
    const filename = `patient_${sanitizedName}_${ts}.pdf`
    const filePath = path.join(base, filename)

    // Get PDF buffer and save
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
    await fs.writeFile(filePath, pdfBuffer)

    return NextResponse.json({
      success: true,
      filename,
      message: 'PDF gerado com sucesso',
    })
  } catch (e: any) {
    console.error('[Patient PDF Export] Error:', e)
    return NextResponse.json({ error: e?.message || 'Erro ao gerar PDF' }, { status: 500 })
  }
}
