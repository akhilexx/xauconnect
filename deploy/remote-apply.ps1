# Runs ON the VM after deploy.tgz is uploaded: extract, install, restart, health-check.
$ErrorActionPreference = 'Stop'
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine')

Set-Location C:\xauconnect

# The archive can contain routes whose old location is also resolvable by Next.
# Stage compiled files in an empty directory, then promote them as a unit.
$stage=Join-Path 'C:\xauconnect' ('.web-stage-'+[Guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($stage)|Out-Null
tar --no-acls --no-same-permissions -xzf deploy.tgz -C $stage './apps/web/.next'
if ($LASTEXITCODE -ne 0) {throw "Web build staging failed"}
tar --no-acls --no-same-permissions --exclude './apps/web/.next' --exclude './apps/web/.next/*' -xzf deploy.tgz
if ($LASTEXITCODE -ne 0) {throw "Source extraction failed"}
Remove-Item deploy.tgz -Force

# Deploys extract over the tree and do not delete files that left the repo.
# Retired sitemaps (tokens.xml, cross-chain-search.xml) kept feeding Google
# thousands of doorway URLs. Keep only the sitemaps the generator writes.
$sitemapDir = 'C:\xauconnect\apps\web\public\sitemaps'
$keepSitemaps = @(
  'chains.xml',
  'swap.xml',
  'cross-chain.xml',
  'meme.xml',
  'learn.xml',
  'search.xml',
  'core.xml'
)
if (Test-Path $sitemapDir) {
  Get-ChildItem $sitemapDir -Filter *.xml |
    Where-Object { $keepSitemaps -notcontains $_.Name } |
    Remove-Item -Force
}

$nssm = 'C:\tools\nssm\nssm.exe'
# Exclude operator files from uploads and protect local leftovers from older releases.
& .\deploy\protect-private-files.ps1
# The existing production database predates Prisma migration history. Apply only
# reviewed, additive SQL. Never accept a schema reset or overwrite operator fee settings.
if (Test-Path .\.env) { Copy-Item .\.env .\backend\.env -Force }
if (-not ((Get-Content .\backend\.env -ErrorAction SilentlyContinue) -match '^DATABASE_URL=')) {
  throw "Production database configuration missing"
}
pnpm --filter @xauconnect/backend exec prisma db execute --schema ../prisma/schema.prisma --file ../prisma/migrations/20261124000000_swap_settlement/migration.sql
if ($LASTEXITCODE -ne 0) { throw "Settlement migration failed; services were not stopped" }
pnpm --filter @xauconnect/backend exec prisma db execute --schema ../prisma/schema.prisma --file ../prisma/migrations/20261124010000_persistent_admin_sessions/migration.sql
if ($LASTEXITCODE -ne 0) { throw "Admin session migration failed; services were not stopped" }
& $nssm stop xauconnect-backend
try {
  Start-Sleep -Seconds 2
  pnpm install --frozen-lockfile
  if ($LASTEXITCODE -ne 0) { throw "Dependency install failed" }
  pnpm db:generate
  if ($LASTEXITCODE -ne 0) { throw "Prisma client generation failed" }
} finally { & $nssm start xauconnect-backend }
# Caddy owns public ingress. Avoid exposing Next's fallback API proxy directly.
$webArgs = ((& $nssm get xauconnect-web AppParameters) -join '').Replace([string][char]0,'').Trim()
if ($webArgs -match 'next start -p 3000$') {
  & $nssm set xauconnect-web AppParameters "$webArgs -H 127.0.0.1"
  if ($LASTEXITCODE -ne 0) { throw "Could not bind web listener to loopback" }
}
& .\deploy\install-web-build.ps1 -IncomingBuild (Join-Path $stage 'apps\web\.next')
Remove-Item -LiteralPath $stage -Recurse -Force

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
