import { test } from "node:test";
import assert from "node:assert/strict";
import { GRAMMAR, GRAMMAR_BY_ID, TOPIC_FOR_MISTAKE } from "./grammar";

test("topic ids are unique", () => {
  assert.equal(new Set(GRAMMAR.map((g) => g.id)).size, GRAMMAR.length);
});

test("every quiz question is well formed", () => {
  for (const g of GRAMMAR) {
    assert.ok(g.quiz.length >= 4, `${g.id} has a quiz`);
    for (const q of g.quiz) {
      assert.ok(q.options.includes(q.answer), `${g.id}: "${q.prompt}" answer is an option`);
      assert.equal(new Set(q.options).size, q.options.length, `${g.id}: "${q.prompt}" options unique`);
      assert.ok(q.explain.length > 0);
    }
  }
});

test("tables are rectangular", () => {
  for (const g of GRAMMAR)
    for (const b of g.blocks)
      if (b.type === "table") for (const r of b.rows) assert.equal(r.length, b.head.length, `${g.id} table row ${r[0]}`);
});

test("mistake → topic links point at real topics", () => {
  for (const id of Object.values(TOPIC_FOR_MISTAKE)) assert.ok(GRAMMAR_BY_ID[id!], id);
});
