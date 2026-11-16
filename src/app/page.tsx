"use client";

import { useEffect, useMemo, useState } from "react";
import { Brain, Cloud, CloudOff, Flame, Languages, Library, Settings as SettingsIcon, Sparkles } from "lucide-react";
import { isDue } from "@/lib/srs";
import { useStudyData } from "@/lib/useStudyData";
import { useSettings } from "@/lib/useSettings";
import { LookupTab, type LookupState } from "@/components/LookupTab";
import { MistakeTab, type MistakeFormState } from "@/components/MistakeTab";
import { ReviewTab } from "@/components/ReviewTab";
import { WordsTab } from "@/components/WordsTab";
import { SettingsPanel } from "@/components/SettingsPanel";

type Tab = "lookup" | "mistakes" | "review" | "words";

const TABS: { id: Tab; label: string; Icon: typeof Languages }[] = [
  { id: "lookup", label: "Look up", Icon: Languages },
  { id: "mistakes", label: "Mistakes", Icon: Sparkles },
  { id: "review", label: "Review", Icon: Brain },
  { id: "words", label: "Words", Icon: Library },
];

export default function Home() {
  const data = useStudyData();
  const { settings, update } = useSettings();
  const [tab, setTab] = useState<Tab>("lookup");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lookup, setLookup] = useState<LookupState>({ text: "", tag: "", result: null });
  const [mistake, setMistake] = useState<MistakeFormState>({
    prompt: "",
    myAnswer: "",
    correctAnswer: "",
    current: null,
  });

  // Remember the last tab between visits.
  useEffect(() => {
    try {
      const t = localStorage.getItem("dl_tab") as Tab | null;
      if (t && TABS.some((x) => x.id === t)) setTab(t);
    } catch {
      // ignore
    }
  }, []);
  const go = (t: Tab) => {
    setTab(t);
    window.scrollTo({ top: 0 });
    try {
      localStorage.setItem("dl_tab", t);
    } catch {
      // ignore
    }
  };

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);
  const dueCount = useMemo(() => data.words.filter((w) => isDue(w, now)).length, [data.words, now]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-lg font-black text-primary-fg" aria-hidden>
            C
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base leading-tight font-bold">Carnet</h1>
            <p className="truncate text-xs text-muted">Your French study sidekick</p>
          </div>
          <div
            className="flex items-center gap-1 rounded-full bg-warn-soft px-2.5 py-1 text-sm font-semibold text-warn"
            title="Study streak"
          >
            <Flame className="size-4" aria-hidden />
            <span className="tabular-nums">{data.profile.streak}</span>
            <span className="sr-only">day streak</span>
          </div>
          <span
            title={data.mode === "cloud" ? "Synced" : data.mode === "local" ? "Saved on this device only" : "Connecting…"}
            className="text-muted"
          >
            {data.mode === "cloud" ? <Cloud className="size-5" aria-label="Synced" /> : <CloudOff className="size-5" aria-label="Not synced" />}
          </span>
          <button
            onClick={() => setSettingsOpen(true)}
            className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-ink"
            aria-label="Settings"
          >
            <SettingsIcon className="size-5" />
          </button>
        </div>

        {/* Desktop tabs */}
        <nav className="hidden gap-1 px-3 pb-2 sm:flex" aria-label="Sections">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => go(id)}
              aria-current={tab === id ? "page" : undefined}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors ${
                tab === id ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-2 hover:text-ink"
              }`}
            >
              <Icon className="size-4" aria-hidden />
              {label}
              {id === "review" && dueCount > 0 && (
                <span className="rounded-full bg-primary px-1.5 text-xs text-primary-fg tabular-nums">{dueCount}</span>
              )}
            </button>
          ))}
        </nav>
      </header>

      <main className="flex-1 px-4 pt-4 pb-28 sm:pb-10">
        {tab === "lookup" && (
          <LookupTab data={data} settings={settings} state={lookup} setState={setLookup} onGoReview={() => go("review")} />
        )}
        {tab === "mistakes" && <MistakeTab data={data} settings={settings} state={mistake} setState={setMistake} />}
        {tab === "review" && (
          <ReviewTab data={data} settings={settings} updateSettings={update} onGoLookup={() => go("lookup")} />
        )}
        {tab === "words" && <WordsTab data={data} settings={settings} onGoLookup={() => go("lookup")} />}
      </main>

      {/* Mobile bottom tabs */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
        aria-label="Sections"
      >
        <div className="mx-auto grid max-w-2xl grid-cols-4">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => go(id)}
              aria-current={tab === id ? "page" : undefined}
              className={`relative flex flex-col items-center gap-0.5 py-2.5 text-xs font-semibold ${
                tab === id ? "text-primary" : "text-muted"
              }`}
            >
              <Icon className="size-5" aria-hidden />
              {label}
              {id === "review" && dueCount > 0 && (
                <span className="absolute top-1.5 left-1/2 ml-2 min-w-5 rounded-full bg-primary px-1 text-[10px] leading-5 text-primary-fg tabular-nums">
                  {dueCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        data={data}
        settings={settings}
        update={update}
      />
    </div>
  );
}
