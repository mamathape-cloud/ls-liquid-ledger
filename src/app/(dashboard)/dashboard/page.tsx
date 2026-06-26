"use client";

import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { ROLES } from "@/lib/constants";
import Link from "next/link";

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null;

  const quickLinks: Record<string, { label: string; href: string; desc: string }[]> = {
    [ROLES.SYSTEM_ADMIN]: [
      { label: "Manage Users", href: "/admin/users", desc: "Create finance, director, and employee accounts" },
      { label: "Categories", href: "/admin/categories", desc: "Manage claim categories" },
      { label: "Reports", href: "/reports", desc: "Organisation-wide reports" },
    ],
    [ROLES.FINANCE]: [
      { label: "Events", href: "/finance/events", desc: "Create events and assign budgets" },
      { label: "Review Claims", href: "/finance/claims", desc: "Approve or reject employee claims" },
      { label: "Batches", href: "/finance/batches", desc: "Club claims and submit to director" },
      { label: "Disburse", href: "/finance/disburse", desc: "Mark claims as paid" },
    ],
    [ROLES.DIRECTOR]: [
      { label: "Review Batches", href: "/director/batches", desc: "Approve or reject batched claims" },
      { label: "Reports", href: "/reports", desc: "View organisation reports" },
    ],
    [ROLES.EMPLOYEE]: [
      { label: "Submit Claim", href: "/employee/claims", desc: "Create reimbursement requests" },
      { label: "My Profile", href: "/employee/profile", desc: "Update UPI and bank details" },
      { label: "Track Claim", href: "/search", desc: "Search by claim ID" },
    ],
  };

  const links = quickLinks[user.role] || [];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Welcome, {user.name}</h1>
      <p className="mb-6 text-slate-500">Liquid Ledger expense management dashboard</p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="transition hover:border-blue-200 hover:shadow-md">
              <h3 className="font-semibold text-blue-700">{link.label}</h3>
              <p className="mt-1 text-sm text-slate-500">{link.desc}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
