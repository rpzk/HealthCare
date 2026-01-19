param(
  [Parameter(Mandatory=$true)][string]$Id,
  [string]$Status,
  [string]$MedicationName,
  [string]$Dosage,
  [string]$Frequency,
  [string]$Duration
)

$ErrorActionPreference = 'Stop'
$headers = @{ "x-test-user"="tester"; "x-test-role"="ADMIN"; "x-test-user-id"="99" }

$payload = @{}
if ($PSBoundParameters.ContainsKey('Status')) { $payload.status = $Status }
$medPatch = @{}
if ($PSBoundParameters.ContainsKey('MedicationName')) { $medPatch.name = $MedicationName }
if ($PSBoundParameters.ContainsKey('Dosage')) { $medPatch.dosage = $Dosage }
if ($PSBoundParameters.ContainsKey('Frequency')) { $medPatch.frequency = $Frequency }
if ($PSBoundParameters.ContainsKey('Duration')) { $medPatch.duration = $Duration }
if ($medPatch.Keys.Count -gt 0) { $payload.medications = @($medPatch) }

$body = $payload | ConvertTo-Json -Depth 5
$url = "http://localhost:3000/api/prescriptions/$Id"
Write-Host "PATCH $url" -ForegroundColor Cyan
$resp = Invoke-WebRequest -Uri $url -Method Patch -Headers $headers -ContentType 'application/json' -Body $body -ErrorAction Stop
Write-Host ("Status: {0}" -f $resp.StatusCode) -ForegroundColor Green
$resp.Content | Out-String | Write-Output
