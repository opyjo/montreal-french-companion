"use client";

import { useEffect, useRef, useState } from "react";
import { CircleCheck, RotateCcw, Volume2 } from "lucide-react";
import { TENSE_BY_ID, VERB_BY_KEY, conjugate } from "@/lib/conjugate";
import { checkVerbAnswer, type SessionItem, type VerbCheck } from "@/lib/verbDrill";
import { speakFrench } from "@/lib/speech";
import type { Grade } from "@/lib/srs";
import type { Settings } from "@/lib/useSettings";
import type { VerbLab } from "@/lib/useVerbLab";
import { Button, Card, EmptyState, SpeakButton, inputClass } from "../ui";
import { AccentKeys } from "./AccentKeys";
import { VerbTable } from "./VerbTable";

type Question = Exclude<SessionItem, { kind: "intro" }>;

interface Missed {
  item: Question;
  typed: string;
}

export function VerbSession({
  items: initial,
  title,
  lab,
  settings,
  onExit,
  onAgain,
}: {
  items: SessionItem[];
  title: string;
  lab: VerbLab;
  settings: Settings;
  onExit: () => void;
  onAgain?: () => void;
}) {
  const [queue, setQueue] = useState(initial);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [check, setCheck] = useState<VerbCheck | null>(null);
  const [stats, setStats] = useState({ right: 0, total: 0 });
  const [missed, setMissed] = useState<Missed[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const requeued = useRef(new Set<string>()); // each form gets one retry per session

  const item = queue[index];
  const done = !item;
  const answered = check !== null;

  // Reset per item; autoplay listening questions; focus the input.
  useEffect(() => {
    setTyped("");
    setPicked(null);
    setCheck(null);
    if (item?.kind === "listen") playListen();
    if (item?.kind === "type") setTimeout(() => inputRef.current?.focus(), 30);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  function playListen() {
    if (item?.kind !== "listen") return;
    const v = VERB_BY_KEY[item.cell.verb];
    void speakFrench(conjugate(v, item.cell.tense, item.cell.person, item.pronoun).full, {
      voice: settings.voice,
      rate: settings.speechRate,
    });
  }

  function answer(q: Question, result: VerbCheck, given: string) {
    setCheck(result);
    const grade: Grade =
      result.verdict === "correct" ? "good" : result.verdict === "wrong" ? "again" : "hard";
    void lab.recordAnswer(q.cell, grade);
    const ok = result.verdict !== "wrong";
    setStats((s) => ({ right: s.right + (ok ? 1 : 0), total: s.total + 1 }));
    if (!ok) {
      setMissed((m) => [...m, { item: q, typed: given }]);
      // Wrong once → ask again (typed) at the end of the session.
      const key = `${q.cell.verb}|${q.cell.tense}|${q.cell.person}`;
      if (!requeued.current.has(key)) {
        requeued.current.add(key);
        setQueue((qq) => [...qq, { ...q, kind: "type", options: undefined, isNew: false }]);
      }
    }
    const v = VERB_BY_KEY[q.cell.verb];
    if (settings.autoPlay && q.kind !== "listen")
      void speakFrench(conjugate(v, q.cell.tense, q.cell.person, q.pronoun).full, {
        voice: settings.voice,
        rate: settings.speechRate,
      });
  }

  function submitTyped() {
    if (item?.kind !== "type" || answered || !typed.trim()) return;
    answer(item, checkVerbAnswer(typed, item.cell, item.pronoun), typed);
  }

  function pick(option: string) {
    if (!item || item.kind === "intro" || item.kind === "type" || answered) return;
    setPicked(option);
    const v = VERB_BY_KEY[item.cell.verb];
    const form = conjugate(v, item.cell.tense, item.cell.person, item.pronoun);
    const right = item.kind === "listen" ? form.full : form.verb;
    answer(
      item,
      option === right ? { verdict: "correct", message: "Correct!" } : { verdict: "wrong", message: "Not quite." },
      option
    );
  }

  const next = () => setIndex((i) => i + 1);

  // Keyboard: Enter checks / continues, 1–4 picks an option.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!item) return;
      if (e.key === "Enter") {
        if (item.kind === "intro" || answered) {
          e.preventDefault();
          next();
        } else if (item.kind === "type") {
          e.preventDefault();
          submitTyped();
        }
      } else if (!answered && item.kind !== "intro" && item.kind !== "type" && /^[1-4]$/.test(e.key)) {
        const opt = item.options?.[Number(e.key) - 1];
        if (opt) pick(opt);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (done) {
    const pct = stats.total ? Math.round((stats.right / stats.total) * 100) : 100;
    return (
      <Card>
        <EmptyState icon={<CircleCheck className="size-6" />} title={`${title}: done`}>
          <p>
            {stats.right} of {stats.total} right ({pct}%). Bien joué !
          </p>
        </EmptyState>
        {missed.length > 0 && (
          <div className="mb-4">
            <h3 className="mb-2 text-sm font-semibold">Worth another look</h3>
            <ul className="space-y-1.5 text-sm">
              {dedupe(missed).map(({ item: q, typed: t }, i) => {
                const v = VERB_BY_KEY[q.cell.verb];
                const f = conjugate(v, q.cell.tense, q.cell.person, q.pronoun);
                return (
                  <li key={i} className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 px-3 py-2">
                    <span>
                      <span lang="fr" className="font-semibold text-good">{f.full}</span>
                      <span className="text-muted"> · {TENSE_BY_ID[q.cell.tense].name}</span>
                      {t && <span className="text-bad line-through decoration-1"> {t}</span>}
                    </span>
                    <SpeakButton text={f.full} voice={settings.voice} rate={settings.speechRate} size="sm" />
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap justify-center gap-2">
          {onAgain && (
            <Button onClick={onAgain}>
              <RotateCcw className="size-4" aria-hidden /> Practise more
            </Button>
          )}
          <Button variant="secondary" onClick={onExit}>
            Back to verbs
          </Button>
        </div>
      </Card>
    );
  }

  const progress = (index / queue.length) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-muted">
        <button onClick={onExit} className="font-semibold hover:text-ink">
          ← End
        </button>
        <span>
          {title} · {queue.length - index} left
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
      </div>

      {item.kind === "intro" ? (
        <Intro verb={item.verb} tense={item.tense} settings={settings} onNext={next} />
      ) : (
        <QuestionCard
          q={item}
          settings={settings}
          typed={typed}
          setTyped={setTyped}
          inputRef={inputRef}
          picked={picked}
          check={check}
          onSubmit={submitTyped}
          onPick={pick}
          onNext={next}
          onReplay={playListen}
        />
      )}
    </div>
  );
}

function dedupe(missed: Missed[]): Missed[] {
  const seen = new Set<string>();
  return missed.filter((m) => {
    const k = `${m.item.cell.verb}${m.item.cell.tense}${m.item.cell.person}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function Intro({ verb, tense, settings, onNext }: { verb: string; tense: Tense; settings: Settings; onNext: () => void }) {
  const v = VERB_BY_KEY[verb];
  const t = TENSE_BY_ID[tense];
  return (
    <Card>
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">New table</p>
      <h2 className="mt-1 text-2xl font-bold" lang="fr">
        {v.inf} <span className="text-base font-normal text-muted">· {t.name}</span>
      </h2>
      <p className="text-muted">
        {v.en} · <em>{t.english}</em>
      </p>
      <div className="mt-4">
        <VerbTable verb={v} tense={tense} settings={settings} />
      </div>
      {v.tip && tense === "present" && <p className="mt-3 rounded-xl bg-tip px-3.5 py-2.5 text-sm text-tip-text">{v.tip}</p>}
      <p className="mt-3 text-sm text-muted">Read it out loud once, then we&apos;ll quiz you on it.</p>
      <Button className="mt-4 w-full" onClick={onNext}>
        Got it, quiz me
      </Button>
    </Card>
  );
}

type Tense = Parameters<typeof conjugate>[1];

function QuestionCard({
  q,
  settings,
  typed,
  setTyped,
  inputRef,
  picked,
  check,
  onSubmit,
  onPick,
  onNext,
  onReplay,
}: {
  q: Question;
  settings: Settings;
  typed: string;
  setTyped: (s: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  picked: string | null;
  check: VerbCheck | null;
  onSubmit: () => void;
  onPick: (o: string) => void;
  onNext: () => void;
  onReplay: () => void;
}) {
  const v = VERB_BY_KEY[q.cell.verb];
  const t = TENSE_BY_ID[q.cell.tense];
  const form = conjugate(v, q.cell.tense, q.cell.person, q.pronoun);
  const answered = check !== null;
  const right = q.kind === "listen" ? form.full : form.verb;
  const subject = form.subject.endsWith("'") ? "je" : form.subject;

  return (
    <>
      <Card>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-primary-soft px-2.5 py-0.5 font-semibold text-primary">{t.name}</span>
          <span className="text-muted">{t.english}</span>
          {q.isNew && <span className="rounded-full bg-tip px-2 py-0.5 font-semibold text-tip-text">new</span>}
        </div>

        {q.kind === "listen" ? (
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={onReplay}
              aria-label="Play again"
              className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-fg hover:bg-primary-strong"
            >
              <Volume2 className="size-6" />
            </button>
            <div>
              <p className="text-lg font-semibold">Which one did you hear?</p>
              <p className="text-sm text-muted">
                {v.inf} — {v.en}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-sm text-muted">
              <span lang="fr" className="font-semibold text-ink">{v.inf}</span> — {v.en}
            </p>
            <p className="mt-1 text-3xl font-bold" lang="fr">
              {subject} <span className="text-muted">____</span>
            </p>
          </div>
        )}

        {q.kind === "type" && (
          <form
            className="mt-4"
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
            }}
          >
            <input
              ref={inputRef}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={answered}
              placeholder="Type the verb"
              className={inputClass}
              lang="fr"
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
            />
            {!answered && <AccentKeys inputRef={inputRef} value={typed} onChange={setTyped} />}
          </form>
        )}

        {(q.kind === "choose" || q.kind === "listen") && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {q.options?.map((o, i) => {
              const isRight = o === right;
              const state = !answered ? "" : isRight ? "border-good bg-good-soft text-good" : o === picked ? "border-bad bg-bad-soft text-bad" : "opacity-60";
              return (
                <button
                  key={o}
                  onClick={() => onPick(o)}
                  disabled={answered}
                  lang="fr"
                  className={`flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-3 text-left text-lg transition-colors hover:bg-surface-2 disabled:cursor-default ${state}`}
                >
                  <span className="hidden text-xs text-muted sm:inline">{i + 1}</span>
                  {o}
                </button>
              );
            })}
          </div>
        )}

        {answered && (
          <div className="mt-4 border-t border-line pt-4">
            <p
              role="status"
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                check.verdict === "correct" ? "bg-good-soft text-good" : check.verdict === "wrong" ? "bg-bad-soft text-bad" : "bg-warn-soft text-warn"
              }`}
            >
              {check.message}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <SpeakButton text={form.full} voice={settings.voice} rate={settings.speechRate} />
              <p lang="fr" className="text-xl font-semibold">{form.full}</p>
            </div>
            {check.verdict !== "correct" && (
              <p className="mt-3 rounded-xl bg-tip px-3.5 py-2.5 text-sm text-tip-text">
                {q.cell.tense === "present" && v.tip ? v.tip : t.how}
              </p>
            )}
          </div>
        )}
      </Card>

      {q.kind === "type" && !answered ? (
        <Button onClick={onSubmit} disabled={!typed.trim()} className="w-full py-3.5 text-base">
          Check
        </Button>
      ) : answered ? (
        <Button onClick={onNext} className="w-full py-3.5 text-base">
          Continue
        </Button>
      ) : null}
    </>
  );
}
