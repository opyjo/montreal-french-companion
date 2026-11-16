"use client";

import { auxiliary, pastParticiple, sharedStem, soundsAlikeNote, table, type Tense, type Verb } from "@/lib/conjugate";
import { cellId, type VerbCell } from "@/lib/verbDrill";
import type { Settings } from "@/lib/useSettings";
import { SpeakButton } from "../ui";

const SIMPLE: Tense[] = ["present", "imparfait", "futur"];

/** The textbook endings, when the verb follows them (so "mangeais" shows mange|ais, not mang|eais). */
function knownEndings(v: Verb, tense: Tense): string[] | null {
  if (tense === "imparfait") return ["ais", "ais", "ait", "ions", "iez", "aient"];
  if (tense === "futur") return ["ai", "as", "a", "ons", "ez", "ont"];
  if (tense === "present") {
    // Use a standard ending set only if every form really follows it
    // (covers achète, m'appelle, j'ouvre — but not suis/es/est).
    const words = table(v, "present").map((f) => f.verb.split(" ").pop() || "");
    const sets = [
      ["e", "es", "e", "ons", "ez", "ent"],
      ["is", "is", "it", "issons", "issez", "issent"],
      ["s", "s", "", "ons", "ez", "ent"],
    ];
    if (v.group !== "irregular" || v.base === "ouvrir")
      return sets.find((e) => words.every((w, i) => w.endsWith(e[i]) && w !== e[i])) ?? null;
  }
  return null;
}

/** Colours the ending of the last word ("nous mange|ons"). */
function Highlighted({ verb, ending }: { verb: string; ending: string | null }) {
  const parts = verb.split(" ");
  const last = parts.pop() || "";
  const lead = parts.length ? parts.join(" ") + " " : "";
  if (!ending || !last.endsWith(ending) || last === ending) return <>{verb}</>;
  return (
    <>
      {lead}
      {last.slice(0, -ending.length)}
      <span className="font-bold text-primary">{ending}</span>
    </>
  );
}

export function VerbTable({
  verb,
  tense,
  settings,
  cells,
}: {
  verb: Verb;
  tense: Tense;
  settings: Settings;
  cells?: Record<string, VerbCell>;
}) {
  const forms = table(verb, tense);
  const known = knownEndings(verb, tense);
  const stem = SIMPLE.includes(tense) && !known ? sharedStem(forms) : "";
  const endingFor = (person: number, word: string) =>
    known ? known[person] : stem && word.startsWith(stem) ? word.slice(stem.length) : null;
  const note = soundsAlikeNote(verb, tense);

  return (
    <div>
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
        {forms.map((f) => {
          const c = cells?.[cellId({ verb: verb.key, tense, person: f.person })];
          const dot = !c ? "bg-line" : c.repetition > 0 ? "bg-good" : c.lapses > 0 ? "bg-bad" : "bg-warn";
          return (
            <li key={f.person} className="flex items-center gap-3 bg-surface px-3 py-2">
              <span className="w-24 shrink-0 text-sm text-muted">{f.subject.replace("'", "’")}</span>
              <span lang="fr" className="min-w-0 flex-1 text-lg break-words">
                <Highlighted verb={f.verb} ending={endingFor(f.person, f.verb.split(" ").pop() || "")} />
              </span>
              {cells && <span className={`size-2 shrink-0 rounded-full ${dot}`} title={c ? `right ${c.correct}× · wrong ${c.wrong}×` : "not practised yet"} />}
              <SpeakButton text={f.full} voice={settings.voice} rate={settings.speechRate} size="sm" />
            </li>
          );
        })}
      </ul>
      <div className="mt-2 space-y-1 text-sm text-muted">
        {tense === "passe-compose" && (
          <p>
            Uses <strong className="text-ink">{auxiliary(verb)}</strong> + past participle{" "}
            <strong className="text-ink" lang="fr">{pastParticiple(verb)}</strong>
            {auxiliary(verb) === "être" && " — which agrees like an adjective: add -e for feminine, -s for plural."}
          </p>
        )}
        {tense === "futur-proche" && <p>aller (present) + the infinitive. Nothing new to learn!</p>}
        {note && <p>{note}</p>}
      </div>
    </div>
  );
}
