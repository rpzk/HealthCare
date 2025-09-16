$ErrorActionPreference = 'Stop'

$headers = @{
  "x-test-user" = "tester"
  "x-test-role" = "ADMIN"
  "x-test-user-id" = "99"
}

Write-Host "Fetching one patient..." -ForegroundColor Cyan
$patients = Invoke-RestMethod -Uri "http://localhost:3000/api/patients?page=1&limit=1" -Method Get -Headers $headers

if (-not $patients -or -not $patients.patients -or $patients.patients.Count -lt 1) {
  throw "Nenhum paciente encontrado para vincular a prescrição. Cadastre um paciente primeiro."
}

$patientId = $patients.patients[0].id
Write-Host "Using patientId: $patientId" -ForegroundColor Yellow

$payload = @{
  patientId = $patientId
  medications = @(
    @{ name = "Amoxicilina"; dosage = "500mg"; frequency = "8/8h"; duration = "7 dias"; instructions = "Após refeições" }
  )
  notes = "Prescrição de teste via script"
}

$body = $payload | ConvertTo-Json -Depth 5

Write-Host "Sending POST to /api/prescriptions..." -ForegroundColor Cyan
try {
  $resp = Invoke-WebRequest -Uri "http://localhost:3000/api/prescriptions" -Method Post -Headers $headers -Body $body -ContentType "application/json" -ErrorAction Stop
  Write-Host ("Status: {0}" -f $resp.StatusCode) -ForegroundColor Green
  $resp.Content | Out-String | Write-Output
}
catch {
  if ($_.Exception.Response -ne $null) {
    $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $errContent = $sr.ReadToEnd()
    Write-Host ("HTTP error: {0}" -f $_.Exception.Response.StatusCode.value__) -ForegroundColor Red
    Write-Output $errContent
  } else {
    throw
  }
}
