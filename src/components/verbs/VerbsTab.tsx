"use client";

import { useMemo, useState } from "react";
import { ChevronRight, CircleHelp, Plus, Search, Target, Zap } from "lucide-react";
import { ALL_VERBS, PERSONS, TENSES, TENSE_BY_ID, VERB_BY_KEY, conjugate, type Tense } from "@/lib/conjugate";
import { stripAccents } from "@/lib/answer";
import {
  buildSmartSession,
  buildTableSession,
  buildWeakSession,
  unseenGroups,
  verbMastery,
  weakestCells,
  type SessionItem,
} from "@/lib/verbDrill";
import type { Settings } from "@/lib/useSettings";
import type { VerbLab } from "@/lib/useVerbLab";
import { Button, Card, inputClass } from "../ui";
import { SpeedRound } from "./SpeedRound";
import { VerbDetail } from "./VerbDetail";
import { VerbSession } from "./VerbSession";

type View =
  | { kind: "home" }
  | { kind: "verb"; key: string }
  | { kind: "session"; title: string; items: SessionItem[]; again?: () => SessionItem[]; n: number }
  | { kind: "speed"; n: number };

export function VerbsTab({ lab, settings }: { lab: VerbLab; settings: Settings }) {
  const [view, setView] = useState<View>({ kind: "home" });
  const [q, setQ] = useState("");
  const [showTenseHelp, setShowTenseHelp] = useState(false);
  const [showAllOthers, setShowAllOthers] = useState(false);
  const { prefs, cells } = lab;

  const nextNew = useMemo(() => unseenGroups(cells, prefs)[0], [cells, prefs]);
  const weak = useMemo(() => weakestCells(cells, 5), [cells]);

  const startSession = (title: string, build: () => SessionItem[]) =>
    setView({ kind: "session", title, items: build(), again: build, n: Date.now() });

  const top = () => window.scrollTo({ top: 0 });

  if (view.kind === "session") {
    return (
      <VerbSession
        key={view.n}
        items={view.items}
        title={view.title}
        lab={lab}
        settings={settings}
        onExit={() => setView({ kind: "home" })}
        onAgain={view.again ? () => startSession(view.title, view.again!) : undefined}
      />
    );
  }
  if (view.kind === "speed") {
    return (
      <SpeedRound
        key={view.n}
        lab={lab}
        onExit={() => setView({ kind: "home" })}
        onAgain={() => setView({ kind: "speed", n: Date.now() })}
      />
    );
  }
  if (view.kind === "verb") {
    return (
      <VerbDetail
        verbKey={view.key}
        lab={lab}
        settings={settings}
        onBack={() => {
          setView({ kind: "home" });
          top();
        }}
        onDrill={(tense) => startSession(`${VERB_BY_KEY[view.key].inf} · ${TENSE_BY_ID[tense].name}`, () => buildTableSession(view.key, tense, prefs))}
      />
    );
  }

  const needle = stripAccents(q.trim().toLowerCase());
  const matchesQ = (k: string) => {
    const v = VERB_BY_KEY[k];
    return !needle || stripAccents(v.inf).includes(needle) || v.en.toLowerCase().includes(needle);
  };
  const mine = ALL_VERBS.filter((v) => prefs.myVerbs.includes(v.key) && matchesQ(v.key));
  const others = ALL_VERBS.filter((v) => !prefs.myVerbs.includes(v.key) && matchesQ(v.key));
  const smartCount = lab.dueCount + (nextNew ? 6 : 0);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted">Verb forms to review</p>
            <p className="text-4xl font-bold tabular-nums">{lab.dueCount}</p>
            {nextNew && (
              <p className="mt-1 text-sm text-muted">
                Next new table: <span lang="fr" className="font-semibold text-ink">{VERB_BY_KEY[nextNew.verb].inf}</span> · {TENSE_BY_ID[nextNew.tense].name}
              </p>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button className="flex-1 sm:flex-none" disabled={smartCount === 0} onClick={() => startSession("Practice", () => buildSmartSession(lab.cells, lab.prefs))}>
            <Target className="size-4" aria-hidden /> Practice
          </Button>
          <Button variant="secondary" className="flex-1 sm:flex-none" onClick={() => setView({ kind: "speed", n: Date.now() })}>
            <Zap className="size-4" aria-hidden /> 60-second round
          </Button>
        </div>
        {smartCount === 0 && (
          <p className="mt-2 text-xs text-muted">All caught up, and every verb in your list is started. Add more verbs below, or turn on another tense.</p>
        )}
      </Card>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Tenses I&apos;m practising</h2>
          <button onClick={() => setShowTenseHelp(!showTenseHelp)} className="flex items-center gap-1 text-sm text-primary" aria-expanded={showTenseHelp}>
            <CircleHelp className="size-4" aria-hidden /> What are these?
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {TENSES.map((t) => {
            const on = prefs.tenses.includes(t.id);
            return (
              <button
                key={t.id}
                aria-pressed={on}
                onClick={() =>
                  lab.setPrefs({ tenses: on ? prefs.tenses.filter((x) => x !== t.id) : TENSES.map((x) => x.id).filter((x) => x === t.id || prefs.tenses.includes(x)) })
                }
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
                  on ? "border-primary bg-primary-soft text-primary" : "border-line text-muted hover:text-ink"
                }`}
              >
                {on ? "✓ " : ""}
                {t.name}
              </button>
            );
          })}
        </div>
        {showTenseHelp && (
          <dl className="mt-3 space-y-2.5 border-t border-line pt-3 text-sm">
            {TENSES.map((t) => (
              <div key={t.id}>
                <dt className="font-semibold">
                  {t.name} <span className="font-normal text-muted">= {t.english}</span>
                </dt>
                <dd className="text-muted">{t.when} {t.how}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-sm font-semibold">Answer by</span>
          <div className="flex rounded-xl bg-surface-2 p-1 text-sm" role="radiogroup" aria-label="Answer mode">
            {(["type", "choose"] as const).map((m) => (
              <button
                key={m}
                role="radio"
                aria-checked={prefs.answerMode === m}
                onClick={() => lab.setPrefs({ answerMode: m })}
                className={`rounded-lg px-3 py-1.5 font-semibold ${prefs.answerMode === m ? "bg-surface text-ink shadow-sm" : "text-muted"}`}
              >
                {m === "type" ? "Typing" : "Multiple choice"}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-1 text-xs text-muted">Typing is harder but sticks better. Use multiple choice when you&apos;re on the go.</p>
      </Card>

      {weak.length > 0 && (
        <Card>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="font-semibold">Forms you miss most</h2>
            <Button variant="secondary" className="!py-1.5" onClick={() => startSession("Weak forms", () => buildWeakSession(lab.cells, lab.prefs))}>
              Drill these
            </Button>
          </div>
          <ul className="space-y-1.5 text-sm">
            {weak.map((c) => {
              const v = VERB_BY_KEY[c.verb];
              return (
                <li key={c.id} className="flex items-center justify-between gap-2">
                  <span>
                    <span lang="fr" className="font-semibold">{conjugate(v, c.tense, c.person).full}</span>
                    <span className="text-muted"> · {TENSE_BY_ID[c.tense].name}, {PERSONS[c.person]}</span>
                  </span>
                  <span className="shrink-0 text-xs text-bad">missed {c.wrong}×</span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a verb (French or English)" className={`${inputClass} pl-9`} aria-label="Find a verb" />
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted">My verbs ({prefs.myVerbs.length})</h2>
        <VerbList
          verbs={mine.map((v) => v.key)}
          lab={lab}
          onOpen={(key) => {
            setView({ kind: "verb", key });
            top();
          }}
        />
        {!q && others.length > 0 && (
          <Button variant="secondary" className="mt-2 w-full" onClick={() => lab.setPrefs({ myVerbs: [...prefs.myVerbs, ...others.slice(0, 5).map((v) => v.key)] })}>
            <Plus className="size-4" aria-hidden /> Add the next 5 verbs
          </Button>
        )}
      </section>

      {others.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted">More common verbs ({others.length})</h2>
          <VerbList
            verbs={(showAllOthers || q ? others : others.slice(0, 8)).map((v) => v.key)}
            lab={lab}
            onOpen={(key) => {
              setView({ kind: "verb", key });
              top();
            }}
            onAdd={(key) => lab.setPrefs({ myVerbs: [...prefs.myVerbs, key] })}
          />
          {!q && !showAllOthers && others.length > 8 && (
            <Button variant="ghost" className="mt-1 w-full" onClick={() => setShowAllOthers(true)}>
              Show all {others.length}
            </Button>
          )}
        </section>
      )}
    </div>
  );
}

function VerbList({
  verbs,
  lab,
  onOpen,
  onAdd,
}: {
  verbs: string[];
  lab: VerbLab;
  onOpen: (key: string) => void;
  onAdd?: (key: string) => void;
}) {
  if (verbs.length === 0) return <p className="py-4 text-center text-sm text-muted">No verbs match.</p>;
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
      {verbs.map((key) => {
        const v = VERB_BY_KEY[key];
        const m = verbMastery(lab.cells, key, lab.prefs.tenses);
        return (
          <li key={key} className="flex items-center">
            <button onClick={() => onOpen(key)} className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left hover:bg-surface-2">
              <div className="min-w-0 flex-1">
                <p lang="fr" className="font-semibold">{v.inf}</p>
                <p className="truncate text-sm text-muted">{v.en}</p>
              </div>
              {!onAdd && (
                <div className="w-16 shrink-0" title={`${Math.round(m * 100)}% of forms learned`}>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-good" style={{ width: `${m * 100}%` }} />
                  </div>
                  <p className="mt-0.5 text-right text-[11px] text-muted tabular-nums">{Math.round(m * 100)}%</p>
                </div>
              )}
              {v.group === "irregular" && <span className="shrink-0 rounded-full bg-warn-soft px-2 py-0.5 text-[11px] font-semibold text-warn">irreg.</span>}
              <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
            </button>
            {onAdd && (
              <button onClick={() => onAdd(key)} aria-label={`Learn ${v.inf}`} className="mr-2 rounded-lg p-2 text-primary hover:bg-primary-soft">
                <Plus className="size-5" />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export type { Tense };
