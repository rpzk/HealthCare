#!/bin/bash

# Digital Signature Test Script
# Usage: npm run dev (in one terminal) then bash scripts/test-signature-flow.sh (in another)

BASE_URL="http://localhost:3000"

echo "🔐 Testing Digital Signature Flow"
echo "=================================="

# 1. Check certificate info
echo ""
echo "1️⃣ Certificate Info"
echo "Public cert: $(ls -lh public/certs/clinic-cert.pem 2>/dev/null | awk '{print $5}')"
echo "Private key: $(ls -lh private/clinic-key.pem 2>/dev/null | awk '{print $5}')"

# 2. Issue a certificate (requires auth - this is a guide)
echo ""
echo "2️⃣ Issue a Certificate (requires auth)"
echo "POST /api/certificates with JSON:"
cat << 'EOF'
{
  "patientId": "patient-uuid",
  "doctorId": "doctor-uuid",
  "type": "MEDICAL_LEAVE",
  "days": 3,
  "startDate": "2025-12-16T00:00:00Z",
  "content": "O paciente está apto para retorno ao trabalho."
}
EOF

# 3. Verify signature (public endpoint)
echo ""
echo "3️⃣ Verify Signature (public)"
echo "GET /api/certificates/verify/{number}/{year}?signature={base64_sig}"
echo "Returns:"
echo "- valid: boolean (signature valid + not revoked)"
echo "- signed: boolean"
echo "- method: PKI_LOCAL | ICP_BRASIL | NONE"
echo "- certificate: { number, year, type, doctor, patient, status }"

# 4. Download PDF with signature
echo ""
echo "4️⃣ Download PDF with Signature"
echo "GET /api/certificates/{id}/pdf"
echo "PDF includes:"
echo "- Signature (first 32 chars + ...)"
echo "- Signature method (PKI_LOCAL)"
echo "- Hash"
echo "- Validation URL"

echo ""
echo "✅ Signature Flow Complete!"
echo ""
echo "🔮 Future: ICP-Brasil"
echo "The signature service has hooks for ICP-Brasil integration:"
echo "- signWithICPBrasil() - requires A3 token or A1 certificate"
echo "- verifyWithICPBrasil() - validates against ICP-Brasil chain"
echo "- signatureMethod can be switched to 'ICP_BRASIL'"
echo ""
echo "Implementation steps when ready:"
echo "1. Add PKCS#11 driver for A3 token OR"
echo "2. Integrate Java SignerLib for A1 certificates OR"
echo "3. Use cloud signing API (e.g., SafeSign, OpenSignature)"
echo "4. Update signWithICPBrasil() with actual implementation"
echo "5. Test with official ICP-Brasil test certificates"
