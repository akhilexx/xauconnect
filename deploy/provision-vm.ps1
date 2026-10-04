# XAUConnect VM provisioning — OpenSSH + Caddy reverse proxy + env fix.
# Run on the VM (az vm run-command). Idempotent.
$ErrorActionPreference = 'Continue'

# ---------- 1. OpenSSH Server (key-auth deploys) ----------
if (-not (Test-Path 'C:\Windows\System32\OpenSSH\sshd.exe')) {
  Add-WindowsCapability -Online -Name 'OpenSSH.Server~~~~0.0.1.0' | Out-Null
}
Set-Service sshd -StartupType Automatic
Start-Service sshd -ErrorAction SilentlyContinue
New-NetFirewallRule -Name 'sshd' -DisplayName 'OpenSSH Server (sshd)' -Enabled True `
  -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22 -ErrorAction SilentlyContinue | Out-Null
$ak = 'C:\ProgramData\ssh\administrators_authorized_keys'
Set-Content -Path $ak -Encoding ascii -Value 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGVgcJwa91fVT0/NwzUJlj7hhUEoH+HmQpPirBtlcgYj xauconnect-deploy'
icacls $ak /inheritance:r /grant 'Administrators:F' /grant 'SYSTEM:F' | Out-Null

# ---------- 2. Caddy ----------
New-Item -ItemType Directory -Force -Path 'C:\caddy' | Out-Null
if (-not (Test-Path 'C:\caddy\caddy.exe')) {
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  Invoke-WebRequest -Uri 'https://caddyserver.com/api/download?os=windows&arch=amd64' `
    -OutFile 'C:\caddy\caddy.exe' -UseBasicParsing
}
@'
:80 {
	encode gzip
	handle /api/* {
		uri strip_prefix /api
		reverse_proxy 127.0.0.1:4000
	}
	handle /ws {
		reverse_proxy 127.0.0.1:4000
	}
	handle {
		reverse_proxy 127.0.0.1:3000
	}
}
'@ | Set-Content -Path 'C:\caddy\Caddyfile' -Encoding ascii

# ---------- 3. Replace portproxy with Caddy service ----------
netsh interface portproxy delete v4tov4 listenport=80 listenaddress=0.0.0.0 | Out-Null
$nssm = 'C:\tools\nssm\nssm.exe'
& $nssm stop xauconnect-proxy 2>$null | Out-Null
& $nssm remove xauconnect-proxy confirm 2>$null | Out-Null
& $nssm install xauconnect-proxy 'C:\caddy\caddy.exe' 'run --config C:\caddy\Caddyfile' | Out-Null
& $nssm set xauconnect-proxy AppDirectory 'C:\caddy' | Out-Null
& $nssm set xauconnect-proxy AppStdout 'C:\xauconnect\logs\proxy.log' | Out-Null
& $nssm set xauconnect-proxy AppStderr 'C:\xauconnect\logs\proxy.err.log' | Out-Null
& $nssm start xauconnect-proxy | Out-Null
New-NetFirewallRule -Name 'xau-http-80' -DisplayName 'XAUConnect HTTP 80' -Enabled True `
  -Direction Inbound -Protocol TCP -Action Allow -LocalPort 80 -ErrorAction SilentlyContinue | Out-Null

# ---------- 4. Env: same-origin API (no baked IPs) ----------
Remove-Item 'C:\xauconnect\apps\web\.env.local' -Force -ErrorAction SilentlyContinue
@'
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=demo
NEXT_PUBLIC_APP_URL=https://xauconnect.com
'@ | Set-Content -Path 'C:\xauconnect\apps\web\.env.production' -Encoding ascii

$envPath = 'C:\xauconnect\.env'
if (Test-Path $envPath) {
  $c = Get-Content $envPath | Where-Object { $_ -notmatch '^CORS_ORIGINS=' }
  $c += 'CORS_ORIGINS=https://xauconnect.com,https://www.xauconnect.com,http://localhost:3000'
  $c | Set-Content $envPath -Encoding ascii
  Copy-Item $envPath 'C:\xauconnect\backend\.env' -Force
}

# PostgreSQL (required for admin metrics, fee config, wallet registry)
if (Test-Path 'C:\xauconnect\deploy\setup-postgres.ps1') {
  & 'C:\xauconnect\deploy\setup-postgres.ps1'
}

# ---------- 5. Report ----------
'sshd:  ' + (Get-Service sshd).Status
'proxy: ' + (& $nssm status xauconnect-proxy)
try { 'api-via-proxy: ' + (Invoke-WebRequest 'http://localhost/api/health' -UseBasicParsing).StatusCode } catch { 'api-via-proxy: FAIL ' + $_.Exception.Message }
