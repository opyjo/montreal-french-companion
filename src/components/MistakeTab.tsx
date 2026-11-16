"use client";

import { useState } from "react";
import { ChevronDown, Eye, Lightbulb, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { explainMistake } from "@/lib/ai";
import { MISTAKE_LABELS, type Mistake, type MistakeExplanation } from "@/lib/types";
import type { StudyData } from "@/lib/useStudyData";
import type { Settings } from "@/lib/useSettings";
import { Button, Card, ErrorBox, Field, SlowHint, SpeakButton, inputClass } from "./ui";
import { WordCard } from "./WordCard";
import { MistakeRedo, buildRedoItems, type RedoItem } from "./today/MistakeRedo";

export interface MistakeFormState {
  prompt: string;
  myAnswer: string;
  correctAnswer: string;
  current: Mistake | null;
}

export function MistakeTab({
  data,
  settings,
  state,
  setState,
}: {
  data: StudyData;
  settings: Settings;
  state: MistakeFormState;
  setState: (s: MistakeFormState) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { prompt, myAnswer, correctAnswer, current } = state;

  async function run() {
    if (!myAnswer.trim() || !correctAnswer.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const input = {
        prompt: prompt.trim(),
        myAnswer: myAnswer.trim(),
        correctAnswer: correctAnswer.trim(),
      };
      const exp = await explainMistake(input, {
        provider: settings.aiProvider,
        apiKey: settings.aiKey,
      });
      const saved = await data.saveMistake({ ...input, ...exp });
      setState({ ...state, current: saved });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const history = data.mistakes.filter((m) => m.id !== current?.id);
  const [redo, setRedo] = useState<RedoItem[] | null>(null);
  const redoable = data.mistakes.filter((m) => m.kind !== "acceptable").length;

  if (redo)
    return (
      <MistakeRedo
        items={redo}
        settings={settings}
        onStudied={data.markStudied}
        onExit={() => setRedo(null)}
        exitLabel="Back to mistakes"
      />
    );

  return (
    <div className="space-y-4">
      {redoable > 0 && (
        <Card className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold">Redo my mistakes</p>
            <p className="text-sm text-muted">
              Fix your {redoable} saved Duolingo mistake{redoable === 1 ? "" : "s"} again, plus practice sentences using the same rules.
            </p>
          </div>
          <Button variant="secondary" className="shrink-0" onClick={() => setRedo(buildRedoItems(data.mistakes))}>
            <RotateCcw className="size-4" aria-hidden /> Start
          </Button>
        </Card>
      )}
      <Card>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void run();
          }}
        >
          <Field label="What Duolingo asked (optional)" hint="The sentence you had to translate, or the audio you heard.">
            <input
              value={prompt}
              onChange={(e) => setState({ ...state, prompt: e.target.value })}
              placeholder="e.g. The girl eats an apple."
              className={inputClass}
            />
          </Field>
          <Field label="Your answer">
            <input
              value={myAnswer}
              onChange={(e) => setState({ ...state, myAnswer: e.target.value })}
              placeholder="e.g. Le fille mange un pomme."
              className={inputClass}
              lang="fr"
              autoCapitalize="off"
              spellCheck={false}
              required
            />
          </Field>
          <Field label="Duolingo's correct answer">
            <input
              value={correctAnswer}
              onChange={(e) => setState({ ...state, correctAnswer: e.target.value })}
              placeholder="e.g. La fille mange une pomme."
              className={inputClass}
              lang="fr"
              autoCapitalize="off"
              spellCheck={false}
              required
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={loading} disabled={!myAnswer.trim() || !correctAnswer.trim()}>
              <Sparkles className="size-4" aria-hidden />
              Explain my mistake
            </Button>
            {(prompt || myAnswer || correctAnswer) && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setState({ prompt: "", myAnswer: "", correctAnswer: "", current })}
              >
                Clear
              </Button>
            )}
          </div>
        </form>
      </Card>

      <SlowHint active={loading} />
      {error && <ErrorBox message={error} />}

      {current && <Explanation mistake={current} data={data} settings={settings} />}

      {history.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted">Past mistakes</h2>
          <div className="space-y-2">
            {history.map((m) => (
              <HistoryItem key={m.id} mistake={m} data={data} settings={settings} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Explanation({
  mistake: m,
  data,
  settings,
}: {
  mistake: MistakeExplanation & Pick<Mistake, "myAnswer" | "correctAnswer">;
  data: StudyData;
  settings: Settings;
}) {
  const ok = m.kind === "acceptable";
  return (
    <div className="space-y-3">
      <Card>
        <span
          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            ok ? "bg-good-soft text-good" : "bg-warn-soft text-warn"
          }`}
        >
          {MISTAKE_LABELS[m.kind]}
        </span>
        <h2 className="mt-2 text-lg font-semibold leading-snug">{m.headline}</h2>

        <div className="mt-3 space-y-1.5 text-base" lang="fr">
          <p className="rounded-lg bg-bad-soft px-3 py-2">
            <span className="mr-2 text-xs font-semibold text-bad">YOU</span>
            {m.myAnswer}
          </p>
          <p className="flex items-center justify-between gap-2 rounded-lg bg-good-soft px-3 py-2">
            <span>
              <span className="mr-2 text-xs font-semibold text-good">CORRECT</span>
              {m.correctAnswer}
            </span>
            <SpeakButton text={m.correctAnswer} voice={settings.voice} rate={settings.speechRate} size="sm" />
          </p>
        </div>

        {m.differences.length > 0 && (
          <ul className="mt-3 space-y-1.5 text-sm">
            {m.differences.map((d, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-mono text-bad line-through decoration-2">{d.yours || "∅"}</span>
                <span className="text-muted">→</span>
                <span className="font-mono font-semibold text-good">{d.correct || "∅"}</span>
                <span className="text-muted">— {d.why}</span>
              </li>
            ))}
          </ul>
        )}

        {m.explanation && <p className="mt-3 text-base">{m.explanation}</p>}

        {m.rule && (
          <div className="mt-3 rounded-xl border border-primary/30 bg-primary-soft px-3.5 py-3 text-sm">
            <span className="font-semibold text-primary">The rule: </span>
            {m.rule}
          </div>
        )}

        {m.memoryTip && (
          <div className="mt-2 flex gap-2.5 rounded-xl border border-tip-border bg-tip px-3.5 py-3 text-sm text-tip-text">
            <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>{m.memoryTip}</p>
          </div>
        )}
      </Card>

      {m.practice.length > 0 && (
        <Card>
          <h3 className="font-semibold">Practise the rule</h3>
          <p className="mb-3 text-sm text-muted">Say or write each one in French, then reveal.</p>
          <ol className="space-y-2">
            {m.practice.map((p, i) => (
              <PracticeRow key={i} en={p.en} fr={p.fr} settings={settings} />
            ))}
          </ol>
        </Card>
      )}

      {m.wordsToSave.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-muted">Words worth saving</h3>
          {m.wordsToSave.map((w, i) => (
            <WordCard
              key={`${w.french}-${i}`}
              info={w}
              voice={settings.voice}
              rate={settings.speechRate}
              saved={data.hasWord(w.french)}
              onSave={() => data.addWords([w], { source: "mistake" })}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function PracticeRow({ en, fr, settings }: { en: string; fr: string; settings: Settings }) {
  const [shown, setShown] = useState(false);
  return (
    <li className="rounded-xl bg-surface-2 px-3 py-2.5">
      <p className="text-base">{en}</p>
      {shown ? (
        <div className="mt-1 flex items-center justify-between gap-2">
          <p lang="fr" className="font-semibold text-primary">
            {fr}
          </p>
          <SpeakButton text={fr} voice={settings.voice} rate={settings.speechRate} size="sm" />
        </div>
      ) : (
        <button
          onClick={() => setShown(true)}
          className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
        >
          <Eye className="size-4" aria-hidden /> Reveal French
        </button>
      )}
    </li>
  );
}

function HistoryItem({ mistake, data, settings }: { mistake: Mistake; data: StudyData; settings: Settings }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-line bg-surface">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium" lang="fr">
            {mistake.correctAnswer}
          </p>
          <p className="truncate text-sm text-muted">
            {MISTAKE_LABELS[mistake.kind]} · {mistake.headline}
          </p>
        </div>
        <ChevronDown className={`size-5 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open && (
        <div className="space-y-2 border-t border-line p-3">
          <Explanation mistake={mistake} data={data} settings={settings} />
          <Button variant="danger" onClick={() => data.deleteMistake(mistake.id)}>
            <Trash2 className="size-4" aria-hidden /> Delete
          </Button>
        </div>
      )}
    </div>
  );
}
