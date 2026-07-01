"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getNavForPermissions } from "@/lib/navigation";
import { ModuleGrid, WelcomeBanner } from "@/components/layout/ThunderModules";
import { Input } from "@/components/ui/Input";

export default function DashboardPage() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/notifications?limit=1")
      .then((r) => r.json())
      .then((d) => setUnreadCount(d.unreadCount || 0));
  }, []);

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

      <div className="mb-6">
        <Input
          placeholder="Search modules..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-2xl py-3.5 pl-4"
        />
      </div>

      <div className="space-y-8">
        <ModuleGrid title="Quick Actions" items={quick} variant="compact" />
        <ModuleGrid title="All Modules" items={modules} variant="large" />
      </div>
    </div>
  );
}
