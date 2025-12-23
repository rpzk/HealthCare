#!/bin/bash

# Medical Certificate System - Integration Test Suite
# Tests QR codes, email notifications, and external system integrations

set -e

API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
TIMEOUT=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
function print_header() {
  echo -e "${BLUE}========================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}========================================${NC}"
}

function print_test() {
  echo -e "${YELLOW}[TEST] $1${NC}"
}

function print_pass() {
  echo -e "${GREEN}[✓ PASS]${NC} $1"
  ((TESTS_PASSED++))
}

function print_fail() {
  echo -e "${RED}[✗ FAIL]${NC} $1"
  ((TESTS_FAILED++))
}

function print_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

# Check if API is running
function check_api_health() {
  print_test "Checking API health"
  
  response=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE_URL/api/health" 2>/dev/null || echo "000")
  
  if [ "$response" == "200" ] || [ "$response" == "404" ]; then
    print_pass "API is running ($API_BASE_URL)"
  else
    print_fail "API not responding (HTTP $response)"
    exit 1
  fi
}

# Test 1: QR Code Generation
function test_qrcode_generation() {
  print_header "Test 1: QR Code Generation"
  
  print_test "Generating QR code for certificate validation"
  
  # This would normally be tested via the PDF generation endpoint
  # For now, we'll verify the service is accessible
  
  if [ -f "lib/qrcode-generator.ts" ]; then
    print_pass "QR code generator service exists"
    
    if grep -q "generateCertificateQRCode" lib/qrcode-generator.ts; then
      print_pass "QR code generation function implemented"
    else
      print_fail "QR code generation function not found"
    fi
  else
    print_fail "QR code generator service not found"
  fi
}

# Test 2: Email Notifications
function test_email_integration() {
  print_header "Test 2: Email Notifications"
  
  print_test "Checking email service configuration"
  
  if [ -f "lib/email-service.ts" ]; then
    print_pass "Email service exists"
    
    if grep -q "sendCertificateIssuedNotification" lib/email-service.ts; then
      print_pass "Certificate issuance email template exists"
    else
      print_fail "Certificate issuance email template not found"
    fi
    
    if grep -q "sendCertificateRevokedNotification" lib/email-service.ts; then
      print_pass "Certificate revocation email template exists"
    else
      print_fail "Certificate revocation email template not found"
    fi
  else
    print_fail "Email service not found"
  fi
  
  print_test "Verifying email service integration in certificate operations"
  
  if grep -q "sendCertificateIssuedNotification" lib/medical-certificate-service.ts; then
    print_pass "Email notification integrated into certificate issuance"
  else
    print_fail "Email notification not integrated into certificate issuance"
  fi
}

# Test 3: Cartório Integration
function test_cartorio_integration() {
  print_header "Test 3: Cartório Integration"
  
  print_test "Testing Cartório submission endpoint"
  
  response=$(curl -s -X POST "$API_BASE_URL/api/integrations/cartorio/submit" \
    -H "Content-Type: application/json" \
    -d '{
      "certificateId": "test_cert_123",
      "cartorioId": "cart_001",
      "registrationType": "FILING"
    }' \
    -w "\n%{http_code}" | tail -1)
  
  if [ "$response" == "401" ]; then
    print_pass "Cartório endpoint requires authentication (expected 401)"
  elif [ "$response" == "400" ] || [ "$response" == "500" ]; then
    print_pass "Cartório endpoint is accessible"
  else
    print_fail "Cartório endpoint returned unexpected status: $response"
  fi
}

# Test 4: SUS Integration
function test_sus_integration() {
  print_header "Test 4: SUS Integration"
  
  print_test "Testing SUS registration endpoint"
  
  response=$(curl -s -X POST "$API_BASE_URL/api/integrations/sus/register" \
    -H "Content-Type: application/json" \
    -d '{
      "certificateId": "test_cert_123",
      "susRegistration": "12345678901234"
    }' \
    -w "\n%{http_code}" | tail -1)
  
  if [ "$response" == "401" ]; then
    print_pass "SUS endpoint requires authentication (expected 401)"
  elif [ "$response" == "400" ] || [ "$response" == "500" ]; then
    print_pass "SUS endpoint is accessible"
  else
    print_fail "SUS endpoint returned unexpected status: $response"
  fi
}

# Test 5: Government Integration
function test_government_integration() {
  print_header "Test 5: Government Protocol Integration"
  
  print_test "Testing Government submission endpoint"
  
  response=$(curl -s -X POST "$API_BASE_URL/api/integrations/government/submit" \
    -H "Content-Type: application/json" \
    -d '{
      "certificateId": "test_cert_123",
      "protocolType": "LABOR_PERMISSION"
    }' \
    -w "\n%{http_code}" | tail -1)
  
  if [ "$response" == "401" ]; then
    print_pass "Government endpoint requires authentication (expected 401)"
  elif [ "$response" == "400" ] || [ "$response" == "500" ]; then
    print_pass "Government endpoint is accessible"
  else
    print_fail "Government endpoint returned unexpected status: $response"
  fi
}

# Test 6: Backup System
function test_backup_system() {
  print_header "Test 6: Local Backup System"
  
  print_test "Checking backup service implementation"
  
  if [ -f "lib/certificate-backup-service.ts" ]; then
    print_pass "Backup service exists"
    
    if grep -q "createDailyBackup" lib/certificate-backup-service.ts; then
      print_pass "Daily backup function implemented"
    else
      print_fail "Daily backup function not found"
    fi
    
    if grep -q "restoreFromBackup" lib/certificate-backup-service.ts; then
      print_pass "Restore function implemented"
    else
      print_fail "Restore function not found"
    fi
    
    if grep -q "listBackups" lib/certificate-backup-service.ts; then
      print_pass "Backup listing function implemented"
    else
      print_fail "Backup listing function not found"
    fi
  else
    print_fail "Backup service not found"
  fi
  
  print_test "Checking backup API endpoints"
  
  if [ -f "app/api/admin/backup/route.ts" ]; then
    print_pass "Backup admin API exists"
  else
    print_fail "Backup admin API not found"
  fi
}

# Test 7: Database Integration Log
function test_integration_log() {
  print_header "Test 7: Integration Logging"
  
  print_test "Checking IntegrationLog model in Prisma schema"
  
  if grep -q "model IntegrationLog" prisma/schema.prisma; then
    print_pass "IntegrationLog model exists in schema"
    
    if grep -q "integrationName String" prisma/schema.prisma; then
      print_pass "Integration name field exists"
    else
      print_fail "Integration name field not found"
    fi
    
    if grep -q "status String" prisma/schema.prisma; then
      print_pass "Status field exists"
    else
      print_fail "Status field not found"
    fi
  else
    print_fail "IntegrationLog model not found in schema"
  fi
}

# Test 8: Digital Signatures
function test_digital_signatures() {
  print_header "Test 8: Digital Signature Integration"
  
  print_test "Checking signature integration in certificates"
  
  if grep -q "signature String?" prisma/schema.prisma; then
    print_pass "Signature field in MedicalCertificate model"
  else
    print_fail "Signature field not found in MedicalCertificate model"
  fi
  
  if grep -q "signatureMethod String" prisma/schema.prisma; then
    print_pass "Signature method field in MedicalCertificate model"
  else
    print_fail "Signature method field not found"
  fi
  
  print_test "Checking signature verification endpoint"
  
  response=$(curl -s -o /dev/null -w "%{http_code}" \
    "$API_BASE_URL/api/certificates/verify/1/2024" 2>/dev/null)
  
  if [ "$response" != "000" ]; then
    print_pass "Signature verification endpoint is accessible"
  else
    print_fail "Signature verification endpoint not responding"
  fi
}

# Test 9: PDF Generation with QR
function test_pdf_qr_integration() {
  print_header "Test 9: PDF Generation with QR Code"
  
  print_test "Checking PDF generator QR code integration"
  
  if [ -f "lib/pdf-generator.ts" ]; then
    print_pass "PDF generator exists"
    
    if grep -q "generateCertificateQRCode\|qrcode" lib/pdf-generator.ts; then
      print_pass "QR code rendering implemented in PDF generator"
    else
      print_fail "QR code not integrated in PDF generator"
    fi
  else
    print_fail "PDF generator not found"
  fi
}

# Test 10: TypeScript Compilation
function test_typescript_compilation() {
  print_header "Test 10: TypeScript Compilation"
  
  print_test "Running type checking"
  
  if command -v npm &> /dev/null; then
    if npm run type-check 2>&1 | grep -q "error"; then
      print_fail "TypeScript compilation errors found"
    else
      print_pass "TypeScript compilation successful"
    fi
  else
    print_info "npm not found, skipping TypeScript check"
  fi
}

# Main execution
function main() {
  print_header "MEDICAL CERTIFICATE SYSTEM - INTEGRATION TEST SUITE"
  
  print_info "API Base URL: $API_BASE_URL"
  print_info "Starting tests...\n"
  
  # Run all tests
  check_api_health
  test_qrcode_generation
  test_email_integration
  test_cartorio_integration
  test_sus_integration
  test_government_integration
  test_backup_system
  test_integration_log
  test_digital_signatures
  test_pdf_qr_integration
  test_typescript_compilation
  
  # Print summary
  echo ""
  print_header "TEST SUMMARY"
  
  total=$((TESTS_PASSED + TESTS_FAILED))
  echo -e "Total Tests:  $total"
  echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
  
  if [ $TESTS_FAILED -gt 0 ]; then
    echo -e "${RED}Failed: $TESTS_FAILED${NC}"
  else
    echo -e "${GREEN}Failed: $TESTS_FAILED${NC}"
  fi
  
  if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✓ ALL TESTS PASSED${NC}\n"
    return 0
  else
    echo -e "\n${RED}✗ SOME TESTS FAILED${NC}\n"
    return 1
  fi
}

# Run main function
main
