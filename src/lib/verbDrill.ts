import { ALL_VERBS, PERSONS, TENSES, TENSE_BY_ID, VERB_BY_KEY, conjugate, table, type Form, type Tense } from "./conjugate";
import { levenshtein, stripAccents } from "./answer";
import type { SrsState } from "./srs";

/** Spaced-repetition state for ONE form, e.g. nous + manger + présent. */
export interface VerbCell extends SrsState {
  id: string;
  verb: string; // verb key
  tense: Tense;
  person: number;
  correct: number;
  wrong: number;
  createdAt: number;
}

export interface CellRef {
  verb: string;
  tense: Tense;
  person: number;
}

export const cellId = (c: CellRef) => `${c.verb}__${c.tense}__${c.person}`;

export type QuestionKind = "type" | "choose" | "listen";

export type SessionItem =
  | { kind: "intro"; verb: string; tense: Tense }
  | { kind: QuestionKind; cell: CellRef; pronoun: string; options?: string[]; isNew?: boolean };

export interface VerbPrefs {
  myVerbs: string[];
  tenses: Tense[];
  answerMode: "type" | "choose";
}

// ---------------------------------------------------------------------------
// Answer checking

export type VerbVerdict = "correct" | "accent" | "typo" | "wrong";

export interface VerbCheck {
  verdict: VerbVerdict;
  message: string;
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/[.!?,;:]/g, " ")
    .replace(/\s*'\s*/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** "allé(e)(s)" → allé, allée, allés, allées */
export function expandAgreement(s: string): string[] {
  const m = s.match(/\(([^)]*)\)/);
  if (!m) return [s];
  const [before, after] = [s.slice(0, m.index), s.slice(m.index! + m[0].length)];
  return [...expandAgreement(before + after), ...expandAgreement(before + m[1] + after)];
}

const SUBJECT = /^(je |j'|tu |il |elle |on |nous |vous |ils |elles )/;

/** Accept the verb on its own ("mangeons") or with its subject ("nous mangeons"). */
function candidates(typed: string): string[] {
  const t = norm(typed);
  const stripped = t.replace(SUBJECT, "");
  return stripped === t ? [t] : [t, stripped];
}

function matches(typed: string, form: Form): boolean {
  const accepted = new Set(expandAgreement(form.verb).map(norm));
  return candidates(typed).some((c) => accepted.has(c));
}

export function checkVerbAnswer(typed: string, cell: CellRef, pronoun?: string): VerbCheck {
  const v = VERB_BY_KEY[cell.verb];
  const form = conjugate(v, cell.tense, cell.person, pronoun);
  if (!norm(typed)) return { verdict: "wrong", message: "No answer typed." };
  if (matches(typed, form)) return { verdict: "correct", message: "Correct!" };

  const accepted = expandAgreement(form.verb).map((x) => stripAccents(norm(x)));
  const cands = candidates(typed).map(stripAccents);
  if (cands.some((c) => accepted.includes(c)))
    return { verdict: "accent", message: "Right form — check the accents." };

  // Typed a real form, just the wrong one? Say which — that's the useful bit.
  for (let p = 0; p < 6; p++) {
    if (p !== cell.person && matches(typed, conjugate(v, cell.tense, p)))
      return { verdict: "wrong", message: `That's the ${PERSONS[p]} form.` };
  }
  for (const t of TENSES) {
    if (t.id !== cell.tense && matches(typed, conjugate(v, t.id, cell.person)))
      return { verdict: "wrong", message: `That's the ${t.name}, not the ${TENSE_BY_ID[cell.tense].name}.` };
  }

  const best = Math.min(...cands.flatMap((c) => accepted.map((a) => levenshtein(c, a))));
  const target = accepted[0];
  if (best <= (target.length > 8 ? 2 : 1)) return { verdict: "typo", message: "Almost — you have a typo." };
  return { verdict: "wrong", message: "Not quite." };
}

// ---------------------------------------------------------------------------
// Building questions

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

/** For il/elle/on and ils/elles, vary the pronoun so it doesn't get stale. */
export function randomPronoun(person: number): string {
  if (person === 2) return ["il", "elle", "on"][Math.floor(Math.random() * 3)];
  if (person === 5) return ["ils", "elles"][Math.floor(Math.random() * 2)];
  return PERSONS[person];
}

/** Four options: the answer plus other persons / tenses of the same verb. */
export function chooseOptions(cell: CellRef, tenses: Tense[]): string[] {
  const v = VERB_BY_KEY[cell.verb];
  const right = conjugate(v, cell.tense, cell.person).verb;
  const pool = new Set<string>();
  for (let p = 0; p < 6; p++) pool.add(conjugate(v, cell.tense, p).verb);
  for (const t of tenses) pool.add(conjugate(v, t, cell.person).verb);
  pool.delete(right);
  return shuffle([right, ...shuffle([...pool]).slice(0, 3)]);
}

/** Listening: hear a full form, pick it from the same person in other tenses (all sound different). */
export function listenOptions(cell: CellRef, tenses: Tense[], pronoun: string): string[] | null {
  const v = VERB_BY_KEY[cell.verb];
  const forms = [...new Set(TENSES.filter((t) => tenses.includes(t.id) || t.id === "imparfait" || t.id === "futur").map((t) => conjugate(v, t.id, cell.person, pronoun).full))];
  const right = conjugate(v, cell.tense, cell.person, pronoun).full;
  const others = forms.filter((f) => f !== right);
  if (others.length < 2) return null;
  return shuffle([right, ...shuffle(others).slice(0, 3)]);
}

function question(cell: CellRef, kind: QuestionKind, tenses: Tense[], isNew = false): SessionItem {
  const pronoun = randomPronoun(cell.person);
  if (kind === "listen") {
    const options = listenOptions(cell, tenses, pronoun);
    if (options) return { kind, cell, pronoun, options };
    kind = "choose";
  }
  return {
    kind,
    cell,
    pronoun,
    options: kind === "choose" ? chooseOptions(cell, tenses) : undefined,
    isNew,
  };
}

const inScope = (c: VerbCell, prefs: VerbPrefs) => prefs.myVerbs.includes(c.verb) && prefs.tenses.includes(c.tense);

export function dueCells(cells: Record<string, VerbCell>, prefs: VerbPrefs, now = Date.now()): VerbCell[] {
  return Object.values(cells)
    .filter((c) => inScope(c, prefs) && c.nextReviewAt <= now)
    .sort((a, b) => a.nextReviewAt - b.nextReviewAt);
}

/** Verb+tense pairs from your set that you haven't started yet, in learning order. */
export function unseenGroups(cells: Record<string, VerbCell>, prefs: VerbPrefs): { verb: string; tense: Tense }[] {
  const out: { verb: string; tense: Tense }[] = [];
  const mine = ALL_VERBS.filter((v) => prefs.myVerbs.includes(v.key));
  for (const t of TENSES.filter((t) => prefs.tenses.includes(t.id))) {
    for (const v of mine) {
      const started = [0, 1, 2, 3, 4, 5].some((p) => cells[cellId({ verb: v.key, tense: t.id, person: p })]);
      if (!started) out.push({ verb: v.key, tense: t.id });
    }
  }
  return out;
}

/**
 * The daily verb session: everything due, then one new table (shown first,
 * then quizzed as multiple choice), capped at `size` questions.
 */
export function buildSmartSession(
  cells: Record<string, VerbCell>,
  prefs: VerbPrefs,
  size = 12
): SessionItem[] {
  const due = dueCells(cells, prefs).slice(0, size);
  const items: SessionItem[] = shuffle(due).map((c, i) => {
    const kind: QuestionKind = prefs.tenses.length > 1 && i % 5 === 4 ? "listen" : prefs.answerMode;
    return question(c, kind, prefs.tenses);
  });

  let room = size - items.length;
  for (const g of unseenGroups(cells, prefs)) {
    if (room < 4) break;
    items.push({ kind: "intro", verb: g.verb, tense: g.tense });
    for (const p of shuffle([0, 1, 2, 3, 4, 5])) {
      items.push(question({ verb: g.verb, tense: g.tense, person: p }, "choose", prefs.tenses, true));
    }
    room -= 6;
    if (items.length >= size) break;
  }
  return items;
}

/** Forms you've got wrong most, worst first. */
export function weakestCells(cells: Record<string, VerbCell>, limit = 8): VerbCell[] {
  return Object.values(cells)
    .filter((c) => c.wrong > 0 && VERB_BY_KEY[c.verb])
    .sort((a, b) => b.wrong - b.correct * 0.5 - (a.wrong - a.correct * 0.5) || b.lapses - a.lapses)
    .slice(0, limit);
}

export function buildWeakSession(cells: Record<string, VerbCell>, prefs: VerbPrefs): SessionItem[] {
  return shuffle(weakestCells(cells, 10)).map((c) => question(c, "type", prefs.tenses));
}

/** Drill one whole table, je → ils, typed. */
export function buildTableSession(verb: string, tense: Tense, prefs: VerbPrefs): SessionItem[] {
  return [0, 1, 2, 3, 4, 5].map((person) => question({ verb, tense, person }, "type", prefs.tenses));
}

export function randomSpeedItem(prefs: VerbPrefs): SessionItem {
  const verbs = prefs.myVerbs.length ? prefs.myVerbs : ALL_VERBS.slice(0, 10).map((v) => v.key);
  const verb = verbs[Math.floor(Math.random() * verbs.length)];
  const tense = prefs.tenses[Math.floor(Math.random() * prefs.tenses.length)] ?? "present";
  return question({ verb, tense, person: Math.floor(Math.random() * 6) }, "choose", prefs.tenses);
}

/** Share of in-scope forms you've reviewed at least once and currently know. */
export function verbMastery(cells: Record<string, VerbCell>, verb: string, tenses: Tense[]): number {
  let known = 0;
  for (const t of tenses)
    for (let p = 0; p < 6; p++) {
      const c = cells[cellId({ verb, tense: t, person: p })];
      if (c && c.repetition > 0) known++;
    }
  return tenses.length ? known / (tenses.length * 6) : 0;
}

export { table };
