$paths = @(
  "C:\xauconnect\apps\web\.next\server\app\swap.html",
  "C:\xauconnect\apps\web\.next\server\app\(site)\swap\page.html"
)
$inject = '<script src="/runtime-config.js"></script>'
foreach ($p in $paths) {
  if (-not (Test-Path $p)) { continue }
  $c = [IO.File]::ReadAllText($p)
  if ($c.Contains("runtime-config.js")) {
    Write-Host "already ok: $p"
    continue
  }
  [IO.File]::WriteAllText($p, $c.Replace("<head>", "<head>$inject"))
  Write-Host "patched: $p"
}
