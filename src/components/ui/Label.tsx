import { cn } from "@/lib/utils";
import { LabelHTMLAttributes, ReactNode } from "react";

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  children: ReactNode;
}

export function Label({ className, required, children, ...props }: LabelProps) {
  return (
    <label
      className={cn("mb-1 block text-sm font-medium text-slate-800", className)}
      {...props}
    >
      {children}
      {required && (
        <span className="text-red-600" aria-hidden="true">
          {" "}
          *
        </span>
      )}
    </label>
  );
}
