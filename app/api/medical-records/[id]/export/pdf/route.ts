export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { convertHtmlToPdfWithFallback } from '@/lib/pdf-converter'

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const recordId = params.id
        const medicalRecord = await prisma.medicalRecord.findUnique({
            where: { id: recordId },
            include: {
                patient: { select: { name: true, cpf: true, birthDate: true } },
                doctor: { select: { name: true, crmNumber: true, speciality: true } }
            }
        })

        if (!medicalRecord) {
            return new NextResponse('Medical record not found', { status: 404 })
        }

        if (session.user.role === 'PATIENT') {
            const patientUser = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: { patientId: true }
            })
            if (medicalRecord.patientId !== patientUser?.patientId) {
                return new NextResponse('Forbidden', { status: 403 })
            }
        }
        if (
            session.user.role === 'DOCTOR' &&
            medicalRecord.doctorId !== session.user.id
        ) {
            return new NextResponse('Forbidden', { status: 403 })
        }

        const patient = medicalRecord.patient
        const doctor = medicalRecord.doctor

        const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Prontuário Médico - ${patient.name}</title>
        <style>
          body { font-family: 'Helvetica', 'Arial', sans-serif; margin: 40px; color: #333; line-height: 1.6; }
          .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
          .clinic-name { font-size: 24px; font-weight: bold; color: #1e40af; margin-bottom: 5px; }
          .doc-title { font-size: 20px; margin-top: 20px; text-transform: uppercase; letter-spacing: 1px; }
          
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; background: #f8fafc; padding: 20px; border-radius: 8px; }
          .info-label { font-size: 12px; color: #64748b; text-transform: uppercase; }
          .info-value { font-size: 16px; font-weight: 500; color: #0f172a; }
          
          .section { margin-bottom: 30px; }
          .section-title { font-size: 18px; color: #2563eb; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 15px; }
          .content-box { background: white; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; white-space: pre-wrap; }
          
          .footer { margin-top: 50px; text-align: center; font-size: 14px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          .signature-box { margin-top: 60px; text-align: center; width: 300px; margin-left: auto; margin-right: auto; }
          .signature-line { border-top: 1px solid #000; padding-top: 10px; margin-top: 50px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="clinic-name">HealthCare System</div>
          <div class="doc-title">Registro de Prontuário Médico</div>
        </div>

        <div class="info-grid">
          <div>
            <div class="info-label">Paciente</div>
            <div class="info-value">${patient.name}</div>
            <div class="info-label" style="margin-top:10px;">Data do Registro</div>
            <div class="info-value">${format(medicalRecord.createdAt, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}</div>
          </div>
          <div>
            <div class="info-label">Médico Responsável</div>
            <div class="info-value">${doctor.name}</div>
            <div class="info-label" style="margin-top:10px;">CRM / Especialidade</div>
            <div class="info-value">${doctor.crmNumber || 'N/A'} - ${doctor.speciality || 'Clínica Geral'}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Motivo e Título</div>
          <div class="content-box"><strong>${medicalRecord.title}</strong><br/>Tipo: ${medicalRecord.recordType} | Prioridade: ${medicalRecord.priority}</div>
        </div>

        <div class="section">
          <div class="section-title">Descrição / Anamnese</div>
          <div class="content-box">${medicalRecord.description || 'Não especificado'}</div>
        </div>

        ${medicalRecord.diagnosis ? `
        <div class="section">
          <div class="section-title">Diagnóstico</div>
          <div class="content-box">${medicalRecord.diagnosis}</div>
        </div>` : ''}

        ${medicalRecord.treatment ? `
        <div class="section">
          <div class="section-title">Tratamento Sugerido</div>
          <div class="content-box">${medicalRecord.treatment}</div>
        </div>` : ''}

        <div class="signature-box">
          <div class="signature-line">
            <strong>${doctor.name}</strong><br/>
            CRM: ${doctor.crmNumber || '---'}<br/>
            Assinatura Digital Integrada
          </div>
        </div>

        <div class="footer">
          Documento gerado eletronicamente em ${format(new Date(), "dd/MM/yyyy HH:mm:ss")}.<br/>
          Código de Verificação: ${medicalRecord.id.split('-')[0].toUpperCase()}
        </div>
      </body>
      </html>
    `

        try {
            const pdfBuffer = await convertHtmlToPdfWithFallback(htmlContent, {
                marginPt: 0,
                timeoutMs: 120000,
            })
            const safeFileName = patient.name.replace(/\s+/g, '-')

            return new NextResponse(new Uint8Array(pdfBuffer), {
                status: 200,
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `inline; filename="prontuario-${safeFileName}.pdf"`
                }
            })
        } catch (pdfError) {
            logger.error('Erro ao gerar PDF do prontuário:', pdfError)
            return new NextResponse('Erro ao conectar com gerador de PDF', { status: 500 })
        }
    } catch (error) {
        logger.error('Error exporting medical record to PDF:', error)
        return new NextResponse('Internal error', { status: 500 })
    }
}
