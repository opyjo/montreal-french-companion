"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Brain, CircleCheck, Flame, Keyboard, Lightbulb, RotateCcw } from "lucide-react";
import { checkAnswer, type CheckResult } from "@/lib/answer";
import { isDue, previewInterval, strength, type Grade } from "@/lib/srs";
import { speakFrench } from "@/lib/speech";
import type { Word } from "@/lib/types";
import type { StudyData } from "@/lib/useStudyData";
import type { ReviewDirection, Settings } from "@/lib/useSettings";
import { Button, Card, EmptyState, GenderChip, SpeakButton, genderText, inputClass } from "./ui";

const SESSION_SIZE = 20;
const ACCENTS = ["é", "è", "ê", "à", "â", "ç", "î", "ï", "ô", "ù", "û", "ë", "œ"];
const GRADES: { grade: Grade; label: string; cls: string }[] = [
  { grade: "again", label: "Forgot", cls: "bg-bad-soft text-bad" },
  { grade: "hard", label: "Hard", cls: "bg-warn-soft text-warn" },
  { grade: "good", label: "Good", cls: "bg-good-soft text-good" },
  { grade: "easy", label: "Easy", cls: "bg-primary-soft text-primary" },
];

type Dir = "fr-en" | "en-fr";
interface QueueItem {
  id: string;
  dir: Dir;
}
interface Session {
  queue: QueueItem[];
  index: number;
  practice: boolean; // practice mode doesn't change the schedule
  reviewed: number;
  forgotten: number;
}

function pickDir(w: Word, pref: ReviewDirection): Dir {
  if (pref !== "mixed") return pref;
  // Brand-new words: recognise first. After that, mostly produce the French
  // (harder, and it's what Duolingo's typing exercises ask of you).
  if (w.repetition === 0 && w.lapses === 0) return "fr-en";
  return Math.random() < 0.65 ? "en-fr" : "fr-en";
}

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

function relTime(ms: number): string {
  const diff = ms - Date.now();
  if (diff <= 0) return "now";
  const min = Math.round(diff / 60000);
  if (min < 60) return `in ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `in ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "tomorrow" : `in ${d} days`;
}

export function ReviewTab({
  data,
  settings,
  updateSettings,
  onGoLookup,
}: {
  data: StudyData;
  settings: Settings;
  updateSettings: (p: Partial<Settings>) => void;
  onGoLookup: () => void;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [tag, setTag] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const pool = useMemo(
    () => (tag ? data.words.filter((w) => w.tag === tag) : data.words),
    [data.words, tag]
  );
  const due = useMemo(
    () => pool.filter((w) => isDue(w, now)).sort((a, b) => a.nextReviewAt - b.nextReviewAt),
    [pool, now]
  );
  const tags = useMemo(
    () => [...new Set(data.words.map((w) => w.tag).filter(Boolean))].sort(),
    [data.words]
  );
  const counts = useMemo(() => {
    const c = { new: 0, learning: 0, known: 0, strong: 0 };
    pool.forEach((w) => c[strength(w)]++);
    return c;
  }, [pool]);
  const nextDue = useMemo(
    () => pool.reduce((min, w) => Math.min(min, w.nextReviewAt), Infinity),
    [pool]
  );

  function start(practice: boolean) {
    const source = practice
      ? [...pool].sort((a, b) => b.lapses - a.lapses || a.interval - b.interval).slice(0, 10)
      : due.slice(0, SESSION_SIZE);
    const queue = shuffle(source).map((w) => ({ id: w.id, dir: pickDir(w, settings.direction) }));
    setSession({ queue, index: 0, practice, reviewed: 0, forgotten: 0 });
  }

  if (session) {
    return (
      <ReviewSession
        session={session}
        setSession={setSession}
        data={data}
        settings={settings}
      />
    );
  }

  if (data.words.length === 0) {
    return (
      <Card>
        <EmptyState icon={<Brain className="size-6" />} title="Your review deck is empty">
          <p>Look up words from your Duolingo lessons and save them. They&apos;ll show up here for review.</p>
          <Button className="mt-4" onClick={onGoLookup}>
            Look up words
          </Button>
        </EmptyState>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted">Due now</p>
            <p className="text-4xl font-bold tabular-nums">{due.length}</p>
            {due.length === 0 && Number.isFinite(nextDue) && (
              <p className="mt-1 text-sm text-muted">Next review {relTime(nextDue)}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-warn-soft px-3 py-1.5 text-sm font-semibold text-warn">
            <Flame className="size-4" aria-hidden />
            {data.profile.streak} day{data.profile.streak === 1 ? "" : "s"}
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-4 gap-2 text-center">
          {(
            [
              ["New", counts.new],
              ["Learning", counts.learning],
              ["Known", counts.known],
              ["Strong", counts.strong],
            ] as const
          ).map(([label, n]) => (
            <div key={label} className="rounded-xl bg-surface-2 py-2">
              <dd className="text-lg font-bold tabular-nums">{n}</dd>
              <dt className="text-xs text-muted">{label}</dt>
            </div>
          ))}
        </dl>

        {tags.length > 0 && (
          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-semibold">Unit</span>
            <select value={tag} onChange={(e) => setTag(e.target.value)} className={inputClass}>
              <option value="">All words</option>
              {tags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {due.length > 0 ? (
            <Button onClick={() => start(false)} className="flex-1 sm:flex-none">
              Start review ({Math.min(due.length, SESSION_SIZE)})
            </Button>
          ) : (
            <Button onClick={() => start(true)} className="flex-1 sm:flex-none" disabled={pool.length === 0}>
              Practise weakest words
            </Button>
          )}
        </div>
        {due.length === 0 && (
          <p className="mt-2 text-xs text-muted">
            You&apos;re all caught up. Practice mode doesn&apos;t change your schedule.
          </p>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Review options</h2>
        <div className="space-y-3">
          <label className="flex items-center justify-between gap-3">
            <span>
              <span className="block text-sm font-semibold">Type my answers</span>
              <span className="block text-xs text-muted">Like Duolingo&apos;s typing exercises. Slower, but you&apos;ll remember more.</span>
            </span>
            <input
              type="checkbox"
              checked={settings.typeAnswers}
              onChange={(e) => updateSettings({ typeAnswers: e.target.checked })}
              className="size-5 accent-[var(--primary)]"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Direction</span>
            <select
              value={settings.direction}
              onChange={(e) => updateSettings({ direction: e.target.value as ReviewDirection })}
              className={inputClass}
            >
              <option value="mixed">Mixed (recommended)</option>
              <option value="fr-en">French → English</option>
              <option value="en-fr">English → French</option>
            </select>
          </label>
        </div>
      </Card>

      <Card className="text-sm">
        <h2 className="mb-2 flex items-center gap-2 font-semibold">
          <Lightbulb className="size-4 text-warn" aria-hidden /> Tips for making words stick
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-muted">
          <li>Try to recall the answer <em>before</em> you reveal it, even if it takes a few seconds. The effort is what builds memory.</li>
          <li>Say the French out loud. Hearing and speaking it gives your brain a second route to the word.</li>
          <li>Always learn nouns with <span className="text-masc font-semibold">le</span> / <span className="text-fem font-semibold">la</span>. The colours stay the same everywhere in the app.</li>
          <li>Be honest with the buttons. &ldquo;Forgot&rdquo; brings the word back sooner, and that&apos;s a good thing.</li>
          <li>A short session every day beats a long one every week.</li>
        </ul>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------

function ReviewSession({
  session,
  setSession,
  data,
  settings,
}: {
  session: Session;
  setSession: (s: Session | null) => void;
  data: StudyData;
  settings: Settings;
}) {
  const [revealed, setRevealed] = useState(false);
  const [typed, setTyped] = useState("");
  const [check, setCheck] = useState<CheckResult | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const item = session.queue[session.index];
  const word = item ? data.words.find((w) => w.id === item.id) : undefined;
  const done = !item;
  const suggested: Grade | null = check
    ? check.verdict === "correct"
      ? "good"
      : check.verdict === "wrong"
        ? "again"
        : "hard"
    : null;

  // Skip cards that were deleted mid-session.
  useEffect(() => {
    if (item && !word && data.words.length > 0) {
      setSession({ ...session, index: session.index + 1 });
    }
  }, [item, word, data.words.length, session, setSession]);

  // Reset per card, and auto-play French when it's on screen.
  useEffect(() => {
    setRevealed(false);
    setTyped("");
    setCheck(null);
    if (word && item?.dir === "fr-en" && settings.autoPlay) {
      void speakFrench(word.french, { voice: settings.voice, rate: settings.speechRate });
    }
    if (settings.typeAnswers) setTimeout(() => inputRef.current?.focus(), 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.index, item?.id]);

  const reveal = useCallback(() => {
    if (!word || !item) return;
    if (settings.typeAnswers && typed.trim()) {
      setCheck(
        item.dir === "en-fr"
          ? checkAnswer(typed, word.french, "fr")
          : checkAnswer(typed, word.english, "en")
      );
    }
    setRevealed(true);
    if (item.dir === "en-fr" && settings.autoPlay) {
      void speakFrench(word.french, { voice: settings.voice, rate: settings.speechRate });
    }
  }, [word, item, typed, settings]);

  const grade = useCallback(
    async (g: Grade) => {
      if (!word || !item || busy) return;
      setBusy(true);
      try {
        if (!session.practice) await data.reviewWord(word, g);
        const again = g === "again";
        setSession({
          ...session,
          queue: again ? [...session.queue, { ...item }] : session.queue,
          index: session.index + 1,
          reviewed: session.reviewed + 1,
          forgotten: session.forgotten + (again ? 1 : 0),
        });
      } finally {
        setBusy(false);
      }
    },
    [word, item, busy, session, data, setSession]
  );

  // Keyboard: Space/Enter reveals, 1–4 grades.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const inInput = (e.target as HTMLElement)?.tagName === "INPUT";
      if (!revealed && e.key === "Enter") {
        e.preventDefault();
        reveal();
      } else if (!revealed && e.key === " " && !inInput) {
        e.preventDefault();
        reveal();
      } else if (revealed && !inInput && ["1", "2", "3", "4"].includes(e.key)) {
        void grade(GRADES[Number(e.key) - 1].grade);
      } else if (revealed && e.key === "Enter" && suggested) {
        e.preventDefault();
        void grade(suggested);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (done) {
    return (
      <Card>
        <EmptyState icon={<CircleCheck className="size-6" />} title={session.practice ? "Practice done" : "Session complete"}>
          <p>
            {session.reviewed} review{session.reviewed === 1 ? "" : "s"}
            {session.forgotten > 0 && `, ${session.forgotten} to look at again soon`}. Bien joué !
          </p>
          <Button className="mt-4" onClick={() => setSession(null)}>
            Back to overview
          </Button>
        </EmptyState>
      </Card>
    );
  }
  if (!word) return null;

  const frFirst = item.dir === "fr-en";
  const remaining = session.queue.length - session.index;

  function insertAccent(ch: string) {
    const el = inputRef.current;
    if (!el) return setTyped((t) => t + ch);
    const s = el.selectionStart ?? typed.length;
    const e = el.selectionEnd ?? typed.length;
    const next = typed.slice(0, s) + ch + typed.slice(e);
    setTyped(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + ch.length, s + ch.length);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-muted">
        <button onClick={() => setSession(null)} className="font-semibold hover:text-ink">
          ← End
        </button>
        <span>
          {session.practice && "Practice · "}
          {remaining} left
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${(session.index / session.queue.length) * 100}%` }}
        />
      </div>

      <Card className="min-h-64">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {frFirst ? "What does this mean?" : "How do you say this in French?"}
        </p>

        <div className="mt-3 flex items-start gap-3">
          {frFirst && <SpeakButton text={word.french} voice={settings.voice} rate={settings.speechRate} />}
          <div className="min-w-0">
            <p
              lang={frFirst ? "fr" : "en"}
              className={`text-2xl font-bold break-words ${frFirst ? genderText(word.gender) : ""}`}
            >
              {frFirst ? word.french : word.english}
            </p>
            {!frFirst && word.partOfSpeech === "noun" && (
              <p className="mt-1 text-xs text-muted">Include the article (le / la / l&apos;)</p>
            )}
          </div>
        </div>

        {settings.typeAnswers && (
          <div className="mt-4">
            <input
              ref={inputRef}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={revealed}
              placeholder={frFirst ? "Type the English" : "Type the French"}
              className={inputClass}
              lang={frFirst ? "en" : "fr"}
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
            />
            {!frFirst && !revealed && (
              <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Accented letters">
                {ACCENTS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertAccent(a)}
                    className="min-w-9 rounded-lg border border-line bg-surface px-2 py-1.5 text-base hover:bg-surface-2"
                  >
                    {a}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {revealed && (
          <div className="mt-5 border-t border-line pt-4">
            {check && (
              <p
                className={`mb-3 rounded-lg px-3 py-2 text-sm font-semibold ${
                  check.verdict === "correct"
                    ? "bg-good-soft text-good"
                    : check.verdict === "wrong"
                      ? "bg-bad-soft text-bad"
                      : "bg-warn-soft text-warn"
                }`}
              >
                {check.message}
              </p>
            )}
            <div className="flex items-start gap-3">
              {!frFirst && <SpeakButton text={word.french} voice={settings.voice} rate={settings.speechRate} />}
              <div className="min-w-0">
                <p
                  lang={frFirst ? "en" : "fr"}
                  className={`text-xl font-semibold break-words ${!frFirst ? genderText(word.gender) : ""}`}
                >
                  {frFirst ? word.english : word.french}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                  <GenderChip gender={word.gender} />
                  {word.pronunciation && <span className="font-mono">{word.pronunciation}</span>}
                </div>
              </div>
            </div>
            {word.memoryTip && (
              <div className="mt-3 flex gap-2.5 rounded-xl border border-tip-border bg-tip px-3.5 py-2.5 text-sm text-tip-text">
                <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden />
                <p>{word.memoryTip}</p>
              </div>
            )}
            {word.exampleFr && (
              <div className="mt-3 text-sm">
                <p lang="fr" className="font-medium">
                  {word.exampleFr}
                </p>
                <p className="text-muted">{word.exampleEn}</p>
              </div>
            )}
          </div>
        )}
      </Card>

      {!revealed ? (
        <Button onClick={reveal} className="w-full py-3.5 text-base">
          {settings.typeAnswers && typed.trim() ? (
            <>
              <Keyboard className="size-4" aria-hidden /> Check
            </>
          ) : (
            "Show answer"
          )}
        </Button>
      ) : (
        <div>
          <div className="grid grid-cols-4 gap-2">
            {GRADES.map(({ grade: g, label, cls }) => (
              <button
                key={g}
                onClick={() => void grade(g)}
                disabled={busy}
                className={`rounded-xl px-1 py-2.5 text-center transition-opacity disabled:opacity-50 ${cls} ${
                  suggested === g ? "ring-2 ring-current" : ""
                }`}
              >
                <span className="block text-sm font-bold">{label}</span>
                {!session.practice && (
                  <span className="block text-[11px] opacity-80">{previewInterval(word, g)}</span>
                )}
              </button>
            ))}
          </div>
          <p className="mt-2 hidden text-center text-xs text-muted sm:block">
            Keys 1–4 to grade{suggested ? " · Enter accepts the suggestion" : ""}
          </p>
        </div>
      )}

      {session.forgotten > 0 && (
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted">
          <RotateCcw className="size-3" aria-hidden /> Forgotten words come back at the end of this session.
        </p>
      )}
    </div>
  );
}
