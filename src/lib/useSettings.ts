"use client";

import { useCallback, useEffect, useState } from "react";
import type { AiProvider } from "./ai";
import type { Voice } from "./speech";

export type ReviewDirection = "mixed" | "fr-en" | "en-fr";

export interface Settings {
  voice: Voice;
  speechRate: number;
  aiProvider: AiProvider;
  aiKey: string;
  autoPlay: boolean;
  typeAnswers: boolean;
  direction: ReviewDirection;
}

const DEFAULTS: Settings = {
  voice: "Aoede",
  speechRate: 0.9,
  aiProvider: "firebase",
  aiKey: "",
  autoPlay: true,
  typeAnswers: false,
  direction: "mixed",
};

const KEY = "dl_settings";

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setSettings({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {
      // ignore unreadable storage
    }
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return { settings, update };
}
