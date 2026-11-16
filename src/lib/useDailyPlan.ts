"use client";

import { useCallback, useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "./firebase";

export type StepId = "verbs" | "words" | "focus";

interface PlanDoc {
  date: string;
  done: StepId[];
}

const LS = "dl_today";

export function localDate(d = new Date()): string {
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
}

function read(): PlanDoc | null {
  try {
    return JSON.parse(localStorage.getItem(LS) || "null");
  } catch {
    return null;
  }
}

/** Which of today's session steps are finished (resets each day, syncs across devices). */
export function useDailyPlan(user: User | null, cloudReady: boolean) {
  const [plan, setPlan] = useState<PlanDoc>({ date: localDate(), done: [] });

  useEffect(() => {
    const local = read();
    if (local?.date === localDate()) setPlan(local);
    if (!cloudReady || !user || !db) return;
    return onSnapshot(
      doc(db, "users", user.uid, "meta", "today"),
      (snap) => {
        const d = snap.data() as PlanDoc | undefined;
        if (d?.date === localDate()) setPlan({ date: d.date, done: d.done ?? [] });
      },
      () => {
        // rules not deployed yet — the local copy still works
      }
    );
  }, [user, cloudReady]);

  const today = localDate();
  const done = plan.date === today ? plan.done : [];

  const markDone = useCallback(
    async (step: StepId) => {
      const next: PlanDoc = { date: today, done: [...new Set([...done, step])] };
      setPlan(next);
      try {
        localStorage.setItem(LS, JSON.stringify(next));
      } catch {
        // ignore
      }
      if (cloudReady && user && db) {
        try {
          await setDoc(doc(db, "users", user.uid, "meta", "today"), { ...next, updatedAt: Date.now() });
        } catch (err) {
          console.warn("Couldn't sync today's plan", err);
        }
      }
    },
    [done, today, cloudReady, user]
  );

  return { done, markDone };
}
