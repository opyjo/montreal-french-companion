"use client";

import type { StudyData } from "@/lib/useStudyData";
import type { Settings } from "@/lib/useSettings";
import { LookupTab, type LookupState } from "./LookupTab";
import { ReviewTab } from "./ReviewTab";
import { WordsTab } from "./WordsTab";

export type WordsView = "review" | "lookup" | "library";

/** Review, Look up and the word library under one tab. */
export function WordsHub({
  view,
  setView,
  data,
  settings,
  updateSettings,
  lookup,
  setLookup,
  dueCount,
}: {
  view: WordsView;
  setView: (v: WordsView) => void;
  data: StudyData;
  settings: Settings;
  updateSettings: (p: Partial<Settings>) => void;
  lookup: LookupState;
  setLookup: (s: LookupState) => void;
  dueCount: number;
}) {
  const tabs: { id: WordsView; label: string }[] = [
    { id: "review", label: dueCount ? `Review (${dueCount})` : "Review" },
    { id: "lookup", label: "Look up" },
    { id: "library", label: `My words (${data.words.length})` },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 rounded-xl bg-surface-2 p-1 text-sm" role="tablist" aria-label="Words">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={view === t.id}
            onClick={() => setView(t.id)}
            className={`truncate rounded-lg px-2 py-2 font-semibold ${view === t.id ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {view === "review" && (
        <ReviewTab data={data} settings={settings} updateSettings={updateSettings} onGoLookup={() => setView("lookup")} />
      )}
      {view === "lookup" && (
        <LookupTab data={data} settings={settings} state={lookup} setState={setLookup} onGoReview={() => setView("review")} />
      )}
      {view === "library" && <WordsTab data={data} settings={settings} onGoLookup={() => setView("lookup")} />}
    </div>
  );
}
