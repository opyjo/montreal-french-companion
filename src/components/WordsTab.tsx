"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Library, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { normalize, stripAccents } from "@/lib/answer";
import { strength } from "@/lib/srs";
import type { Gender, PartOfSpeech, Word } from "@/lib/types";
import type { StudyData } from "@/lib/useStudyData";
import type { Settings } from "@/lib/useSettings";
import { Button, Card, EmptyState, Field, SpeakButton, genderText, inputClass } from "./ui";
import { WordCard } from "./WordCard";

const STRENGTH_STYLE: Record<ReturnType<typeof strength>, string> = {
  new: "bg-primary-soft text-primary",
  learning: "bg-warn-soft text-warn",
  known: "bg-good-soft text-good",
  strong: "bg-good text-surface",
};

export function WordsTab({
  data,
  settings,
  onGoLookup,
}: {
  data: StudyData;
  settings: Settings;
  onGoLookup: () => void;
}) {
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");
  const [adding, setAdding] = useState(false);

  const tags = useMemo(
    () => [...new Set(data.words.map((w) => w.tag).filter(Boolean))].sort(),
    [data.words]
  );

  const list = useMemo(() => {
    const needle = stripAccents(normalize(q));
    return data.words
      .filter((w) => !tag || w.tag === tag)
      .filter(
        (w) =>
          !needle ||
          stripAccents(normalize(w.french)).includes(needle) ||
          normalize(w.english).includes(needle)
      )
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [data.words, q, tag]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${data.words.length} words`}
            className={`${inputClass} pl-9`}
            aria-label="Search words"
          />
        </div>
        {tags.length > 0 && (
          <select value={tag} onChange={(e) => setTag(e.target.value)} className={`${inputClass} sm:w-56`} aria-label="Filter by unit">
            <option value="">All units</option>
            {tags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}
        <Button variant="secondary" onClick={() => setAdding(!adding)}>
          {adding ? <X className="size-4" aria-hidden /> : <Plus className="size-4" aria-hidden />}
          {adding ? "Cancel" : "Add manually"}
        </Button>
      </div>

      {adding && <ManualAdd data={data} tags={tags} onDone={() => setAdding(false)} />}

      {data.words.length === 0 ? (
        <Card>
          <EmptyState icon={<Library className="size-6" />} title="No saved words yet">
            <p>Words you save from Look up or Mistakes will show up here.</p>
            <Button className="mt-4" onClick={onGoLookup}>
              Look up words
            </Button>
          </EmptyState>
        </Card>
      ) : list.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">No words match.</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {list.map((w) => (
            <WordRow key={w.id} word={w} data={data} settings={settings} />
          ))}
        </ul>
      )}
    </div>
  );
}

function WordRow({ word, data, settings }: { word: Word; data: StudyData; settings: Settings }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const s = strength(word);

  return (
    <li>
      <div className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
        <SpeakButton text={word.french} voice={settings.voice} rate={settings.speechRate} size="sm" />
        <button
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <div className="min-w-0 flex-1">
            <p lang="fr" className={`truncate font-semibold ${genderText(word.gender)}`}>
              {word.french}
            </p>
            <p className="truncate text-sm text-muted">{word.english}</p>
          </div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${STRENGTH_STYLE[s]}`}>{s}</span>
          <ChevronDown className={`size-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
        </button>
      </div>
      {open && (
        <div className="bg-surface-2 p-3">
          {editing ? (
            <EditWord word={word} data={data} onDone={() => setEditing(false)} />
          ) : (
            <WordCard
              info={word}
              voice={settings.voice}
              rate={settings.speechRate}
              actions={
                <>
                  <Button variant="secondary" onClick={() => setEditing(true)}>
                    <Pencil className="size-4" aria-hidden /> Edit
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      if (confirm(`Delete “${word.french}”?`)) void data.deleteWord(word.id);
                    }}
                  >
                    <Trash2 className="size-4" aria-hidden /> Delete
                  </Button>
                  <span className="ml-auto self-center text-xs text-muted">
                    {word.tag && `${word.tag} · `}reviewed {word.repetition}× · forgot {word.lapses}×
                  </span>
                </>
              }
            />
          )}
        </div>
      )}
    </li>
  );
}

function EditWord({ word, data, onDone }: { word: Word; data: StudyData; onDone: () => void }) {
  const [draft, setDraft] = useState(word);
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<Word>) => setDraft({ ...draft, ...patch });
  return (
    <Card className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="French">
          <input value={draft.french} onChange={(e) => set({ french: e.target.value })} className={inputClass} lang="fr" />
        </Field>
        <Field label="English">
          <input value={draft.english} onChange={(e) => set({ english: e.target.value })} className={inputClass} />
        </Field>
      </div>
      <Field label="Memory tip" hint="Your own hook is often stickier than the AI's.">
        <textarea value={draft.memoryTip} onChange={(e) => set({ memoryTip: e.target.value })} rows={2} className={inputClass} />
      </Field>
      <Field label="Unit">
        <input value={draft.tag} onChange={(e) => set({ tag: e.target.value })} className={inputClass} />
      </Field>
      <div className="flex gap-2">
        <Button
          loading={saving}
          disabled={!draft.french.trim() || !draft.english.trim()}
          onClick={async () => {
            setSaving(true);
            try {
              await data.updateWord({ ...draft, french: draft.french.trim(), english: draft.english.trim() });
              onDone();
            } finally {
              setSaving(false);
            }
          }}
        >
          Save
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}

function ManualAdd({ data, tags, onDone }: { data: StudyData; tags: string[]; onDone: () => void }) {
  const [french, setFrench] = useState("");
  const [english, setEnglish] = useState("");
  const [gender, setGender] = useState<Gender>("none");
  const [memoryTip, setMemoryTip] = useState("");
  const [tag, setTag] = useState("");
  const [msg, setMsg] = useState("");

  async function save() {
    const pos: PartOfSpeech = gender === "none" ? "other" : "noun";
    const n = await data.addWords(
      [
        {
          french: french.trim(),
          english: english.trim(),
          partOfSpeech: pos,
          gender,
          pronunciation: "",
          memoryTip: memoryTip.trim(),
          exampleFr: "",
          exampleEn: "",
          grammarNote: "",
          lookAlikes: "",
        },
      ],
      { tag, source: "manual" }
    );
    if (n === 0) {
      setMsg("That word is already in your deck.");
      return;
    }
    setFrench("");
    setEnglish("");
    setMemoryTip("");
    setGender("none");
    setMsg("");
    onDone();
  }

  return (
    <Card>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <p className="text-sm text-muted">
          No AI needed. Tip: use Look up instead to get a memory trick and example for free.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="French">
            <input value={french} onChange={(e) => setFrench(e.target.value)} placeholder="la fenêtre" className={inputClass} lang="fr" required />
          </Field>
          <Field label="English">
            <input value={english} onChange={(e) => setEnglish(e.target.value)} placeholder="the window" className={inputClass} required />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Gender (nouns)">
            <select value={gender} onChange={(e) => setGender(e.target.value as Gender)} className={inputClass}>
              <option value="none">Not a noun</option>
              <option value="masculine">Masculine (le)</option>
              <option value="feminine">Feminine (la)</option>
            </select>
          </Field>
          <Field label="Unit (optional)">
            <input value={tag} onChange={(e) => setTag(e.target.value)} list="manual-tags" className={inputClass} />
            <datalist id="manual-tags">
              {tags.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </Field>
        </div>
        <Field label="Memory tip (optional)">
          <input value={memoryTip} onChange={(e) => setMemoryTip(e.target.value)} placeholder="fenêtre ≈ 'defenestrate' (throw out a window)" className={inputClass} />
        </Field>
        {msg && <p className="text-sm text-warn">{msg}</p>}
        <Button type="submit" disabled={!french.trim() || !english.trim()}>
          <Plus className="size-4" aria-hidden /> Add word
        </Button>
      </form>
    </Card>
  );
}
