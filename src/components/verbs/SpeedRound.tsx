"use client";

import { useEffect, useRef, useState } from "react";
import { Zap } from "lucide-react";
import { TENSE_BY_ID, VERB_BY_KEY, conjugate } from "@/lib/conjugate";
import { randomSpeedItem, type SessionItem } from "@/lib/verbDrill";
import type { VerbLab } from "@/lib/useVerbLab";
import { Button, Card } from "../ui";

const SECONDS = 60;
const BEST_KEY = "dl_speed_best";

type Q = Exclude<SessionItem, { kind: "intro" }>;

/** 60 seconds of multiple choice. Wrong answers feed your weak-forms list. */
export function SpeedRound({ lab, onExit, onAgain }: { lab: VerbLab; onExit: () => void; onAgain: () => void }) {
  const [q, setQ] = useState<Q>(() => randomSpeedItem(lab.prefs) as Q);
  const [left, setLeft] = useState(SECONDS);
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [flash, setFlash] = useState<{ picked: string; right: string } | null>(null);
  const [best, setBest] = useState(0);
  const started = useRef(Date.now());

  useEffect(() => {
    try {
      setBest(Number(localStorage.getItem(BEST_KEY) || 0));
    } catch {
      // ignore
    }
    const t = setInterval(() => {
      setLeft(Math.max(0, SECONDS - Math.floor((Date.now() - started.current) / 1000)));
    }, 250);
    return () => clearInterval(t);
  }, []);

  const over = left === 0;

  useEffect(() => {
    if (!over || score <= best) return;
    setBest(score);
    try {
      localStorage.setItem(BEST_KEY, String(score));
    } catch {
      // ignore
    }
  }, [over, score, best]);

  const v = VERB_BY_KEY[q.cell.verb];
  const form = conjugate(v, q.cell.tense, q.cell.person, q.pronoun);

  function pick(o: string) {
    if (flash || over) return;
    const ok = o === form.verb;
    setFlash({ picked: o, right: form.verb });
    if (ok) setScore((s) => s + 1);
    else setMisses((m) => m + 1);
    // Count it, but don't let rushed guessing reschedule reviews.
    void lab.recordAnswer(q.cell, ok ? "good" : "again", false);
    setTimeout(
      () => {
        setFlash(null);
        setQ(randomSpeedItem(lab.prefs) as Q);
      },
      ok ? 250 : 1100
    );
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (/^[1-4]$/.test(e.key) && q.options?.[Number(e.key) - 1]) pick(q.options[Number(e.key) - 1]);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (over) {
    return (
      <Card className="text-center">
        <Zap className="mx-auto size-8 text-warn" aria-hidden />
        <h2 className="mt-2 text-2xl font-bold">{score} correct</h2>
        <p className="text-muted">
          {misses} missed · best {Math.max(best, score)}
          {score > 0 && score >= best && " · new record!"}
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Button onClick={onAgain}>Go again</Button>
          <Button variant="secondary" onClick={onExit}>
            Back to verbs
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <button onClick={onExit} className="font-semibold text-muted hover:text-ink">
          ← End
        </button>
        <span className="font-semibold tabular-nums">
          ⚡ {score} · <span className={left <= 10 ? "text-bad" : ""}>{left}s</span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-warn transition-all duration-300" style={{ width: `${(left / SECONDS) * 100}%` }} />
      </div>
      <Card>
        <p className="text-xs font-semibold text-primary">{TENSE_BY_ID[q.cell.tense].name}</p>
        <p className="mt-1 text-sm text-muted">
          <span lang="fr" className="font-semibold text-ink">{v.inf}</span> — {v.en}
        </p>
        <p className="mt-1 text-3xl font-bold" lang="fr">
          {form.subject.endsWith("'") ? "je" : form.subject} <span className="text-muted">____</span>
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {q.options?.map((o) => {
            const state = !flash ? "" : o === flash.right ? "border-good bg-good-soft text-good" : o === flash.picked ? "border-bad bg-bad-soft text-bad" : "opacity-50";
            return (
              <button
                key={o}
                lang="fr"
                onClick={() => pick(o)}
                className={`rounded-xl border border-line bg-surface px-3 py-3.5 text-lg hover:bg-surface-2 ${state}`}
              >
                {o}
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
