# Medical Certificate System - Quick Start Guide

## For Developers

### Getting Started

1. **Ensure Database is Running:**
   ```bash
   docker compose up -d postgres redis
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

4. **Run Migrations:**
   ```bash
   npx prisma migrate deploy
   ```

5. **Start Development Server:**
   ```bash
   npm run dev
   ```

Access the app at `http://localhost:3000`

---

## Certificate Issuance Flow

### 1. Issue Certificate (Doctor Side)

Navigate to **Certificates → Novo Atestado** and fill the form:
- Patient selection
- Certificate type (Medical Leave, Fitness, Disability, etc.)
- Duration (days)
- Content

**What Happens Automatically:**
- ✅ Certificate numbered sequentially per year
- ✅ Digital signature applied (PKI-Local)
- ✅ QR code generated
- ✅ PDF created with all elements
- ✅ Email sent to patient (if SMTP configured)
- ✅ Audit log recorded

### 2. View Certificate (Patient Side)

Patient receives email with:
- Certificate details
- Validation link
- QR code to scan

Clicking link → Public validation page shows:
- Certificate number
- Validity dates
- Digital signature verification
- Signature method (PKI_LOCAL)
- QR code

---

## Email Configuration

### Gmail (Recommended for Development)

1. Go to [Google Account Settings](https://myaccount.google.com)
2. Enable 2-Factor Authentication
3. Generate [App Password](https://myaccount.google.com/apppasswords)
4. Add to `.env.local`:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="Your Clinic <your-email@gmail.com>"
```

### SendGrid (Production)

```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.your_sendgrid_api_key
SMTP_FROM="Your Clinic <noreply@clinic.com>"
```

### Test Email

Trigger certificate issuance and check:
1. Server logs for email send confirmation
2. Patient email inbox
3. Check spam folder if not received

---

## External Integrations

### Cartório Integration

**When ready to connect:** Obtain API credentials from Cartório provider

Edit `lib/integration-services.ts` - `CartorioService.submitCertificate()`:

```typescript
// Replace TODO section with actual API call:
const cartorioResponse = await fetch(
  'https://api.your-cartorio.com/submit',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CARTORIO_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  }
)

const result = await cartorioResponse.json()
const protocolNumber = result.protocolNumber
```

Set environment variable:
```bash
CARTORIO_API_KEY=your_api_key_here
CARTORIO_ENDPOINT=https://api.cartorio.example.com
```

### SUS Integration

**When ready to connect:** Obtain DATASUS credentials from clinic's health ministry contact

Edit `lib/integration-services.ts` - `SUSService.registerMedicalRecord()`:

```typescript
// Implement HL7/FHIR message formatting
// Connect to DATASUS endpoint
// Parse SUS record ID response
```

Set environment variables:
```bash
DATASUS_ENDPOINT=https://datasus.example.com
DATASUS_USER=clinic_username
DATASUS_PASS=clinic_password
```

### Government Portal

**When ready to connect:** Register with government portal, receive API key and certificates

Edit `lib/integration-services.ts` - `GovernmentProtocolService.submitProtocol()`:

```typescript
// Authenticate using certificate's digital signature
// Submit via government portal API
// Parse protocol ID response
```

Set environment variables:
```bash
GOVERNMENT_API_KEY=your_api_key_here
GOVERNMENT_PORTAL_URL=https://portal.government.example.com
```

---

## Backup Management

### Enable Automatic Daily Backups

Add to your application startup (e.g., in middleware or pages/api/health.ts):

```typescript
import { initializeBackupSchedule } from '@/lib/certificate-backup-service'

// Call once at startup
if (process.env.ENABLE_BACKUP_SCHEDULE !== 'false') {
  initializeBackupSchedule()
}
```

Set environment variable:
```bash
ENABLE_BACKUP_SCHEDULE=true
BACKUP_RETENTION_DAYS=365
```

### Manual Backup Operations

**Create Backup:**
```bash
curl -X POST http://localhost:3000/api/admin/backup/create \
  -H "Content-Type: application/json" \
  -d '{"action": "CREATE"}'
```

**List Backups:**
```bash
curl http://localhost:3000/api/admin/backup/list
```

**Restore Backup:**
```bash
curl -X POST http://localhost:3000/api/admin/backup/create \
  -H "Content-Type: application/json" \
  -d '{
    "action": "RESTORE",
    "backupFilename": "backup-2024-12-16-1702750000.tar.gz"
  }'
```

---

## Testing

### Run Integration Tests

```bash
bash scripts/test-integration-system.sh
```

Validates:
- ✅ API health
- ✅ QR code generation
- ✅ Email service
- ✅ All integration endpoints
- ✅ Backup system
- ✅ Digital signatures
- ✅ TypeScript compilation

### Test Individual Certificate Issuance

1. Navigate to **Certificates → Novo Atestado**
2. Fill all required fields
3. Click **Emitir Atestado**
4. Observe:
   - Success message appears
   - Certificate listed in "Listagem"
   - Email sent (check console or email inbox)
   - PDF generated and downloadable

### Test QR Code

1. Issue a certificate
2. Download PDF
3. Verify QR code appears in bottom-right
4. Scan QR code with phone camera
5. Browser should open validation endpoint
6. Confirm certificate details display correctly

### Test Email

1. Configure SMTP settings
2. Issue certificate
3. Check recipient email inbox
4. Verify:
   - Email arrives (may take 30-60 seconds)
   - Contains certificate details
   - Includes validation link
   - Includes certificate number and dates

---

## Database Schema

### Core Tables

**MedicalCertificate**
- All certificate data
- Signature fields: `signature`, `signatureMethod`, `timestamp`
- Revocation fields: `revokedAt`, `revokedReason`
- QR code: `qrCodeData`

**IntegrationLog**
- Tracks external system submissions
- Fields: `integrationName`, `certificateId`, `status`, `externalProtocolId`
- Error tracking: `errorCount`, `lastError`

**AuditLog**
- Complete audit trail
- All certificate operations
- All backup operations
- User actions

### Useful Queries

**List all certificates:**
```sql
SELECT sequenceNumber, year, type, patient.name, doctor.name, createdAt
FROM medical_certificate
JOIN patient ON medical_certificate.patientId = patient.id
JOIN user AS doctor ON medical_certificate.doctorId = doctor.id
ORDER BY createdAt DESC;
```

**Find revoked certificates:**
```sql
SELECT * FROM medical_certificate
WHERE revokedAt IS NOT NULL
ORDER BY revokedAt DESC;
```

**Integration submission history:**
```sql
SELECT integrationName, status, COUNT(*) as count
FROM integration_log
GROUP BY integrationName, status;
```

**Recent backups:**
```sql
SELECT * FROM audit_log
WHERE action = 'BACKUP_CREATED'
ORDER BY createdAt DESC
LIMIT 10;
```

---

## Debugging

### Check Logs

**Server console:**
```
[QR Code] Generated for validation URL...
[Cartório Integration] Submission prepared...
[Email] Sending certificate issued notification...
[Backup Service] Backup created...
```

**Database logs:**
```sql
SELECT * FROM audit_log ORDER BY createdAt DESC LIMIT 20;
SELECT * FROM integration_log ORDER BY submittedAt DESC LIMIT 20;
```

### Common Issues

**Email not sending:**
- Check SMTP credentials in `.env.local`
- Verify Gmail app password is set correctly
- Check server console for email service errors
- Email failures are logged as warnings, not blocking

**QR code not appearing in PDF:**
- Check `lib/qrcode-generator.ts` is imported
- Verify validation URL is correct
- Check PDF rendering in `lib/pdf-generator.ts`
- QR failures are non-blocking, PDF still generates

**Signature verification failing:**
- Verify `private/clinic-key.pem` exists
- Check `public/certs/clinic-cert.pem` exists
- Ensure certificate hasn't expired (10-year validity)
- Check `lib/signature-service.ts` for PKI_LOCAL implementation

**Backup not creating:**
- Check `private/backups/` directory exists (created automatically)
- Verify `ENABLE_BACKUP_SCHEDULE=true`
- Check server logs for backup service messages
- Manually trigger: `curl -X POST .../api/admin/backup/create -d '{"action":"CREATE"}'`

---

## Development Tips

### Adding New Certificate Type

1. Edit `prisma/schema.prisma` - `CertificateType` enum
2. Add template in `lib/medical-certificate-service.ts` - `generateDefaultContent()`
3. Update email template if needed
4. Run migration: `npx prisma migrate dev`

### Customizing PDF Layout

Edit `lib/pdf-generator.ts`:
- Adjust positioning (line numbers and coordinates)
- Add clinic logo: Update `clinic.logoUrl` in Branding table
- Modify colors, fonts, spacing

### Adding New Integration

1. Create new service object in `lib/integration-services.ts`
2. Create API route in `app/api/integrations/[name]/route.ts`
3. Add to IntegrationLog with unique `integrationName`
4. Test via API endpoint

### Testing External APIs

Use PostMan or curl for testing:

```bash
# Test with authentication headers
curl -X POST http://localhost:3000/api/integrations/cartorio/submit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "certificateId": "test_id",
    "cartorioId": "test_cartorio",
    "registrationType": "FILING"
  }'
```

---

## Production Deployment Checklist

- [ ] All environment variables set
- [ ] SMTP credentials verified (test email sent)
- [ ] Database migrations applied
- [ ] Private keys backed up (`private/clinic-key.pem`)
- [ ] Backup schedule enabled
- [ ] External APIs credentials obtained
- [ ] SSL certificates configured
- [ ] HTTPS enforced
- [ ] Monitoring and alerts set up
- [ ] Backup restoration tested
- [ ] Admin role-based access configured
- [ ] Rate limiting enabled
- [ ] Logs aggregation set up
- [ ] Data encryption for sensitive fields enabled

---

## Next Steps

1. **Test Full Flow:** Issue certificate → Get email → Scan QR → View validation
2. **Configure SMTP:** Enable real email notifications
3. **Set Up Backups:** Enable automatic backup schedule
4. **Connect External APIs:** When credentials available
5. **Add Admin UI:** For backup and integration management
6. **Enable Monitoring:** Set up alerts for failures
7. **Deploy to Production:** Follow production checklist

---

## Support Resources

- **Documentation:** See `INTEGRATION_SYSTEM_DOCUMENTATION.md`
- **Complete Report:** See `MEDICAL_CERTIFICATE_COMPLETE_REPORT.md`
- **Prisma Docs:** https://www.prisma.io/docs/
- **Next.js Docs:** https://nextjs.org/docs
- **API Reference:** See inline comments in service files

---

**Last Updated:** 2024-12-16  
**Version:** 1.0
