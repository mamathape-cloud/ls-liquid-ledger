"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function NotificationBell() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const load = () => {
      fetch("/api/notifications?limit=1")
        .then((res) => res.json())
        .then((data) => setUnread(data.unreadCount || 0));
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Link
      href="/notifications"
      className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
    >
      <span className="text-lg">🔔</span>
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
