# Petit à Petit: a French study sidekick for Duolingo

Duolingo teaches you French but rarely explains it. Petit à Petit fills the gaps. The name comes from the saying *petit à petit, l'oiseau fait son nid*: little by little, the bird builds its nest. It's a small Next.js + Firebase app you keep open next to your Duolingo lessons.

Live at **https://petitapetit-fr.vercel.app**.

## What it does

| Tab | What it does |
| --- | --- |
| **Today** | The home screen: one daily session in three steps: **verb practice** (due forms + one new table), **word review** (due words), and a **focus drill** on your top weak spot. Steps tick off as you finish them and reset each day. **Talk about your life**: fill in a short profile (job, city, family, hobbies, food) and the AI writes practice sentences about *you*, using only your verbs and tenses; **Write about you** answers everyday questions in French and gets gentle corrections plus a richer version to try next time. **Your weak spots** finds patterns across everything you do, such as *nous forms*, *passé composé with être*, a specific irregular verb, words you keep forgetting, or the type of Duolingo mistake you keep making (articles, agreement…), each with a one-tap drill. |
| **Verbs** | **Verb Lab.** The 60 most useful verbs in Duolingo order, with conjugation tables for présent, passé composé, futur proche, imparfait and futur simple (built-in rules, no AI). Endings are colour-coded, each row has audio, and each verb has a memory tip. **Practice** introduces one new table at a time, then reviews each *verb + tense + person* on its own spaced-repetition schedule, so it learns that you know *je vais* but not *nous allons*. Answers are typed (with accent keys) or multiple choice, plus listening questions. Wrong answers say *why* ("That's the nous form", "That's the imparfait"). Also: drill any single table, a 60-second speed round, and a "forms you miss most" list. |
| **Grammar** | 11 one-page cheat sheets for Duolingo sections 1–2 (articles, gender clues, du/de la, negation, questions, adjectives, possessives, à/au/en, numbers 0–100, time and dates, tu/vous/on), written by hand with audio examples and a 5-question quiz each. Quizzes under 60% and repeated Duolingo mistake types show up as weak spots linked to the right sheet. |
| **Words** | Three views in one tab: **Review** (spaced repetition), **Look up** and **My words**, described below. |
| **Look up** | Paste French or English words, a list, or a full sentence. Each word comes back with its translation, article and gender (colour-coded: blue = masculine, pink = feminine), a pronunciation guide, a **memory trick**, an example sentence, a grammar note and look-alike warnings. Save words to your deck one at a time or all at once, optionally tagged with the Duolingo unit. |
| **Mistakes** | **Redo my mistakes** turns your saved Duolingo mistakes into exercises (translate the prompt again or fix your wrong sentence, plus practice sentences), with the words you missed highlighted. Paste what Duolingo asked, your answer and the correct answer. You get the type of mistake, a word-by-word diff, the rule in plain English, a trick to remember it and three practice sentences. It also suggests words to save. Explanations are kept in a history. |
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
users/{uid}/verbCells/{id}  Verb Lab: SRS state per verb form (e.g. manger__present__3)
users/{uid}/meta/verbLab    Verb Lab settings (my verbs, tenses, answer mode)
users/{uid}/meta/today      which of today's steps are done
users/{uid}/meta/grammar    grammar quiz scores
users/{uid}/meta/aboutMe    "About you" profile for personal practice
```

## Tests

```bash
npm test   # conjugation tables, answer checking, session building
```

## Code map

- `src/data/verbs.ts`: the verb list (irregular forms and stems, tips, examples)
- `src/lib/conjugate.ts`: conjugation engine for all five tenses
- `src/lib/verbDrill.ts`: answer checking, multiple choice options, practice sessions
- `src/data/grammar.ts`: the grammar cheat sheets and quizzes
- `src/lib/weakSpots.ts`: weak-spot detection across verbs, words and mistakes
- `src/lib/sentenceCheck.ts`: lenient whole-sentence checking for "Redo my mistakes"

- `src/lib/ai.ts`: prompts and response validation for look-ups and mistake explanations
- `src/lib/srs.ts`: spaced-repetition scheduler
- `src/lib/answer.ts`: typed-answer checking (accents, articles, typos)
- `src/lib/useStudyData.ts`: auth, Firestore sync and local-storage fallback
- `src/components/*Tab.tsx`: the four screens
