# 🧪 Feature Testing Guide

**Quick reference for testing all implemented features**

---

## 1️⃣ NPS Survey Testing

### Test Endpoints

```bash
# Submit NPS response
curl -X POST http://localhost:3000/api/nps \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "patient123",
    "score": 9,
    "feedback": "Excellent service, very friendly staff!",
    "category": "staff_friendliness"
  }'

# Get NPS statistics
curl http://localhost:3000/api/nps/stats?startDate=2025-01-01&endDate=2025-12-31
```

### Frontend Test
1. Navigate to: `http://localhost:3000/admin/nps` (admin dashboard)
2. View NPS trends chart
3. See sentiment analysis breakdown

---

## 2️⃣ BI Dashboard Testing

### Test Endpoint

```bash
# Get BI metrics
curl "http://localhost:3000/api/bi/dashboard?startDate=2025-01-01&endDate=2025-12-31&departmentId=dept123"
```

### Frontend Test
1. Navigate to: `http://localhost:3000/admin/bi`
2. View charts for:
   - Patient acquisition trends
   - Appointment attendance rates
   - Revenue forecasting
   - Staff productivity
3. Test date range filters

---

## 3️⃣ Medication Tracking Testing

### Test Endpoints

```bash
# Record medication taken
curl -X POST http://localhost:3000/api/medications/tracking \
  -H "Content-Type: application/json" \
  -d '{
    "prescriptionItemId": "presc123",
    "takenAt": "2025-12-15T09:00:00Z",
    "dosage": "500mg",
    "notes": "Took with food"
  }'

# Get medication tracking history
curl "http://localhost:3000/api/medications/tracking?patientId=patient123&limit=10&offset=0"
```

### Frontend Test
1. Navigate to: `http://localhost:3000/prescriptions/medications`
2. View current medications checklist
3. Click "Mark as Taken" for a medication
4. Add optional notes
5. Submit and verify in list

---

## 4️⃣ Medical Certificates Testing

### Test Endpoints

```bash
# Create certificate
curl -X POST http://localhost:3000/api/certificates \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "patient123",
    "doctorId": "doctor123",
    "reason": "Medical leave",
    "startDate": "2025-12-15",
    "endDate": "2025-12-22",
    "workDays": 5,
    "notes": "Rest required"
  }'

# Validate certificate (public endpoint)
curl "http://localhost:3000/api/certificates/validate/2025/001234"

# Get certificate details
curl http://localhost:3000/api/certificates/cert-id-here
```

### Frontend Test
1. Navigate to: `http://localhost:3000/certificates`
2. Create new certificate
3. Fill form with patient, dates, reason
4. Download PDF
5. Use validation code on public portal

---

### 5️⃣ Digital Signatures Testing

### API Tests

```bash
# 1) Upload certificate (requires auth cookie/header)
curl -X POST http://localhost:3000/api/digital-signatures/certificates/upload \
  -H "Content-Type: application/json" \
  --cookie "next-auth.session-token=..." \
  -d '{
    "certificateType": "A1",
    "issuer": "ICP-Brasil/AC Certisign",
    "subject": "CN=Dr. João Silva, O=CRM-1234, C=BR",
    "serialNumber": "1234567890",
    "notBefore": "2025-01-01T00:00:00.000Z",
    "notAfter": "2026-01-01T00:00:00.000Z",
    "certificatePem": "-----BEGIN CERTIFICATE-----...-----END CERTIFICATE-----",
    "publicKeyPem": "-----BEGIN PUBLIC KEY-----...-----END PUBLIC KEY-----"
  }'

# 2) Sign document (requires auth)
curl -X POST http://localhost:3000/api/digital-signatures/sign \
  -H "Content-Type: application/json" \
  --cookie "next-auth.session-token=..." \
  -d '{
    "certificateId": "<id-from-upload>",
    "documentType": "PRESCRIPTION",
    "documentId": "RX-001",
    "originalContent": "<full-original-text-or-json>",
    "signatureValue": "<base64-signature-from-client-token>",
    "signatureAlgorithm": "SHA256withRSA"
  }'

# 3) Validate signature by hash (public)
curl http://localhost:3000/api/digital-signatures/validate/<sha256-hash>
```

### Database Verification

```bash
# Check if certificate and signatures exist in DB
psql -h localhost -U healthcare -d healthcare_db -c "SELECT id, serial_number, is_active FROM digital_certificates ORDER BY created_at DESC LIMIT 5;"
psql -h localhost -U healthcare -d healthcare_db -c "SELECT id, document_type, document_id, signature_hash FROM signed_documents ORDER BY created_at DESC LIMIT 5;"
```

---

## 6️⃣ Backup Testing

### Verify Backup Setup

```bash
# Check if backup script is executable
ls -la backup-db.sh
ls -la scripts/healthcare-backup.sh

# Check cron job
crontab -l | grep healthcare-backup

# Test backup manually
./backup-db.sh

# Verify backup file
ls -lh backups/
```

---

## 📋 Full Integration Test Checklist

- [ ] **NPS**: Submit feedback → Check in admin dashboard → Verify sentiment tags
- [ ] **BI**: View dashboard → Filter by date range → Check all KPIs load
- [ ] **Medications**: Mark medication as taken → Check history → Verify notes save
- [ ] **Certificates**: Create certificate → Generate PDF → Validate code → Check patient receives
- [ ] **Digital Sig**: Verify schema is synced → Check User relations created
- [ ] **Backup**: Run backup script → Verify file created → Check timestamp

---

## 🔧 Troubleshooting

### NPS Issues
- **No data showing**: Check if `npx prisma generate` was run
- **API 404**: Verify [app/api/nps/route.ts](../app/api/nps/route.ts) exists
- **Dashboard blank**: Clear browser cache and reload

### Medication Tracking
- **Can't submit**: Check prescriptionItemId is valid and exists
- **History empty**: Run GET endpoint with correct filters
- **Type errors**: Run `npm run type-check`

### Digital Signatures
- **Schema sync failed**: Run `npx prisma db push --skip-generate`
- **Relations error**: Check User model has correct relation names
- **Certificate upload fails**: Verify fileSize and mimeType fields

### Backup Issues
- **Script not found**: Check script location and permissions
- **Cron not running**: Check `crontab -l` and email logs
- **Backup corrupted**: Verify database connection and pg_dump availability

---

## 📊 Expected Test Results

| Feature | Endpoint | Expected Response |
|---------|----------|------------------|
| **NPS** | POST /api/nps | 201 + NPS ID |
| **NPS** | GET /api/nps/stats | 200 + JSON metrics |
| **BI** | GET /api/bi/dashboard | 200 + KPI data |
| **Medications** | POST /api/medications/tracking | 201 + tracking ID |
| **Medications** | GET /api/medications/tracking | 200 + array of records |
| **Certificates** | POST /api/certificates | 201 + certificate number |
| **Certificates** | GET /api/certificates/validate/YYYY/NNNN | 200 + validation status |
| **Backup** | Run backup-db.sh | Exit 0 + backup file created |

---

**Last Updated:** December 15, 2025  
**All features ready for testing** ✅
