import { getFirebaseGeminiModel } from "./firebase";

export interface StandupResult {
  beginnerFr: string;
  franglaisFr: string;
  proFr: string;
  phoneticGuide: string;
  tips: string[];
  keyVocab: { fr: string; en: string; note: string }[];
  source: "firebase-ai" | "custom-api" | "local-fallback";
}

export interface DecodeResult {
  original: string;
  meaningEn: string;
  standardFr: string;
  register: string;
  phonetic: string;
  breakdown: { term: string; meaning: string; note: string }[];
  exampleReplyFr: string;
  exampleReplyEn: string;
  source: "firebase-ai" | "custom-api" | "local-fallback";
}

function cleanJsonText(raw: string): string {
  return raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

export async function generateStandupCoach(params: {
  yesterdayEn: string;
  todayEn: string;
  blockersEn: string;
  customProvider?: "firebase" | "gemini" | "openai";
  customApiKey?: string;
}): Promise<StandupResult> {
  const {
    yesterdayEn,
    todayEn,
    blockersEn,
    customProvider = "firebase",
    customApiKey = "",
  } = params;

  const prompt = `You are a bilingual Montreal Software Engineering coach helping an English-speaking developer give their daily standup in French to a native Québécois tech team in Montreal.

Developer's English update:
- Yesterday: ${yesterdayEn || "Worked on my sprint tasks"}
- Today: ${todayEn || "Continuing on current ticket"}
- Blockers: ${blockersEn || "None"}

Return ONLY valid JSON matching this exact structure:
{
  "beginnerFr": "Short, high-confidence survival French sentences a Day-1 learner can say easily without getting stuck.",
  "franglaisFr": "Authentic casual Montreal software engineer Franglais (using words like 'Faque', 'pis', 'de mon bord', 'PR', 'merger', 'staging', 'ticket', 'chus', '-tu').",
  "proFr": "Clean, natural professional Canadian French suitable for a formal demo or stakeholder meeting.",
  "phoneticGuide": "English-friendly phonetic pronunciation guide for the beginnerFr and franglaisFr versions.",
  "tips": [
    "3 short coaching tips explaining the Québécois/Montreal tech expressions used"
  ],
  "keyVocab": [
    { "fr": "French/Québécois phrase", "en": "English meaning", "note": "Pronunciation or usage tip" }
  ]
}`;

  // 1. Try Firebase AI Logic (Gemini Developer API initialized on the project)
  if (customProvider === "firebase" || !customApiKey) {
    for (const modelName of ["gemini-3.8-flash", "gemini-3.5-flash"]) {
      try {
        const model = getFirebaseGeminiModel(modelName);
        const res = await model.generateContent(prompt);
        const text = res.response.text();
        const parsed = JSON.parse(cleanJsonText(text));
        return {
          beginnerFr: parsed.beginnerFr || "",
          franglaisFr: parsed.franglaisFr || "",
          proFr: parsed.proFr || "",
          phoneticGuide: parsed.phoneticGuide || "",
          tips: Array.isArray(parsed.tips) ? parsed.tips : [],
          keyVocab: Array.isArray(parsed.keyVocab) ? parsed.keyVocab : [],
          source: "firebase-ai",
        };
      } catch (err) {
        console.warn(`Firebase AI Logic (${modelName}) attempt failed:`, err);
      }
    }
  }

  // 2. Try Custom API route if user provided a key
  if (customApiKey) {
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "standup",
          prompt,
          provider: customProvider === "openai" ? "openai" : "gemini",
          apiKey: customApiKey,
        }),
      });
      if (response.ok) {
        const parsed = await response.json();
        return { ...parsed, source: "custom-api" };
      }
    } catch (err) {
      console.warn("Custom API call failed:", err);
    }
  }

  // 3. Smart Offline Fallback
  return {
    beginnerFr: `Hier, j'ai travaillé sur ${yesterdayEn || "mon ticket"}. Aujourd'hui, je continue là-dessus. Pas de bloqueurs de mon bord!`,
    franglaisFr: `Hier, j'ai avancé sur ${yesterdayEn || "le ticket"} pis j'ai ouvert ma PR. Faque aujourd'hui, je regarde ${todayEn || "la suite"}. ${
      blockersEn && blockersEn.toLowerCase() !== "none"
        ? `Chus juste un peu bloqué sur ${blockersEn}.`
        : "Rien à signaler de mon bord!"
    }`,
    proFr: `Hier, j'ai complété mes tâches concernant ${yesterdayEn || "le sprint"}. Aujourd'hui, je me concentre sur ${todayEn || "la prochaine étape"}. Aucun obstacle à signaler de mon côté.`,
    phoneticGuide:
      "ee-air zhay a-van-sé sur luh tee-kè pee zhay oo-vair ma pé-air. fak oh-zhoor-dwee zhuh kon-tee-nü. ryen a see-nya-lé duh mon bor!",
    tips: [
      "Say 'de mon bord' (on my end) — Montreal devs use it in almost every standup.",
      "Use 'Faque' (so) to transition from yesterday's update to today's plan.",
      "Keep English tech nouns like 'PR', 'ticket', 'staging', and 'bug' — Montreal engineers rarely translate them!",
    ],
    keyVocab: [
      {
        fr: "De mon bord",
        en: "On my end / From my side",
        note: "Pronounced: duh mon bor",
      },
      {
        fr: "Faque aujourd'hui",
        en: "So today",
        note: "Pronounced: fak oh-zhoor-dwee",
      },
    ],
    source: "local-fallback",
  };
}

export async function decodeMeetingPhrase(params: {
  phrase: string;
  customProvider?: "firebase" | "gemini" | "openai";
  customApiKey?: string;
}): Promise<DecodeResult> {
  const { phrase, customProvider = "firebase", customApiKey = "" } = params;

  const prompt = `You are a Montreal Québécois & Workplace "Franglais" expert helping an English-speaking software engineer decode something they heard in a meeting or read on Slack in Montreal.

Phrase to decode: "${phrase}"

Return ONLY valid JSON matching this exact structure:
{
  "original": "${phrase.replace(/"/g, '\\"')}",
  "meaningEn": "Natural English translation in a software/workplace context",
  "standardFr": "How standard/European Duolingo French would phrase this",
  "register": "Casual Montreal Tech / Québécois Spoken / Workplace Franglais",
  "phonetic": "Easy English-friendly pronunciation guide in Canadian French",
  "breakdown": [
    {
      "term": "Specific word/contraction from the phrase",
      "meaning": "What it means in English",
      "note": "Why Montrealers say it this way (e.g. contraction, anglicism, Québécois expression)"
    }
  ],
  "exampleReplyFr": "A natural, short Montreal French reply you can say or type back on Slack",
  "exampleReplyEn": "English meaning of that reply"
}`;

  if (customProvider === "firebase" || !customApiKey) {
    for (const modelName of ["gemini-3.8-flash", "gemini-3.5-flash"]) {
      try {
        const model = getFirebaseGeminiModel(modelName);
        const res = await model.generateContent(prompt);
        const text = res.response.text();
        const parsed = JSON.parse(cleanJsonText(text));
        return {
          original: parsed.original || phrase,
          meaningEn: parsed.meaningEn || "",
          standardFr: parsed.standardFr || "",
          register: parsed.register || "Québécois / Montreal Tech",
          phonetic: parsed.phonetic || "",
          breakdown: Array.isArray(parsed.breakdown) ? parsed.breakdown : [],
          exampleReplyFr: parsed.exampleReplyFr || "Parfait, c'est beau!",
          exampleReplyEn: parsed.exampleReplyEn || "Perfect, sounds good!",
          source: "firebase-ai",
        };
      } catch (err) {
        console.warn(`Firebase AI Logic (${modelName}) decode failed:`, err);
      }
    }
  }

  if (customApiKey) {
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "decode",
          prompt,
          provider: customProvider === "openai" ? "openai" : "gemini",
          apiKey: customApiKey,
        }),
      });
      if (response.ok) {
        const parsed = await response.json();
        return { ...parsed, source: "custom-api" };
      }
    } catch (err) {
      console.warn("Custom API decode failed:", err);
    }
  }

  return {
    original: phrase,
    meaningEn:
      "Sounds good / So let's check that later today (Montreal workplace expression)",
    standardFr: "C'est d'accord, nous regarderons cela plus tard aujourd'hui.",
    register: "Casual Montreal Tech / Québécois",
    phonetic: "sè boh, on ruh-gard sa tan-toh",
    breakdown: [
      {
        term: phrase,
        meaning: "Spoken Montreal workplace phrase",
        note: "Contains common Québécois contractions and workplace Franglais.",
      },
    ],
    exampleReplyFr: "Parfait, c'est beau! Fais-moi signe.",
    exampleReplyEn: "Perfect, sounds good! Let me know.",
    source: "local-fallback",
  };
}
