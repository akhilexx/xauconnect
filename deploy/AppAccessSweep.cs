// Windows PowerShell / .NET Framework helper for the dedicated application tree.
// Enumerate real directories once. pnpm junctions must not become recursive walks.
using System;
using System.IO;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Collections.Generic;
using System.Security.AccessControl;
using System.Security.Principal;

public static class AppAccessSweep {
    [DllImport("advapi32.dll", CharSet=CharSet.Unicode, EntryPoint="GetNamedSecurityInfoW")]
    static extern uint GetAcl(string name,int kind,uint info,IntPtr owner,IntPtr group,out IntPtr dacl,IntPtr sacl,out IntPtr sd);
    [DllImport("advapi32.dll", CharSet=CharSet.Unicode, EntryPoint="SetNamedSecurityInfoW")]
    static extern uint SetAcl(string name,int kind,uint info,IntPtr owner,IntPtr group,IntPtr dacl,IntPtr sacl);
    [DllImport("advapi32.dll")] static extern uint GetSecurityDescriptorLength(IntPtr sd);
    [DllImport("advapi32.dll",SetLastError=true)] static extern bool GetSecurityDescriptorDacl(IntPtr sd,out bool present,out IntPtr dacl,out bool defaulted);
    [DllImport("kernel32.dll")] static extern IntPtr LocalFree(IntPtr p);
    static string Extended(string p){return p.StartsWith(@"\\?\") ? p : @"\\?\"+p;}
    static FileSystemSecurity ReadAcl(FileSystemInfo item,bool isDir){
        IntPtr sd,dacl;
        uint err=GetAcl(Extended(item.FullName),1,4,IntPtr.Zero,IntPtr.Zero,out dacl,IntPtr.Zero,out sd);
        if(err!=0)throw new Win32Exception((int)err);
        try{
            var bytes=new byte[GetSecurityDescriptorLength(sd)];
            Marshal.Copy(sd,bytes,0,bytes.Length);
            FileSystemSecurity security=isDir?(FileSystemSecurity)new DirectorySecurity():new FileSecurity();
            security.SetSecurityDescriptorBinaryForm(bytes,AccessControlSections.Access);
            return security;
        }finally{LocalFree(sd);}
    }
    static void WriteAcl(FileSystemInfo item,FileSystemSecurity acl){
        byte[] bytes=acl.GetSecurityDescriptorBinaryForm();
        var ptr=Marshal.AllocHGlobal(bytes.Length);
        try{
            Marshal.Copy(bytes,0,ptr,bytes.Length);
            bool present,defaulted;IntPtr dacl;
            if(!GetSecurityDescriptorDacl(ptr,out present,out dacl,out defaulted) || !present || dacl==IntPtr.Zero)
                throw new IOException("Refusing to install a missing DACL");
            uint err=SetAcl(Extended(item.FullName),1,4u|(acl.AreAccessRulesProtected?0x80000000u:0u),IntPtr.Zero,IntPtr.Zero,dacl,IntPtr.Zero);
            if(err!=0)throw new Win32Exception((int)err);
        }finally{Marshal.FreeHGlobal(ptr);}
    }
    static bool Broad(FileSystemAccessRule rule) {
        string id=rule.IdentityReference.Value;
        return rule.AccessControlType==AccessControlType.Allow &&
            (id=="S-1-1-0" || id=="S-1-5-11" || id=="S-1-5-32-545");
    }
    static bool Writable(FileSystemAccessRule rule) {
        const FileSystemRights mask=FileSystemRights.Write | FileSystemRights.Delete |
            FileSystemRights.DeleteSubdirectoriesAndFiles | FileSystemRights.ChangePermissions | FileSystemRights.TakeOwnership;
        return Broad(rule) && (((rule.FileSystemRights & mask)!=0) || (((uint)rule.FileSystemRights & 0x50000000u)!=0));
    }
    public static void Apply(string root) {
        var pending=new Stack<DirectoryInfo>(); pending.Push(new DirectoryInfo(root));
        int checkedFiles=0, changed=0, links=0, errors=0;
        var trusted=new[]{WindowsIdentity.GetCurrent().User, new SecurityIdentifier("S-1-5-18"),new SecurityIdentifier("S-1-5-32-544")};
        while(pending.Count>0){
            var parent=pending.Pop();
            foreach(var item in parent.EnumerateFileSystemInfos()){
                try{
                    if((item.Attributes & FileAttributes.ReparsePoint)!=0){links++;continue;}
                    var dir=item as DirectoryInfo;
                    FileSystemSecurity acl=ReadAcl(item,dir!=null);
                    var rules=acl.GetAccessRules(true,true,typeof(SecurityIdentifier));
                    bool change=false,inherited=false;
                    foreach(FileSystemAccessRule rule in rules) if(Writable(rule)){change=true;inherited|=rule.IsInherited;}
                    if(change){
                        if(inherited)acl.SetAccessRuleProtection(true,false);
                        foreach(FileSystemAccessRule rule in acl.GetAccessRules(true,false,typeof(SecurityIdentifier)))
                            if(Broad(rule))acl.RemoveAccessRuleSpecific(rule);
                        if(inherited)foreach(var sid in trusted)acl.AddAccessRule(new FileSystemAccessRule(sid,FileSystemRights.FullControl,
                            dir==null?InheritanceFlags.None:InheritanceFlags.ContainerInherit|InheritanceFlags.ObjectInherit,
                            PropagationFlags.None,AccessControlType.Allow));
                        WriteAcl(item,acl);
                        changed++;
                    }
                    if(dir!=null)pending.Push(dir);
                    if(++checkedFiles%25000==0)Console.WriteLine("Checked {0} filesystem objects; corrected {1}",checkedFiles,changed);
                }catch(FileNotFoundException){}catch(DirectoryNotFoundException){}catch(Exception e){
                    errors++;if(errors<=5)Console.WriteLine("ACL check failed on {0}: {1}",item.FullName,e.GetType().Name);
                }
            }
        }
        Console.WriteLine("Checked {0} objects, corrected {1}, skipped {2} reparse points, errors {3}",checkedFiles,changed,links,errors);
        if(errors!=0)throw new IOException("One or more ACL checks failed");
    }
}
