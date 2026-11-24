# Promote a clean Next build on the same volume. Never overlay previous server routes.
param([Parameter(Mandatory=$true)][string]$IncomingBuild)
$ErrorActionPreference='Stop'
$root='C:\xauconnect'
$nssm='C:\tools\nssm\nssm.exe'
$incoming=(Resolve-Path -LiteralPath $IncomingBuild).Path
if ($incoming -notmatch '^C:\\xauconnect\\\.web-stage-[0-9a-f]{32}\\apps\\web\\\.next$') {throw 'Invalid staged build directory'}
$buildId=(Get-Content -LiteralPath (Join-Path $incoming 'BUILD_ID') -Raw).Trim()
$login=Get-Content -LiteralPath (Join-Path $incoming 'server\app\xaxmd5\login.html') -Raw
$expected=[regex]::Match($login,'xaxmd5/login/page-[a-f0-9]+\.js').Value
if (-not $expected -or -not $buildId) {throw 'Staged login bundle or build ID missing'}
$current=Join-Path $root 'apps\web\.next'
$rollbacks=Join-Path $root '.web-releases'
[IO.Directory]::CreateDirectory($rollbacks)|Out-Null
$backup=Join-Path $rollbacks ('web-'+[Guid]::NewGuid().ToString('N'))
$pointer=Join-Path $rollbacks 'previous.txt'
$previous=if(Test-Path -LiteralPath $pointer){(Get-Content -LiteralPath $pointer -Raw).Trim()}
if(Test-Path -LiteralPath "$current\static"){
  # Tabs that were already open can still request their content-hashed assets.
  & robocopy "$current\static" "$incoming\static" /E /XO /XN /XC /MAXAGE:14 /XF '._*' /R:1 /W:1 /NFL /NDL /NJH /NJS | Out-Null
  if($LASTEXITCODE -ge 8){throw 'Could not retain recent browser assets'}
}
& $nssm stop xauconnect-web
if($LASTEXITCODE){throw 'Could not stop web service'}
$moved=$false;$promoted=$false
try {
  if(Test-Path -LiteralPath $current){[IO.Directory]::Move($current,$backup);$moved=$true}
  [IO.Directory]::Move($incoming,$current);$promoted=$true
  & $nssm start xauconnect-web
  if($LASTEXITCODE){throw 'Could not start the new web build'}
  $matched=$false
  for($i=0;$i -lt 12;$i++){
    try{$result=Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 -Uri 'http://127.0.0.1:3000/xaxmd5/login'
      if($result.StatusCode -eq 200 -and $result.Content.Contains($expected)){$matched=$true;break}
    }catch{}
    Start-Sleep -Seconds 2
  }
  if(-not $matched){throw 'Live login did not reference the staged JavaScript bundle'}
} catch {
  $failure=$_
  if($promoted){& $nssm stop xauconnect-web | Out-Null;[IO.Directory]::Move($current,$incoming)}
  if($moved){[IO.Directory]::Move($backup,$current)}
  & $nssm start xauconnect-web | Out-Null
  throw $failure
}
if($moved){
  [IO.File]::WriteAllText($pointer,[IO.Path]::GetFileName($backup))
  if($previous -match '^web-[0-9a-f]{32}$' -and $previous -ne [IO.Path]::GetFileName($backup)){
    $retired=Join-Path $rollbacks $previous
    if(Test-Path -LiteralPath $retired){Remove-Item -LiteralPath $retired -Recurse -Force}
  }
}
Write-Output ("Verified live web build "+$buildId+" serving "+$expected)
