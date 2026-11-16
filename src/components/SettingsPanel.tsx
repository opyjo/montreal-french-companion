"use client";

import { useEffect, useState } from "react";
import { LogIn, LogOut, X } from "lucide-react";
import { firebaseConfigured } from "@/lib/firebase";
import { VOICES, speakFrench, type Voice } from "@/lib/speech";
import type { AiProvider } from "@/lib/ai";
import type { StudyData } from "@/lib/useStudyData";
import type { Settings } from "@/lib/useSettings";
import { Button, ErrorBox, Field, inputClass } from "./ui";

export function SettingsPanel({
  open,
  onClose,
  data,
  settings,
  update,
}: {
  open: boolean;
  onClose: () => void;
  data: StudyData;
  settings: Settings;
  update: (p: Partial<Settings>) => void;
}) {
  const [authError, setAuthError] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const u = data.user;
  const signedIn = !!u && !u.isAnonymous;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-md overflow-y-auto bg-bg p-5 shadow-xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold">Settings</h2>
          <button onClick={onClose} aria-label="Close settings" className="rounded-lg p-2 text-muted hover:bg-surface-2">
            <X className="size-5" />
          </button>
        </div>

        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Account &amp; sync</h3>
          {!firebaseConfigured ? (
            <p className="text-sm text-muted">
              Firebase isn&apos;t configured, so your words are saved in this browser only. Add the
              <code className="mx-1">NEXT_PUBLIC_FIREBASE_*</code> variables to enable sync.
            </p>
          ) : signedIn ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3">
              <div className="min-w-0 text-sm">
                <p className="truncate font-semibold">{u.displayName || "Signed in"}</p>
                <p className="truncate text-muted">{u.email}</p>
              </div>
              <Button variant="secondary" onClick={() => void data.signOut()}>
                <LogOut className="size-4" aria-hidden /> Sign out
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted">
                {data.mode === "cloud"
                  ? "Your words are saved to a guest account on this device. Sign in with Google to keep them and use them on your phone and computer."
                  : "Sync is unavailable right now; words are saved in this browser."}
              </p>
              <Button
                loading={signingIn}
                onClick={async () => {
                  setAuthError("");
                  setSigningIn(true);
                  try {
                    await data.signInWithGoogle();
                  } catch (e) {
                    setAuthError(e instanceof Error ? e.message : String(e));
                  } finally {
                    setSigningIn(false);
                  }
                }}
              >
                <LogIn className="size-4" aria-hidden /> Sign in with Google
              </Button>
              {authError && <ErrorBox message={authError} />}
            </div>
          )}
        </section>

        <section className="mt-7 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Audio</h3>
          <Field label="Voice">
            <div className="flex gap-2">
              <select
                value={settings.voice}
                onChange={(e) => update({ voice: e.target.value as Voice })}
                className={inputClass}
              >
                {VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
              <Button
                variant="secondary"
                onClick={() =>
                  void speakFrench("Bonjour ! Je m'appelle Camille. Enchantée.", {
                    voice: settings.voice,
                    rate: settings.speechRate,
                  })
                }
              >
                Test
              </Button>
            </div>
          </Field>
          <Field label={`Speed: ${settings.speechRate.toFixed(2)}×`}>
            <input
              type="range"
              min={0.6}
              max={1.2}
              step={0.05}
              value={settings.speechRate}
              onChange={(e) => update({ speechRate: Number(e.target.value) })}
              className="w-full accent-[var(--primary)]"
            />
          </Field>
          <label className="flex items-center justify-between gap-3 text-sm font-semibold">
            Play French automatically during review
            <input
              type="checkbox"
              checked={settings.autoPlay}
              onChange={(e) => update({ autoPlay: e.target.checked })}
              className="size-5 accent-[var(--primary)]"
            />
          </label>
        </section>

        <section className="mt-7 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">AI</h3>
          <p className="text-sm text-muted">
            Translations and explanations use Gemini through Firebase, with no key needed. If that stops
            working, you can add your own API key here as a backup. It&apos;s stored only in this browser.
          </p>
          <Field label="Backup provider">
            <select
              value={settings.aiProvider}
              onChange={(e) => update({ aiProvider: e.target.value as AiProvider })}
              className={inputClass}
            >
              <option value="firebase">None (Firebase only)</option>
              <option value="gemini">Google Gemini API key</option>
              <option value="openai">OpenAI API key</option>
            </select>
          </Field>
          {settings.aiProvider !== "firebase" && (
            <Field label="API key">
              <input
                type="password"
                value={settings.aiKey}
                onChange={(e) => update({ aiKey: e.target.value.trim() })}
                className={inputClass}
                autoComplete="off"
              />
            </Field>
          )}
        </section>
      </aside>
    </div>
  );
}
