import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export const metadata: Metadata = {
  title: "Admin console",
  description: "XAUConnect admin: metrics, fees, connected wallets, users, audit.",
  robots: { index: false, follow: false },
};

export default function AdminConsolePage() {
  return <AdminDashboard />;
}
