export type PartOfSpeech =
  | "noun"
  | "verb"
  | "adjective"
  | "adverb"
  | "pronoun"
  | "preposition"
  | "phrase"
  | "other";

export type Gender = "masculine" | "feminine" | "none";

/** What the AI returns for one word or phrase (before it is saved). */
export interface WordInfo {
  french: string; // nouns include their article, e.g. "la pomme"
  english: string;
  partOfSpeech: PartOfSpeech;
  gender: Gender;
  pronunciation: string; // English-friendly respelling
  memoryTip: string;
  exampleFr: string;
  exampleEn: string;
  grammarNote: string;
  lookAlikes: string;
}

export type WordSource = "lookup" | "mistake" | "manual";

/** A saved word in the review deck. */
export interface Word extends WordInfo {
  id: string;
  tag: string; // e.g. "Unit 4 – Food"
  source: WordSource;
  // Spaced-repetition state
  interval: number; // days
  repetition: number; // successful reviews in a row
  easeFactor: number;
  lapses: number;
  nextReviewAt: number; // epoch ms
  createdAt: number;
  updatedAt: number;
}

export interface SentenceTranslation {
  original: string;
  translation: string;
  french: string; // whichever of original/translation is French (for audio)
  notes: string;
}

export interface LookupResult {
  sentence: SentenceTranslation | null;
  items: WordInfo[];
}

export type MistakeKind =
  | "acceptable"
  | "typo"
  | "accent"
  | "agreement"
  | "article"
  | "conjugation"
  | "word-order"
  | "vocabulary"
  | "missing-word"
  | "extra-word"
  | "other";

export interface MistakeDiff {
  yours: string;
  correct: string;
  why: string;
}

export interface PracticeSentence {
  en: string;
  fr: string;
}

export interface MistakeExplanation {
  kind: MistakeKind;
  headline: string;
  explanation: string;
  rule: string;
  memoryTip: string;
  differences: MistakeDiff[];
  practice: PracticeSentence[];
  wordsToSave: WordInfo[];
}

/** A saved mistake explanation (history). */
export interface Mistake extends MistakeExplanation {
  id: string;
  prompt: string;
  myAnswer: string;
  correctAnswer: string;
  createdAt: number;
}

export interface Profile {
  streak: number;
  lastStudyDate: string; // YYYY-MM-DD (local)
  totalReviews: number;
}

export const MISTAKE_LABELS: Record<MistakeKind, string> = {
  acceptable: "Your answer is also fine",
  typo: "Typo",
  accent: "Accent",
  agreement: "Agreement",
  article: "Article",
  conjugation: "Verb form",
  "word-order": "Word order",
  vocabulary: "Wrong word",
  "missing-word": "Missing word",
  "extra-word": "Extra word",
  other: "Other",
};
