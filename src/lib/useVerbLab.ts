"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { collection, doc, onSnapshot, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "./firebase";
import { ALL_VERBS } from "./conjugate";
import { STARTER_VERB_COUNT } from "@/data/verbs";
import { NEW_WORD_SRS, schedule, type Grade } from "./srs";
import { cellId, dueCells, type CellRef, type VerbCell, type VerbPrefs } from "./verbDrill";

const LS = { cells: "dl_verbcells", prefs: "dl_verbprefs" };

export const DEFAULT_PREFS: VerbPrefs = {
  myVerbs: ALL_VERBS.slice(0, STARTER_VERB_COUNT).map((v) => v.key),
  tenses: ["present", "passe-compose", "futur-proche"],
  answerMode: "type",
};

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
    // ignore
  }
}

function cleanPrefs(p: Partial<VerbPrefs> | undefined): VerbPrefs {
  const known = new Set(ALL_VERBS.map((v) => v.key));
  const myVerbs = (p?.myVerbs ?? DEFAULT_PREFS.myVerbs).filter((k) => known.has(k));
  const tenses = (p?.tenses ?? DEFAULT_PREFS.tenses).filter((t) =>
    ["present", "passe-compose", "futur-proche", "imparfait", "futur"].includes(t)
  );
  return {
    myVerbs: myVerbs.length ? myVerbs : DEFAULT_PREFS.myVerbs,
    tenses: tenses.length ? tenses : ["present"],
    answerMode: p?.answerMode === "choose" ? "choose" : "type",
  };
}

/**
 * Verb Lab progress: one spaced-repetition record per verb form, plus your
 * verb list and tense choices. Syncs through Firestore when available and
 * quietly falls back to this browser if not (e.g. rules not yet deployed).
 */
export function useVerbLab(user: User | null, cloudReady: boolean, onStudied: () => void) {
  const [cells, setCells] = useState<Record<string, VerbCell>>({});
  const [prefs, setPrefsState] = useState<VerbPrefs>(DEFAULT_PREFS);
  const [cloud, setCloud] = useState(false);
  const cellsRef = useRef(cells);
  cellsRef.current = cells;

  const goLocal = useCallback(() => {
    setCloud(false);
    setCells(readLocal(LS.cells, {}));
    setPrefsState(cleanPrefs(readLocal(LS.prefs, undefined)));
  }, []);

  useEffect(() => {
    if (!cloudReady || !user || !db) {
      goLocal();
      return;
    }
    const uid = user.uid;
    const unsubCells = onSnapshot(
      collection(db, "users", uid, "verbCells"),
      (snap) => {
        const next: Record<string, VerbCell> = {};
        snap.forEach((d) => (next[d.id] = { ...(d.data() as VerbCell), id: d.id }));
        setCells(next);
        setCloud(true);
      },
      (err) => {
        console.warn("Verb progress sync unavailable; saving on this device", err);
        goLocal();
      }
    );
    const unsubPrefs = onSnapshot(
      doc(db, "users", uid, "meta", "verbLab"),
      (snap) => setPrefsState(cleanPrefs(snap.data() as Partial<VerbPrefs> | undefined)),
      () => setPrefsState(cleanPrefs(readLocal(LS.prefs, undefined)))
    );
    return () => {
      unsubCells();
      unsubPrefs();
    };
  }, [user, cloudReady, goLocal]);

  const persistCell = useCallback(
    async (cell: VerbCell) => {
      setCells((prev) => {
        const next = { ...prev, [cell.id]: cell };
        if (!cloud) writeLocal(LS.cells, next);
        return next;
      });
      if (cloud && user && db) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...data } = cell;
        try {
          await setDoc(doc(db, "users", user.uid, "verbCells", id), data);
        } catch (err) {
          console.warn("Couldn't sync verb progress", err);
        }
      }
    },
    [cloud, user]
  );

  /**
   * Record an answer. `scheduleIt` false (speed rounds) only updates the
   * right/wrong counts, so quick-fire guessing doesn't distort the schedule.
   */
  const recordAnswer = useCallback(
    async (ref: CellRef, grade: Grade, scheduleIt = true) => {
      const id = cellId(ref);
      const now = Date.now();
      const existing: VerbCell = cellsRef.current[id] ?? {
        ...NEW_WORD_SRS,
        ...ref,
        id,
        nextReviewAt: now,
        updatedAt: now,
        createdAt: now,
        correct: 0,
        wrong: 0,
      };
      const right = grade !== "again";
      const counted = {
        ...existing,
        correct: existing.correct + (right ? 1 : 0),
        wrong: existing.wrong + (right ? 0 : 1),
        updatedAt: now,
      };
      const next = scheduleIt || !cellsRef.current[id] ? schedule(counted, grade, now) : counted;
      await persistCell(next);
      onStudied();
    },
    [persistCell, onStudied]
  );

  const setPrefs = useCallback(
    async (patch: Partial<VerbPrefs>) => {
      const next = cleanPrefs({ ...prefs, ...patch });
      setPrefsState(next);
      writeLocal(LS.prefs, next);
      if (cloud && user && db) {
        try {
          await setDoc(doc(db, "users", user.uid, "meta", "verbLab"), { ...next, updatedAt: Date.now() });
        } catch (err) {
          console.warn("Couldn't sync verb settings", err);
        }
      }
    },
    [prefs, cloud, user]
  );

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const dueCount = useMemo(() => dueCells(cells, prefs, Date.now()).length, [cells, prefs, now]);

  return { cells, prefs, setPrefs, recordAnswer, dueCount, synced: cloud };
}

export type VerbLab = ReturnType<typeof useVerbLab>;
