"use client";

import { useEffect } from "react";

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function Modal({ open, title, onClose, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center">
      <div className="my-auto flex w-full max-w-md max-h-[calc(100vh-2rem)] flex-col rounded-xl bg-white shadow-xl">
        <div className="shrink-0 border-b border-[var(--border)] px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">{children}</div>
      </div>
    </div>
  );
}
