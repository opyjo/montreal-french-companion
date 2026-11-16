# Carnet: a French study sidekick for Duolingo

Duolingo teaches you French but rarely explains it. Carnet fills the gaps. It's a small Next.js + Firebase app you keep open next to your Duolingo lessons.

## What it does

| Tab | What it does |
| --- | --- |
| **Look up** | Paste French or English words, a list, or a full sentence. Each word comes back with its translation, article and gender (colour-coded: blue = masculine, pink = feminine), a pronunciation guide, a **memory trick**, an example sentence, a grammar note and look-alike warnings. Save words to your deck one at a time or all at once, optionally tagged with the Duolingo unit. |
| **Mistakes** | Paste what Duolingo asked, your answer and the correct answer. You get the type of mistake, a word-by-word diff, the rule in plain English, a trick to remember it and three practice sentences. It also suggests words to save. Explanations are kept in a history. |
| **Review** | Spaced-repetition flashcards (SM-2 style: 1 day → 3 days → ~8 → ~20…). New words start French→English, then mostly English→French. Optional *type your answer* mode with an accent keyboard and Duolingo-style lenient grading (accents, missing articles and typos are flagged rather than failed). You can filter by unit. Forgotten words come back at the end of the session. |
| **Words** | Searchable library of everything you've saved, with strength levels (new / learning / known / strong). You can edit your own memory tips, add words manually or delete them. |

Standard (France) French only. Audio uses Gemini HD voices through Firebase AI Logic and falls back to the device's French voice.

## Setup

```bash
cp .env.example .env.local   # fill in your Firebase web config
npm install
npm run dev
```

- **Firebase**: Anonymous + Google sign-in, Cloud Firestore, and Firebase AI Logic (Gemini Developer API) must be enabled on the project. Guests are upgraded to Google accounts in place, so words saved before signing in are kept.
- **Security rules**: deploy with `firebase deploy --only firestore:rules`.
- **Without Firebase env vars**: the app still runs, saving to browser storage only. Add a Gemini or OpenAI key under Settings to use the AI features.

## Data model

```
users/{uid}                 streak, lastStudyDate, totalReviews
users/{uid}/words/{id}      word info + SRS state (interval, repetition, easeFactor, lapses, nextReviewAt)
users/{uid}/mistakes/{id}   explained Duolingo mistakes
```

## Code map

- `src/lib/ai.ts`: prompts and response validation for look-ups and mistake explanations
- `src/lib/srs.ts`: spaced-repetition scheduler
- `src/lib/answer.ts`: typed-answer checking (accents, articles, typos)
- `src/lib/useStudyData.ts`: auth, Firestore sync and local-storage fallback
- `src/components/*Tab.tsx`: the four screens
