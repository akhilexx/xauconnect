import type { Metadata } from "next";
import { AdminLoginPanel } from "@/components/admin/admin-login-panel";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return <AdminLoginPanel />;
}
