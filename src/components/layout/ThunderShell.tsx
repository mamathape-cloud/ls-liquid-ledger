"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getNavForPermissions, getBottomNavForPermissions, type NavItem } from "@/lib/navigation";
import { NavIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/types";

interface ThunderShellProps {
  user: SessionUser;
  children: React.ReactNode;
}

export function ThunderShell({ user, children }: ThunderShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const permissions = user.permissions || [];
  const allNav = getNavForPermissions(permissions);
  const bottomNav = getBottomNavForPermissions(permissions, user.roleSlug);
  const isDashboard = pathname === "/dashboard";

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const load = () =>
      fetch("/api/notifications?limit=1")
        .then((r) => r.json())
        .then((d) => setUnreadCount(d.unreadCount || 0));
    load();
    const id = setInterval(load, 30000);
    window.addEventListener("notifications-updated", load);
    return () => {
      clearInterval(id);
      window.removeEventListener("notifications-updated", load);
    };
  }, [pathname]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col overflow-x-hidden bg-[var(--background)] lg:max-w-6xl">
      <header className="sticky top-0 z-30 shrink-0 border-b border-[var(--border)] bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <Link href="/dashboard" className="min-w-0">
            <Image
              src="/liquid-stage-logo.png"
              alt="Liquid Stage"
              width={939}
              height={1024}
              className="h-10 w-auto object-contain"
            />
            <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-[var(--primary)]">
              Liquid Ledger
            </p>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/notifications"
              className="relative rounded-xl p-2 text-slate-600 hover:bg-[var(--primary-soft)]"
            >
              <NavIcon name="notifications" className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="rounded-xl p-2 text-slate-600 hover:bg-[var(--primary-soft)]"
              aria-label="Open menu"
            >
              <NavIcon name="menu" className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className={cn("min-w-0 flex-1 max-w-full px-4 py-4 sm:px-6", !isDashboard && "pb-4")}>
        {children}
      </main>

      <nav className="sticky bottom-0 z-30 border-t border-[var(--border)] bg-white px-2 py-2 safe-area-pb">
        <div className="flex items-center justify-around">
          {bottomNav.map((item) => (
            <BottomNavLink key={item.href} item={item} active={pathname === item.href} badge={item.href === "/notifications" ? unreadCount : 0} />
          ))}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-medium",
              menuOpen ? "text-[var(--primary)]" : "text-slate-500"
            )}
          >
            <NavIcon name="menu" className="h-5 w-5" />
            More
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="fixed inset-0 z-50">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} aria-label="Close menu" />
          <div className="absolute left-0 right-0 top-0 max-h-[85vh] overflow-y-auto rounded-b-3xl bg-white p-5 pt-[max(1.25rem,env(safe-area-inset-top))] shadow-2xl lg:left-auto lg:right-4 lg:top-4 lg:max-h-none lg:w-80 lg:rounded-2xl lg:pt-5">
            <div className="mb-4 flex items-center gap-3 border-b border-[var(--border)] pb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary-soft)] text-lg font-bold text-[var(--primary)]">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-slate-900">{user.name}</p>
                <p className="text-xs text-slate-500">{user.roleSlug.replace(/_/g, " ")}</p>
              </div>
            </div>
            <div className="grid gap-1">
              {allNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition",
                    pathname === item.href
                      ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                      : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <NavIcon name={item.icon} className="h-5 w-5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
            <button
              type="button"
              onClick={logout}
              className="mt-4 w-full rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-medium text-red-600"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function BottomNavLink({
  item,
  active,
  badge,
}: {
  item: NavItem;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={item.href}
      className={cn(
        "relative flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-medium transition",
        active ? "text-[var(--primary)]" : "text-slate-500"
      )}
    >
      <NavIcon name={item.icon} className="h-5 w-5" />
      <span className="max-w-[4.5rem] truncate">{item.label.split(" ").pop()}</span>
      {!!badge && badge > 0 && item.href !== "/notifications" && (
        <span className="absolute right-1 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  );
}
