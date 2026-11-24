# Keep the proxy and service wrapper executable/readable while restricting who can
# replace them. Do not restart services or change unrelated application directories.
$ErrorActionPreference='Stop'
$public=@('S-1-1-0','S-1-5-11','S-1-5-32-545')
$admins=[System.Security.Principal.SecurityIdentifier]::new('S-1-5-32-544')
$system=[System.Security.Principal.SecurityIdentifier]::new('S-1-5-18')
$users=[System.Security.Principal.SecurityIdentifier]::new('S-1-5-32-545')
foreach($p in @('C:\caddy','C:\caddy\caddy.exe','C:\caddy\Caddyfile','C:\tools\nssm','C:\tools\nssm\nssm.exe')){
  if(-not(Test-Path -LiteralPath $p)){continue}
  $acl=Get-Acl -LiteralPath $p
  $acl.SetAccessRuleProtection($true,$false)
  foreach($ace in @($acl.GetAccessRules($true,$false,[System.Security.Principal.SecurityIdentifier]))){
    if($ace.AccessControlType -eq 'Allow' -and $public -contains $ace.IdentityReference.Value){$acl.RemoveAccessRuleSpecific($ace)}
  }
  $inherit=if((Get-Item -LiteralPath $p).PSIsContainer){'ContainerInherit, ObjectInherit'}else{'None'}
  foreach($sid in @($system,$admins,[System.Security.Principal.WindowsIdentity]::GetCurrent().User)){
    $acl.AddAccessRule([System.Security.AccessControl.FileSystemAccessRule]::new($sid,'FullControl',$inherit,'None','Allow'))
  }
  $acl.AddAccessRule([System.Security.AccessControl.FileSystemAccessRule]::new($users,'ReadAndExecute',$inherit,'None','Allow'))
  Set-Acl -LiteralPath $p -AclObject $acl
  $bad=@((Get-Acl -LiteralPath $p).GetAccessRules($true,$true,[System.Security.Principal.SecurityIdentifier])|Where-Object {
    $_.AccessControlType -eq 'Allow' -and $public -contains $_.IdentityReference.Value -and ($_.FileSystemRights -band [System.Security.AccessControl.FileSystemRights]::WriteData)})
  if($bad.Count){throw "Unexpected write permissions: $p"}
}
Write-Output 'Proxy and service wrapper permissions verified'
