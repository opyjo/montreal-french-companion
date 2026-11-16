"use client";

import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { LoaderCircle, Volume2 } from "lucide-react";
import { speakFrench, type Voice } from "@/lib/speech";
import type { Gender, PartOfSpeech } from "@/lib/types";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-fg hover:bg-primary-strong disabled:opacity-50",
  secondary:
    "bg-surface text-ink border border-line hover:bg-surface-2 disabled:opacity-50",
  ghost: "text-muted hover:text-ink hover:bg-surface-2 disabled:opacity-50",
  danger: "text-bad hover:bg-bad-soft disabled:opacity-50",
};

export function Button({
  variant = "primary",
  className = "",
  loading,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
}) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${VARIANTS[variant]} ${className}`}
    >
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-line bg-surface p-4 sm:p-5 ${className}`}>
      {children}
    </div>
  );
}

export function SpeakButton({
  text,
  voice,
  rate,
  size = "md",
  label = "Listen",
}: {
  text: string;
  voice: Voice;
  rate: number;
  size?: "sm" | "md";
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const dim = size === "sm" ? "size-8" : "size-10";
  return (
    <button
      type="button"
      aria-label={`${label}: ${text}`}
      title={label}
      onClick={async (e) => {
        e.stopPropagation();
        setBusy(true);
        try {
          await speakFrench(text, { voice, rate });
        } finally {
          setBusy(false);
        }
      }}
      className={`${dim} shrink-0 inline-flex items-center justify-center rounded-full bg-primary-soft text-primary hover:bg-primary hover:text-primary-fg transition-colors`}
    >
      {busy ? (
        <LoaderCircle className="size-4 animate-spin" aria-hidden />
      ) : (
        <Volume2 className={size === "sm" ? "size-4" : "size-5"} aria-hidden />
      )}
    </button>
  );
}

export function GenderChip({ gender }: { gender: Gender }) {
  if (gender === "none") return null;
  const masc = gender === "masculine";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
        masc ? "bg-masc-soft text-masc" : "bg-fem-soft text-fem"
      }`}
    >
      {masc ? "masculine" : "feminine"}
    </span>
  );
}

export function PosChip({ pos }: { pos: PartOfSpeech }) {
  return (
    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted">
      {pos}
    </span>
  );
}

/** Colours nouns by gender — seeing la/le in a consistent colour helps it stick. */
export function genderText(gender: Gender): string {
  if (gender === "masculine") return "text-masc";
  if (gender === "feminine") return "text-fem";
  return "text-ink";
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-base text-ink placeholder:text-muted/70 focus:border-primary focus:outline-none";

export function ErrorBox({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-bad/30 bg-bad-soft px-4 py-3 text-sm text-bad"
    >
      {message}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        {icon}
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      {children && <div className="mt-1 max-w-sm text-sm text-muted">{children}</div>}
    </div>
  );
}

/** Shown under a form while an AI request is running longer than usual. */
export function SlowHint({ active }: { active: boolean }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    setSlow(false);
    if (!active) return;
    const t = setTimeout(() => setSlow(true), 5000);
    return () => clearTimeout(t);
  }, [active]);
  if (!active || !slow) return null;
  return (
    <p role="status" className="text-sm text-muted">
      Gemini is busy. Still trying, this can take up to 20 seconds…
    </p>
  );
}
