import { FlashcardItem } from "@/data/montrealPhrases";

export type SrsGrade = 0 | 3 | 4 | 5; // 0 = Again, 3 = Hard, 4 = Good, 5 = Easy

export function calculateSm2(
  card: FlashcardItem,
  grade: SrsGrade
): FlashcardItem {
  let { interval, repetition, easeFactor } = card;

  if (grade < 3) {
    repetition = 0;
    interval = 0; // Review again today
  } else {
    if (repetition === 0) {
      interval = 1;
    } else if (repetition === 1) {
      interval = 3;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetition += 1;
  }

  easeFactor =
    easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;
  if (easeFactor > 5.0) easeFactor = 5.0;

  const now = Date.now();
  const nextReviewAt =
    grade < 3
      ? now + 60 * 1000 // 1 min for "Again"
      : now + interval * 24 * 60 * 60 * 1000;

  return {
    ...card,
    interval,
    repetition,
    easeFactor: Number(easeFactor.toFixed(2)),
    nextReviewAt,
    updatedAt: now,
  };
}
