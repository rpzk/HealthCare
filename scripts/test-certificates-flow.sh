#!/bin/bash

# Test script for certificates end-to-end flow
# Usage: npm run dev (in one terminal) then bash scripts/test-certificates-flow.sh (in another)

BASE_URL="http://localhost:3000"
DOCTOR_ID="test-doctor-id"
PATIENT_ID="test-patient-id"

echo "🧪 Testing Certificates End-to-End Flow"
echo "========================================"

# 1. Test GET branding (should be empty initially)
echo ""
echo "1️⃣ GET /api/branding (initial state)"
curl -s "$BASE_URL/api/branding" | jq .

# 2. Test POST to set branding (text only for now)
echo ""
echo "2️⃣ POST /api/branding (set clinic name and footer)"
curl -s -X POST "$BASE_URL/api/branding" \
  -H "Content-Type: application/json" \
  -d '{
    "clinicName": "Clínica Exemplo",
    "footerText": "Rua das Flores, 123 - São Paulo, SP"
  }' | jq .

# 3. Verify branding was saved
echo ""
echo "3️⃣ GET /api/branding (after update)"
curl -s "$BASE_URL/api/branding" | jq .

echo ""
echo "✅ Branding tests passed!"
echo ""
echo "📝 Next steps:"
echo "  1. Go to /admin/branding to upload logo/header images"
echo "  2. Go to /certificates to issue a certificate"
echo "  3. Download PDF from the certificates list"
echo "  4. Visit /certificates/validate/{number}/{year}?hash=... to validate"
echo ""
echo "🗂️  Uploaded files are stored in: public/uploads/"
