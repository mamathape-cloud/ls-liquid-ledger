"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@/lib/validators";
import { z } from "zod";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";

type LoginForm = z.infer<typeof loginSchema>;

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858 3.029a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: "", password: "" },
  });

  const phoneField = register("phone");
  const passwordField = register("password");

  const onSubmit = async (data: LoginForm) => {
    setServerError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const json = await res.json();
      setServerError(json.message || "Login failed");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Image
            src="/liquid-stage-logo.png"
            alt="Liquid Stage"
            width={939}
            height={1024}
            priority
            className="mx-auto h-auto max-h-24 w-auto object-contain"
          />
        </div>

        <div className="th-card p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-slate-900">Welcome Back 👋</h1>
          <p className="mt-1 text-sm text-slate-500">Login to your account to continue</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="phone" required>Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={10}
                placeholder="10-digit phone number"
                className="mt-1.5"
                name={phoneField.name}
                ref={phoneField.ref}
                onBlur={phoneField.onBlur}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                  e.target.value = digits;
                  setValue("phone", digits, { shouldValidate: true, shouldDirty: true });
                }}
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="password" required>Password</Label>
              <div className="relative mt-1.5">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="pr-11"
                  name={passwordField.name}
                  ref={passwordField.ref}
                  onBlur={passwordField.onBlur}
                  onChange={passwordField.onChange}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-500 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)]"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOffIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>
            {serverError && <p className="text-sm text-red-600">{serverError}</p>}
            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Login"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            <span className="font-semibold text-slate-700">Liquid Ledger</span>
            <br />
            Expense management portal
          </p>
        </div>
      </div>
    </div>
  );
}
