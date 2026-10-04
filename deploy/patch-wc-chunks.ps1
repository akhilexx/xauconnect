$from = "bypass-invalid-wc-project-id-placeholder"
$to = "bee84fb01deef3c2f88c326565c66089"
$root = "C:\xauconnect\apps\web\.next\static\chunks"
$n = 0
Get-ChildItem $root -Recurse -Filter *.js | ForEach-Object {
  $c = [IO.File]::ReadAllText($_.FullName)
  if ($c.Contains($from)) {
    [IO.File]::WriteAllText($_.FullName, $c.Replace($from, $to))
    $n++
  }
}
Write-Host "patched $n files"

$inject = '<script src="/runtime-config.js"></script>'
$htmlN = 0
Get-ChildItem "C:\xauconnect\apps\web\.next\server\app" -Recurse -Filter *.html | ForEach-Object {
  $c = [IO.File]::ReadAllText($_.FullName)
  if ($c.Contains("<head>") -and -not $c.Contains("runtime-config.js")) {
    [IO.File]::WriteAllText($_.FullName, $c.Replace("<head>", "<head>$inject"))
    $htmlN++
  }
}
Write-Host "injected runtime-config into $htmlN html files"
