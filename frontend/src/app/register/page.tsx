"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { PublicRoute } from "@/features/auth/guards/RouteGuard";
import {
  Eye, EyeOff, Loader2, ArrowRight, Check, X,
  Lock, Building2, Layers,
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

// ─── Selling points (left panel) ──────────────────────────────────────────
const points = [
  { icon: Layers,    title: "Instant Semantic Search",  desc: "Vector embeddings over your entire PDF library." },
  { icon: Lock,      title: "Enterprise Security",      desc: "JWT + refresh rotation + role-based access control." },
  { icon: Building2, title: "Multi-Tenant Ready",       desc: "Built for teams with scoped document access." },
];

// ─── Register Page ─────────────────────────────────────────────────────────
export default function RegisterPage() {
  return (
    <PublicRoute>
      <div className="flex min-h-screen w-full">

        {/* ── LEFT: brand panel ──────────────────────────────────────────── */}
        <div className="relative hidden lg:flex lg:w-2/5 flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-primary/85 to-primary/60 p-12">
          {/* Decorative orbs */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-black/20 blur-3xl" />
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)",
                backgroundSize: "36px 36px",
              }}
            />
          </div>

          {/* Logo */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 text-white font-black text-xl">
              R
            </div>
            <div>
              <span className="text-lg font-bold text-white tracking-tight">RagCX</span>
              <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white/90 uppercase tracking-widest">
                Enterprise
              </span>
            </div>
          </div>

          {/* Hero */}
          <div className="relative z-10 space-y-6 max-w-xs">
            <div>
              <h1 className="text-3xl font-black text-white leading-tight">
                Join the next
                <br />
                <span className="text-white/65">generation of RAG</span>
              </h1>
              <p className="mt-3 text-sm text-white/55 leading-relaxed">
                Create your account and start chatting with your documents in minutes.
              </p>
            </div>
            <div className="space-y-4">
              {points.map((p) => {
                const Icon = p.icon;
                return (
                  <div key={p.title} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 border border-white/15">
                      <Icon className="h-4 w-4 text-white/70" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{p.title}</p>
                      <p className="text-xs text-white/45 leading-relaxed">{p.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-2">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-white/25">Free to register. No credit card required.</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>
        </div>

        {/* ── RIGHT: form panel ──────────────────────────────────────────── */}
        <div className="flex w-full lg:w-3/5 flex-col items-center justify-center bg-background px-8 py-12 overflow-y-auto">

          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-black text-lg">
              R
            </div>
            <span className="text-xl font-bold text-foreground">RagCX</span>
          </div>

          <div className="w-full max-w-sm space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Create your account
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Start indexing and searching enterprise PDFs instantly.
              </p>
            </div>

            <RegisterForm />

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-0.5"
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

  const inputBase =
    "w-full rounded-xl border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 transition-all";
  const inputOk   = "border-border hover:border-primary/40 focus:border-primary focus:ring-primary/20";
  const inputErr  = "border-destructive focus:ring-destructive/30";

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
          className={`${inputBase} ${errors.email ? inputErr : inputOk}`}
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
            className={`${inputBase} pr-12 ${errors.password ? inputErr : inputOk}`}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {/* Strength checklist */}
        {pwValue.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-3 space-y-1.5">
            {[
              { rule: passwordRules.minLength,  text: "At least 12 characters" },
              { rule: passwordRules.hasUpper,   text: "One uppercase letter" },
              { rule: passwordRules.hasLower,   text: "One lowercase letter" },
              { rule: passwordRules.hasNumber,  text: "One number" },
              { rule: passwordRules.hasSpecial, text: "One special character" },
            ].map(({ rule, text }) => {
              const ok = rule(pwValue);
              return (
                <div key={text} className={`flex items-center gap-2 text-xs font-medium transition-colors ${ok ? "text-emerald-500" : "text-muted-foreground"}`}>
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
            className={`${inputBase} pr-12 ${errors.confirmPassword ? inputErr : inputOk}`}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
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
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground
          hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2
          transition-all disabled:opacity-60 shadow-lg shadow-primary/25 active:scale-[0.98]"
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
