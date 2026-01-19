import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { withRbac } from '@/lib/with-auth'
import { PatientService } from '@/lib/patient-service'
import { auditLogger, AuditAction } from '@/lib/audit-logger'
import { incCounter, observeHistogram } from '@/lib/metrics'
import { startSpan } from '@/lib/tracing'
import crypto from 'crypto'

let JSZip: any

export const GET = withRbac('patient.export', async (req: NextRequest, { params, user }) => {
  try {
    const start = Date.now()
  const patient = await startSpan('patient.full_export.fetch', () => PatientService.getPatientById(params.id))
    auditLogger.logSuccess(user.id, user.email, user.role, AuditAction.DATA_EXPORT, 'Patient', { patientId: params.id, mode: 'full' })
    const accept = req.headers.get('accept') || ''
    const payload = { patient, exportedAt: new Date().toISOString(), version: 1 }
    const json = JSON.stringify(payload, null, 2)
    const hash = crypto.createHash('sha256').update(json).digest('hex')

    if (accept.includes('application/zip')) {
      if (!JSZip) {
        JSZip = (await import('jszip')).default
      }
  const zip = new JSZip()
      zip.file('patient.json', json)
      zip.file('integrity.sha256', hash + '  patient.json\n')
      const content = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } })
      incCounter('patient_full_export_total', { format: 'zip' })
      observeHistogram('patient_full_export_duration_ms', Date.now() - start, { format: 'zip' })
      return new NextResponse(content, {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename=patient-${params.id}.zip`,
          'X-Integrity-SHA256': hash
        }
      })
    }
    incCounter('patient_full_export_total', { format: 'json' })
    observeHistogram('patient_full_export_duration_ms', Date.now() - start, { format: 'json' })
    return NextResponse.json({ patient, integrity: { sha256: hash } })
  } catch (e:any) {
    auditLogger.logError(user.id, user.email, user.role, AuditAction.DATA_EXPORT, 'Patient', e.message, { patientId: params.id, mode: 'full' })
    return NextResponse.json({ error: 'Erro ao exportar paciente' }, { status: 500 })
  }
})
