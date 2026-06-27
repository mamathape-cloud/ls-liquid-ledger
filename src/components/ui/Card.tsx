import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("th-card p-4 text-slate-900 sm:p-6", className)}
      {...props}
    />
  );
}
