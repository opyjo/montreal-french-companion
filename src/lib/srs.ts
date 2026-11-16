import type { Word } from "./types";

/** Again = forgot, Hard = got it with effort, Good = recalled, Easy = instant. */
export type Grade = "again" | "hard" | "good" | "easy";

const DAY = 24 * 60 * 60 * 1000;
const MINUTE = 60 * 1000;

export const NEW_WORD_SRS = {
  interval: 0,
  repetition: 0,
  easeFactor: 2.5,
  lapses: 0,
} as const;

/**
 * SM-2 style scheduler. A forgotten card comes back in 10 minutes (and is
 * re-queued in the current session); remembered cards are spaced out
 * 1 day → 3 days → interval × ease, which is what makes words stick.
 */
export function schedule(word: Word, grade: Grade, now = Date.now()): Word {
  let { interval, repetition, easeFactor, lapses } = word;

  if (grade === "again") {
    return {
      ...word,
      interval: 0,
      repetition: 0,
      easeFactor: Math.max(1.3, round(easeFactor - 0.2)),
      lapses: lapses + 1,
      nextReviewAt: now + 10 * MINUTE,
      updatedAt: now,
    };
  }

  if (repetition === 0) {
    interval = grade === "easy" ? 4 : 1;
  } else if (repetition === 1) {
    interval = grade === "hard" ? 2 : grade === "good" ? 3 : 6;
  } else {
    const factor =
      grade === "hard" ? 1.2 : grade === "good" ? easeFactor : easeFactor * 1.3;
    interval = Math.max(interval + 1, Math.round(interval * factor));
  }

  const easeDelta = grade === "hard" ? -0.15 : grade === "easy" ? 0.15 : 0;
  easeFactor = Math.min(3.0, Math.max(1.3, round(easeFactor + easeDelta)));

  return {
    ...word,
    interval,
    repetition: repetition + 1,
    easeFactor,
    lapses,
    nextReviewAt: now + interval * DAY,
    updatedAt: now,
  };
}

/** Human-readable "next review" hint shown on the grade buttons. */
export function previewInterval(word: Word, grade: Grade): string {
  const next = schedule(word, grade, 0);
  if (grade === "again") return "10 min";
  return next.interval === 1 ? "1 day" : `${next.interval} days`;
}

export function isDue(word: Word, now = Date.now()): boolean {
  return word.nextReviewAt <= now;
}

/** Strength bucket for the word list. */
export function strength(word: Word): "new" | "learning" | "known" | "strong" {
  if (word.repetition === 0 && word.lapses === 0 && word.interval === 0)
    return "new";
  if (word.interval < 3) return "learning";
  if (word.interval < 21) return "known";
  return "strong";
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
