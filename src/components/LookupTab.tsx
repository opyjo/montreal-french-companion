"use client";

import { useMemo, useState } from "react";
import { BookOpen, Languages, ListChecks } from "lucide-react";
import { lookupWords } from "@/lib/ai";
import type { LookupResult } from "@/lib/types";
import type { StudyData } from "@/lib/useStudyData";
import type { Settings } from "@/lib/useSettings";
import { Button, Card, ErrorBox, Field, SpeakButton, inputClass } from "./ui";
import { WordCard } from "./WordCard";

export interface LookupState {
  text: string;
  tag: string;
  result: LookupResult | null;
}

export function LookupTab({
  data,
  settings,
  state,
  setState,
  onGoReview,
}: {
  data: StudyData;
  settings: Settings;
  state: LookupState;
  setState: (s: LookupState) => void;
  onGoReview: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const { text, tag, result } = state;

  const tags = useMemo(
    () => [...new Set(data.words.map((w) => w.tag).filter(Boolean))].sort(),
    [data.words]
  );
  const unsaved = result?.items.filter((i) => !data.hasWord(i.french)) ?? [];

  async function run() {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const res = await lookupWords(text, {
        provider: settings.aiProvider,
        apiKey: settings.aiKey,
      });
      setState({ ...state, result: res });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function saveAll() {
    const n = await data.addWords(unsaved, { tag, source: "lookup" });
    setNotice(`${n} word${n === 1 ? "" : "s"} added to your review deck.`);
  }

  return (
    <div className="space-y-4">
      <Card>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run();
          }}
          className="space-y-3"
        >
          <Field
            label="Paste words or a sentence"
            hint="French or English. One word, a list (one per line or comma-separated), or a whole sentence from your lesson."
          >
            <textarea
              value={text}
              onChange={(e) => setState({ ...state, text: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void run();
              }}
              rows={4}
              placeholder={"la pomme, manger, boire\nor: Je mange une pomme et je bois de l'eau."}
              className={`${inputClass} resize-y`}
              lang="fr"
              autoCapitalize="off"
              spellCheck={false}
            />
          </Field>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Field label="Duolingo unit (optional)" hint="Tags saved words so you can review a unit together.">
                <input
                  value={tag}
                  onChange={(e) => setState({ ...state, tag: e.target.value })}
                  list="unit-tags"
                  placeholder="e.g. Section 1 · Unit 4 — Food"
                  className={inputClass}
                />
                <datalist id="unit-tags">
                  {tags.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </Field>
            </div>
            <Button type="submit" loading={loading} disabled={!text.trim()} className="sm:mb-[1.4rem]">
              <Languages className="size-4" aria-hidden />
              Translate
            </Button>
          </div>
        </form>
      </Card>

      {error && <ErrorBox message={error} />}

      {result?.sentence && (
        <Card>
          <div className="flex items-start gap-3">
            <SpeakButton
              text={result.sentence.french || result.sentence.original}
              voice={settings.voice}
              rate={settings.speechRate}
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Sentence</p>
              <p className="mt-1 text-lg font-semibold" lang="fr">
                {result.sentence.original}
              </p>
              <p className="text-base text-muted">{result.sentence.translation}</p>
              {result.sentence.notes && <p className="mt-2 text-sm">{result.sentence.notes}</p>}
            </div>
          </div>
        </Card>
      )}

      {result && result.items.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-muted">
              {result.items.length} word{result.items.length === 1 ? "" : "s"}
            </h2>
            {unsaved.length > 1 && (
              <Button variant="secondary" onClick={saveAll}>
                <ListChecks className="size-4" aria-hidden />
                Save all {unsaved.length}
              </Button>
            )}
          </div>
          {notice && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-good-soft px-4 py-3 text-sm text-good">
              <span>{notice}</span>
              <button className="font-semibold underline" onClick={onGoReview}>
                Review now
              </button>
            </div>
          )}
          <div className="space-y-3">
            {result.items.map((info, i) => (
              <WordCard
                key={`${info.french}-${i}`}
                info={info}
                voice={settings.voice}
                rate={settings.speechRate}
                saved={data.hasWord(info.french)}
                onSave={() => data.addWords([info], { tag, source: "lookup" })}
              />
            ))}
          </div>
        </>
      )}

      {!result && !loading && data.words.length === 0 && <HowItWorks />}
    </div>
  );
}

function HowItWorks() {
  const steps = [
    ["Do your Duolingo lesson", "Notice words you didn't know or keep forgetting."],
    ["Paste them here", "You get the translation, the gender, a memory trick and an example. Save the ones you want to keep."],
    ["Review a few minutes a day", "The Review tab shows each word just before you'd forget it. That spacing is what makes words stick."],
    ["Got something wrong?", "Paste it into Mistakes for a plain-English explanation of the rule."],
  ];
  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <BookOpen className="size-5 text-primary" aria-hidden />
        <h2 className="font-semibold">How to use this with Duolingo</h2>
      </div>
      <ol className="space-y-3">
        {steps.map(([title, body], i) => (
          <li key={title} className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
              {i + 1}
            </span>
            <div className="text-sm">
              <p className="font-semibold">{title}</p>
              <p className="text-muted">{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
