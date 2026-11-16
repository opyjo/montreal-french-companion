import { ALL_VERBS, PERSONS, TENSES, TENSE_BY_ID, VERB_BY_KEY, auxiliary, type Tense } from "./conjugate";
import type { VerbCell, VerbPrefs, CellRef } from "./verbDrill";
import { MISTAKE_LABELS, type Mistake, type MistakeKind, type Word } from "./types";
import { GRAMMAR_BY_ID, TOPIC_FOR_MISTAKE } from "@/data/grammar";
import type { GrammarScores } from "./useSyncedDoc";

/**
 * Weak spots = patterns in what you get wrong, across verb drills, word
 * reviews and the Duolingo mistakes you paste in. Each one comes with a drill.
 */

export type WeakAction =
  | { type: "verb-person"; person: number }
  | { type: "verb-tense"; tense: Tense; etreOnly?: boolean }
  | { type: "verb"; verb: string }
  | { type: "words"; ids: string[] }
  | { type: "mistakes"; kind: MistakeKind }
  | { type: "grammar"; topic: string };

export interface WeakSpot {
  id: string;
  title: string;
  detail: string;
  source: "verbs" | "words" | "mistakes" | "grammar";
  score: number; // higher = more urgent
  action: WeakAction;
  topic?: string; // a grammar cheat sheet that explains it
}

const PERSON_LABEL = ["je forms", "tu forms", "il/elle/on forms", "nous forms", "vous forms", "ils/elles forms"];

const MISTAKE_TITLES: Partial<Record<MistakeKind, string>> = {
  article: "Articles (le / la / un / une / du)",
  agreement: "Making words agree (gender & plural)",
  conjugation: "Verb endings in sentences",
  "word-order": "Word order",
  vocabulary: "Choosing the right word",
  "missing-word": "Leaving out small words",
  "extra-word": "Adding extra words",
  accent: "Accents",
};

interface Tally {
  right: number;
  wrong: number;
}

function add(map: Map<string, Tally>, key: string, c: VerbCell) {
  const t = map.get(key) ?? { right: 0, wrong: 0 };
  t.right += c.correct;
  t.wrong += c.wrong;
  map.set(key, t);
}

const pct = (t: Tally) => Math.round((t.wrong / (t.right + t.wrong)) * 100);

export function findWeakSpots(input: {
  cells: Record<string, VerbCell>;
  words: Word[];
  mistakes: Mistake[];
  grammar?: GrammarScores;
}): WeakSpot[] {
  const spots: WeakSpot[] = [];
  const cells = Object.values(input.cells).filter((c) => VERB_BY_KEY[c.verb]);

  // ---- Verb patterns --------------------------------------------------
  const overall: Tally = { right: 0, wrong: 0 };
  const byPerson = new Map<string, Tally>();
  const byTense = new Map<string, Tally>();
  const byVerb = new Map<string, Tally>();
  const etrePC: Tally = { right: 0, wrong: 0 };
  for (const c of cells) {
    overall.right += c.correct;
    overall.wrong += c.wrong;
    add(byPerson, String(c.person), c);
    add(byTense, c.tense, c);
    add(byVerb, c.verb, c);
    if (c.tense === "passe-compose" && auxiliary(VERB_BY_KEY[c.verb]) === "être") {
      etrePC.right += c.correct;
      etrePC.wrong += c.wrong;
    }
  }
  const baseRate = overall.wrong / Math.max(1, overall.right + overall.wrong);
  // A pattern counts if it's clearly worse than your average, with enough evidence.
  const weak = (t: Tally, minWrong = 3) => {
    const rate = t.wrong / Math.max(1, t.right + t.wrong);
    return t.wrong >= minWrong && rate >= 0.25 && rate >= baseRate * 1.3;
  };

  for (const [p, t] of byPerson)
    if (weak(t))
      spots.push({
        id: `person-${p}`,
        title: PERSON_LABEL[Number(p)],
        detail: `You miss ${pct(t)}% of ${PERSONS[Number(p)]} forms (${t.wrong} of ${t.right + t.wrong}).`,
        source: "verbs",
        score: t.wrong * 1.2,
        action: { type: "verb-person", person: Number(p) },
      });

  for (const [tense, t] of byTense)
    if (weak(t))
      spots.push({
        id: `tense-${tense}`,
        title: TENSE_BY_ID[tense as Tense].name,
        detail: `You miss ${pct(t)}% of ${TENSE_BY_ID[tense as Tense].name} forms (${t.wrong} of ${t.right + t.wrong}).`,
        source: "verbs",
        score: t.wrong,
        action: { type: "verb-tense", tense: tense as Tense },
      });

  // Be specific: if it's only the être verbs that go wrong in the passé
  // composé, say that instead of "passé composé" in general.
  const pc = byTense.get("passe-compose");
  const nonEtre: Tally = pc ? { right: pc.right - etrePC.right, wrong: pc.wrong - etrePC.wrong } : { right: 0, wrong: 0 };
  const etreIsTheProblem = weak(etrePC, 2) && !weak(nonEtre, 1);
  if (etreIsTheProblem) {
    const i = spots.findIndex((s) => s.id === "tense-passe-compose");
    if (i >= 0) spots.splice(i, 1);
  }
  if (weak(etrePC, 2) && (etreIsTheProblem || !spots.some((s) => s.id === "tense-passe-compose")))
    spots.push({
      id: "tense-etre-pc",
      title: "Passé composé with être",
      detail: `Verbs like aller and venir use être in the past (je suis allé). You miss ${pct(etrePC)}% of them.`,
      source: "verbs",
      score: etrePC.wrong * 1.3,
      action: { type: "verb-tense", tense: "passe-compose", etreOnly: true },
    });

  for (const [verb, t] of byVerb)
    if (weak(t) && t.wrong >= 4)
      spots.push({
        id: `verb-${verb}`,
        title: VERB_BY_KEY[verb].inf,
        detail: `${t.wrong} wrong answers so far (${pct(t)}%). ${VERB_BY_KEY[verb].group === "irregular" ? "It's irregular, so it needs extra reps." : ""}`.trim(),
        source: "verbs",
        score: t.wrong,
        action: { type: "verb", verb },
      });

  // ---- Words you keep forgetting ----------------------------------------
  const sticky = input.words.filter((w) => w.lapses >= 2).sort((a, b) => b.lapses - a.lapses);
  if (sticky.length)
    spots.push({
      id: "words-forgotten",
      title: sticky.length === 1 ? `“${sticky[0].french}”` : "Words you keep forgetting",
      detail:
        sticky.length === 1
          ? `Forgotten ${sticky[0].lapses} times. Try writing your own memory tip for it.`
          : `${sticky.slice(0, 3).map((w) => w.french).join(", ")}${sticky.length > 3 ? ` and ${sticky.length - 3} more` : ""}.`,
      source: "words",
      score: sticky.reduce((n, w) => n + w.lapses, 0),
      action: { type: "words", ids: sticky.slice(0, 12).map((w) => w.id) },
    });

  // ---- Duolingo mistakes by type -------------------------------------
  const byKind = new Map<MistakeKind, number>();
  for (const m of input.mistakes)
    if (m.kind !== "acceptable" && m.kind !== "typo" && m.kind !== "other")
      byKind.set(m.kind, (byKind.get(m.kind) ?? 0) + 1);
  for (const [kind, n] of byKind)
    if (n >= 2)
      spots.push({
        id: `mistakes-${kind}`,
        title: MISTAKE_TITLES[kind] ?? MISTAKE_LABELS[kind],
        detail: `${n} of the Duolingo mistakes you pasted were about this.`,
        source: "mistakes",
        score: n * 2,
        action: { type: "mistakes", kind },
        topic: TOPIC_FOR_MISTAKE[kind],
      });

  // ---- Grammar quizzes you haven't passed yet -------------------------
  for (const [id, s] of Object.entries(input.grammar?.scores ?? {}))
    if (GRAMMAR_BY_ID[id] && s.total > 0 && s.best / s.total < 0.6)
      spots.push({
        id: `grammar-${id}`,
        title: GRAMMAR_BY_ID[id].title,
        detail: `Best quiz score ${s.best}/${s.total}. Re-read the cheat sheet and try the quiz again.`,
        source: "grammar",
        score: (s.total - s.best) * 1.5,
        action: { type: "grammar", topic: id },
        topic: id,
      });

  return spots.sort((a, b) => b.score - a.score);
}

/** Verb forms to drill for a weak spot: in your verb list and tenses, worst first, then unseen. */
export function cellsForAction(
  action: Extract<WeakAction, { type: "verb-person" | "verb-tense" | "verb" }>,
  cells: Record<string, VerbCell>,
  prefs: VerbPrefs,
  limit = 8
): CellRef[] {
  const verbs = action.type === "verb" ? [action.verb] : prefs.myVerbs;
  const tenses = action.type === "verb-tense" ? [action.tense] : prefs.tenses;
  const refs: CellRef[] = [];
  for (const verb of verbs) {
    const v = VERB_BY_KEY[verb];
    if (!v) continue;
    if (action.type === "verb-tense" && action.etreOnly && auxiliary(v) !== "être") continue;
    for (const tense of tenses)
      for (let person = 0; person < 6; person++)
        if (action.type !== "verb-person" || person === action.person) refs.push({ verb, tense, person });
  }
  const id = (r: CellRef) => `${r.verb}__${r.tense}__${r.person}`;
  const badness = (r: CellRef) => {
    const c = cells[id(r)];
    if (!c) return 0.5; // unseen: middle priority
    return c.wrong - c.correct * 0.5 + c.lapses + (c.nextReviewAt <= Date.now() ? 1 : 0);
  };
  return refs.sort((a, b) => badness(b) - badness(a)).slice(0, limit);
}

/** For the être-verbs weak spot when the user's list has none: suggest them. */
export const ETRE_VERBS = ALL_VERBS.filter((v) => auxiliary(v) === "être").map((v) => v.key);

export { TENSES };
