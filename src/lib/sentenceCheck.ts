import { levenshtein, stripAccents } from "./answer";

export type SentenceVerdict = "correct" | "accent" | "typo" | "wrong";

export interface SentenceCheck {
  verdict: SentenceVerdict;
  message: string;
  /** The expected sentence split into words, flagged where you missed them. */
  words: { text: string; missed: boolean }[];
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/[«»"“”.,!?;:()]/g, " ")
    .replace(/\s*'\s*/g, "'")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

const tokens = (s: string) => norm(s).split(/[\s']+/).filter(Boolean);

/** Lenient whole-sentence check for typed French (redoing Duolingo mistakes). */
export function checkSentence(typed: string, expected: string): SentenceCheck {
  const t = norm(typed);
  const e = norm(expected);
  const typedWords = new Set(tokens(typed));
  const typedPlain = new Set(tokens(typed).map(stripAccents));
  const words = expected
    .trim()
    .split(/\s+/)
    .map((w) => {
      const parts = tokens(w);
      const missed = parts.some((p) => !typedWords.has(p));
      return { text: w, missed };
    });

  if (!t) return { verdict: "wrong", message: "No answer typed.", words };
  if (t === e) return { verdict: "correct", message: "Parfait !", words };
  if (stripAccents(t) === stripAccents(e)) {
    const marked = words.map((w) => ({
      ...w,
      missed: tokens(w.text).some((p) => !typedWords.has(p) && typedPlain.has(stripAccents(p))),
    }));
    return { verdict: "accent", message: "Right words — check the accents.", words: marked };
  }
  const dist = levenshtein(stripAccents(t), stripAccents(e));
  if (dist <= Math.max(1, Math.floor(e.length / 20)))
    return { verdict: "typo", message: "Almost — just a small slip.", words };
  return { verdict: "wrong", message: "Not quite. Compare with the answer below.", words };
}
