# Patches JWT_SECRET in C:\xauconnect\.env (never touches other keys).
param(
  [Parameter(Mandatory = $true)]
  [string]$Secret
)

$path = 'C:\xauconnect\.env'
if (-not (Test-Path $path)) {
  Write-Error ".env not found at $path"
  exit 1
}

$lines = Get-Content $path
$found = $false
$out = foreach ($line in $lines) {
  if ($line -match '^\s*JWT_SECRET\s*=') {
    $found = $true
    "JWT_SECRET=`"$Secret`""
  } else {
    $line
  }
}
if (-not $found) {
  $out += "JWT_SECRET=`"$Secret`""
}
Set-Content -Path $path -Value $out -Encoding UTF8
Write-Output 'JWT_SECRET patched in C:\xauconnect\.env'
