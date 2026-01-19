$ErrorActionPreference = 'Stop'

$headers = @{
  "x-test-user" = "tester"
  "x-test-role" = "ADMIN"
  "x-test-user-id" = "99"
}

$url = "http://localhost:3000/api/patients?page=1&limit=1"
Write-Host "GET $url" -ForegroundColor Cyan
$resp = Invoke-WebRequest -Uri $url -Method Get -Headers $headers -ErrorAction Stop
Write-Host ("Status: {0}" -f $resp.StatusCode) -ForegroundColor Green
if ($resp.Content) {
  try {
    $json = $resp.Content | ConvertFrom-Json
    ($json | ConvertTo-Json -Depth 5) | Write-Output
  } catch {
    Write-Host "Non-JSON response body:" -ForegroundColor Yellow
    Write-Output $resp.Content
  }
} else {
  Write-Host "Empty response body" -ForegroundColor Yellow
}
