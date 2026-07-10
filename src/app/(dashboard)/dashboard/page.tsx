"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getNavForPermissions } from "@/lib/navigation";
import { ModuleGrid, WelcomeBanner } from "@/components/layout/ThunderModules";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatINR } from "@/lib/utils";

interface ClaimSummary {
  totalClaims: number;
  claimedAmountThisMonth: number;
  settledAmountThisMonth: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [search, setSearch] = useState("");
  const [claimSummary, setClaimSummary] = useState<ClaimSummary | null>(null);

  useEffect(() => {
    fetch("/api/notifications?limit=1")
      .then((r) => r.json())
      .then((d) => setUnreadCount(d.unreadCount || 0));
  }, []);

  const hasMyClaims = user?.permissions?.includes("my_claims") ?? false;

  useEffect(() => {
    if (!hasMyClaims) return;
    fetch("/api/claims/summary")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setClaimSummary(d))
      .catch(() => setClaimSummary(null));
  }, [hasMyClaims]);

  if (!user) return null;

  const nav = getNavForPermissions(user.permissions || []).filter((item) => item.href !== "/dashboard");
  const filtered = search.trim()
    ? nav.filter(
        (item) =>
          item.label.toLowerCase().includes(search.toLowerCase()) ||
          item.description.toLowerCase().includes(search.toLowerCase())
      )
    : nav;

  const quick = filtered.filter((item) => item.section === "quick");
  const modules = filtered.filter((item) => item.section !== "quick");

  return (
    <div className="pb-2">
      <WelcomeBanner name={user.name} unreadCount={unreadCount} />

      {hasMyClaims && claimSummary && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card>
            <p className="text-sm text-slate-500">Total Claims</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{claimSummary.totalClaims}</p>
          </Card>
          <Card>
            <p className="text-sm text-slate-500">Claimed Amount This Month</p>
            <p className="mt-1 text-2xl font-bold text-[var(--primary)]">
              {formatINR(claimSummary.claimedAmountThisMonth)}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-slate-500">Settled Amount This Month</p>
            <p className="mt-1 text-2xl font-bold text-green-700">
              {formatINR(claimSummary.settledAmountThisMonth)}
            </p>
          </Card>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search modules..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-0 flex-1 rounded-2xl py-3.5 pl-4"
        />
        {search.trim() && (
          <Button type="button" variant="ghost" onClick={() => setSearch("")}>
            Clear All
          </Button>
        )}
      </div>

      <div className="space-y-8">
        <ModuleGrid title="Quick Actions" items={quick} variant="compact" />
        <ModuleGrid title="All Modules" items={modules} variant="large" />
      </div>
    </div>
  );
}
