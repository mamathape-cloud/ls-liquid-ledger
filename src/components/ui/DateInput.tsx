"use client";

import { forwardRef, useEffect, useRef, useState, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type DateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "defaultValue" | "onChange"> & {
  /** Controlled value (YYYY-MM-DD). Prefer this with RHF Controller / setValue. */
  value?: string;
  /** Uncontrolled initial value. */
  defaultValue?: string;
  onChange?: (value: string) => void;
  onBlur?: InputHTMLAttributes<HTMLInputElement>["onBlur"];
};

/**
 * Mobile-safe date input.
 * Keeps a local value while focused so parent re-renders (watch / polling)
 * cannot remount or reset the native picker mid-selection.
 */
export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  function DateInput(
    { className, value, defaultValue = "", onChange, onBlur, name, ...props },
    ref
  ) {
    const isControlled = value !== undefined;
    const [inner, setInner] = useState(String(isControlled ? value : defaultValue));
    const focusedRef = useRef(false);

    useEffect(() => {
      if (!isControlled) return;
      // Do not sync from parent while the native picker is open.
      if (focusedRef.current) return;
      setInner(String(value ?? ""));
    }, [value, isControlled]);

    const commit = (next: string) => {
      setInner(next);
      onChange?.(next);
    };

    return (
      <input
        ref={ref}
        type="date"
        name={name}
        value={inner}
        className={cn(
          "date-input w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-slate-900 outline-none",
          "focus:border-[var(--primary)] focus:ring-0",
          className
        )}
        {...props}
        onFocus={(e) => {
          focusedRef.current = true;
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          focusedRef.current = false;
          // Sync any pending value after the picker closes.
          if (isControlled && String(value ?? "") !== inner) {
            onChange?.(inner);
          }
          onBlur?.(e);
        }}
        onChange={(e) => {
          const next = e.target.value;
          // Only commit complete dates — avoids intermediate mobile events closing the picker.
          if (next === "" || /^\d{4}-\d{2}-\d{2}$/.test(next)) {
            commit(next);
          } else {
            setInner(next);
          }
        }}
      />
    );
  }
);

DateInput.displayName = "DateInput";
