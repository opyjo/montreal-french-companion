"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PenLine, RefreshCw, Sparkles, UserRound } from "lucide-react";
import { correctWriting, generatePersonalSentences, type PersonalSentence, type WritingFeedback } from "@/lib/ai";
import { VERB_BY_KEY, TENSE_BY_ID, type Tense } from "@/lib/conjugate";
import { checkSentence, type SentenceCheck } from "@/lib/sentenceCheck";
import type { AboutMe } from "@/lib/useSyncedDoc";
import type { Settings } from "@/lib/useSettings";
import type { VerbPrefs } from "@/lib/verbDrill";
import { Button, Card, ErrorBox, Field, SlowHint, SpeakButton, inputClass } from "../ui";

const FIELDS: { key: keyof AboutMe; label: string; placeholder: string }[] = [
  { key: "name", label: "Your first name", placeholder: "Alex" },
  { key: "work", label: "What you do", placeholder: "software developer, I work from home" },
  { key: "city", label: "Where you live", placeholder: "Montréal" },
  { key: "family", label: "Family & pets", placeholder: "married, two kids, a dog called Max" },
  { key: "hobbies", label: "Hobbies", placeholder: "running, cooking, football on TV" },
  { key: "food", label: "Food & drink you like", placeholder: "jollof rice, coffee, pizza" },
  { key: "routine", label: "A typical day", placeholder: "gym at 7, work 9–5, cook dinner, read" },
];

/** Everyday questions, tagged by the tense a good answer uses. */
const QUESTIONS: { fr: string; en: string; tense: Tense }[] = [
  { fr: "Qu'est-ce que tu fais dans la vie ?", en: "What do you do for a living?", tense: "present" },
  { fr: "Où est-ce que tu habites ?", en: "Where do you live?", tense: "present" },
  { fr: "Qu'est-ce que tu aimes manger ?", en: "What do you like to eat?", tense: "present" },
  { fr: "Qu'est-ce que tu fais le week-end ?", en: "What do you do at the weekend?", tense: "present" },
  { fr: "Parle-moi de ta famille.", en: "Tell me about your family.", tense: "present" },
  { fr: "Décris ta journée typique.", en: "Describe your typical day.", tense: "present" },
  { fr: "Qu'est-ce que tu as fait hier soir ?", en: "What did you do last night?", tense: "passe-compose" },
  { fr: "Qu'est-ce que tu as mangé ce matin ?", en: "What did you eat this morning?", tense: "passe-compose" },
  { fr: "Qu'est-ce que tu as fait le week-end dernier ?", en: "What did you do last weekend?", tense: "passe-compose" },
  { fr: "Qu'est-ce que tu vas faire ce soir ?", en: "What are you going to do tonight?", tense: "futur-proche" },
  { fr: "Qu'est-ce que tu vas faire ce week-end ?", en: "What are you going to do this weekend?", tense: "futur-proche" },
  { fr: "Qu'est-ce que tu faisais quand tu étais petit(e) ?", en: "What did you use to do as a child?", tense: "imparfait" },
  { fr: "Où est-ce que tu habitais avant ?", en: "Where did you live before?", tense: "imparfait" },
  { fr: "Qu'est-ce que tu feras l'été prochain ?", en: "What will you do next summer?", tense: "futur" },
];

const CACHE = "dl_personal_sentences";

export function AboutYou({
  profile,
  saveProfile,
  prefs,
  settings,
  onStudied,
  onBack,
}: {
  profile: AboutMe;
  saveProfile: (p: AboutMe) => void;
  prefs: VerbPrefs;
  settings: Settings;
  onStudied: () => void;
  onBack: () => void;
}) {
  const filled = Object.values(profile).filter(Boolean).length;
  const [editing, setEditing] = useState(filled === 0);
  const ai = { provider: settings.aiProvider, apiKey: settings.aiKey };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm font-semibold text-muted hover:text-ink">
        ← Back to Today
      </button>
      <div>
        <h2 className="text-xl font-bold">Practise talking about your life</h2>
        <p className="text-sm text-muted">The French you&apos;ll actually use: sentences about you, with the verbs you&apos;ve studied.</p>
      </div>

      {editing ? (
        <ProfileForm
          profile={profile}
          onSave={(p) => {
            saveProfile(p);
            setEditing(false);
          }}
          onCancel={filled ? () => setEditing(false) : undefined}
        />
      ) : (
        <Card className="flex items-start gap-3">
          <UserRound className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <p className="min-w-0 flex-1 text-sm text-muted">
            {FIELDS.filter((f) => profile[f.key]).map((f) => profile[f.key]).join(" · ")}
          </p>
          <Button variant="ghost" className="shrink-0 !px-2 !py-1" onClick={() => setEditing(true)}>
            Edit
          </Button>
        </Card>
      )}

      {!editing && (
        <>
          <PersonalSentences profile={profile} prefs={prefs} settings={settings} ai={ai} onStudied={onStudied} />
          <WriteAboutYou profile={profile} prefs={prefs} settings={settings} ai={ai} onStudied={onStudied} />
        </>
      )}
    </div>
  );
}

function ProfileForm({ profile, onSave, onCancel }: { profile: AboutMe; onSave: (p: AboutMe) => void; onCancel?: () => void }) {
  const [draft, setDraft] = useState(profile);
  return (
    <Card>
      <h3 className="font-semibold">About you</h3>
      <p className="mb-3 text-sm text-muted">A few words in English is plenty. It&apos;s only used to write practice sentences for you.</p>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(draft);
        }}
      >
        {FIELDS.map((f) => (
          <Field key={f.key} label={f.label}>
            <input
              value={draft[f.key]}
              onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
              placeholder={f.placeholder}
              maxLength={200}
              className={inputClass}
            />
          </Field>
        ))}
        <div className="flex gap-2">
          <Button type="submit" disabled={!Object.values(draft).some((v) => v.trim())}>
            Save
          </Button>
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}

type Ai = { provider: Settings["aiProvider"]; apiKey: string };

function PersonalSentences({
  profile,
  prefs,
  settings,
  ai,
  onStudied,
}: {
  profile: AboutMe;
  prefs: VerbPrefs;
  settings: Settings;
  ai: Ai;
  onStudied: () => void;
}) {
  const [sentences, setSentences] = useState<PersonalSentence[]>([]);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [check, setCheck] = useState<SentenceCheck | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const c = JSON.parse(localStorage.getItem(CACHE) || "null");
      if (Array.isArray(c?.sentences)) {
        setSentences(c.sentences);
        setIndex(Math.min(c.index ?? 0, c.sentences.length));
      }
    } catch {
      // ignore
    }
  }, []);

  function persist(list: PersonalSentence[], i: number) {
    try {
      localStorage.setItem(CACHE, JSON.stringify({ sentences: list, index: i }));
    } catch {
      // ignore
    }
  }

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const list = await generatePersonalSentences(
        {
          profile,
          verbs: prefs.myVerbs.map((k) => VERB_BY_KEY[k]?.inf).filter(Boolean),
          tenses: prefs.tenses.map((t) => `${TENSE_BY_ID[t].name} (${TENSE_BY_ID[t].english})`),
        },
        ai
      );
      setSentences(list);
      setIndex(0);
      setTyped("");
      setCheck(null);
      persist(list, 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const s = sentences[index];
  const done = sentences.length > 0 && !s;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">Sentences about your life</h3>
          <p className="text-sm text-muted">Translate each into French. Written for you, using only your verbs and tenses.</p>
        </div>
        {sentences.length > 0 && (
          <Button variant="ghost" className="shrink-0 !px-2 !py-1" onClick={generate} loading={loading} aria-label="New set">
            <RefreshCw className="size-4" aria-hidden />
          </Button>
        )}
      </div>

      {error && <div className="mt-3"><ErrorBox message={error} /></div>}

      {sentences.length === 0 ? (
        <>
          <Button className="mt-3" onClick={generate} loading={loading}>
            <Sparkles className="size-4" aria-hidden /> Write my sentences
          </Button>
          <div className="mt-2"><SlowHint active={loading} /></div>
        </>
      ) : done ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-good-soft px-4 py-3 text-sm text-good">
          <span>All {sentences.length} done. Bien joué !</span>
          <Button variant="secondary" onClick={generate} loading={loading}>
            New set
          </Button>
        </div>
      ) : (
        <div className="mt-3">
          <p className="text-xs text-muted">
            {index + 1} of {sentences.length}
          </p>
          <p className="mt-1 text-lg font-semibold">{s.en}</p>
          <textarea
            ref={ref}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (check) next();
                else submit();
              }
            }}
            disabled={!!check}
            rows={2}
            placeholder="En français…"
            className={`${inputClass} mt-2 resize-none`}
            lang="fr"
            spellCheck={false}
            autoCorrect="off"
          />
          {check && (
            <div className="mt-3">
              <p
                role="status"
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                  check.verdict === "correct" ? "bg-good-soft text-good" : check.verdict === "wrong" ? "bg-bad-soft text-bad" : "bg-warn-soft text-warn"
                }`}
              >
                {check.verdict === "wrong" ? "Here's one way to say it. Other wordings can be right too." : check.message}
              </p>
              <div className="mt-2 flex items-start gap-3">
                <SpeakButton text={s.fr} voice={settings.voice} rate={settings.speechRate} />
                <p lang="fr" className="text-lg">
                  {check.words.map((w, i) => (
                    <span key={i} className={w.missed && check.verdict !== "correct" ? "rounded bg-warn-soft px-0.5 font-semibold text-warn" : ""}>
                      {w.text}{" "}
                    </span>
                  ))}
                </p>
              </div>
            </div>
          )}
          <Button className="mt-3 w-full" onClick={check ? next : submit} disabled={!check && !typed.trim()}>
            {check ? "Next" : "Check"}
          </Button>
        </div>
      )}
    </Card>
  );

  function submit() {
    if (!s || !typed.trim()) return;
    setCheck(checkSentence(typed, s.fr));
    onStudied();
  }
  function next() {
    const i = index + 1;
    setIndex(i);
    setTyped("");
    setCheck(null);
    persist(sentences, i);
    setTimeout(() => ref.current?.focus(), 30);
  }
}

function WriteAboutYou({
  profile,
  prefs,
  settings,
  ai,
  onStudied,
}: {
  profile: AboutMe;
  prefs: VerbPrefs;
  settings: Settings;
  ai: Ai;
  onStudied: () => void;
}) {
  const pool = useMemo(() => {
    const p = QUESTIONS.filter((q) => prefs.tenses.includes(q.tense));
    return p.length ? p : QUESTIONS.filter((q) => q.tense === "present");
  }, [prefs.tenses]);
  const [qi, setQi] = useState(0);
  const [answer, setAnswer] = useState("");
  const [fb, setFb] = useState<WritingFeedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const q = pool[qi % pool.length];

  useEffect(() => setQi(Math.floor(Math.random() * pool.length)), [pool.length]);

  async function submit() {
    if (!answer.trim()) return;
    setLoading(true);
    setError("");
    try {
      setFb(await correctWriting({ question: q.fr, answer, profile }, ai));
      onStudied();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <h3 className="flex items-center gap-2 font-semibold">
        <PenLine className="size-4 text-primary" aria-hidden /> Write about you
      </h3>
      <p className="text-sm text-muted">Answer in a sentence or two. You&apos;ll get gentle corrections.</p>
      <div className="mt-3 flex items-start gap-3">
        <SpeakButton text={q.fr} voice={settings.voice} rate={settings.speechRate} size="sm" />
        <div>
          <p lang="fr" className="text-lg font-semibold">{q.fr}</p>
          <p className="text-sm text-muted">
            {q.en} · <span className="text-primary">{TENSE_BY_ID[q.tense].name}</span>
          </p>
        </div>
      </div>
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        disabled={!!fb || loading}
        rows={3}
        placeholder="Je…"
        className={`${inputClass} mt-3 resize-y`}
        lang="fr"
        spellCheck={false}
        autoCorrect="off"
      />
      {error && <div className="mt-2"><ErrorBox message={error} /></div>}
      {!fb && (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={submit} loading={loading} disabled={!answer.trim()}>
              <Sparkles className="size-4" aria-hidden /> Check my French
            </Button>
            <Button variant="ghost" onClick={() => setQi((i) => i + 1)} disabled={loading}>
              Different question
            </Button>
          </div>
          <div className="mt-2"><SlowHint active={loading} /></div>
        </>
      )}
      {fb && (
        <div className="mt-4 space-y-3 border-t border-line pt-4">
          <p className={`rounded-lg px-3 py-2 text-sm font-semibold ${fb.isCorrect ? "bg-good-soft text-good" : "bg-warn-soft text-warn"}`}>
            {fb.isCorrect ? "No mistakes. " : ""}
            {fb.encouragement}
          </p>
          {!fb.isCorrect && (
            <div className="flex items-start gap-3">
              <SpeakButton text={fb.corrected} voice={settings.voice} rate={settings.speechRate} size="sm" />
              <p lang="fr" className="text-base font-medium">{fb.corrected}</p>
            </div>
          )}
          {fb.fixes.length > 0 && (
            <ul className="space-y-1.5 text-sm">
              {fb.fixes.map((f, i) => (
                <li key={i} className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-mono text-bad line-through decoration-2">{f.wrong || "∅"}</span>
                  <span className="text-muted">→</span>
                  <span className="font-mono font-semibold text-good">{f.right || "∅"}</span>
                  <span className="text-muted">— {f.why}</span>
                </li>
              ))}
            </ul>
          )}
          {fb.richer && (
            <div className="rounded-xl bg-primary-soft px-3.5 py-3 text-sm">
              <p className="font-semibold text-primary">Next time, try:</p>
              <div className="mt-1 flex items-start gap-2">
                <SpeakButton text={fb.richer} voice={settings.voice} rate={settings.speechRate} size="sm" />
                <div>
                  <p lang="fr" className="font-medium">{fb.richer}</p>
                  <p className="text-muted">{fb.richerEn}</p>
                </div>
              </div>
            </div>
          )}
          <Button
            variant="secondary"
            onClick={() => {
              setFb(null);
              setAnswer("");
              setQi((i) => i + 1);
            }}
          >
            Another question
          </Button>
        </div>
      )}
    </Card>
  );
}
