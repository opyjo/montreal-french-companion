# ⚜️ Faque.dev — Montreal SWE French & Franglais Companion

A custom Next.js + Firebase learning companion built for English-speaking software engineers ramping up on a French / Québécois / Franglais tech team in Montreal.

## Features

1. **Standup & Meeting Prep Studio (`Standup Studio`)**
   - Draft your daily update (Yesterday / Today / Blockers) in English.
   - Generates 3 registers powered by **Firebase AI Logic (`gemini-3.8-flash`)**:
     - 🌱 **Day-1 Survival French**
     - ⚜️ **Authentic Montreal Dev Franglais** (*"Faque aujourd'hui..."*, *"de mon bord"*, *"pis"*, *"PR"*)
     - 💼 **Clean Professional French**
   - Includes `fr-CA` speech synthesis (`0.75x`, `1.0x`, `1.2x` speeds) and `fr-CA` speech recognition for pronunciation practice.

2. **Meeting & Slack "Franglais" Decoder + Ear-Training Drill**
   - Decode overheard Québécois expressions vs. standard Duolingo French.
   - Interactive ear-training mini-game for fast Montreal connector words (*Faque*, *Mettons*, *Tantôt*, *Dans le fond*, *C'est beau*, *Pantoute*, *Chus*, *-tu*).

3. **Montreal SWE Phrasebook & SM-2 Spaced Repetition (`Flashcards`)**
   - Pre-seeded with authentic Montreal software engineering expressions across Standup, Code Review, Meetings, Connectors, and Slack.
   - Real-time cross-device sync via **Cloud Firestore** (`northamerica-northeast1` Montréal) + **Firebase Auth** (Anonymous & Google Sign-In).

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
