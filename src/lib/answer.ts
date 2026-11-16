/**
 * Lenient answer checking for typed review answers, modelled on how
 * Duolingo grades: accents and articles get a warning, not a fail.
 */

export type CheckVerdict = "correct" | "accent" | "article" | "typo" | "wrong";

export interface CheckResult {
  verdict: CheckVerdict;
  message: string;
}

const ARTICLES_FR = /^(le|la|les|l'|un|une|des|du|de la|de l'|de)\s*/;
const ARTICLES_EN = /^(the|a|an|to)\s+/;

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/\(.*?\)/g, " ")
    .replace(/[.,!?;:«»"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function stripAccents(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae");
}

function stripArticle(s: string, lang: "fr" | "en"): string {
  return s.replace(lang === "fr" ? ARTICLES_FR : ARTICLES_EN, "").trim();
}

/** Accepted answers: "to eat / to have a meal, to dine" → three options. */
function alternatives(expected: string): string[] {
  return expected
    .split(/\s*[\/;,]\s*|\s+or\s+|\s+ou\s+/)
    .map(normalize)
    .filter(Boolean);
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(
        prev[j] + 1,
        prev[j - 1] + 1,
        diag + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      diag = tmp;
    }
  }
  return prev[b.length];
}

export function checkAnswer(
  typed: string,
  expected: string,
  lang: "fr" | "en"
): CheckResult {
  const t = normalize(typed);
  if (!t) return { verdict: "wrong", message: "No answer typed." };

  const options = lang === "fr" ? [normalize(expected)] : alternatives(expected);

  for (const opt of options) {
    if (t === opt) return { verdict: "correct", message: "Correct!" };
  }
  for (const opt of options) {
    if (stripAccents(t) === stripAccents(opt))
      return {
        verdict: "accent",
        message: "Right word — check the accents.",
      };
  }
  for (const opt of options) {
    const a = stripArticle(t, lang);
    const b = stripArticle(opt, lang);
    if (a && a === b)
      return lang === "fr"
        ? {
            verdict: "article",
            message:
              "Right word, but learn it with its article — that's how you remember the gender.",
          }
        : { verdict: "correct", message: "Correct!" };
    if (a && stripAccents(a) === stripAccents(b))
      return {
        verdict: "accent",
        message: "Close — check the article and accents.",
      };
  }
  const typed2 = stripAccents(stripArticle(t, lang));
  for (const opt of options) {
    const target = stripAccents(stripArticle(opt, lang));
    const limit = target.length > 6 ? 2 : 1;
    if (typed2 && levenshtein(typed2, target) <= limit)
      return { verdict: "typo", message: "Almost — you have a typo." };
  }
  return { verdict: "wrong", message: "Not quite." };
}
