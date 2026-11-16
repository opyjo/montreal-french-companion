import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  ResponseModality,
} from "firebase/ai";

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

/** False when env vars are missing — the app then runs in local-only mode. */
export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (firebaseConfigured) {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

export const googleProvider = new GoogleAuthProvider();

/**
 * Text models tried in order through Firebase AI Logic.
 * Checked Nov 2026 on this project: the "lite" models answer in ~2–5s;
 * gemini-3.8-flash / gemini-flash-latest hang without responding and
 * gemini-2.5-flash is retired, so they are deliberately not listed.
 */
export const GEMINI_TEXT_MODELS = ["gemini-3.5-flash-lite", "gemini-flash-lite-latest"];

/** Give up on a single AI request after this long instead of spinning forever. */
export const AI_TIMEOUT_MS = 30000;

export function getGeminiModel(modelName: string) {
  if (!app) throw new Error("Firebase is not configured");
  const ai = getAI(app, { backend: new GoogleAIBackend() });
  return getGenerativeModel(
    ai,
    {
      model: modelName,
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
      },
    },
    { timeout: AI_TIMEOUT_MS }
  );
}

export function getTtsModel(voiceName: string) {
  if (!app) throw new Error("Firebase is not configured");
  const ai = getAI(app, { backend: new GoogleAIBackend() });
  return getGenerativeModel(ai, {
    model: "gemini-3.1-flash-tts-preview", // needs Firebase App Check enforced
    generationConfig: {
      responseModalities: [ResponseModality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName } },
        languageCode: "fr-FR",
      },
    },
  }, { timeout: 20000 });
}

export { app, auth, db };
