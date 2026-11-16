"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GoogleAuthProvider,
  linkWithPopup,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCredential,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { auth, db, googleProvider } from "./firebase";
import { normalize } from "./answer";
import { NEW_WORD_SRS, schedule, type Grade } from "./srs";
import type { Mistake, Profile, Word, WordInfo, WordSource } from "./types";

export type SyncMode = "loading" | "cloud" | "local";

const LS = { words: "dl_words", mistakes: "dl_mistakes", profile: "dl_profile" };
const EMPTY_PROFILE: Profile = { streak: 0, lastStudyDate: "", totalReviews: 0 };

function localDate(d = new Date()): string {
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
}

function nextStreak(p: Profile): Profile {
  const today = localDate();
  if (p.lastStudyDate === today) return p;
  const yesterday = localDate(new Date(Date.now() - 86400000));
  return {
    ...p,
    streak: p.lastStudyDate === yesterday ? p.streak + 1 : 1,
    lastStudyDate: today,
  };
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or blocked — data stays in memory for this session
  }
}

/** Firestore rejects `undefined`; strip it (and the id, which is the doc key). */
function toDoc<T extends { id: string }>(item: T): Omit<T, "id"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, ...rest } = item;
  return JSON.parse(JSON.stringify(rest));
}

export function useStudyData() {
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<SyncMode>("loading");
  const [words, setWords] = useState<Word[]>([]);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [, bumpAuth] = useState(0);
  const profileRef = useRef(profile);
  profileRef.current = profile;

  // ---- Auth -------------------------------------------------------------
  useEffect(() => {
    const goLocal = () => {
      setWords(readLocal<Word[]>(LS.words, []));
      setMistakes(readLocal<Mistake[]>(LS.mistakes, []));
      setProfile(readLocal<Profile>(LS.profile, EMPTY_PROFILE));
      setMode("local");
    };
    if (!auth) {
      goLocal();
      return;
    }
    const a = auth;
    return onAuthStateChanged(a, async (u) => {
      if (u) {
        setUser(u);
        return;
      }
      try {
        await signInAnonymously(a);
      } catch (err) {
        console.warn("Anonymous sign-in failed; using local storage", err);
        goLocal();
      }
    });
  }, []);

  // ---- Firestore listeners ---------------------------------------------
  useEffect(() => {
    if (!user || !db) return;
    const d = db;
    const uid = user.uid;
    const unsubs = [
      onSnapshot(
        collection(d, "users", uid, "words"),
        (snap) => {
          setWords(snap.docs.map((s) => ({ ...(s.data() as Word), id: s.id })));
          setMode("cloud");
        },
        (err) => {
          console.warn("Words sync error; falling back to this device", err);
          setWords(readLocal<Word[]>(LS.words, []));
          setMistakes(readLocal<Mistake[]>(LS.mistakes, []));
          setProfile(readLocal<Profile>(LS.profile, EMPTY_PROFILE));
          setMode("local");
        }
      ),
      onSnapshot(
        query(collection(d, "users", uid, "mistakes"), orderBy("createdAt", "desc"), limit(50)),
        (snap) => setMistakes(snap.docs.map((s) => ({ ...(s.data() as Mistake), id: s.id }))),
        (err) => console.warn("Mistakes sync error", err)
      ),
      onSnapshot(
        doc(d, "users", uid),
        (snap) => {
          const data = snap.data() as Partial<Profile> | undefined;
          setProfile({
            streak: data?.streak ?? 0,
            lastStudyDate: data?.lastStudyDate ?? "",
            totalReviews: data?.totalReviews ?? 0,
          });
        },
        (err) => console.warn("Profile sync error", err)
      ),
    ];
    return () => unsubs.forEach((u) => u());
  }, [user]);

  const cloud = mode === "cloud" && !!user && !!db;

  // ---- Writers ----------------------------------------------------------
  const saveProfile = useCallback(
    async (p: Profile) => {
      setProfile(p);
      if (cloud) {
        // Overwrite (not merge) so legacy fields from the old app are dropped
        // and the doc always matches the security rules.
        await setDoc(doc(db!, "users", user!.uid), {
          streak: p.streak,
          lastStudyDate: p.lastStudyDate,
          totalReviews: p.totalReviews,
          updatedAt: Date.now(),
        });
      } else {
        writeLocal(LS.profile, p);
      }
    },
    [cloud, user]
  );

  const putWords = useCallback(
    async (list: Word[]) => {
      if (cloud) {
        const batch = writeBatch(db!);
        list.forEach((w) => batch.set(doc(db!, "users", user!.uid, "words", w.id), toDoc(w)));
        await batch.commit();
      } else {
        setWords((prev) => {
          const map = new Map(prev.map((w) => [w.id, w]));
          list.forEach((w) => map.set(w.id, w));
          const next = [...map.values()];
          writeLocal(LS.words, next);
          return next;
        });
      }
    },
    [cloud, user]
  );

  const existingKeys = useMemo(
    () => new Set(words.map((w) => normalize(w.french))),
    [words]
  );

  /** Adds words to the deck, skipping ones already saved. Returns how many were added. */
  const addWords = useCallback(
    async (infos: WordInfo[], opts: { tag?: string; source: WordSource }) => {
      const now = Date.now();
      const seen = new Set(existingKeys);
      const fresh: Word[] = [];
      for (const info of infos) {
        const key = normalize(info.french);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        fresh.push({
          ...info,
          ...NEW_WORD_SRS,
          id: newId("w"),
          tag: (opts.tag || "").trim().slice(0, 80),
          source: opts.source,
          nextReviewAt: now,
          createdAt: now,
          updatedAt: now,
        });
      }
      if (fresh.length) {
        await putWords(fresh);
        await saveProfile(nextStreak(profileRef.current));
      }
      return fresh.length;
    },
    [existingKeys, putWords, saveProfile]
  );

  const hasWord = useCallback(
    (french: string) => existingKeys.has(normalize(french)),
    [existingKeys]
  );

  const updateWord = useCallback(
    (w: Word) => putWords([{ ...w, updatedAt: Date.now() }]),
    [putWords]
  );

  const deleteWord = useCallback(
    async (id: string) => {
      if (cloud) {
        await deleteDoc(doc(db!, "users", user!.uid, "words", id));
      } else {
        setWords((prev) => {
          const next = prev.filter((w) => w.id !== id);
          writeLocal(LS.words, next);
          return next;
        });
      }
    },
    [cloud, user]
  );

  const reviewWord = useCallback(
    async (w: Word, grade: Grade) => {
      const updated = schedule(w, grade);
      await putWords([updated]);
      const p = nextStreak(profileRef.current);
      await saveProfile({ ...p, totalReviews: p.totalReviews + 1 });
      return updated;
    },
    [putWords, saveProfile]
  );

  const saveMistake = useCallback(
    async (m: Omit<Mistake, "id" | "createdAt">) => {
      const full: Mistake = { ...m, id: newId("m"), createdAt: Date.now() };
      if (cloud) {
        await setDoc(doc(db!, "users", user!.uid, "mistakes", full.id), toDoc(full));
      } else {
        setMistakes((prev) => {
          const next = [full, ...prev].slice(0, 50);
          writeLocal(LS.mistakes, next);
          return next;
        });
      }
      return full;
    },
    [cloud, user]
  );

  const deleteMistake = useCallback(
    async (id: string) => {
      if (cloud) {
        await deleteDoc(doc(db!, "users", user!.uid, "mistakes", id));
      } else {
        setMistakes((prev) => {
          const next = prev.filter((m) => m.id !== id);
          writeLocal(LS.mistakes, next);
          return next;
        });
      }
    },
    [cloud, user]
  );

  // ---- Account ----------------------------------------------------------
  /** Upgrades the anonymous account to Google so the same words follow you to every device. */
  const signInWithGoogle = useCallback(async () => {
    if (!auth) throw new Error("Firebase is not configured");
    const current = auth.currentUser;
    if (current?.isAnonymous) {
      try {
        await linkWithPopup(current, googleProvider);
        // Linking keeps the uid (and all words) but doesn't fire
        // onAuthStateChanged, so force a re-render to show the account.
        await current.reload();
        bumpAuth((n) => n + 1);
        return;
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (code === "auth/credential-already-in-use") {
          const cred = GoogleAuthProvider.credentialFromError(
            err as Parameters<typeof GoogleAuthProvider.credentialFromError>[0]
          );
          if (cred) {
            await signInWithCredential(auth, cred);
            return;
          }
        }
        throw err;
      }
    }
    await signInWithPopup(auth, googleProvider);
  }, []);

  const signOut = useCallback(async () => {
    if (auth) await fbSignOut(auth);
  }, []);

  return {
    user,
    mode,
    words,
    mistakes,
    profile,
    addWords,
    hasWord,
    updateWord,
    deleteWord,
    reviewWord,
    saveMistake,
    deleteMistake,
    signInWithGoogle,
    signOut,
  };
}

export type StudyData = ReturnType<typeof useStudyData>;
