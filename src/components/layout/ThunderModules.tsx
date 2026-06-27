"use client";

import Link from "next/link";
import { NavIcon } from "@/components/icons";
import type { NavItem } from "@/lib/navigation";

interface ModuleGridProps {
  title: string;
  items: NavItem[];
  variant?: "compact" | "large";
}

export function ModuleGrid({ title, items, variant = "compact" }: ModuleGridProps) {
  if (!items.length) return null;

  if (variant === "compact") {
    return (
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 lg:grid-cols-6">
          {items.map((item) => (
            <Link key={item.href} href={item.href} className="group flex flex-col items-center gap-2 text-center">
              <div className="th-module-icon h-14 w-14 transition group-hover:bg-[var(--primary-soft)] group-hover:shadow-sm sm:h-16 sm:w-16">
                <NavIcon name={item.icon} />
              </div>
              <span className="line-clamp-2 text-[11px] font-medium leading-tight text-slate-700 sm:text-xs">
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="th-card flex items-start gap-4 p-4 transition hover:border-[var(--primary)] hover:shadow-md"
          >
            <div className="th-module-icon h-14 w-14 shrink-0">
              <NavIcon name={item.icon} />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900">{item.label}</h3>
              <p className="mt-1 text-sm text-slate-500">{item.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

interface WelcomeBannerProps {
  name: string;
  unreadCount: number;
}

export function WelcomeBanner({ name, unreadCount }: WelcomeBannerProps) {
  const firstName = name.split(" ")[0];
  return (
    <div className="th-card mb-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
          Welcome back, <span className="text-[var(--primary)]">{firstName}!</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {unreadCount > 0
            ? `You have ${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}.`
            : "Manage claims, events, and reimbursements from here."}
        </p>
      </div>
      <div className="flex items-center gap-3 rounded-2xl bg-[var(--surface-muted)] px-4 py-3">
        <span className="text-2xl">📋</span>
        <div>
          <p className="text-xs text-slate-500">Liquid Ledger</p>
          <p className="font-semibold text-slate-800">Expense Portal</p>
        </div>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  backHref = "/dashboard",
  children,
}: {
  title: string;
  backHref?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href={backHref}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-white text-slate-600"
        >
          ←
        </Link>
        <h1 className="truncate text-lg font-bold text-slate-900 sm:text-xl">{title}</h1>
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}
