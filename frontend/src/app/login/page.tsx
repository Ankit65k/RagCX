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
      <div className="flex min-h-screen w-full">

        {/* ── LEFT PANEL: Brand Hero ──────────────────────────────────────── */}
        <div className="relative hidden lg:flex lg:w-3/5 flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-12">

          {/* Background decorative orbs */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
            <div className="absolute top-1/2 -right-20 h-72 w-72 rounded-full bg-white/8 blur-3xl" />
            <div className="absolute -bottom-20 left-1/3 h-80 w-80 rounded-full bg-black/20 blur-3xl" />
            {/* Subtle grid overlay */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
          </div>

          {/* Logo + Product name */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 text-white font-black text-xl shadow-lg">
              R
            </div>
            <div>
              <span className="text-lg font-bold text-white tracking-tight">RagCX</span>
            </div>
          </div>

          {/* Hero text */}
          <div className="relative z-10 space-y-6 max-w-lg">
            <div>
              <h1 className="text-4xl font-black text-white leading-tight tracking-tight">
                Ask your PDFs
                <br />
                <span className="text-white/70">anything</span>
              </h1>
              <p className="mt-4 text-base text-white/60 leading-relaxed">
                Answers come only from your documents, with page references.
              </p>
            </div>
          </div>

          {/* Bottom attribution */}
          <div className="relative z-10 flex items-center gap-2">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-white/30">Runs locally with Ollama and ChromaDB</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>
        </div>

        {/* ── RIGHT PANEL: Login Form ─────────────────────────────────────── */}
        <div className="flex w-full lg:w-2/5 flex-col items-center justify-center bg-background px-8 py-12">

          {/* Mobile-only logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-white font-black text-lg">
              R
            </div>
            <span className="text-xl font-bold text-foreground">RagCX</span>
          </div>

          <div className="w-full max-w-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header */}
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Welcome back
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Sign in to your workspace to continue
              </p>
            </div>

            {/* Form */}
            <LoginForm />

            {/* Register link */}
            <p className="text-center text-sm text-muted-foreground">
              No account yet?{" "}
              <Link
                href="/register"
                className="font-semibold text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-0.5"
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>

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
          className={`w-full rounded-xl border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50
            focus:outline-none focus:ring-2 transition-all
            ${errors.email
              ? "border-destructive focus:ring-destructive/30"
              : "border-border hover:border-primary/40 focus:border-primary focus:ring-primary/20"
            }`}
        />
        {errors.email && (
          <p className="text-xs text-destructive animate-in fade-in duration-200">
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
            className={`w-full rounded-xl border bg-card pl-4 pr-12 py-3 text-sm text-foreground placeholder:text-muted-foreground/50
              focus:outline-none focus:ring-2 transition-all
              ${errors.password
                ? "border-destructive focus:ring-destructive/30"
                : "border-border hover:border-primary/40 focus:border-primary focus:ring-primary/20"
              }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="text-xs text-destructive animate-in fade-in duration-200">
            {errors.password.message}
          </p>
        )}
      </div>

      {/* Submit */}
      <button
        id="login-submit"
        type="submit"
        disabled={isLoggingIn}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground
          hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2
          transition-all disabled:opacity-60 shadow-lg shadow-primary/25 active:scale-[0.98]"
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
