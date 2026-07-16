"use client";

import { cn } from "@/lib/utils";

interface ClickableIdProps {
  label: string;
  onClick: () => void;
  className?: string;
}

export function ClickableId({ label, onClick, className }: ClickableIdProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "font-medium text-[var(--primary)] underline-offset-2 hover:underline",
        className
      )}
    >
      {label}
    </button>
  );
}
