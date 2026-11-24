# Restrict existing operator material without copying, printing or deleting any secret.
# The documented services run as LocalSystem. Keep the deploy operator and local admins.
$ErrorActionPreference = 'Stop'
$root = 'C:\xauconnect'
$trusted = @(
  [System.Security.Principal.SecurityIdentifier]::new('S-1-5-18'),
  [System.Security.Principal.SecurityIdentifier]::new('S-1-5-32-544'),
  [System.Security.Principal.WindowsIdentity]::GetCurrent().User
)
$items = @('.env','backend\.env','apps\web\.env.production','.cursor\rules\server.mdc','PROJECT_CONTEXT.md')
foreach ($folder in @('.local','.azure','deploy\secrets')) {
  $dir = Join-Path $root $folder
  if(Test-Path -LiteralPath $dir){
    $items += $folder
    $items += @(Get-ChildItem -LiteralPath $dir -Recurse -Force | Where-Object { -not ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) } | ForEach-Object { $_.FullName.Substring($root.Length+1) })
  }
}
$count=0
foreach ($relative in $items){
  $path=Join-Path $root $relative
  if(-not (Test-Path -LiteralPath $path)){continue}
  $item=Get-Item -LiteralPath $path -Force
  if($item.Attributes -band [IO.FileAttributes]::ReparsePoint){continue}
  $acl=Get-Acl -LiteralPath $path
  $acl.SetAccessRuleProtection($true,$false)
  foreach($ace in @($acl.GetAccessRules($true,$false,[System.Security.Principal.SecurityIdentifier]))){
    $acl.RemoveAccessRuleSpecific($ace)
  }
  foreach($sid in $trusted){
    $inherit=if($item.PSIsContainer){'ContainerInherit, ObjectInherit'}else{'None'}
    $rule=[System.Security.AccessControl.FileSystemAccessRule]::new($sid,'FullControl',$inherit,'None','Allow')
    $acl.AddAccessRule($rule)
  }
  Set-Acl -LiteralPath $path -AclObject $acl
  $count++
}
Write-Output "Protected $count private deployment items"
