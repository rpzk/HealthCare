param(
  [Parameter(Mandatory=$true)][string]$Id
)

$ErrorActionPreference = 'Stop'
$headers = @{ "x-test-user"="tester"; "x-test-role"="ADMIN"; "x-test-user-id"="99" }
$url = "http://localhost:3000/api/prescriptions/$Id"
Write-Host "DELETE $url" -ForegroundColor Cyan
try {
  $resp = Invoke-WebRequest -Uri $url -Method Delete -Headers $headers -ErrorAction Stop
  Write-Host ("Status: {0}" -f $resp.StatusCode) -ForegroundColor Green
  if ($resp.Content) { $resp.Content | Out-String | Write-Output } else { Write-Host 'No content' -ForegroundColor Yellow }
} catch {
  if ($null -ne $_.Exception.Response) {
    $code = $_.Exception.Response.StatusCode.value__
    Write-Host ("HTTP error: {0}" -f $code) -ForegroundColor Red
    $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $errContent = $sr.ReadToEnd()
    Write-Output $errContent
  } else { throw }
}
