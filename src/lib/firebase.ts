import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signOut as fbSignOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
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

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export function getFirebaseGeminiModel(modelName = "gemini-3.8-flash") {
  const ai = getAI(app, { backend: new GoogleAIBackend() });
  return getGenerativeModel(ai, {
    model: modelName,
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
    },
  });
}

export function getFirebaseTtsModel(voiceName = "Aoede") {
  const ai = getAI(app, { backend: new GoogleAIBackend() });
  return getGenerativeModel(ai, {
    model: "gemini-3.1-flash-tts-preview",
    generationConfig: {
      responseModalities: [ResponseModality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName,
          },
        },
        languageCode: "fr-CA",
      },
    },
  });
}

export {
  app,
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signInAnonymously,
  fbSignOut,
  onAuthStateChanged,
};
export type { User };
