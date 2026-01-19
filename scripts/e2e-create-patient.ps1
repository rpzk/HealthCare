$ErrorActionPreference = 'Stop'

$headers = @{
  "x-test-user" = "tester"
  "x-test-role" = "ADMIN"
  "x-test-user-id" = "99"
}

$payload = @{
  name = "Paciente Teste"
  email = "paciente.teste+$(Get-Random)@example.com"
  phone = "+55 11 99999-0000"
  birthDate = "1990-01-01"
  gender = "OTHER"
  allergies = @("Nenhuma")
  # Campos obrigatórios pelo validador Zod
  cpf = "123.456.789-00"
  # Fornecer um CUID válido só para passar na validação; o backend usará user.id para vincular
  doctorId = "ckv8hn3cq00000123456789ab"
}

$body = $payload | ConvertTo-Json -Depth 5

Write-Host "Creating patient via /api/patients..." -ForegroundColor Cyan
try {
  $resp = Invoke-WebRequest -Uri "http://localhost:3000/api/patients" -Method Post -Headers $headers -Body $body -ContentType "application/json" -ErrorAction Stop
  Write-Host ("Status: {0}" -f $resp.StatusCode) -ForegroundColor Green
  $json = $resp.Content | ConvertFrom-Json
  Write-Host ("Created patient: {0} ({1})" -f $json.id, $json.name) -ForegroundColor Yellow
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
