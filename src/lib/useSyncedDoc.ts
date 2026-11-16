"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "./firebase";

/**
 * A small per-user settings/progress document at users/{uid}/meta/{docId},
 * mirrored to localStorage so it works offline or before rules are deployed.
 */
export function useSyncedDoc<T extends object>(
  user: User | null,
  cloudReady: boolean,
  docId: string,
  fallback: T,
  clean: (raw: unknown) => T
) {
  const key = `dl_meta_${docId}`;
  const [value, setValue] = useState<T>(fallback);
  const cleanRef = useRef(clean);
  cleanRef.current = clean;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setValue(cleanRef.current(JSON.parse(raw)));
    } catch {
      // ignore
    }
    if (!cloudReady || !user || !db) return;
    return onSnapshot(
      doc(db, "users", user.uid, "meta", docId),
      (snap) => {
        if (snap.exists()) setValue(cleanRef.current(snap.data()));
      },
      () => {
        // rules not deployed yet — local copy keeps working
      }
    );
  }, [user, cloudReady, docId, key]);

  const save = useCallback(
    async (next: T) => {
      setValue(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // ignore
      }
      if (cloudReady && user && db) {
        try {
          await setDoc(doc(db, "users", user.uid, "meta", docId), { ...next, updatedAt: Date.now() });
        } catch (err) {
          console.warn(`Couldn't sync ${docId}`, err);
        }
      }
    },
    [cloudReady, user, docId, key]
  );

  return [value, save] as const;
}

// ---------------------------------------------------------------------------

export interface GrammarScores {
  scores: Record<string, { best: number; last: number; total: number }>;
}

export function cleanGrammarScores(raw: unknown): GrammarScores {
  const out: GrammarScores = { scores: {} };
  const s = (raw as { scores?: Record<string, unknown> })?.scores;
  if (s && typeof s === "object")
    for (const [k, v] of Object.entries(s)) {
      const x = v as { best?: unknown; last?: unknown; total?: unknown };
      if (typeof x?.best === "number" && typeof x?.total === "number" && /^[a-z-]{1,30}$/.test(k))
        out.scores[k] = { best: x.best, last: typeof x.last === "number" ? x.last : x.best, total: x.total };
    }
  return out;
}

export interface AboutMe {
  name: string;
  work: string;
  city: string;
  family: string;
  hobbies: string;
  food: string;
  routine: string;
}

export const EMPTY_ABOUT: AboutMe = { name: "", work: "", city: "", family: "", hobbies: "", food: "", routine: "" };

export function cleanAboutMe(raw: unknown): AboutMe {
  const r = (raw ?? {}) as Record<string, unknown>;
  const out = { ...EMPTY_ABOUT };
  for (const k of Object.keys(EMPTY_ABOUT) as (keyof AboutMe)[])
    if (typeof r[k] === "string") out[k] = (r[k] as string).slice(0, 200);
  return out;
}
