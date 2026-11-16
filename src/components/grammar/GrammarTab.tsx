"use client";

import { useEffect, useState } from "react";
import { ChevronRight, CircleCheck, Lightbulb, TriangleAlert } from "lucide-react";
import { GRAMMAR, GRAMMAR_BY_ID, type Block, type GrammarTopic } from "@/data/grammar";
import type { GrammarScores } from "@/lib/useSyncedDoc";
import type { Settings } from "@/lib/useSettings";
import { Button, Card, SpeakButton } from "../ui";

export function GrammarTab({
  settings,
  scores,
  saveScores,
  openTopic,
  setOpenTopic,
  onStudied,
}: {
  settings: Settings;
  scores: GrammarScores;
  saveScores: (s: GrammarScores) => void;
  openTopic: string | null;
  setOpenTopic: (id: string | null) => void;
  onStudied: () => void;
}) {
  const topic = openTopic ? GRAMMAR_BY_ID[openTopic] : null;

  if (topic)
    return (
      <TopicView
        key={topic.id}
        topic={topic}
        settings={settings}
        onBack={() => {
          setOpenTopic(null);
          window.scrollTo({ top: 0 });
        }}
        onQuizDone={(right) => {
          const prev = scores.scores[topic.id];
          saveScores({
            scores: {
              ...scores.scores,
              [topic.id]: { best: Math.max(prev?.best ?? 0, right), last: right, total: topic.quiz.length },
            },
          });
          onStudied();
        }}
      />
    );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Grammar cheat sheets</h2>
        <p className="text-sm text-muted">The rules behind Duolingo&apos;s first sections, one page each, with a 5-question check.</p>
      </div>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {GRAMMAR.map((g) => {
          const s = scores.scores[g.id];
          const pct = s ? s.best / s.total : 0;
          return (
            <li key={g.id}>
              <button
                onClick={() => {
                  setOpenTopic(g.id);
                  window.scrollTo({ top: 0 });
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-2"
              >
                <div className="min-w-0 flex-1">
                  <p lang="fr" className="font-semibold">{g.title}</p>
                  <p className="text-sm text-muted">{g.summary}</p>
                </div>
                {s && (
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                      pct === 1 ? "bg-good-soft text-good" : pct >= 0.6 ? "bg-primary-soft text-primary" : "bg-warn-soft text-warn"
                    }`}
                    title="Best quiz score"
                  >
                    {s.best}/{s.total}
                  </span>
                )}
                <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TopicView({
  topic,
  settings,
  onBack,
  onQuizDone,
}: {
  topic: GrammarTopic;
  settings: Settings;
  onBack: () => void;
  onQuizDone: (right: number) => void;
}) {
  return (
    <div className="space-y-3">
      <button onClick={onBack} className="text-sm font-semibold text-muted hover:text-ink">
        ← All grammar
      </button>
      <Card>
        <h2 lang="fr" className="text-2xl font-bold">{topic.title}</h2>
        <p className="mt-1 text-muted">{topic.summary}</p>
        <div className="mt-4 space-y-4">
          {topic.blocks.map((b, i) => (
            <BlockView key={i} block={b} settings={settings} />
          ))}
        </div>
      </Card>
      <Quiz topic={topic} onDone={onQuizDone} />
    </div>
  );
}

function BlockView({ block: b, settings }: { block: Block; settings: Settings }) {
  switch (b.type) {
    case "text":
      return <p className="text-base">{b.text}</p>;
    case "tip":
      return (
        <div className="flex gap-2.5 rounded-xl border border-tip-border bg-tip px-3.5 py-3 text-sm text-tip-text">
          <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>{b.text}</p>
        </div>
      );
    case "trap":
      return (
        <div className="flex gap-2.5 rounded-xl border border-bad/30 bg-bad-soft px-3.5 py-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-bad" aria-hidden />
          <p>
            <span className="font-semibold text-bad">Watch out: </span>
            {b.text}
          </p>
        </div>
      );
    case "examples":
      return (
        <ul className="space-y-2">
          {b.items.map((e, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <SpeakButton text={e.fr} voice={settings.voice} rate={settings.speechRate} size="sm" />
              <div>
                <p lang="fr" className="font-medium">{e.fr}</p>
                <p className="text-sm text-muted">{e.en}</p>
              </div>
            </li>
          ))}
        </ul>
      );
    case "table": {
      const hasHead = b.head.some(Boolean);
      return (
        <div className="-mx-1 overflow-x-auto px-1">
          <table className="w-full border-collapse overflow-hidden rounded-xl text-sm">
            {hasHead && (
              <thead>
                <tr>
                  {b.head.map((h, i) => (
                    <th key={i} className="border-b border-line bg-surface-2 px-3 py-2 text-left font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {b.rows.map((r, i) => (
                <tr key={i} className="border-b border-line last:border-0">
                  {r.map((c, j) => (
                    <td key={j} lang="fr" className={`px-3 py-2 align-top ${j === 0 && !hasHead ? "" : ""}`}>
                      {b.speak === j && c ? (
                        <span className="flex items-center gap-2">
                          <SpeakButton text={c} voice={settings.voice} rate={settings.speechRate} size="sm" />
                          {c}
                        </span>
                      ) : (
                        c
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  }
}

function Quiz({ topic, onDone }: { topic: GrammarTopic; onDone: (right: number) => void }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [right, setRight] = useState(0);
  const [started, setStarted] = useState(false);
  const q = topic.quiz[i];
  const finished = started && !q;

  useEffect(() => {
    if (finished) onDone(right);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  if (!started)
    return (
      <Card className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold">Check yourself</p>
          <p className="text-sm text-muted">{topic.quiz.length} quick questions</p>
        </div>
        <Button onClick={() => setStarted(true)}>Start quiz</Button>
      </Card>
    );

  if (finished)
    return (
      <Card className="text-center">
        <CircleCheck className="mx-auto size-8 text-good" aria-hidden />
        <p className="mt-2 text-xl font-bold">
          {right} / {topic.quiz.length}
        </p>
        <p className="text-sm text-muted">
          {right === topic.quiz.length ? "Parfait !" : right >= topic.quiz.length * 0.6 ? "Good, almost there." : "Worth another read. It'll show up in your weak spots until you've got it."}
        </p>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => {
            setI(0);
            setRight(0);
            setPicked(null);
          }}
        >
          Try again
        </Button>
      </Card>
    );

  return (
    <Card>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        Question {i + 1} of {topic.quiz.length}
      </p>
      <p lang="fr" className="mt-2 text-lg font-semibold">{q.prompt}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {q.options.map((o) => {
          const state = !picked ? "" : o === q.answer ? "border-good bg-good-soft text-good" : o === picked ? "border-bad bg-bad-soft text-bad" : "opacity-60";
          return (
            <button
              key={o}
              lang="fr"
              disabled={!!picked}
              onClick={() => {
                setPicked(o);
                if (o === q.answer) setRight((n) => n + 1);
              }}
              className={`rounded-xl border border-line bg-surface px-3.5 py-3 text-left hover:bg-surface-2 disabled:cursor-default ${state}`}
            >
              {o}
            </button>
          );
        })}
      </div>
      {picked && (
        <>
          <p role="status" className={`mt-3 rounded-lg px-3 py-2 text-sm ${picked === q.answer ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>
            <span className="font-semibold">{picked === q.answer ? "Correct! " : "Not quite. "}</span>
            {q.explain}
          </p>
          <Button
            className="mt-3 w-full"
            onClick={() => {
              setPicked(null);
              setI((n) => n + 1);
            }}
          >
            Continue
          </Button>
        </>
      )}
    </Card>
  );
}
