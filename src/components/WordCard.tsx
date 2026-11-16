"use client";

import { useState, type ReactNode } from "react";
import { Check, Lightbulb, Plus, TriangleAlert } from "lucide-react";
import type { WordInfo } from "@/lib/types";
import type { Voice } from "@/lib/speech";
import { Button, GenderChip, PosChip, SpeakButton, genderText } from "./ui";

export function WordCard({
  info,
  voice,
  rate,
  saved,
  onSave,
  actions,
}: {
  info: WordInfo;
  voice: Voice;
  rate: number;
  saved?: boolean;
  onSave?: () => Promise<unknown>;
  actions?: ReactNode;
}) {
  const [saving, setSaving] = useState(false);

  return (
    <article className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <header className="flex items-start gap-3">
        <SpeakButton text={info.french} voice={voice} rate={rate} />
        <div className="min-w-0 flex-1">
          <h3
            lang="fr"
            className={`text-xl font-bold leading-tight break-words ${genderText(info.gender)}`}
          >
            {info.french}
          </h3>
          <p className="mt-0.5 text-base text-ink">{info.english}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <PosChip pos={info.partOfSpeech} />
            <GenderChip gender={info.gender} />
            {info.pronunciation && (
              <span className="text-xs text-muted">
                says <span className="font-mono">{info.pronunciation}</span>
              </span>
            )}
          </div>
        </div>
        {onSave && (
          <Button
            variant={saved ? "secondary" : "primary"}
            className="shrink-0 !px-3"
            disabled={saved}
            loading={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSave();
              } finally {
                setSaving(false);
              }
            }}
          >
            {saved ? (
              <>
                <Check className="size-4" aria-hidden /> Saved
              </>
            ) : (
              <>
                <Plus className="size-4" aria-hidden /> Save
              </>
            )}
          </Button>
        )}
      </header>

      {info.memoryTip && (
        <div className="mt-4 flex gap-2.5 rounded-xl border border-tip-border bg-tip px-3.5 py-3 text-sm text-tip-text">
          <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            <span className="font-semibold">Remember it: </span>
            {info.memoryTip}
          </p>
        </div>
      )}

      {info.exampleFr && (
        <div className="mt-3 flex items-start gap-2.5">
          <SpeakButton
            text={info.exampleFr}
            voice={voice}
            rate={rate}
            size="sm"
            label="Listen to example"
          />
          <div className="text-sm">
            <p lang="fr" className="font-medium">
              {info.exampleFr}
            </p>
            <p className="text-muted">{info.exampleEn}</p>
          </div>
        </div>
      )}

      {(info.grammarNote || info.lookAlikes) && (
        <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
          {info.grammarNote && (
            <div>
              <dt className="inline font-semibold">Grammar: </dt>
              <dd className="inline text-muted">{info.grammarNote}</dd>
            </div>
          )}
          {info.lookAlikes && (
            <div className="flex gap-1.5">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
              <div>
                <dt className="inline font-semibold">Don&apos;t confuse: </dt>
                <dd className="inline text-muted">{info.lookAlikes}</dd>
              </div>
            </div>
          )}
        </dl>
      )}

      {actions && <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">{actions}</div>}
    </article>
  );
}
