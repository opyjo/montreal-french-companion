"use client";

import { useMemo, useState } from "react";
import { BookA, Brain, Check, ChevronRight, Crosshair, Flame, PartyPopper, Sparkles } from "lucide-react";
import { VERB_BY_KEY, TENSE_BY_ID } from "@/lib/conjugate";
import { isDue } from "@/lib/srs";
import { buildSmartSession, buildTypedSession, unseenGroups, type SessionItem } from "@/lib/verbDrill";
import { cellsForAction, findWeakSpots, type WeakAction, type WeakSpot } from "@/lib/weakSpots";
import type { StudyData } from "@/lib/useStudyData";
import type { Settings } from "@/lib/useSettings";
import type { VerbLab } from "@/lib/useVerbLab";
import type { StepId } from "@/lib/useDailyPlan";
import { Button, Card } from "../ui";
import { ReviewSession, buildWordSession, type Session as WordSession } from "../ReviewTab";
import { VerbSession } from "../verbs/VerbSession";
import { MistakeRedo, buildRedoItems, type RedoItem } from "./MistakeRedo";

const WORDS_PER_DAY = 10;
const VERBS_PER_DAY = 10;

type View =
  | { kind: "home" }
  | { kind: "verbs"; items: SessionItem[]; title: string; step?: StepId }
  | { kind: "words"; session: WordSession; step?: StepId }
  | { kind: "redo"; items: RedoItem[]; step?: StepId };

interface Step {
  id: StepId;
  title: string;
  detail: string;
  Icon: typeof Brain;
  available: boolean;
  start: () => void;
}

export function TodayTab({
  data,
  lab,
  settings,
  plan,
  onGo,
}: {
  data: StudyData;
  lab: VerbLab;
  settings: Settings;
  plan: { done: StepId[]; markDone: (s: StepId) => void };
  onGo: (tab: "verbs" | "words" | "mistakes") => void;
}) {
  const [view, setView] = useState<View>({ kind: "home" });
  const home = () => {
    setView({ kind: "home" });
    window.scrollTo({ top: 0 });
  };

  const spots = useMemo(
    () => findWeakSpots({ cells: lab.cells, words: data.words, mistakes: data.mistakes }),
    [lab.cells, data.words, data.mistakes]
  );
  const dueWords = useMemo(
    () => data.words.filter((w) => isDue(w)).sort((a, b) => a.nextReviewAt - b.nextReviewAt),
    [data.words]
  );
  const nextTable = unseenGroups(lab.cells, lab.prefs)[0];
  const redoable = data.mistakes.filter((m) => m.kind !== "acceptable");

  function runAction(action: WeakAction, title: string, step?: StepId) {
    if (action.type === "words") {
      const words = data.words.filter((w) => action.ids.includes(w.id));
      setView({ kind: "words", session: buildWordSession(words, settings.direction, true), step });
    } else if (action.type === "mistakes") {
      setView({ kind: "redo", items: buildRedoItems(data.mistakes, action.kind), step });
    } else {
      const refs = cellsForAction(action, lab.cells, lab.prefs);
      setView({ kind: "verbs", items: buildTypedSession(refs, lab.prefs), title, step });
    }
  }

  // ---- Today's three steps ----------------------------------------------
  const focus: { title: string; detail: string; run: () => void } | null = spots[0]
    ? { title: `Focus: ${spots[0].title}`, detail: spots[0].detail, run: () => runAction(spots[0].action, spots[0].title, "focus") }
    : redoable.length
      ? {
          title: "Redo your Duolingo mistakes",
          detail: `${redoable.length} saved mistake${redoable.length === 1 ? "" : "s"} to fix again.`,
          run: () => setView({ kind: "redo", items: buildRedoItems(data.mistakes), step: "focus" }),
        }
      : null;

  const verbCount = Math.min(lab.dueCount, VERBS_PER_DAY);
  const steps: Step[] = [
    {
      id: "verbs",
      title: "Verb practice",
      detail:
        verbCount && nextTable
          ? `${verbCount} forms to review + a new table: ${VERB_BY_KEY[nextTable.verb].inf} (${TENSE_BY_ID[nextTable.tense].name})`
          : verbCount
            ? `${verbCount} verb forms to review`
            : nextTable
              ? `New table: ${VERB_BY_KEY[nextTable.verb].inf} · ${TENSE_BY_ID[nextTable.tense].name}`
              : "Nothing due",
      Icon: BookA,
      available: verbCount > 0 || !!nextTable,
      start: () =>
        setView({ kind: "verbs", items: buildSmartSession(lab.cells, lab.prefs, VERBS_PER_DAY), title: "Verb practice", step: "verbs" }),
    },
    {
      id: "words",
      title: "Word review",
      detail: dueWords.length
        ? `${Math.min(dueWords.length, WORDS_PER_DAY)} of your saved words are due`
        : data.words.length
          ? "Nothing due"
          : "Save words from Look up to review them here",
      Icon: Brain,
      available: dueWords.length > 0,
      start: () =>
        setView({ kind: "words", session: buildWordSession(dueWords.slice(0, WORDS_PER_DAY), settings.direction, false), step: "words" }),
    },
    {
      id: "focus",
      title: focus?.title ?? "Focus drill",
      detail: focus?.detail ?? "Your weak spots will show up here after a few sessions.",
      Icon: Crosshair,
      available: !!focus,
      start: () => focus?.run(),
    },
  ];

  const todo = steps.filter((s) => s.available && !plan.done.includes(s.id));
  const required = steps.filter((s) => s.available || plan.done.includes(s.id));
  const finished = required.length > 0 && todo.length === 0;

  // ---- Running a session ---------------------------------------------------
  const complete = (step?: StepId) => step && plan.markDone(step);

  if (view.kind === "verbs")
    return (
      <VerbSession
        key={view.title}
        items={view.items}
        title={view.title}
        lab={lab}
        settings={settings}
        onExit={home}
        onComplete={() => complete(view.step)}
        exitLabel="Back to Today"
      />
    );
  if (view.kind === "words")
    return (
      <ReviewSession
        session={view.session}
        setSession={(s) => {
          if (s) setView({ ...view, session: s });
          else {
            if (view.session.index >= view.session.queue.length) complete(view.step);
            home();
          }
        }}
        data={data}
        settings={settings}
        exitLabel="Back to Today"
      />
    );
  if (view.kind === "redo")
    return (
      <MistakeRedo
        items={view.items}
        settings={settings}
        onStudied={data.markStudied}
        onExit={home}
        onComplete={() => complete(view.step)}
        exitLabel="Back to Today"
      />
    );

  // ---- Home ------------------------------------------------------------
  const dateFr = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const formsKnown = Object.values(lab.cells).filter((c) => c.repetition > 0).length;
  const doneCount = required.length - todo.length;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted first-letter:uppercase" lang="fr">{dateFr}</p>
        <h2 className="text-2xl font-bold">{finished ? "C'est fini pour aujourd'hui !" : "Bonjour !"}</h2>
      </div>

      <Card>
        {finished ? (
          <div className="flex items-center gap-3">
            <PartyPopper className="size-8 shrink-0 text-warn" aria-hidden />
            <div>
              <p className="font-semibold">Today&apos;s session is done.</p>
              <p className="text-sm text-muted">Come back tomorrow to keep your streak. Extra practice below if you want it.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-semibold">Today&apos;s session</h3>
              <span className="text-sm text-muted tabular-nums">
                {doneCount} of {required.length || 3} done
              </span>
            </div>
            <div className="mb-4 h-2 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-good transition-all" style={{ width: `${required.length ? (doneCount / required.length) * 100 : 0}%` }} />
            </div>
          </>
        )}
        <ol className="space-y-2">
          {steps.map((s) => {
            const isDone = plan.done.includes(s.id);
            return (
              <li key={s.id}>
                <button
                  onClick={s.start}
                  disabled={!s.available}
                  className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-3 text-left transition-colors hover:bg-surface-2 disabled:cursor-default disabled:hover:bg-surface"
                >
                  <span
                    className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
                      isDone ? "bg-good text-surface" : s.available ? "bg-primary-soft text-primary" : "bg-surface-2 text-muted"
                    }`}
                  >
                    {isDone ? <Check className="size-5" aria-label="done" /> : <s.Icon className="size-5" aria-hidden />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block font-semibold ${!s.available && !isDone ? "text-muted" : ""}`}>{s.title}</span>
                    <span className="block text-sm text-muted">{isDone ? "Done for today. Tap to do more." : s.detail}</span>
                  </span>
                  {s.available && <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ol>
        {!finished && todo[0] && (
          <Button className="mt-4 w-full py-3 text-base" onClick={todo[0].start}>
            {doneCount === 0 ? "Start" : "Continue"}: {todo[0].title.replace(/^Focus: /, "")}
          </Button>
        )}
      </Card>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat icon={<Flame className="size-4 text-warn" aria-hidden />} value={data.profile.streak} label="day streak" />
        <Stat value={formsKnown} label="verb forms learned" />
        <Stat value={data.words.length} label="words saved" />
      </div>

      <Card>
        <h3 className="font-semibold">Your weak spots</h3>
        {spots.length === 0 ? (
          <p className="mt-1 text-sm text-muted">
            Nothing stands out yet. As you practise verbs, review words and paste Duolingo mistakes, the patterns you trip on
            (like <em>nous</em> forms, articles or the passé composé with <em>être</em>) will show up here with a drill for each.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {spots.slice(0, 5).map((s) => (
              <WeakRow key={s.id} spot={s} onRun={() => runAction(s.action, s.title, s === spots[0] ? "focus" : undefined)} />
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-2 sm:grid-cols-3">
        <QuickLink label="All verbs" onClick={() => onGo("verbs")} />
        <QuickLink label="Look up words" onClick={() => onGo("words")} />
        <QuickLink label="Explain a mistake" onClick={() => onGo("mistakes")} />
      </div>
    </div>
  );
}

function Stat({ value, label, icon }: { value: number; label: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-2 py-3">
      <p className="flex items-center justify-center gap-1 text-xl font-bold tabular-nums">
        {icon}
        {value}
      </p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

const SOURCE: Record<WeakSpot["source"], { label: string; cls: string }> = {
  verbs: { label: "verbs", cls: "bg-primary-soft text-primary" },
  words: { label: "words", cls: "bg-good-soft text-good" },
  mistakes: { label: "Duolingo", cls: "bg-warn-soft text-warn" },
};

function WeakRow({ spot, onRun }: { spot: WeakSpot; onRun: () => void }) {
  return (
    <li className="flex items-center gap-3 rounded-xl bg-surface-2 px-3.5 py-3">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-semibold">
          <span lang="fr">{spot.title}</span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${SOURCE[spot.source].cls}`}>{SOURCE[spot.source].label}</span>
        </p>
        <p className="text-sm text-muted">{spot.detail}</p>
      </div>
      <Button variant="secondary" className="shrink-0 !px-3 !py-2" onClick={onRun}>
        <Sparkles className="size-4" aria-hidden /> Drill
      </Button>
    </li>
  );
}

function QuickLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold hover:bg-surface-2">
      {label}
      <ChevronRight className="size-4 text-muted" aria-hidden />
    </button>
  );
}
