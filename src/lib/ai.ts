import { firebaseConfigured, GEMINI_TEXT_MODELS, getGeminiModel } from "./firebase";
import type {
  Gender,
  LookupResult,
  MistakeExplanation,
  MistakeKind,
  PartOfSpeech,
  PracticeSentence,
  WordInfo,
} from "./types";

export type AiProvider = "firebase" | "gemini" | "openai";

export interface AiSettings {
  provider: AiProvider;
  apiKey: string;
}

const LEARNER_CONTEXT = `You are a patient French tutor helping an English speaker who is working through Duolingo's French course (currently around sections 1–2, beginner level). Teach standard international French (France) only — no Québécois or regional slang. Keep every explanation short, concrete and beginner-friendly; avoid jargon, or explain it in a few words when you must use it.`;

const WORD_SHAPE = `{
  "french": "the French word or phrase; ALWAYS include the definite article for nouns (le/la/l'/les), e.g. \\"la pomme\\", \\"l'eau (f)\\"; give verbs in the infinitive",
  "english": "English meaning(s), separated by \\" / \\" if several, e.g. \\"to eat / to have a meal\\"",
  "partOfSpeech": "noun | verb | adjective | adverb | pronoun | preposition | phrase | other",
  "gender": "masculine | feminine | none",
  "pronunciation": "simple English-friendly respelling with the stressed syllable in CAPS, e.g. \\"lah POHM\\"",
  "memoryTip": "ONE vivid, specific memory hook linking the sound or spelling to the meaning (a mnemonic, an English cognate, or a mini-story). For nouns, also give a hook for the gender. Max 2 sentences.",
  "exampleFr": "a short, simple example sentence a Duolingo beginner could understand",
  "exampleEn": "its English translation",
  "grammarNote": "one beginner-relevant note (e.g. present tense je/tu/il/nous forms for verbs, feminine/plural forms for adjectives, irregular plural) or \\"\\"",
  "lookAlikes": "false friends or easily confused words (e.g. \\"poisson (fish) vs poison (poison)\\") or \\"\\""
}`;

export function lookupPrompt(text: string): string {
  return `${LEARNER_CONTEXT}

The learner pasted the following (it may be French or English, one word, a list of words, or a whole sentence):
"""
${text}
"""

Instructions:
- Detect the language of each item. Whatever the input language, the "french" field is French and "english" is English.
- If the input is a list of words/phrases, return one item per word/phrase, in the same order.
- If the input is a full sentence (or several), set "sentence" with a natural translation, and ALSO return the 2–8 most useful vocabulary items from it (skip trivial words like "et", "the", "a").
- Correct obvious misspellings silently.

Return ONLY valid JSON with this exact structure:
{
  "sentence": null or { "original": "...", "translation": "...", "french": "whichever of original/translation is the French version", "notes": "one short note on anything a beginner would find surprising in this sentence, or \\"\\"" },
  "items": [ ${WORD_SHAPE} ]
}`;
}

export function mistakePrompt(p: {
  prompt: string;
  myAnswer: string;
  correctAnswer: string;
}): string {
  return `${LEARNER_CONTEXT}

The learner got this exercise wrong in Duolingo and wants to understand why.
- Exercise prompt (what Duolingo showed them): ${p.prompt ? `"${p.prompt}"` : "(not provided)"}
- The learner's answer: "${p.myAnswer}"
- Duolingo's correct answer: "${p.correctAnswer}"

Compare the two answers carefully, word by word. If the learner's answer is actually also correct French with the same meaning, say so (kind "acceptable") and explain why Duolingo might not accept it.

Return ONLY valid JSON with this exact structure:
{
  "kind": "acceptable | typo | accent | agreement | article | conjugation | word-order | vocabulary | missing-word | extra-word | other — the MAIN problem",
  "headline": "one plain sentence saying exactly what went wrong",
  "explanation": "2–4 short sentences explaining why, at beginner level",
  "rule": "the general rule to remember, in one line",
  "memoryTip": "a short trick to never make this mistake again",
  "differences": [ { "yours": "the learner's word/fragment (\\"\\" if missing)", "correct": "the correct word/fragment", "why": "very short reason" } ],
  "practice": [ { "en": "a new English sentence that uses the same rule, beginner level", "fr": "its French translation" } ],
  "wordsToSave": [ ${WORD_SHAPE} ]
}
Give exactly 3 practice sentences. In "wordsToSave", include 0–3 words from the correct answer that the learner seems not to know yet (empty array if the mistake was only a typo or accent).`;
}

// ---------------------------------------------------------------------------

function stripFences(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

async function generateJson(prompt: string, settings: AiSettings): Promise<unknown> {
  const errors: string[] = [];

  if (settings.provider === "firebase" || !settings.apiKey) {
    if (!firebaseConfigured) {
      errors.push("Firebase is not configured");
    } else {
      // Free-tier Gemini often answers 429 (rate limit) or 500 ("high
      // demand") for a moment. Those are temporary, so rotate models and back
      // off; errors like 400/403/404 mean that model will never work here.
      const delays = [0, 1000, 2000, 3000, 5000, 6000];
      const dead = new Set<string>();
      for (let i = 0; i < delays.length; i++) {
        const live = GEMINI_TEXT_MODELS.filter((m) => !dead.has(m));
        if (live.length === 0) break;
        const name = live[i % live.length];
        if (delays[i]) await new Promise((r) => setTimeout(r, delays[i]));
        try {
          const res = await getGeminiModel(name).generateContent(prompt);
          return JSON.parse(stripFences(res.response.text()));
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`Firebase AI (${name}) failed`, err);
          if (/\[(400|401|403|404)\b/.test(msg)) dead.add(name);
          errors.push(`${name}: ${friendlyAiError(msg)}`);
        }
      }
    }
  }

  if (settings.apiKey) {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        provider: settings.provider === "openai" ? "openai" : "gemini",
        apiKey: settings.apiKey,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) return body;
    errors.push(
      `API key (${settings.provider}): ${
        (body as { error?: string }).error || res.statusText
      }`
    );
  }

  throw new Error(
    `Couldn't reach the AI. ${[...new Set(errors.map((e) => e.replace(/^[^:]+: /, "")))].join(" · ")}${
      settings.apiKey ? "" : " — you can add your own Gemini or OpenAI key in Settings."
    }`
  );
}

function friendlyAiError(msg: string): string {
  if (/\[429\b/.test(msg)) return "Gemini's free usage limit was hit — wait a minute and try again";
  if (/high demand|\[50[03]\b/.test(msg)) return "Gemini is overloaded right now — try again in a moment";
  if (/timeout|aborted/i.test(msg)) return "Gemini took too long to answer";
  return msg.replace(/^AI: Error fetching from \S+ /, "").slice(0, 200);
}

// ---------------------------------------------------------------------------
// Normalisers: never trust the model's JSON blindly.

const POS: PartOfSpeech[] = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "pronoun",
  "preposition",
  "phrase",
  "other",
];
const KINDS: MistakeKind[] = [
  "acceptable",
  "typo",
  "accent",
  "agreement",
  "article",
  "conjugation",
  "word-order",
  "vocabulary",
  "missing-word",
  "extra-word",
  "other",
];

function str(v: unknown, max = 2000): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function arr(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v)
    ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    : [];
}

export function toWordInfo(raw: Record<string, unknown>): WordInfo | null {
  const french = str(raw.french, 300);
  const english = str(raw.english, 300);
  if (!french || !english) return null;
  const pos = str(raw.partOfSpeech).toLowerCase() as PartOfSpeech;
  const gender = str(raw.gender).toLowerCase() as Gender;
  return {
    french,
    english,
    partOfSpeech: POS.includes(pos) ? pos : "other",
    gender: gender === "masculine" || gender === "feminine" ? gender : "none",
    pronunciation: str(raw.pronunciation, 300),
    memoryTip: str(raw.memoryTip, 800),
    exampleFr: str(raw.exampleFr, 500),
    exampleEn: str(raw.exampleEn, 500),
    grammarNote: str(raw.grammarNote, 800),
    lookAlikes: str(raw.lookAlikes, 500),
  };
}

export async function lookupWords(
  text: string,
  settings: AiSettings
): Promise<LookupResult> {
  const raw = (await generateJson(lookupPrompt(text), settings)) as Record<
    string,
    unknown
  >;
  const s = raw?.sentence as Record<string, unknown> | null | undefined;
  const sentence =
    s && str(s.translation)
      ? {
          original: str(s.original) || text.trim(),
          translation: str(s.translation),
          french: str(s.french),
          notes: str(s.notes),
        }
      : null;
  const items = arr(raw?.items)
    .map(toWordInfo)
    .filter((x): x is WordInfo => x !== null)
    .slice(0, 30);
  if (!sentence && items.length === 0) {
    throw new Error("The AI returned nothing usable — try rephrasing.");
  }
  return { sentence, items };
}

export async function explainMistake(
  input: { prompt: string; myAnswer: string; correctAnswer: string },
  settings: AiSettings
): Promise<MistakeExplanation> {
  const raw = (await generateJson(mistakePrompt(input), settings)) as Record<
    string,
    unknown
  >;
  const kind = str(raw?.kind).toLowerCase() as MistakeKind;
  const headline = str(raw?.headline, 500);
  if (!headline) throw new Error("The AI returned nothing usable — try again.");
  return {
    kind: KINDS.includes(kind) ? kind : "other",
    headline,
    explanation: str(raw.explanation, 2000),
    rule: str(raw.rule, 500),
    memoryTip: str(raw.memoryTip, 800),
    differences: arr(raw.differences)
      .map((d) => ({
        yours: str(d.yours, 200),
        correct: str(d.correct, 200),
        why: str(d.why, 300),
      }))
      .filter((d) => d.yours || d.correct)
      .slice(0, 8),
    practice: arr(raw.practice)
      .map((p) => ({ en: str(p.en, 300), fr: str(p.fr, 300) }))
      .filter((p): p is PracticeSentence => !!(p.en && p.fr))
      .slice(0, 5),
    wordsToSave: arr(raw.wordsToSave)
      .map(toWordInfo)
      .filter((x): x is WordInfo => x !== null)
      .slice(0, 5),
  };
}

// ---------------------------------------------------------------------------
// "About you": personalised practice

export interface Profile {
  name: string;
  work: string;
  city: string;
  family: string;
  hobbies: string;
  food: string;
  routine: string;
}

export interface PersonalSentence {
  en: string;
  fr: string;
  verb: string;
}

function profileText(p: Profile): string {
  const lines = [
    p.name && `Name: ${p.name}`,
    p.work && `Work: ${p.work}`,
    p.city && `Lives in: ${p.city}`,
    p.family && `Family / pets: ${p.family}`,
    p.hobbies && `Hobbies: ${p.hobbies}`,
    p.food && `Food and drink they like: ${p.food}`,
    p.routine && `A typical day: ${p.routine}`,
  ].filter(Boolean);
  return lines.length ? lines.join("\n") : "(no details given — keep it about everyday life)";
}

export async function generatePersonalSentences(
  input: { profile: Profile; verbs: string[]; tenses: string[]; count?: number },
  settings: AiSettings
): Promise<PersonalSentence[]> {
  const count = input.count ?? 8;
  const prompt = `${LEARNER_CONTEXT}

Write ${count} short practice sentences (5–10 words) about THIS learner's real life, as things they would actually say about themselves ("I…", "my wife…", "on Saturdays I…"). Make them specific to the details below, not generic.

About the learner:
${profileText(input.profile)}

Constraints:
- Each sentence uses one of these verbs (the ones they have studied): ${input.verbs.join(", ")}
- Spread the sentences across these tenses: ${input.tenses.join(", ")}
- Beginner vocabulary only (Duolingo sections 1–2). Natural, correct standard French, the way a native speaker would say it. Watch the classic traps: no article for a job after être (Je suis développeur, not "un développeur"); use the right partitive (du café, de l'eau); être verbs in the passé composé (je suis allé).
- Spell the English correctly too.

Return ONLY valid JSON:
{ "sentences": [ { "en": "English sentence", "fr": "French translation", "verb": "infinitive used" } ] }`;
  const raw = (await generateJson(prompt, settings)) as { sentences?: unknown };
  const list = arr(raw?.sentences)
    .map((s) => ({ en: str(s.en, 300), fr: str(s.fr, 300), verb: str(s.verb, 40) }))
    .filter((s) => s.en && s.fr)
    .slice(0, count);
  if (!list.length) throw new Error("The AI returned no sentences — try again.");
  return list;
}

export interface WritingFeedback {
  isCorrect: boolean;
  corrected: string;
  fixes: { wrong: string; right: string; why: string }[];
  encouragement: string;
  richer: string;
  richerEn: string;
}

export async function correctWriting(
  input: { question: string; answer: string; profile: Profile },
  settings: AiSettings
): Promise<WritingFeedback> {
  const prompt = `${LEARNER_CONTEXT}

The learner answered a question in French about their own life.
Question: "${input.question}"
Their answer: "${input.answer}"

Some context about them (only use it to understand what they meant):
${profileText(input.profile)}

Correct their French. Keep their meaning and their words where possible; only fix real mistakes (spelling, accents, gender, agreement, verb forms, word order, missing words). Don't rewrite correct French into something fancier.

Return ONLY valid JSON:
{
  "isCorrect": true or false,
  "corrected": "their answer with mistakes fixed (identical to theirs if it was already correct)",
  "fixes": [ { "wrong": "what they wrote", "right": "the fix", "why": "very short beginner-level reason" } ],
  "encouragement": "one short, warm sentence in English",
  "richer": "a slightly longer, natural version they could say next time, still beginner level, in French",
  "richerEn": "English translation of richer"
}`;
  const raw = (await generateJson(prompt, settings)) as Record<string, unknown>;
  const corrected = str(raw?.corrected, 1000);
  if (!corrected) throw new Error("The AI returned nothing usable — try again.");
  return {
    isCorrect: raw.isCorrect === true,
    corrected,
    fixes: arr(raw.fixes)
      .map((f) => ({ wrong: str(f.wrong, 200), right: str(f.right, 200), why: str(f.why, 300) }))
      .filter((f) => f.wrong || f.right)
      .slice(0, 10),
    encouragement: str(raw.encouragement, 300),
    richer: str(raw.richer, 600),
    richerEn: str(raw.richerEn, 600),
  };
}
