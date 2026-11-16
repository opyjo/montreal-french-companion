"use client";

import { useEffect, useRef, useState } from "react";
import { CircleCheck } from "lucide-react";
import { checkSentence, type SentenceCheck } from "@/lib/sentenceCheck";
import type { Mistake, MistakeKind } from "@/lib/types";
import type { Settings } from "@/lib/useSettings";
import { Button, Card, EmptyState, SpeakButton, inputClass } from "../ui";

export interface RedoItem {
  instruction: string;
  prompt: string;
  expected: string;
  rule: string;
}

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

/**
 * Turns saved Duolingo mistakes into exercises: translate the original
 * prompt again (or fix your wrong sentence), plus the practice sentences.
 */
export function buildRedoItems(mistakes: Mistake[], kind?: MistakeKind, limit = 8): RedoItem[] {
  const pool = mistakes.filter((m) => m.kind !== "acceptable" && (!kind || m.kind === kind));
  const items: RedoItem[] = [];
  for (const m of pool) {
    items.push(
      m.prompt && !/[àâçéèêëîïôûùœ]/i.test(m.prompt) && m.prompt !== m.correctAnswer
        ? { instruction: "Translate into French", prompt: m.prompt, expected: m.correctAnswer, rule: m.rule }
        : { instruction: "Fix this sentence", prompt: m.myAnswer, expected: m.correctAnswer, rule: m.rule }
    );
    for (const p of m.practice.slice(0, 2))
      items.push({ instruction: "Translate into French", prompt: p.en, expected: p.fr, rule: m.rule });
  }
  return shuffle(items).slice(0, limit);
}

const ACCENTS = ["é", "è", "ê", "à", "â", "ç", "î", "ô", "ù", "û", "œ"];

export function MistakeRedo({
  items,
  settings,
  onStudied,
  onExit,
  onComplete,
  exitLabel = "Done",
}: {
  items: RedoItem[];
  settings: Settings;
  onStudied: () => void;
  onExit: () => void;
  onComplete?: () => void;
  exitLabel?: string;
}) {
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [check, setCheck] = useState<SentenceCheck | null>(null);
  const [right, setRight] = useState(0);
  const ref = useRef<HTMLTextAreaElement>(null);
  const item = items[index];

  useEffect(() => {
    if (!item) onComplete?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  useEffect(() => {
    setTyped("");
    setCheck(null);
    setTimeout(() => ref.current?.focus(), 30);
  }, [index]);

  function submit() {
    if (!item || check || !typed.trim()) return;
    const r = checkSentence(typed, item.expected);
    setCheck(r);
    if (r.verdict !== "wrong") setRight((n) => n + 1);
    onStudied();
  }

  if (!item) {
    return (
      <Card>
        <EmptyState icon={<CircleCheck className="size-6" />} title="Mistakes redone">
          <p>
            {right} of {items.length} right. Each one you fix now is one Duolingo won&apos;t catch you on again.
          </p>
          <Button className="mt-4" onClick={onExit}>
            {exitLabel}
          </Button>
        </EmptyState>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-muted">
        <button onClick={onExit} className="font-semibold hover:text-ink">
          ← End
        </button>
        <span>Redo my mistakes · {items.length - index} left</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(index / items.length) * 100}%` }} />
      </div>
      <Card>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{item.instruction}</p>
        <p className="mt-2 text-xl font-semibold" lang={item.instruction.startsWith("Fix") ? "fr" : "en"}>
          {item.prompt}
        </p>
        <textarea
          ref={ref}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (check) setIndex((i) => i + 1);
              else submit();
            }
          }}
          disabled={!!check}
          rows={2}
          placeholder="Type it in French"
          className={`${inputClass} mt-4 resize-none`}
          lang="fr"
          autoCapitalize="sentences"
          autoCorrect="off"
          spellCheck={false}
        />
        {!check && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ACCENTS.map((a) => (
              <button
                key={a}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setTyped((t) => t + a)}
                className="min-w-9 rounded-lg border border-line bg-surface px-2 py-1.5 hover:bg-surface-2"
              >
                {a}
              </button>
            ))}
          </div>
        )}
        {check && (
          <div className="mt-4 border-t border-line pt-4">
            <p
              role="status"
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                check.verdict === "correct" ? "bg-good-soft text-good" : check.verdict === "wrong" ? "bg-bad-soft text-bad" : "bg-warn-soft text-warn"
              }`}
            >
              {check.message}
            </p>
            <div className="mt-3 flex items-start gap-3">
              <SpeakButton text={item.expected} voice={settings.voice} rate={settings.speechRate} />
              <p lang="fr" className="text-lg">
                {check.words.map((w, i) => (
                  <span key={i} className={w.missed && check.verdict !== "correct" ? "rounded bg-warn-soft px-0.5 font-semibold text-warn" : ""}>
                    {w.text}{" "}
                  </span>
                ))}
              </p>
            </div>
            {item.rule && <p className="mt-3 rounded-xl bg-primary-soft px-3.5 py-2.5 text-sm"><span className="font-semibold text-primary">Rule: </span>{item.rule}</p>}
          </div>
        )}
      </Card>
      {check ? (
        <Button className="w-full py-3.5 text-base" onClick={() => setIndex((i) => i + 1)}>
          Continue
        </Button>
      ) : (
        <Button className="w-full py-3.5 text-base" onClick={submit} disabled={!typed.trim()}>
          Check
        </Button>
      )}
    </div>
  );
}
