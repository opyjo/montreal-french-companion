import { test } from "node:test";
import assert from "node:assert/strict";
import { cellsForAction, findWeakSpots } from "./weakSpots";
import { checkSentence } from "./sentenceCheck";
import type { VerbCell } from "./verbDrill";
import type { Mistake, Word } from "./types";

const now = Date.now();
function cell(verb: string, tense: VerbCell["tense"], person: number, correct: number, wrong: number): VerbCell {
  return { id: `${verb}__${tense}__${person}`, verb, tense, person, correct, wrong, lapses: wrong, interval: 1,
    repetition: 1, easeFactor: 2.5, nextReviewAt: now + 1e7, updatedAt: now, createdAt: now };
}
const asMap = (cs: VerbCell[]) => Object.fromEntries(cs.map((c) => [c.id, c]));

test("no data → no weak spots", () => {
  assert.deepEqual(findWeakSpots({ cells: {}, words: [], mistakes: [] }), []);
});

test("spots a person pattern (nous) that is worse than average", () => {
  const cs = [];
  for (const v of ["parler", "manger", "aimer", "aller"]) {
    for (const p of [0, 1, 2, 4, 5]) cs.push(cell(v, "present", p, 4, 0));
    cs.push(cell(v, "present", 3, 1, 2));
  }
  const spots = findWeakSpots({ cells: asMap(cs), words: [], mistakes: [] });
  assert.equal(spots[0].id, "person-3");
  assert.match(spots[0].detail, /nous/);
});

test("spots être-verbs in passé composé", () => {
  const cs = [
    cell("aller", "passe-compose", 0, 0, 2), cell("venir", "passe-compose", 1, 0, 2),
    cell("parler", "passe-compose", 0, 6, 0), cell("manger", "passe-compose", 1, 6, 0),
    cell("parler", "present", 0, 8, 0),
  ];
  const ids = findWeakSpots({ cells: asMap(cs), words: [], mistakes: [] }).map((s) => s.id);
  assert.ok(ids.includes("tense-etre-pc"), ids.join(","));
});

test("words forgotten twice or more, and repeated Duolingo mistake types", () => {
  const w = { id: "w1", french: "la pomme", lapses: 3 } as Word;
  const m = (kind: Mistake["kind"]) => ({ kind } as Mistake);
  const spots = findWeakSpots({ cells: {}, words: [w, { ...w, id: "w2", lapses: 1 }], mistakes: [m("article"), m("article"), m("typo"), m("typo")] });
  const ids = spots.map((s) => s.id);
  assert.deepEqual(ids.sort(), ["mistakes-article", "words-forgotten"]);
  const words = spots.find((s) => s.id === "words-forgotten")!;
  assert.deepEqual(words.action, { type: "words", ids: ["w1"] });
});

test("cellsForAction respects person, tense and être filter", () => {
  const prefs = { myVerbs: ["parler", "aller", "venir"], tenses: ["present", "passe-compose"] as VerbCell["tense"][], answerMode: "type" as const };
  const nous = cellsForAction({ type: "verb-person", person: 3 }, {}, prefs);
  assert.ok(nous.length > 0 && nous.every((r) => r.person === 3));
  const etre = cellsForAction({ type: "verb-tense", tense: "passe-compose", etreOnly: true }, {}, prefs, 20);
  assert.ok(etre.every((r) => r.tense === "passe-compose" && r.verb !== "parler"));
  assert.equal(etre.length, 12);
});

test("sentence checking", () => {
  assert.equal(checkSentence("La fille mange une pomme", "La fille mange une pomme.").verdict, "correct");
  assert.equal(checkSentence("la fille mange une pomme !", "La fille mange une pomme.").verdict, "correct");
  assert.equal(checkSentence("Je suis alle au cafe", "Je suis allé au café.").verdict, "accent");
  assert.equal(checkSentence("La fille mange une pome", "La fille mange une pomme.").verdict, "typo");
  const r = checkSentence("Le fille mange un pomme", "La fille mange une pomme.");
  assert.equal(r.verdict, "wrong");
  assert.deepEqual(r.words.filter((w) => w.missed).map((w) => w.text), ["La", "une"]);
  assert.equal(checkSentence("j’aime l’eau", "J'aime l'eau.").verdict, "correct");
});

test("failed grammar quizzes become weak spots; mistakes link to cheat sheets", () => {
  const m = (kind: Mistake["kind"]) => ({ kind } as Mistake);
  const spots = findWeakSpots({
    cells: {}, words: [], mistakes: [m("article"), m("article")],
    grammar: { scores: { negation: { best: 2, last: 2, total: 5 }, numbers: { best: 5, last: 5, total: 5 } } },
  });
  const g = spots.find((s) => s.id === "grammar-negation");
  assert.ok(g && g.action.type === "grammar");
  assert.ok(!spots.some((s) => s.id === "grammar-numbers"));
  assert.equal(spots.find((s) => s.id === "mistakes-article")?.topic, "articles");
});
