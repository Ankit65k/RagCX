"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { PublicRoute } from "@/features/auth/guards/RouteGuard";
import {
  Eye, EyeOff, Loader2, ArrowRight, Check, X,
} from "lucide-react";
import Link from "next/link";

// ─── Password rules ────────────────────────────────────────────────────────
const passwordRules = {
  minLength:  (v: string) => v.length >= 12,
  hasUpper:   (v: string) => /[A-Z]/.test(v),
  hasLower:   (v: string) => /[a-z]/.test(v),
  hasNumber:  (v: string) => /[0-9]/.test(v),
  hasSpecial: (v: string) => /[^A-Za-z0-9]/.test(v),
};

const schema = zod
  .object({
    email:           zod.string().email("Enter a valid email address"),
    password:        zod.string()
      .min(12, "At least 12 characters")
      .refine(passwordRules.hasUpper,   "Must have an uppercase letter")
      .refine(passwordRules.hasLower,   "Must have a lowercase letter")
      .refine(passwordRules.hasNumber,  "Must have a number")
      .refine(passwordRules.hasSpecial, "Must have a special character"),
    confirmPassword: zod.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type FormValues = zod.infer<typeof schema>;

// ─── Register Page ─────────────────────────────────────────────────────────
export default function RegisterPage() {
  return (
    <PublicRoute>
      <div className="flex min-h-screen w-full items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-8 animate-fade-in">

          {/* Logo */}
          <div className="flex items-center gap-3 justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-lg">
              R
            </div>
            <span className="text-xl font-bold text-foreground">RagCX</span>
          </div>

          {/* Auth Card */}
          <div className="rounded-lg border border-hairline bg-surface-1 p-8 space-y-6">
            {/* Header */}
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Create your account
              </h2>
              <p className="mt-2 text-sm text-ink-subtle">
                Start indexing and searching PDFs instantly.
              </p>
            </div>

            {/* Form */}
            <RegisterForm />

            {/* Login link */}
            <p className="text-center text-sm text-ink-subtle">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-primary hover:text-primary-hover transition-colors inline-flex items-center gap-0.5"
              >
                Sign in
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </p>
          </div>

        </div>
      </div>
    </PublicRoute>
  );
}

// ─── Register Form ─────────────────────────────────────────────────────────
function RegisterForm() {
  const { register: registerUser, isRegistering } = useAuth();
  const [showPw, setShowPw]        = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [pwValue, setPwValue]      = React.useState("");

  const {
    register, handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = (data: FormValues) =>
    registerUser({ email: data.email, password: data.password, confirmPassword: data.confirmPassword });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>

      {/* Email */}
      <div className="space-y-1.5">
        <label htmlFor="reg-email" className="text-xs font-semibold text-foreground">Email Address</label>
        <input
          id="reg-email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          disabled={isRegistering}
          {...register("email")}
          className={`w-full rounded-md border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-ink-subtle/50
            focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all
            ${errors.email
              ? "border-destructive focus:ring-destructive/40"
              : "border-hairline hover:border-hairline-strong"
            }`}
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <label htmlFor="reg-password" className="text-xs font-semibold text-foreground">Password</label>
        <div className="relative">
          <input
            id="reg-password"
            type={showPw ? "text" : "password"}
            autoComplete="new-password"
            placeholder="••••••••••••"
            disabled={isRegistering}
            {...register("password", { onChange: (e) => setPwValue(e.target.value) })}
            className={`w-full rounded-md border bg-surface-2 pl-3 pr-10 py-2 text-sm text-foreground placeholder:text-ink-subtle/50
              focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all
              ${errors.password
                ? "border-destructive focus:ring-destructive/40"
                : "border-hairline hover:border-hairline-strong"
              }`}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-ink-subtle hover:text-foreground hover:bg-surface-1 transition-colors"
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {/* Strength checklist */}
        {pwValue.length > 0 && (
          <div className="rounded-md border border-hairline bg-surface-2 p-3 space-y-1.5">
            {[
              { rule: passwordRules.minLength,  text: "At least 12 characters" },
              { rule: passwordRules.hasUpper,   text: "One uppercase letter" },
              { rule: passwordRules.hasLower,   text: "One lowercase letter" },
              { rule: passwordRules.hasNumber,  text: "One number" },
              { rule: passwordRules.hasSpecial, text: "One special character" },
            ].map(({ rule, text }) => {
              const ok = rule(pwValue);
              return (
                <div key={text} className={`flex items-center gap-2 text-xs font-medium transition-colors ${ok ? "text-success" : "text-ink-subtle"}`}>
                  {ok ? <Check className="h-3.5 w-3.5 shrink-0" /> : <X className="h-3.5 w-3.5 shrink-0" />}
                  {text}
                </div>
              );
            })}
          </div>
        )}

        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>

      {/* Confirm Password */}
      <div className="space-y-1.5">
        <label htmlFor="reg-confirm" className="text-xs font-semibold text-foreground">Confirm Password</label>
        <div className="relative">
          <input
            id="reg-confirm"
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            placeholder="••••••••••••"
            disabled={isRegistering}
            {...register("confirmPassword")}
            className={`w-full rounded-md border bg-surface-2 pl-3 pr-10 py-2 text-sm text-foreground placeholder:text-ink-subtle/50
              focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all
              ${errors.confirmPassword
                ? "border-destructive focus:ring-destructive/40"
                : "border-hairline hover:border-hairline-strong"
              }`}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-ink-subtle hover:text-foreground hover:bg-surface-1 transition-colors"
          >
            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
        )}
      </div>

      {/* Submit */}
      <button
        id="register-submit"
        type="submit"
        disabled={isRegistering}
        className="w-full flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground
          hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary-focus/50 focus:ring-offset-2 focus:ring-offset-surface-1
          transition-all disabled:opacity-60 active:scale-[0.98]"
      >
        {isRegistering ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Creating account…
          </>
        ) : (
          <>
            Create Account
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

    </form>
  );
}
