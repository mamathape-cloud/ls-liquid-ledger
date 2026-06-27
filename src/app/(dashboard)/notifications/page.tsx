"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function NotificationsPage() {
  const [tab, setTab] = useState<"unread" | "read">("unread");
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);

  const load = (page = 1) => {
    setLoading(true);
    const readParam = tab === "unread" ? "false" : "true";
    fetch(`/api/notifications?read=${readParam}&page=${page}&limit=10`)
      .then((r) => r.json())
      .then((d) => {
        setItems(d.data || []);
        setMeta(d.meta || { page: 1, limit: 10, total: 0, totalPages: 1 });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(1);
  }, [tab]);

  const markRead = async (id: string) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load(meta.page);
    window.dispatchEvent(new Event("notifications-updated"));
  };

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    setTab("read");
    load(1);
    window.dispatchEvent(new Event("notifications-updated"));
  };

  const pages = Array.from({ length: meta.totalPages }, (_, i) => i + 1).slice(
    Math.max(0, meta.page - 3),
    meta.page + 2
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {tab === "unread" && (
          <Button variant="secondary" onClick={markAllRead}>Mark all read</Button>
        )}
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab("unread")}
          className={`px-4 py-2 text-sm font-medium ${
            tab === "unread"
              ? "border-b-2 border-[var(--primary)] text-[var(--primary)]"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Unread
        </button>
        <button
          type="button"
          onClick={() => setTab("read")}
          className={`px-4 py-2 text-sm font-medium ${
            tab === "read"
              ? "border-b-2 border-[var(--primary)] text-[var(--primary)]"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Read
        </button>
      </div>

      <Card>
        {loading ? (
          <p className="text-slate-500">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-slate-500">
            {tab === "unread" ? "No unread notifications." : "No read notifications."}
          </p>
        ) : (
          <div className="divide-y">
            {items.map((n) => (
              <div key={n._id} className={`py-4 ${n.read ? "opacity-80" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-medium">{n.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{n.message}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {new Date(n.createdAt).toLocaleString("en-IN")}
                    </p>
                    {n.link && (
                      <Link href={n.link} className="mt-2 inline-block text-sm text-[var(--primary)] hover:underline">
                        View details
                      </Link>
                    )}
                  </div>
                  {tab === "unread" && (
                    <Button variant="ghost" onClick={() => markRead(n._id)}>Mark read</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {meta.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t pt-4">
            <p className="text-sm text-slate-500">
              Page {meta.page} of {meta.totalPages} ({meta.total} total)
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={meta.page <= 1}
                onClick={() => load(meta.page - 1)}
              >
                Previous
              </Button>
              {pages.map((p) => (
                <Button
                  key={p}
                  variant={p === meta.page ? "primary" : "secondary"}
                  onClick={() => load(p)}
                >
                  {p}
                </Button>
              ))}
              <Button
                variant="secondary"
                disabled={meta.page >= meta.totalPages}
                onClick={() => load(meta.page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
