# Dedicated XAUConnect directory only. Node services run here; ordinary Windows
# accounts must not be able to replace executable application code or dependencies.
$ErrorActionPreference='Stop'
$root='C:\xauconnect'
$acl=Get-Acl -LiteralPath $root
$acl.SetAccessRuleProtection($true,$false)
$publicSids=@('S-1-5-11','S-1-5-32-545','S-1-1-0')
foreach($ace in @($acl.GetAccessRules($true,$false,[System.Security.Principal.SecurityIdentifier]))){
  if($ace.AccessControlType -eq 'Allow' -and $publicSids -contains $ace.IdentityReference.Value){$acl.RemoveAccessRuleSpecific($ace)}
}
$trusted = @([System.Security.Principal.WindowsIdentity]::GetCurrent().User,[System.Security.Principal.SecurityIdentifier]::new('S-1-5-18'),[System.Security.Principal.SecurityIdentifier]::new('S-1-5-32-544'))
foreach($sid in $trusted){
  $acl.AddAccessRule([System.Security.AccessControl.FileSystemAccessRule]::new($sid,'FullControl','ContainerInherit, ObjectInherit','None','Allow'))
}
# No generic local account requires filesystem access; the HTTP servers have their own identities.
Set-Acl -LiteralPath $root -AclObject $acl
foreach($p in @($root,"$root\backend\src\index.ts","$root\apps\web\.next\BUILD_ID")){
  $broad=@((Get-Acl -LiteralPath $p).GetAccessRules($true,$true,[System.Security.Principal.SecurityIdentifier]) | Where-Object {
    $_.AccessControlType -eq 'Allow' -and $publicSids -contains $_.IdentityReference.Value -and ($_.FileSystemRights -band [System.Security.AccessControl.FileSystemRights]::WriteData)
  })
  if($broad.Count){throw "Unexpected write access on $p"}
}
Write-Output 'Application directory and checked service files have restricted write access'
