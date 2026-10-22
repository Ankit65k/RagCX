"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { PublicRoute } from "@/features/auth/guards/RouteGuard";
import {
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

// ─── Validation Schema ─────────────────────────────────────────────────────

const loginSchema = zod.object({
  email: zod.string().email("Enter a valid email address"),
  password: zod.string().min(1, "Password is required"),
});

type LoginFormValues = zod.infer<typeof loginSchema>;

// ─── Login Page ────────────────────────────────────────────────────────────

export default function LoginPage() {
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
                Welcome back
              </h2>
              <p className="mt-2 text-sm text-ink-subtle">
                Sign in to your workspace to continue
              </p>
            </div>

            {/* Form */}
            <LoginForm />

            {/* Register link */}
            <p className="text-center text-sm text-ink-subtle">
              No account yet?{" "}
              <Link
                href="/register"
                className="font-semibold text-primary hover:text-primary-hover transition-colors inline-flex items-center gap-0.5"
              >
                Create one
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </p>
          </div>

        </div>
      </div>
    </PublicRoute>
  );
}

// ─── Login Form Component ──────────────────────────────────────────────────

function LoginForm() {
  const { login, isLoggingIn } = useAuth();
  const [showPassword, setShowPassword] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (data: LoginFormValues) => {
    login({ email: data.email, password: data.password });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>

      {/* Email */}
      <div className="space-y-1.5">
        <label htmlFor="login-email" className="text-xs font-semibold text-foreground">
          Email Address
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          disabled={isLoggingIn}
          {...register("email")}
          className={`w-full rounded-md border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-ink-subtle/50
            focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all
            ${errors.email
              ? "border-destructive focus:ring-destructive/40"
              : "border-hairline hover:border-hairline-strong"
            }`}
        />
        {errors.email && (
          <p className="text-xs text-destructive">
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <label htmlFor="login-password" className="text-xs font-semibold text-foreground">
          Password
        </label>
        <div className="relative">
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••••••"
            disabled={isLoggingIn}
            {...register("password")}
            className={`w-full rounded-md border bg-surface-2 pl-3 pr-10 py-2 text-sm text-foreground placeholder:text-ink-subtle/50
              focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all
              ${errors.password
                ? "border-destructive focus:ring-destructive/40"
                : "border-hairline hover:border-hairline-strong"
              }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-subtle hover:text-foreground hover:bg-surface-1 transition-colors"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="text-xs text-destructive">
            {errors.password.message}
          </p>
        )}
      </div>

      {/* Submit */}
      <button
        id="login-submit"
        type="submit"
        disabled={isLoggingIn}
        className="w-full flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground
          hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary-focus/50 focus:ring-offset-2 focus:ring-offset-surface-1
          transition-all disabled:opacity-60 active:scale-[0.98]"
      >
        {isLoggingIn ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Signing in…
          </>
        ) : (
          <>
            Sign In
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

    </form>
  );
}
