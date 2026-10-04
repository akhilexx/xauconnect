$pgBin = 'C:\pgsql\pgsql\bin'
$env:PGPASSWORD = 'xauconnect'
& "$pgBin\psql.exe" -U postgres -h localhost -p 5432 -c "DO `$`$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'xau') THEN CREATE ROLE xau LOGIN PASSWORD 'xau'; END IF; END `$`$;"
$dbExists = (& "$pgBin\psql.exe" -U postgres -h localhost -p 5432 -tc "SELECT 1 FROM pg_database WHERE datname='xauconnect'").Trim()
if ($dbExists -ne '1') {
  & "$pgBin\psql.exe" -U postgres -h localhost -p 5432 -c 'CREATE DATABASE xauconnect OWNER xau;'
}
$line = 'DATABASE_URL=postgresql://xau:xau@localhost:5432/xauconnect?schema=public'
$c = @()
if (Test-Path 'C:\xauconnect\.env') {
  $c = Get-Content 'C:\xauconnect\.env' | Where-Object { $_ -notmatch '^DATABASE_URL=' }
}
$c += $line
$c | Set-Content 'C:\xauconnect\.env' -Encoding ascii
Copy-Item 'C:\xauconnect\.env' 'C:\xauconnect\backend\.env' -Force
Set-Location C:\xauconnect
pnpm --filter @xauconnect/backend db:push
pnpm --filter @xauconnect/backend db:seed
C:\tools\nssm\nssm.exe restart xauconnect-backend
Start-Sleep 8
(Invoke-WebRequest http://localhost:4000/health -UseBasicParsing).StatusCode
'FINISH_DB_OK'
