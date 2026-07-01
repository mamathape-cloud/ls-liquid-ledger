"use client";

import { cn } from "@/lib/utils";

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

export function Checkbox({ label, className, id, ...props }: CheckboxProps) {
  const inputId = id || props.name;
  return (
    <label
      htmlFor={inputId}
      className={cn("flex cursor-pointer items-center gap-2 text-sm text-slate-700", className)}
    >
      <input
        id={inputId}
        type="checkbox"
        className="h-4 w-4 rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]"
        {...props}
      />
      {label && <span>{label}</span>}
    </label>
  );
}
