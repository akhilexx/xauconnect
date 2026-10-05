# Runs ON the VM after deploy.tgz is uploaded: extract, install, restart, health-check.
$ErrorActionPreference = 'Stop'
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine')

Set-Location C:\xauconnect

tar -xzf deploy.tgz
Remove-Item deploy.tgz -Force

$nssm = 'C:\tools\nssm\nssm.exe'
# Unlock Prisma's query engine DLL before generate (backend holds it while running).
& $nssm stop xauconnect-backend
Start-Sleep -Seconds 2

pnpm install --frozen-lockfile
pnpm db:generate

# Backend reads backend\.env — keep it synced with the server-managed root .env
if (Test-Path .\.env) { Copy-Item .\.env .\backend\.env -Force }

# Apply schema + seed when DATABASE_URL is configured
if ((Get-Content .\.env -ErrorAction SilentlyContinue) -match '^DATABASE_URL=') {
  pnpm --filter @xauconnect/backend db:push
  pnpm --filter @xauconnect/backend db:seed
}

& $nssm start xauconnect-backend
& $nssm restart xauconnect-web

function Wait-Status([string]$url) {
  for ($i = 1; $i -le 12; $i++) {
    try {
      return (Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 5).StatusCode
    } catch {
      Start-Sleep -Seconds 5
    }
  }
  throw "timed out waiting for $url"
}

'backend: ' + (Wait-Status 'http://localhost:4000/health')
'web:     ' + (Wait-Status 'http://localhost:3000/')
'proxy:   ' + (Wait-Status 'http://localhost/api/health')
'REMOTE_APPLY_OK'
