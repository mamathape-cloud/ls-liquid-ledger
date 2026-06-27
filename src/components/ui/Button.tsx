import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const variants = {
      primary: "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-sm",
      secondary: "bg-[var(--primary-soft)] text-[var(--primary)] hover:bg-[#f5ecd0]",
      danger: "bg-red-600 text-white hover:bg-red-700",
      ghost: "border border-[var(--border)] bg-white text-slate-700 hover:bg-slate-50",
      outline: "border border-[var(--primary)] bg-white text-[var(--primary)] hover:bg-[var(--primary-soft)]",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-xs",
      md: "px-4 py-2.5 text-sm",
      lg: "px-5 py-3 text-base",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-medium transition disabled:opacity-50",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
