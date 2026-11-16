"use client";

import { useState } from "react";
import { Check, Lightbulb, Plus, Target } from "lucide-react";
import { TENSES, VERB_BY_KEY, groupLabel, type Tense } from "@/lib/conjugate";
import type { Settings } from "@/lib/useSettings";
import type { VerbLab } from "@/lib/useVerbLab";
import { Button, Card, SpeakButton } from "../ui";
import { VerbTable } from "./VerbTable";

export function VerbDetail({
  verbKey,
  lab,
  settings,
  onBack,
  onDrill,
}: {
  verbKey: string;
  lab: VerbLab;
  settings: Settings;
  onBack: () => void;
  onDrill: (tense: Tense) => void;
}) {
  const v = VERB_BY_KEY[verbKey];
  const [tense, setTense] = useState<Tense>(lab.prefs.tenses[0] ?? "present");
  const mine = lab.prefs.myVerbs.includes(v.key);
  const info = TENSES.find((t) => t.id === tense)!;

  return (
    <div className="space-y-3">
      <button onClick={onBack} className="text-sm font-semibold text-muted hover:text-ink">
        ← All verbs
      </button>

      <Card>
        <div className="flex items-start gap-3">
          <SpeakButton text={v.inf} voice={settings.voice} rate={settings.speechRate} />
          <div className="min-w-0 flex-1">
            <h2 lang="fr" className="text-2xl font-bold">{v.inf}</h2>
            <p className="text-base">{v.en}</p>
            <span className="mt-1 inline-block rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">{groupLabel(v)}</span>
          </div>
          <Button
            variant={mine ? "secondary" : "primary"}
            className="shrink-0 !px-3"
            onClick={() =>
              lab.setPrefs({
                myVerbs: mine ? lab.prefs.myVerbs.filter((k) => k !== v.key) : [...lab.prefs.myVerbs, v.key],
              })
            }
          >
            {mine ? <Check className="size-4" aria-hidden /> : <Plus className="size-4" aria-hidden />}
            {mine ? "Learning" : "Learn"}
          </Button>
        </div>
        {v.tip && (
          <div className="mt-4 flex gap-2.5 rounded-xl border border-tip-border bg-tip px-3.5 py-3 text-sm text-tip-text">
            <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>{v.tip}</p>
          </div>
        )}
        <div className="mt-3 flex items-start gap-2.5 text-sm">
          <SpeakButton text={v.exFr} voice={settings.voice} rate={settings.speechRate} size="sm" label="Listen to example" />
          <div>
            <p lang="fr" className="font-medium">{v.exFr}</p>
            <p className="text-muted">{v.exEn}</p>
          </div>
        </div>
      </Card>

      <div className="-mx-4 overflow-x-auto px-4" role="tablist" aria-label="Tense">
        <div className="flex w-max gap-1.5">
          {TENSES.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tense === t.id}
              onClick={() => setTense(t.id)}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold ${
                tense === t.id ? "bg-primary text-primary-fg" : "bg-surface-2 text-muted hover:text-ink"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <p className="text-sm">
          <span className="font-semibold">{info.name}</span> <span className="text-muted">= {info.english}</span>
        </p>
        <p className="mb-3 text-sm text-muted">{info.when}</p>
        <VerbTable verb={v} tense={tense} settings={settings} cells={lab.cells} />
        <Button className="mt-4 w-full" onClick={() => onDrill(tense)}>
          <Target className="size-4" aria-hidden /> Drill this table
        </Button>
        {!lab.prefs.tenses.includes(tense) && (
          <p className="mt-2 text-center text-xs text-muted">
            {info.name} isn&apos;t in your daily practice yet. Turn it on from the Verbs page when you&apos;re ready.
          </p>
        )}
      </Card>
    </div>
  );
}
