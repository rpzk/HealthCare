# Quick Start: PDF Export System

## What Was Built

A **BullMQ-powered asynchronous PDF export** system for patient medical records with digital signatures.

## How It Works (User Perspective)

1. Admin goes to **Backups → Backups por Entidade** section
2. Selects a patient
3. Clicks **"Exportar prontuário (PDF assinado)"**
4. Sees a **progress bar** in real-time
5. When complete, clicks **"Baixar"** to download the signed PDF

## How It Works (Technical)

```
User clicks button
         ↓
POST /api/admin/backups/entity/patient/pdf
         ↓
Create PatientPdfExport record (status=PENDING)
         ↓
Enqueue BullMQ 'patient_pdf_export' job
         ↓
Return exportId to frontend
         ↓
Frontend polls GET /api/admin/backups/entity/patient/pdf/status every 2 seconds
         ↓
Worker processes job:
  - generatePatientPdfHtml() → HTML with all patient data
  - generatePatientPdfFromHtml() → PDF via Puppeteer
  - signPdf() → Add digital signature + hash
  - Save to /home/umbrel/backups/healthcare/patient_pdf_*.pdf
         ↓
Frontend shows progress bar (20% → 50% → 75% → 100%)
         ↓
Shows download button when complete
         ↓
GET /api/admin/backups/files/download?filename=patient_pdf_*.pdf
         ↓
User gets signed PDF
```

## Files Changed

### Database
- `prisma/schema.prisma` - Added PatientPdfExport & PatientPdfExportLog models

### Backend Services
- `lib/pdf-patient-export.ts` - PDF generation from patient data
- `lib/pdf-signing.ts` - Digital signature framework
- `lib/ai-bullmq-queue.ts` - Added patient_pdf_export job handler

### API Endpoints
- `app/api/admin/backups/entity/patient/pdf/route.ts` - Initiate export
- `app/api/admin/backups/entity/patient/pdf/status/route.ts` - Poll progress
- `app/api/admin/backups/files/route.ts` - List files (now includes PDFs)
- `app/api/admin/backups/files/download/route.ts` - Download files (now supports .pdf)

### Frontend
- `app/admin/backup/page.tsx` - Added UI for PDF export and progress tracking

## What It Exports

**Into the PDF:**
- Patient demographics (name, CPF, email, birth date, phone, etc.)
- Consultation history (last 20)
- Prescriptions (medication, dosage, frequency)
- Medical records (title, description, diagnosis, treatment)
- Exam requests
- Attachments list

**Format:** Professional HTML→PDF with styled sections, tables, and headers

## Key Features

✅ **Asynchronous** - Doesn't block the web server  
✅ **Real-time progress** - Frontend polls job status every 2 seconds  
✅ **Digital signatures** - Framework for A1 certificate integration  
✅ **Error handling** - Logs all failures with details  
✅ **Audit trail** - PatientPdfExportLog tracks every step  
✅ **Secure** - Admin RBAC + file whitelist + path protection  
✅ **Compliance** - Supports LGPD data portability  

## To Use

### Prerequisites
```bash
# Ensure Puppeteer is installed (for PDF generation)
npm install puppeteer
```

### Start Services
```bash
# Terminal 1: Database & cache
docker compose up -d postgres redis

# Terminal 2: Web server
npm run dev

# Terminal 3: BullMQ worker
npm run worker:ai
```

### Test It
1. Go to http://localhost:3000/admin/backup
2. Scroll to **"Backups por Entidade"**
3. Select a patient from dropdown
4. Click **"Exportar prontuário (PDF assinado)"**
5. Watch progress bar appear and complete
6. Click **"Baixar"** to download PDF

## Database Migration

Already applied! Tables created:
- `patient_pdf_exports` - Job tracking
- `patient_pdf_export_logs` - Progress audit

```bash
# If you need to re-run migration
npx prisma migrate dev
```

## Production Checklist

- [ ] Install node-signpdf for real A1 certificate signing
- [ ] Configure RFC 3161 timestamp service endpoint
- [ ] Set up certificate storage (PKCS#12 file or hardware token)
- [ ] Configure Puppeteer for server environment (may need headless Chrome)
- [ ] Set expiration policy for old PDFs (default: 30 days)
- [ ] Set up job timeout (default: BullMQ default)
- [ ] Enable audit logging to external system
- [ ] Add rate limiting on PDF export API
- [ ] Configure backup/storage for generated PDFs
- [ ] Test with real patient data

## Troubleshooting

**"Puppeteer error: Chrome not found"**
```bash
# Install Chromium
apt-get install chromium
# Or use system Chrome
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

**Job stuck in PROCESSING**
- Check Redis connection: `redis-cli ping`
- Check worker logs: `npm run worker:ai`
- Check job in Redis: `redis-cli KEYS ai-jobs:*`

**PDF download returns 400 "Arquivo não permitido"**
- Filename must start with `patient_pdf_`
- Filename must end with `.pdf`
- Check file exists: `ls /home/umbrel/backups/healthcare/patient_pdf_*`

**Export shows error "Erro ao gerar PDF"**
- Puppeteer not installed: `npm install puppeteer`
- Chrome/Chromium not available (see above)
- Check worker logs for detailed error message

## API Reference

### Initiate Export
```bash
curl -X POST http://localhost:3000/api/admin/backups/entity/patient/pdf \
  -H "Content-Type: application/json" \
  -d '{"id":"patient_id"}' \
  -H "Authorization: Bearer ..."
```

### Check Progress
```bash
curl "http://localhost:3000/api/admin/backups/entity/patient/pdf/status?exportId=export_id" \
  -H "Authorization: Bearer ..."
```

### List Files
```bash
curl "http://localhost:3000/api/admin/backups/files" \
  -H "Authorization: Bearer ..."
```

### Download PDF
```bash
curl "http://localhost:3000/api/admin/backups/files/download?filename=patient_pdf_*.pdf" \
  -O -H "Authorization: Bearer ..."
```

## Next Steps

1. **Test the system** with a test patient
2. **Monitor** job processing via worker logs
3. **Integrate** real A1 certificate when needed
4. **Set up** automated backup of PDFs
5. **Configure** email delivery (optional)
6. **Document** in clinic procedures for staff

## Files Location

- **Backups:** `/home/umbrel/backups/healthcare/patient_pdf_*.pdf`
- **Logs:** PostgreSQL `patient_pdf_export_logs` table
- **Job queue:** Redis (default hostname)

Enjoy! 🎉
