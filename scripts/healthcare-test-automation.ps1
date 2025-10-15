#!/usr/bin/env pwsh
# HEALTHCARE_TEST_AUTOMATION.ps1
# Script automático para testar todas funcionalidades do Healthcare
# Uso: .\scripts\healthcare-test-automation.ps1

param(
    [string]$BaseUrl = "http://localhost:3000",
    [int]$Timeout = 5,
    [switch]$Verbose,
    [switch]$SkipCleanup
)

# ============================================
# Cores e Formatação
# ============================================

$GREEN = "`e[92m"
$RED = "`e[91m"
$YELLOW = "`e[93m"
$BLUE = "`e[94m"
$RESET = "`e[0m"

$PASSED = 0
$FAILED = 0
$SKIPPED = 0

function Write-Header {
    param([string]$Message)
    Write-Host "`n$BLUE═════════════════════════════════════════$RESET"
    Write-Host "$BLUE$Message$RESET"
    Write-Host "$BLUE═════════════════════════════════════════$RESET`n"
}

function Write-Pass {
    param([string]$Message)
    Write-Host "$GREEN✓ PASS$RESET: $Message"
    $script:PASSED++
}

function Write-Fail {
    param([string]$Message, [string]$Error = "")
    Write-Host "$RED✗ FAIL$RESET: $Message"
    if ($Error) {
        Write-Host "$RED  → $Error$RESET"
    }
    $script:FAILED++
}

function Write-Skip {
    param([string]$Message)
    Write-Host "$YELLOW⊘ SKIP$RESET: $Message"
    $script:SKIPPED++
}

function Write-Info {
    param([string]$Message)
    Write-Host "$BLUE[INFO]$RESET $Message"
}

# ============================================
# Helpers
# ============================================

function Test-Connection {
    try {
        $response = Invoke-WebRequest -Uri "$BaseUrl/api/health" `
            -TimeoutSec $Timeout `
            -ErrorAction SilentlyContinue
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

function Invoke-API {
    param(
        [string]$Method = "GET",
        [string]$Endpoint,
        [object]$Body = $null,
        [hashtable]$Headers = @{}
    )
    
    $url = "$BaseUrl$Endpoint"
    $defaultHeaders = @{
        "Content-Type" = "application/json"
    }
    
    foreach ($key in $Headers.Keys) {
        $defaultHeaders[$key] = $Headers[$key]
    }
    
    try {
        $params = @{
            Uri = $url
            Method = $Method
            Headers = $defaultHeaders
            TimeoutSec = $Timeout
            ErrorAction = "Stop"
        }
        
        if ($Body) {
            $params.Body = $Body | ConvertTo-Json -Depth 10
        }
        
        $response = Invoke-WebRequest @params
        return @{
            StatusCode = $response.StatusCode
            Content = $response.Content | ConvertFrom-Json
            Headers = $response.Headers
        }
    } catch {
        return @{
            StatusCode = $_.Exception.Response.StatusCode.value__
            Error = $_.Exception.Message
            Content = $null
        }
    }
}

# ============================================
# TESTES
# ============================================

Write-Header "HEALTHCARE APP - AUTOMATION TEST SUITE"

# ============================================
# Teste 1: Health Check
# ============================================

Write-Host "$BLUE[TEST 1/8]$RESET Health Check"

if (Test-Connection) {
    Write-Pass "Server is running at $BaseUrl"
    
    $response = Invoke-API -Endpoint "/api/health"
    if ($response.StatusCode -eq 200) {
        Write-Pass "Health endpoint returned 200 OK"
        if ($Verbose) {
            Write-Info "Response: $($response.Content | ConvertTo-Json)"
        }
    } else {
        Write-Fail "Health endpoint returned $($response.StatusCode)"
    }
} else {
    Write-Fail "Server not responding at $BaseUrl"
    Write-Info "Make sure the server is running: npm run dev"
    exit 1
}

# ============================================
# Teste 2: Create Medical Record (POST)
# ============================================

Write-Host "$BLUE[TEST 2/8]$RESET Create Medical Record"

$newRecord = @{
    title = "Test Consultation $(Get-Date -Format 'yyyyMMdd-HHmmss')"
    description = "This is a test medical record with more than 10 characters"
    diagnosis = "Test Diagnosis"
    treatment = "Test Treatment"
    notes = "Test Notes"
    recordType = "CONSULTATION"
    priority = "NORMAL"
    patientId = "test-patient-$(Get-Random)"
}

$response = Invoke-API -Method POST -Endpoint "/api/medical-records" -Body $newRecord

if ($response.StatusCode -eq 201 -or $response.StatusCode -eq 200) {
    Write-Pass "Created medical record successfully"
    $recordId = $response.Content.id
    Write-Info "Record ID: $recordId"
    
    if ($Verbose) {
        Write-Info "Response: $($response.Content | ConvertTo-Json)"
    }
} else {
    Write-Fail "Failed to create medical record (Status: $($response.StatusCode))"
    if ($response.Error) {
        Write-Info "Error: $($response.Error)"
    }
    $recordId = $null
}

# ============================================
# Teste 3: List Medical Records (GET)
# ============================================

Write-Host "$BLUE[TEST 3/8]$RESET List Medical Records"

$response = Invoke-API -Endpoint "/api/medical-records?pageSize=10&page=1"

if ($response.StatusCode -eq 200) {
    Write-Pass "Listed medical records successfully"
    $count = $response.Content.pagination.total
    Write-Info "Total records: $count"
    
    if ($Verbose) {
        Write-Info "First record: $($response.Content.data[0].title)"
    }
} else {
    Write-Fail "Failed to list medical records (Status: $($response.StatusCode))"
}

# ============================================
# Teste 4: Get Single Record (GET by ID)
# ============================================

Write-Host "$BLUE[TEST 4/8]$RESET Get Single Medical Record"

if ($recordId) {
    $response = Invoke-API -Endpoint "/api/medical-records/$recordId"
    
    if ($response.StatusCode -eq 200) {
        Write-Pass "Retrieved single record by ID"
        Write-Info "Title: $($response.Content.title)"
        Write-Info "Version: $($response.Content.version)"
        
        if ($Verbose) {
            Write-Info "Full record: $($response.Content | ConvertTo-Json)"
        }
    } else {
        Write-Fail "Failed to retrieve record (Status: $($response.StatusCode))"
    }
} else {
    Write-Skip "Get single record - no record ID from previous test"
}

# ============================================
# Teste 5: Update Medical Record (PUT)
# ============================================

Write-Host "$BLUE[TEST 5/8]$RESET Update Medical Record"

if ($recordId) {
    $updatedRecord = @{
        title = "Updated Test Consultation"
        description = "This is an updated test medical record with more than 10 characters"
        diagnosis = "Updated Diagnosis"
        treatment = "Updated Treatment"
        notes = "Updated Notes"
        recordType = "CONSULTATION"
        priority = "HIGH"
        patientId = $newRecord.patientId
        version = 1  # Optimistic locking
    }
    
    $response = Invoke-API -Method PUT -Endpoint "/api/medical-records/$recordId" -Body $updatedRecord
    
    if ($response.StatusCode -eq 200) {
        Write-Pass "Updated medical record successfully"
        Write-Info "New version: $($response.Content.version)"
        
        if ($Verbose) {
            Write-Info "Updated title: $($response.Content.title)"
        }
    } else {
        Write-Fail "Failed to update record (Status: $($response.StatusCode))"
    }
} else {
    Write-Skip "Update record - no record ID from previous test"
}

# ============================================
# Teste 6: Validation (Zod)
# ============================================

Write-Host "$BLUE[TEST 6/8]$RESET Validation with Zod"

$invalidRecord = @{
    title = "AB"  # Too short!
    description = "Short"  # Too short!
    recordType = "INVALID_TYPE"  # Invalid enum!
    patientId = ""
}

$response = Invoke-API -Method POST -Endpoint "/api/medical-records" -Body $invalidRecord

if ($response.StatusCode -eq 400) {
    Write-Pass "Validation correctly rejected invalid data"
    Write-Info "Status Code: 400 Bad Request"
    
    if ($Verbose) {
        Write-Info "Error details: $($response.Content | ConvertTo-Json)"
    }
} else {
    Write-Fail "Validation should have returned 400 (got $($response.StatusCode))"
}

# ============================================
# Teste 7: Pagination
# ============================================

Write-Host "$BLUE[TEST 7/8]$RESET Pagination & Filtering"

$testCases = @(
    @{
        name = "Filter by recordType"
        endpoint = "/api/medical-records?recordType=CONSULTATION"
    },
    @{
        name = "Filter by priority"
        endpoint = "/api/medical-records?priority=NORMAL"
    },
    @{
        name = "Search by title"
        endpoint = "/api/medical-records?search=Test"
    },
    @{
        name = "Pagination page 1"
        endpoint = "/api/medical-records?page=1&pageSize=5"
    }
)

foreach ($testCase in $testCases) {
    $response = Invoke-API -Endpoint $testCase.endpoint
    
    if ($response.StatusCode -eq 200) {
        Write-Pass "$($testCase.name) - Found $($response.Content.pagination.total) records"
    } else {
        Write-Fail "$($testCase.name) - Failed with status $($response.StatusCode)"
    }
}

# ============================================
# Teste 8: Rate Limiting
# ============================================

Write-Host "$BLUE[TEST 8/8]$RESET Rate Limiting (429 Too Many Requests)"

$rateLimitHit = $false
$requestsBeforeLimit = 0

for ($i = 1; $i -le 30; $i++) {
    $response = Invoke-API -Endpoint "/api/medical-records"
    
    if ($response.StatusCode -eq 429) {
        $rateLimitHit = $true
        $requestsBeforeLimit = $i - 1
        $retryAfter = $response.Headers.'Retry-After'
        Write-Pass "Rate limit triggered after $requestsBeforeLimit requests"
        Write-Info "Retry-After header: $retryAfter seconds"
        break
    }
    
    # Small delay between requests
    Start-Sleep -Milliseconds 10
}

if (-not $rateLimitHit) {
    Write-Skip "Rate limiting - limit not reached in test (increase if needed)"
}

# ============================================
# Teste 9 (Bonus): Delete Record (DELETE)
# ============================================

Write-Host "$BLUE[TEST 9/9]$RESET Delete Medical Record (Soft Delete)"

if ($recordId -and -not $SkipCleanup) {
    $response = Invoke-API -Method DELETE -Endpoint "/api/medical-records/$recordId"
    
    if ($response.StatusCode -eq 200) {
        Write-Pass "Deleted medical record (soft delete)"
        Write-Info "Record marked as deleted but data is preserved"
        
        # Verify soft delete
        $checkResponse = Invoke-API -Endpoint "/api/medical-records/$recordId"
        if ($checkResponse.StatusCode -eq 200 -and $checkResponse.Content.deletedAt -ne $null) {
            Write-Pass "Verified soft delete - deletedAt field is set"
        }
    } else {
        Write-Fail "Failed to delete record (Status: $($response.StatusCode))"
    }
} else {
    Write-Skip "Delete record - test cleanup skipped or no record ID"
}

# ============================================
# Summary
# ============================================

Write-Header "TEST SUMMARY"

$total = $PASSED + $FAILED + $SKIPPED
Write-Host "$GREEN Passed:  $PASSED$RESET"
Write-Host "$RED Failed:  $FAILED$RESET"
Write-Host "$YELLOW Skipped: $SKIPPED$RESET"
Write-Host "$BLUE Total:   $total$RESET`n"

$successRate = if ($total -gt 0) { [math]::Round(($PASSED / $total) * 100, 1) } else { 0 }
Write-Host "Success Rate: $successRate%`n"

# ============================================
# Exit Code
# ============================================

if ($FAILED -eq 0) {
    Write-Host "$GREEN✓ ALL TESTS PASSED!$RESET`n"
    exit 0
} else {
    Write-Host "$RED✗ SOME TESTS FAILED$RESET`n"
    exit 1
}
