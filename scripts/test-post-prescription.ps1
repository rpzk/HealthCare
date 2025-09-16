$headers = @{
  "x-test-user" = "tester"
  "x-test-role" = "ADMIN"
  "x-test-user-id" = "99"
}

$payload = @{
  patientId = "123"
  medications = @(
    @{
      name = "Amoxicilina"
      dosage = "500mg"
      frequency = "8/8h"
      duration = "7 dias"
      instructions = "Após refeições"
    }
  )
  notes = "Teste via PowerShell"
}

$body = $payload | ConvertTo-Json -Depth 5

Write-Host "Sending POST to /api/prescriptions..." -ForegroundColor Cyan
$response = Invoke-RestMethod -Uri "http://localhost:3000/api/prescriptions" -Method Post -Headers $headers -Body $body -ContentType "application/json"

Write-Host "Response:" -ForegroundColor Green
$response | ConvertTo-Json -Depth 5
