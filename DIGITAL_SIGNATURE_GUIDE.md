# Digital Signature Implementation Guide

## Overview

Medical certificates now support **digital signatures** with two approaches:

1. **PKI Local** ✅ (Implemented) - Self-signed RSA certificates
2. **ICP-Brasil** 🔮 (Hooks ready) - Official ICP-Brasil certificates

---

## PKI Local (Self-Signed) - Currently Active

### Architecture

```
Certificate Data (JSON)
    ↓
SHA-256 Hash
    ↓
RSA Sign with Private Key (clinic-key.pem)
    ↓
Base64 Signature
    ↓
Stored in DB (signature column)
```

### Files

- **Private Key**: `private/clinic-key.pem` (2048-bit RSA, self-signed)
- **Public Cert**: `public/certs/clinic-cert.pem` (X.509, valid 10 years)
- **Service**: `lib/signature-service.ts`
  - `signWithPKILocal()` - Sign with private key
  - `verifyWithPKILocal()` - Verify with public cert

### Database Fields

```typescript
signature       String?   // Base64-encoded RSA signature
signatureMethod String    // "NONE" | "PKI_LOCAL" | "ICP_BRASIL"
```

### Flow: Issue Certificate

1. **Generate certificate data** (JSON with all fields)
2. **Sign with PKI_LOCAL**:
   ```typescript
   const signResult = signCertificate(data, 'PKI_LOCAL');
   // Returns: { signature: "base64...", method: "PKI_LOCAL", timestamp }
   ```
3. **Store in DB**:
   ```typescript
   certificate.signature = signResult.signature;
   certificate.signatureMethod = 'PKI_LOCAL';
   ```
4. **Render in PDF**: Signature shown as truncated string + method

### Flow: Public Validation

User visits: `/certificates/validate/{number}/{year}?hash={hash}`

**Endpoint**: `GET /api/certificates/verify/[number]/[year]`

1. Load certificate from DB
2. Reconstruct certificate data (same JSON format)
3. Verify signature:
   ```typescript
   const result = verifyCertificate(data, signature, 'PKI_LOCAL');
   // Returns: { valid: boolean, method, message }
   ```
4. Return status:
   - ✅ `{ valid: true, signed: true, method: "PKI_LOCAL" }` - Legit
   - ❌ `{ valid: false, signed: true }` - Forged or revoked

---

## ICP-Brasil (Future) - Hooks Ready

### What is ICP-Brasil?

- Official Brazilian Public Key Infrastructure
- Provides legally binding digital signatures
- Two main types:
  - **A1**: Software certificate (PFX/P12 file)
  - **A3**: Hardware token/smartcard

### Integration Points

All ICP-Brasil code goes in `lib/signature-service.ts`:

- `signWithICPBrasil(data, certPath, password)` - Currently throws NotImplemented
- `verifyWithICPBrasil(data, signature, certPath)` - Currently throws NotImplemented

### Implementation Options

#### Option 1: Hardware Token (A3) - Most Secure

**Requirements**:
- PKCS#11-compliant token (e.g., Safenet, Gemalto)
- OS drivers installed
- Node.js PKCS#11 wrapper

**Library**: `pkcs11js` or `node-pkcs11`

```typescript
import Pkcs11 from 'pkcs11js'

export function signWithICPBrasil(data: string, slotId: number, pin: string) {
  const pkcs11 = new Pkcs11()
  pkcs11.load('/path/to/pkcs11-driver.so') // Platform-specific
  
  const session = pkcs11.openSession(slotId)
  session.login(pin)
  
  const privateKey = pkcs11.findObjects({ class: 'private' })[0]
  const signature = session.sign('sha256', data, privateKey)
  
  return Buffer.from(signature).toString('base64')
}
```

#### Option 2: Software Certificate (A1) - Easier

**Requirements**:
- PFX/P12 file (certificate + private key)
- Password-protected

**Library**: `jsrsasign` or Java-based signer

```typescript
import { KJUR } from 'jsrsasign'

export function signWithICPBrasil(data: string, pfxPath: string, password: string) {
  const pfx = fs.readFileSync(pfxPath)
  const cert = KJUR.asn1.pemtobinary(pfx)
  
  // Decrypt PFX with password
  // Extract private key
  // Sign data
  // Return Base64 signature
}
```

#### Option 3: Cloud Signing Service - Recommended

**Requirements**:
- Account with SafeSign, OpenSignature, or similar
- API credentials

```typescript
import axios from 'axios'

export async function signWithICPBrasil(
  data: string,
  certificateId: string,
  apiKey: string
) {
  const response = await axios.post('https://cloud-signer.api/sign', {
    data,
    certificateId,
    hashAlgorithm: 'SHA256',
  }, {
    headers: { Authorization: `Bearer ${apiKey}` }
  })
  
  return response.data.signature
}
```

### Step-by-Step: Add ICP-Brasil

**1. Choose Implementation** (A3, A1, or Cloud)

**2. Update `signWithICPBrasil()`** in `lib/signature-service.ts`:
```typescript
export function signWithICPBrasil(
  data: string,
  certificatePath?: string,
  password?: string
): SignatureResult {
  // Replace throw with actual implementation
  // return { signature, method: 'ICP_BRASIL', timestamp }
}
```

**3. Update `verifyWithICPBrasil()`**:
```typescript
export function verifyWithICPBrasil(
  data: string,
  signature: string,
  certificatePath?: string
): VerificationResult {
  // Verify signature against ICP-Brasil certificate chain
  // Validate certificate is valid (not revoked, not expired)
  // Check against AC Raiz ICP-Brasil
  // return { valid, method: 'ICP_BRASIL', message }
}
```

**4. Update Model** if needed:
- Add fields for certificate enrollment/caching
- Add timestamp validation

**5. Update API** to support ICP-Brasil selection:
```typescript
// POST /api/certificates with signatureMethod
{
  "patientId": "...",
  "doctorId": "...",
  "signatureMethod": "ICP_BRASIL",  // Add this
  "content": "..."
}
```

**6. Test** with ICP-Brasil test certificates

---

## Security Considerations

### PKI Local (Current)

✅ **Good for**:
- MVP/Prototype
- Internal clinic use
- Testing workflows

❌ **Limitations**:
- No legal binding (court won't accept)
- Self-signed (can be forged)
- No timestamp authority
- Clinic key exposure = compromised all certs

### ICP-Brasil (Future)

✅ **Good for**:
- Legal/regulatory compliance
- Court/government recognition
- Binding force
- Professional use

⚠️ **Considerations**:
- Higher cost (certificate + infrastructure)
- Key management complexity
- Hardware/PIN management
- Integration testing required

---

## Database Schema

```sql
ALTER TABLE medical_certificates ADD COLUMN signature TEXT;
ALTER TABLE medical_certificates ADD COLUMN signatureMethod VARCHAR(50) DEFAULT 'NONE';
```

**Values**:
- `NONE` - Unsigned
- `PKI_LOCAL` - Self-signed
- `ICP_BRASIL` - Official Brazilian signature

---

## Public Verification API

**Endpoint**: `GET /api/certificates/verify/{number}/{year}`

**Parameters**:
- `signature` (query) - Base64-encoded signature

**Response**:
```json
{
  "valid": true,
  "signed": true,
  "method": "PKI_LOCAL",
  "message": "Signature verified",
  "revoked": false,
  "certificate": {
    "number": 1,
    "year": 2025,
    "type": "MEDICAL_LEAVE",
    "doctor": "Dr. João",
    "doctorCRM": "123456",
    "patient": { "name": "Maria" },
    "issuedAt": "2025-12-16T...",
    "revokedAt": null
  }
}
```

---

## PDF Rendering

**Included in Certificate PDF**:
- `Assinatura Digital: [first 32 chars]...`
- `Método: PKI_LOCAL`
- `Hash: [certificate data hash]`
- `Validar em: [public validation URL]`

When ICP-Brasil is implemented, it will show:
- `Assinatura Digital: [signature]`
- `Método: ICP_BRASIL`
- Full chain details (optional)

---

## Testing

### Local Testing

```bash
# 1. Check certificate
ls -lh private/clinic-key.pem public/certs/clinic-cert.pem

# 2. Start app
npm run dev

# 3. Run test script
bash scripts/test-signature-flow.sh

# 4. Issue a certificate (via UI or API)
# 5. Check DB: signature and signatureMethod columns populated

# 6. Validate public
curl "http://localhost:3000/api/certificates/verify/001/2025?signature=..."

# 7. Download PDF and check signature rendered
```

### ICP-Brasil Testing (When Ready)

- Request ICP-Brasil test certificate from AC
- Follow their PKCS#11 / API documentation
- Implement in `signWithICPBrasil()`
- Test with test AC environment
- Validate chain against test root

---

## Audit & Logging

All signature operations logged in `AuditLog`:

```typescript
{
  action: 'CERTIFICATE_SIGNED',
  entityType: 'MedicalCertificate',
  entityId: certificateId,
  metadata: {
    signatureMethod: 'PKI_LOCAL',
    timestamp: now()
  }
}
```

---

## Next Steps

1. **Monitor ICP-Brasil adoption** in Brazil (2025-2026)
2. **Plan integration** once business needs it
3. **Choose provider** (A3 token, A1 software, or cloud API)
4. **Implement in `signature-service.ts`**
5. **Test and validate** with official AC
6. **Deploy and inform users** of upgrade

---

## Reference Links

- **PKI Local**: Node.js `crypto` module (built-in)
- **ICP-Brasil**:
  - https://www.iti.gov.br (official AC root)
  - PKCS#11: https://en.wikipedia.org/wiki/PKCS_11
  - SafeSign (cloud): https://safesign.com.br
  - OpenSignature (cloud): https://www.opensignature.com

---

**Status**: ✅ PKI Local ready | 🔮 ICP-Brasil hooks in place
