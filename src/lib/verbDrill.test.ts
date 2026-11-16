import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildSmartSession,
  checkVerbAnswer,
  chooseOptions,
  expandAgreement,
  unseenGroups,
  type VerbCell,
  type VerbPrefs,
} from "./verbDrill";

const prefs: VerbPrefs = { myVerbs: ["être", "parler", "aller"], tenses: ["present", "passe-compose"], answerMode: "type" };

test("agreement expansion", () => {
  assert.deepEqual(expandAgreement("allé(e)(s)").sort(), ["allé", "allée", "allées", "allés"]);
  assert.deepEqual(expandAgreement("mange"), ["mange"]);
});

test("accepts the verb alone or with its subject", () => {
  const c = { verb: "parler", tense: "present" as const, person: 3 };
  assert.equal(checkVerbAnswer("parlons", c).verdict, "correct");
  assert.equal(checkVerbAnswer("Nous parlons.", c).verdict, "correct");
  assert.equal(checkVerbAnswer("  nous   PARLONS ", c).verdict, "correct");
});

test("reflexive nous: 'nous appelons' and 'nous nous appelons' both count", () => {
  const c = { verb: "sappeler", tense: "present" as const, person: 3 };
  assert.equal(checkVerbAnswer("nous appelons", c).verdict, "correct");
  assert.equal(checkVerbAnswer("nous nous appelons", c).verdict, "correct");
  assert.equal(checkVerbAnswer("m’appelle", { ...c, person: 0 }).verdict, "correct");
});

test("être-verbs accept any agreement", () => {
  const c = { verb: "aller", tense: "passe-compose" as const, person: 2 };
  for (const a of ["est allé", "est allée", "elle est allée"]) assert.equal(checkVerbAnswer(a, c).verdict, "correct", a);
});

test("names the person or tense you typed by mistake", () => {
  const c = { verb: "être", tense: "present" as const, person: 5 };
  const r = checkVerbAnswer("ont", { ...c, verb: "avoir", person: 3 });
  assert.equal(r.verdict, "wrong");
  assert.match(r.message, /ils\/elles form/);
  const r2 = checkVerbAnswer("parlais", { verb: "parler", tense: "present", person: 0 });
  assert.match(r2.message, /Imparfait/);
});

test("accent and typo leniency", () => {
  assert.equal(checkVerbAnswer("etes", { verb: "être", tense: "present", person: 4 }).verdict, "accent");
  assert.equal(checkVerbAnswer("mangons", { verb: "manger", tense: "present", person: 3 }).verdict, "typo");
  assert.equal(checkVerbAnswer("xyz", { verb: "manger", tense: "present", person: 3 }).verdict, "wrong");
});

test("multiple-choice options are 4 distinct and include the answer", () => {
  for (let i = 0; i < 50; i++) {
    const opts = chooseOptions({ verb: "parler", tense: "present", person: 0 }, ["present", "passe-compose"]);
    assert.equal(new Set(opts).size, opts.length);
    assert.ok(opts.includes("parle"));
    assert.ok(opts.length >= 3);
  }
});

test("smart session: new learner gets a table intro then quizzes", () => {
  const s = buildSmartSession({}, prefs, 12);
  assert.equal(s[0].kind, "intro");
  assert.ok(s.length >= 7 && s.length <= 14);
  assert.deepEqual(unseenGroups({}, prefs)[0], { verb: "être", tense: "present" });
});

test("smart session: due forms come first and nothing out of scope", () => {
  const now = Date.now();
  const cell = (verb: string, tense: "present" | "imparfait", person: number): VerbCell => ({
    id: `${verb}__${tense}__${person}`, verb, tense, person, interval: 1, repetition: 1, easeFactor: 2.5, lapses: 0,
    nextReviewAt: now - 1000, updatedAt: now, createdAt: now, correct: 1, wrong: 0,
  });
  const cells = Object.fromEntries(
    [cell("parler", "present", 0), cell("parler", "present", 3), cell("parler", "imparfait", 1)].map((c) => [c.id, c])
  );
  const s = buildSmartSession(cells, prefs, 12);
  const quizzed = s.filter((i) => i.kind !== "intro") as Extract<(typeof s)[number], { cell: unknown }>[];
  assert.ok(quizzed.every((q) => q.cell.tense !== "imparfait"), "imparfait isn't enabled");
  assert.ok(quizzed.slice(0, 2).every((q) => q.cell.verb === "parler"));
});
