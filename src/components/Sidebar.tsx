"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { getNavForRole } from "@/lib/navigation";
import { Button } from "@/components/ui/Button";
import type { SessionUser } from "@/types";
import { cn } from "@/lib/utils";

interface SidebarProps {
  user: SessionUser;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const navItems = getNavForRole(user.role);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnread = () => {
    fetch("/api/notifications?limit=1")
      .then((res) => res.json())
      .then((data) => setUnreadCount(data.unreadCount || 0));
  };

  useEffect(() => {
    loadUnread();
    const interval = setInterval(loadUnread, 30000);
    const onFocus = () => loadUnread();
    const onUpdate = () => loadUnread();
    window.addEventListener("focus", onFocus);
    window.addEventListener("notifications-updated", onUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("notifications-updated", onUpdate);
    };
  }, [pathname]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="flex w-64 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-6">
        <h1 className="text-lg font-bold text-blue-700">Liquid Ledger</h1>
        <p className="mt-1 text-xs text-slate-500">{user.name}</p>
        <p className="text-xs text-slate-400">{user.role.replace(/_/g, " ")}</p>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition",
              pathname === item.href
                ? "bg-blue-50 text-blue-700"
                : "text-slate-600 hover:bg-slate-50"
            )}
          >
            <span>{item.label}</span>
            {item.href === "/notifications" && unreadCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>
        ))}
      </nav>
      <div className="border-t border-slate-200 p-4">
        <Button className="w-full" onClick={logout}>
          Logout
        </Button>
      </div>
    </aside>
  );
}
