# Attempts to download the latest CBO file from gov.br downloads page.
# This script is opportunistic: if the direct XLSX/CSV link is known, set $url directly.
# Otherwise you'll need to manually download and place the file in uploads/external-cache or set CBO_LOCAL_PATH.

param(
  [string]$url = ''
)

$targetDir = Join-Path $PSScriptRoot '..\uploads\external-cache'
if (-not (Test-Path $targetDir)) { New-Item -ItemType Directory -Path $targetDir | Out-Null }

if ($url -ne '') {
  $filename = Split-Path $url -Leaf
  $out = Join-Path $targetDir $filename
  Invoke-WebRequest -Uri $url -OutFile $out
  Write-Host "Downloaded $url -> $out"
  Write-Host "Set environment variable CBO_LOCAL_PATH to $out before running the import"
  exit 0
}

Write-Host "No URL provided. Please download the official CBO file from:"
Write-Host "https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/cbo/servicos/downloads"
Write-Host "Then place it in: $targetDir and set environment variable CBO_LOCAL_PATH accordingly."
