param(
  [string]$Id
)

$ErrorActionPreference = 'Stop'

if (-not $Id) {
  Write-Host "Fetching latest prescription id..." -ForegroundColor Cyan
  $headers = @{ "x-test-user" = "tester"; "x-test-role" = "ADMIN"; "x-test-user-id" = "99" }
  $list = Invoke-RestMethod -Uri "http://localhost:3000/api/prescriptions?page=1&limit=1" -Method Get -Headers $headers
  if (-not $list -or -not $list.prescriptions -or $list.prescriptions.Count -lt 1) {
    throw "Nenhuma prescrição encontrada"
  }
  $Id = $list.prescriptions[0].id
}

$headers = @{ "x-test-user" = "tester"; "x-test-role" = "ADMIN"; "x-test-user-id" = "99" }
$url = "http://localhost:3000/api/prescriptions/$Id"
Write-Host "GET $url" -ForegroundColor Cyan
$resp = Invoke-WebRequest -Uri $url -Method Get -Headers $headers -ErrorAction Stop
Write-Host ("Status: {0}" -f $resp.StatusCode) -ForegroundColor Green
if ($resp.Content) {
  try {
    $json = $resp.Content | ConvertFrom-Json
    ($json | ConvertTo-Json -Depth 6) | Write-Output
  } catch {
    Write-Host "Non-JSON response body:" -ForegroundColor Yellow
    Write-Output $resp.Content
  }
} else {
  Write-Host "Empty response body" -ForegroundColor Yellow
}
