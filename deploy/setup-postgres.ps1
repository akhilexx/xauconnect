# XAUConnect — PostgreSQL 16 portable binaries on Windows (SSH-safe, no GUI installer).
$ErrorActionPreference = 'Continue'
$pgRoot = 'C:\pgsql'
$pgData = 'C:\pgsql\data'
$pgBin = 'C:\pgsql\pgsql\bin'
$zip = 'C:\pgsql\pgsql-binaries.zip'
$svcName = 'postgresql-xau'

if (-not (Test-Path "$pgBin\psql.exe")) {
  New-Item -ItemType Directory -Force -Path $pgRoot | Out-Null
  if (-not (Test-Path $zip)) {
    Write-Host 'Downloading PostgreSQL portable binaries...'
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri 'https://get.enterprisedb.com/postgresql/postgresql-16.6-1-windows-x64-binaries.zip' `
      -OutFile $zip -UseBasicParsing
  }
  Expand-Archive -Path $zip -DestinationPath $pgRoot -Force
}

$psql = "$pgBin\psql.exe"
$initdb = "$pgBin\initdb.exe"
$pgCtl = "$pgBin\pg_ctl.exe"

if (-not (Test-Path $pgData)) {
  Write-Host 'Initializing database cluster...'
  'xauconnect' | Out-File -FilePath C:\pgsql\pw.txt -Encoding ascii -NoNewline
  & $initdb -D $pgData -U postgres -A scram-sha-256 -E UTF8 --pwfile=C:\pgsql\pw.txt
  Remove-Item C:\pgsql\pw.txt -Force -ErrorAction SilentlyContinue
}

if (-not (Get-Service $svcName -ErrorAction SilentlyContinue)) {
  & $pgCtl register -N $svcName -D $pgData -S auto
}
if ((Get-Service $svcName -ErrorAction SilentlyContinue).Status -ne 'Running') {
  Start-Service $svcName -ErrorAction SilentlyContinue
  if ((Get-Service $svcName).Status -ne 'Running') {
    & $pgCtl start -D $pgData -w -t 90
  }
}

$env:PGPASSWORD = 'xauconnect'
& $psql -U postgres -h localhost -p 5432 -c "DO `$`$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'xau') THEN CREATE ROLE xau LOGIN PASSWORD 'xau'; END IF; END `$`$;"
$dbExists = (& $psql -U postgres -h localhost -p 5432 -tc "SELECT 1 FROM pg_database WHERE datname='xauconnect'").Trim()
if ($dbExists -ne '1') {
  & $psql -U postgres -h localhost -p 5432 -c 'CREATE DATABASE xauconnect OWNER xau;'
}
& $psql -U postgres -h localhost -p 5432 -c 'GRANT ALL PRIVILEGES ON DATABASE xauconnect TO xau;'

$envPath = 'C:\xauconnect\.env'
$line = 'DATABASE_URL=postgresql://xau:xau@localhost:5432/xauconnect?schema=public'
if (Test-Path $envPath) {
  $c = Get-Content $envPath | Where-Object { $_ -notmatch '^DATABASE_URL=' }
  $c += $line
  $c | Set-Content $envPath -Encoding ascii
} else {
  $line | Set-Content $envPath -Encoding ascii
}
Copy-Item $envPath 'C:\xauconnect\backend\.env' -Force
Write-Host 'PostgreSQL portable ready — DATABASE_URL configured'
