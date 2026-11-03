"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Mic,
  Volume2,
  Sparkles,
  BookOpen,
  Headphones,
  MessageSquareCode,
  CheckCircle2,
  Plus,
  RefreshCw,
  Flame,
  Cloud,
  CloudOff,
  Settings,
  LogIn,
  LogOut,
  Copy,
  Check,
  Award,
  Search,
  ChevronRight,
  RotateCcw,
  HelpCircle,
} from "lucide-react";
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signInAnonymously,
  fbSignOut,
  onAuthStateChanged,
  User,
} from "@/lib/firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  writeBatch,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import {
  INITIAL_MONTREAL_CARDS,
  CONNECTOR_DRILLS,
  FlashcardItem,
  PhraseCategory,
} from "@/data/montrealPhrases";
import { calculateSm2, SrsGrade } from "@/lib/srs";
import {
  speakFrench,
  GEMINI_HD_VOICES,
  GeminiHdVoice,
} from "@/lib/speech";
import {
  generateStandupCoach,
  decodeMeetingPhrase,
  StandupResult,
  DecodeResult,
} from "@/lib/ai";

interface SavedStandup {
  id: string;
  yesterdayEn: string;
  todayEn: string;
  blockersEn: string;
  beginnerFr: string;
  franglaisFr: string;
  proFr: string;
  tips: string[];
  createdAt: number;
}

interface SavedDecode {
  id: string;
  original: string;
  meaningEn: string;
  standardFr: string;
  breakdown: string;
  register: string;
  createdAt: number;
}

export default function MontrealFrenchApp() {
  // Navigation & Audio Settings
  const [activeTab, setActiveTab] = useState<"standup" | "decoder" | "deck">(
    "standup"
  );
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [selectedVoice, setSelectedVoice] = useState<GeminiHdVoice>("Aoede");
  const [isSynthesizingAudio, setIsSynthesizingAudio] = useState<boolean>(false);
  const [voiceLabel, setVoiceLabel] = useState<string>(
    "Gemini HD (Aoede • fr-CA)"
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Firebase Auth & Sync State
  const [user, setUser] = useState<User | null>(null);
  const [syncStatus, setSyncStatus] = useState<
    "connecting" | "synced" | "local"
  >("connecting");
  const [xp, setXp] = useState<number>(120);
  const [streak, setStreak] = useState<number>(1);

  // AI Settings Modal
  const [showSettings, setShowSettings] = useState(false);
  const [aiProvider, setAiProvider] = useState<
    "firebase" | "gemini" | "openai"
  >("firebase");
  const [customApiKey, setCustomApiKey] = useState<string>("");

  // 1. Standup Studio State
  const [yesterdayEn, setYesterdayEn] = useState(
    "Fixed the auth token refresh bug and reviewed 2 PRs"
  );
  const [todayEn, setTodayEn] = useState(
    "Connecting the frontend to Firestore and testing in staging"
  );
  const [blockersEn, setBlockersEn] = useState(
    "Need 5 minutes with someone to check the staging env variables"
  );
  const [standupResult, setStandupResult] = useState<StandupResult | null>(
    null
  );
  const [isGeneratingStandup, setIsGeneratingStandup] = useState(false);
  const [selectedRegister, setSelectedRegister] = useState<
    "beginnerFr" | "franglaisFr" | "proFr"
  >("franglaisFr");
  const [recentStandups, setRecentStandups] = useState<SavedStandup[]>([]);

  // Pronunciation Mic Check State
  const [isListening, setIsListening] = useState(false);
  const [spokenTranscript, setSpokenTranscript] = useState<string>("");

  // 2. Decoder & Ear Drill State
  const [phraseToDecode, setPhraseToDecode] = useState(
    "Faque mettons qu'on merge ça tantôt, c'est-tu correct de ton bord?"
  );
  const [decodeResult, setDecodeResult] = useState<DecodeResult | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);
  const [recentDecodes, setRecentDecodes] = useState<SavedDecode[]>([]);

  // Ear Drill Quiz State
  const [drillIndex, setDrillIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [drillScore, setDrillScore] = useState(0);

  // 3. Flashcards & SRS Deck State
  const [cards, setCards] = useState<FlashcardItem[]>(INITIAL_MONTREAL_CARDS);
  const [deckMode, setDeckMode] = useState<"srs" | "browse" | "add">("srs");
  const [isFlipped, setIsFlipped] = useState(false);
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<
    PhraseCategory | "all"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");

  // New Custom Card Form
  const [newFr, setNewFr] = useState("");
  const [newEn, setNewEn] = useState("");
  const [newNote, setNewNote] = useState("");
  const [newPhonetic, setNewPhonetic] = useState("");
  const [newCategory, setNewCategory] = useState<PhraseCategory>("standup");
  const [newExFr, setNewExFr] = useState("");
  const [newExEn, setNewExEn] = useState("");

  // Load saved AI key and voice preference from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedProv = localStorage.getItem("faque_ai_provider") as
        | "firebase"
        | "gemini"
        | "openai"
        | null;
      const savedKey = localStorage.getItem("faque_ai_key");
      const savedVoice = localStorage.getItem(
        "faque_hd_voice"
      ) as GeminiHdVoice | null;
      if (savedProv) setAiProvider(savedProv);
      if (savedKey) setCustomApiKey(savedKey);
      if (savedVoice) {
        setSelectedVoice(savedVoice);
        setVoiceLabel(`Gemini HD (${savedVoice} • fr-CA)`);
      }
    }
  }, []);

  // Firebase Auth & Real-time Firestore Listeners
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (currUser) => {
      if (currUser) {
        setUser(currUser);
      } else {
        try {
          const anon = await signInAnonymously(auth);
          setUser(anon.user);
        } catch (err) {
          console.warn("Anonymous auth fallback to local state:", err);
          setSyncStatus("local");
        }
      }
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);
    const cardsColRef = collection(db, "users", user.uid, "cards");
    const standupsQuery = query(
      collection(db, "users", user.uid, "standups"),
      orderBy("createdAt", "desc"),
      limit(5)
    );
    const decodesQuery = query(
      collection(db, "users", user.uid, "decodes"),
      orderBy("createdAt", "desc"),
      limit(5)
    );

    // Ensure User Profile Document Exists
    getDoc(userDocRef)
      .then(async (snap) => {
        if (!snap.exists()) {
          const now = Date.now();
          await setDoc(userDocRef, {
            displayName: user.displayName || "Montreal Dev",
            xp: 120,
            streak: 1,
            lastStudyDate: new Date().toISOString().slice(0, 10),
            updatedAt: now,
            createdAt: now,
            uid: user.uid,
          });
        } else {
          const d = snap.data();
          if (typeof d.xp === "number") setXp(d.xp);
          if (typeof d.streak === "number") setStreak(d.streak);
        }
      })
      .catch((e) => console.warn("Profile init error:", e));

    // Listen to Cards Collection & Seed if Empty
    const unsubCards = onSnapshot(
      cardsColRef,
      async (snapshot) => {
        setSyncStatus("synced");
        if (snapshot.empty) {
          try {
            const batch = writeBatch(db);
            const now = Date.now();
            INITIAL_MONTREAL_CARDS.forEach((c) => {
              const ref = doc(db, "users", user.uid, "cards", c.id);
              batch.set(ref, {
                id: c.id,
                french: c.french,
                english: c.english,
                quebecoisNote: c.quebecoisNote,
                phonetic: c.phonetic,
                category: c.category,
                exampleFr: c.exampleFr,
                exampleEn: c.exampleEn,
                interval: c.interval,
                repetition: c.repetition,
                easeFactor: c.easeFactor,
                nextReviewAt: c.nextReviewAt,
                updatedAt: now,
                createdAt: now,
              });
            });
            await batch.commit();
          } catch (seedErr) {
            console.warn("Could not seed cards to Firestore:", seedErr);
          }
        } else {
          const loaded: FlashcardItem[] = [];
          snapshot.forEach((docSnap) => {
            const d = docSnap.data() as FlashcardItem;
            loaded.push({ ...d, id: docSnap.id });
          });
          setCards(loaded);
        }
      },
      (err) => {
        console.warn("Cards listener error:", err);
        setSyncStatus("local");
      }
    );

    const unsubStandups = onSnapshot(standupsQuery, (snap) => {
      const list: SavedStandup[] = [];
      snap.forEach((d) => list.push({ ...(d.data() as SavedStandup), id: d.id }));
      setRecentStandups(list);
    });

    const unsubDecodes = onSnapshot(decodesQuery, (snap) => {
      const list: SavedDecode[] = [];
      snap.forEach((d) => list.push({ ...(d.data() as SavedDecode), id: d.id }));
      setRecentDecodes(list);
    });

    return () => {
      unsubCards();
      unsubStandups();
      unsubDecodes();
    };
  }, [user]);

  const awardXp = useCallback(
    async (points: number) => {
      const nextXp = xp + points;
      setXp(nextXp);
      if (user) {
        try {
          await setDoc(
            doc(db, "users", user.uid),
            {
              xp: nextXp,
              streak,
              updatedAt: Date.now(),
            },
            { merge: true }
          );
        } catch (e) {
          console.warn("XP update warning:", e);
        }
      }
    },
    [xp, streak, user]
  );

  const handlePlayAudio = async (text: string, customRate?: number) => {
    const usedVoice = await speakFrench(
      text,
      customRate ?? speechRate,
      selectedVoice,
      setIsSynthesizingAudio
    );
    if (usedVoice) setVoiceLabel(usedVoice);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Standup Generator Handler
  const handleGenerateStandup = async () => {
    setIsGeneratingStandup(true);
    try {
      const res = await generateStandupCoach({
        yesterdayEn,
        todayEn,
        blockersEn,
        customProvider: aiProvider,
        customApiKey,
      });
      setStandupResult(res);
      awardXp(25);

      if (user) {
        const standupId = `standup-${Date.now()}`;
        await setDoc(doc(db, "users", user.uid, "standups", standupId), {
          id: standupId,
          yesterdayEn: yesterdayEn.slice(0, 4000),
          todayEn: todayEn.slice(0, 4000),
          blockersEn: blockersEn.slice(0, 4000),
          beginnerFr: res.beginnerFr.slice(0, 7500),
          franglaisFr: res.franglaisFr.slice(0, 7500),
          proFr: res.proFr.slice(0, 7500),
          tips: res.tips.slice(0, 10).map((t) => t.slice(0, 900)),
          createdAt: Date.now(),
        });
      }
    } finally {
      setIsGeneratingStandup(false);
    }
  };

  // Speech Recognition (Pronunciation Test in fr-CA)
  const handleToggleMic = () => {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert(
        "Speech recognition works best in Chrome, Edge, or Safari on macOS/iOS."
      );
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRec();
    recognition.lang = "fr-CA";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);
    setSpokenTranscript("");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      setSpokenTranscript(transcript);
      setIsListening(false);
      awardXp(15);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  // Meeting Phrase Decoder Handler
  const handleDecodePhrase = async (inputOverride?: string) => {
    const targetPhrase = inputOverride ?? phraseToDecode;
    if (!targetPhrase.trim()) return;
    if (inputOverride) setPhraseToDecode(inputOverride);

    setIsDecoding(true);
    try {
      const res = await decodeMeetingPhrase({
        phrase: targetPhrase,
        customProvider: aiProvider,
        customApiKey,
      });
      setDecodeResult(res);
      awardXp(20);

      if (user) {
        const decodeId = `decode-${Date.now()}`;
        const breakdownStr = res.breakdown
          .map((b) => `${b.term}: ${b.meaning} (${b.note})`)
          .join(" | ")
          .slice(0, 7500);

        await setDoc(doc(db, "users", user.uid, "decodes", decodeId), {
          id: decodeId,
          original: res.original.slice(0, 2900),
          meaningEn: res.meaningEn.slice(0, 4900),
          standardFr: res.standardFr.slice(0, 4900),
          breakdown: breakdownStr,
          register: (res.register || "Montreal Tech").slice(0, 190),
          createdAt: Date.now(),
        });
      }
    } finally {
      setIsDecoding(false);
    }
  };

  // Save a phrase directly to Firestore Flashcards
  const handleQuickSaveCard = async (cardData: {
    french: string;
    english: string;
    quebecoisNote: string;
    phonetic?: string;
    category?: PhraseCategory;
    exampleFr?: string;
    exampleEn?: string;
  }) => {
    const id = `custom-${Date.now()}`;
    const now = Date.now();
    const newCard: FlashcardItem = {
      id,
      french: cardData.french.slice(0, 950),
      english: cardData.english.slice(0, 950),
      quebecoisNote: (
        cardData.quebecoisNote || "Added from Montreal meeting / standup"
      ).slice(0, 1900),
      phonetic: (cardData.phonetic || "").slice(0, 450),
      category: cardData.category || "meetings",
      exampleFr: (cardData.exampleFr || cardData.french).slice(0, 1900),
      exampleEn: (cardData.exampleEn || cardData.english).slice(0, 1900),
      interval: 0,
      repetition: 0,
      easeFactor: 2.5,
      nextReviewAt: 0,
      updatedAt: now,
    };

    setCards((prev) => [newCard, ...prev]);
    awardXp(15);

    if (user) {
      try {
        await setDoc(doc(db, "users", user.uid, "cards", id), {
          ...newCard,
          createdAt: now,
        });
      } catch (e) {
        console.warn("Could not save custom card to Firestore:", e);
      }
    }
  };

  // Due SRS Cards
  const dueCards = cards.filter((c) => c.nextReviewAt <= Date.now());
  const activeSrsCard =
    dueCards.length > 0
      ? dueCards[currentCardIdx % dueCards.length]
      : cards[currentCardIdx % Math.max(cards.length, 1)];

  const handleGradeCard = async (grade: SrsGrade) => {
    if (!activeSrsCard) return;
    const updated = calculateSm2(activeSrsCard, grade);
    setIsFlipped(false);
    setCards((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
    setCurrentCardIdx((prev) => prev + 1);
    awardXp(10);

    if (user) {
      try {
        await setDoc(
          doc(db, "users", user.uid, "cards", updated.id),
          {
            french: updated.french,
            english: updated.english,
            quebecoisNote: updated.quebecoisNote,
            phonetic: updated.phonetic,
            category: updated.category,
            exampleFr: updated.exampleFr,
            exampleEn: updated.exampleEn,
            interval: updated.interval,
            repetition: updated.repetition,
            easeFactor: updated.easeFactor,
            nextReviewAt: updated.nextReviewAt,
            updatedAt: Date.now(),
          },
          { merge: true }
        );
      } catch (e) {
        console.warn("SRS update error:", e);
      }
    }
  };

  // Google Sign-In Handler
  const handleGoogleSignIn = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      setUser(res.user);
    } catch (err) {
      console.warn("Google Sign-In popup error:", err);
      alert(
        "Note: Ensure Google Sign-In is enabled and localhost is in Authorized Domains in the Firebase Console."
      );
    }
  };

  const currentDrill = CONNECTOR_DRILLS[drillIndex % CONNECTOR_DRILLS.length];

  const filteredBrowseCards = cards.filter((c) => {
    const matchesCat =
      categoryFilter === "all" || c.category === categoryFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      c.french.toLowerCase().includes(q) ||
      c.english.toLowerCase().includes(q) ||
      c.quebecoisNote.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#0b1020]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center shadow-lg shadow-sky-500/20 font-bold text-lg tracking-tight">
              ⚜️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg text-white tracking-tight">
                  Faque<span className="text-sky-400">.dev</span>
                </h1>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  Montréal Tech French
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Built for English SWEs on Québécois / Franglais teams
              </p>
            </div>
          </div>

          {/* Controls: HD Voice Picker, Speed, XP, Firebase Sync, Settings */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Gemini HD Neural Voice Selector */}
            <div className="flex items-center bg-slate-900/90 border border-sky-500/30 rounded-lg px-2 py-1 text-xs gap-1.5">
              {isSynthesizingAudio ? (
                <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              )}
              <select
                value={selectedVoice}
                onChange={(e) => {
                  const v = e.target.value as GeminiHdVoice;
                  setSelectedVoice(v);
                  setVoiceLabel(`Gemini HD (${v} • fr-CA)`);
                  localStorage.setItem("faque_hd_voice", v);
                }}
                className="bg-transparent text-sky-200 font-medium focus:outline-none cursor-pointer"
                title="Firebase AI Logic Neural HD Voice (gemini-3.1-flash-tts-preview)"
              >
                {GEMINI_HD_VOICES.map((v) => (
                  <option
                    key={v.id}
                    value={v.id}
                    className="bg-slate-900 text-white"
                  >
                    🎙️ {v.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Audio Speed Pill */}
            <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-lg p-1 text-xs">
              <Volume2 className="w-3.5 h-3.5 text-sky-400 ml-1.5 mr-1" />
              {[
                { label: "0.8x Slow", val: 0.82 },
                { label: "1.0x Natural", val: 1.0 },
                { label: "1.15x Fast", val: 1.15 },
              ].map((s) => (
                <button
                  key={s.label}
                  onClick={() => setSpeechRate(s.val)}
                  className={`px-2 py-1 rounded-md font-medium transition ${
                    Math.abs(speechRate - s.val) < 0.05
                      ? "bg-sky-500 text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Streak & XP */}
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
              <span className="flex items-center gap-1 text-amber-400 font-semibold">
                <Flame className="w-3.5 h-3.5 fill-amber-400" /> {streak}d
              </span>
              <span className="text-slate-600">|</span>
              <span className="flex items-center gap-1 text-sky-300 font-semibold">
                <Award className="w-3.5 h-3.5" /> {xp} XP
              </span>
            </div>

            {/* Firebase Status */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs bg-slate-900/90 border-slate-800"
              title={`Project: faque-mtl-dev-2026 (northamerica-northeast1 Montréal)`}
            >
              {syncStatus === "synced" ? (
                <>
                  <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300 font-medium hidden sm:inline">
                    Firestore Synced
                  </span>
                </>
              ) : (
                <>
                  <CloudOff className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-300 font-medium hidden sm:inline">
                    Local Mode
                  </span>
                </>
              )}
            </div>

            {/* Auth Button */}
            {user && !user.isAnonymous ? (
              <button
                onClick={() => fbSignOut(auth)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">
                  {user.displayName?.split(" ")[0] || "Signed In"}
                </span>
              </button>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-xs text-sky-300 font-medium transition"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Sync Google</span>
              </button>
            )}

            {/* AI Settings Button */}
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition"
              title="AI & Voice Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-6xl mx-auto px-4 flex gap-2 overflow-x-auto pt-1">
          {[
            {
              id: "standup",
              label: "1. Standup & Meeting Prep",
              icon: MessageSquareCode,
              badge: "Speak",
            },
            {
              id: "decoder",
              label: "2. Franglais Decoder & Ear Drill",
              icon: Headphones,
              badge: "Listen",
            },
            {
              id: "deck",
              label: `3. Montreal SWE Phrasebook (${dueCards.length} Due)`,
              icon: BookOpen,
              badge: "SRS Deck",
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() =>
                  setActiveTab(tab.id as "standup" | "decoder" | "deck")
                }
                className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-sm font-medium whitespace-nowrap transition ${
                  active
                    ? "border-sky-400 text-sky-300 bg-sky-500/10 rounded-t-lg"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 rounded-t-lg"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                    active
                      ? "bg-sky-500/20 text-sky-300"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        {/* ============================================================
            TAB 1: STANDUP & MEETING PREP STUDIO
           ============================================================ */}
        {activeTab === "standup" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: English Standup Input */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-[#131b33] border border-slate-800 rounded-2xl p-5 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-base text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-sky-400" />
                    Draft Your Standup in English
                  </h2>
                  <span className="text-xs text-slate-400">
                    Firebase AI Logic
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Write what you want to say in plain English. We&apos;ll
                  generate 3 versions: <strong>Day-1 Survival</strong>,{" "}
                  <strong>Natural Montreal Dev Franglais</strong>, and{" "}
                  <strong>Professional French</strong>.
                </p>

                {/* Quick Templates */}
                <div className="mb-4">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block mb-1.5">
                    Quick Dev Scenarios:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      {
                        label: "PR Merged + Staging",
                        y: "Merged my PR for the user profile page and fixed unit tests",
                        t: "Deploying to staging and starting the Firestore rules ticket",
                        b: "None on my end",
                      },
                      {
                        label: "Blocked on API / Config",
                        y: "Investigated the latency bug on the search endpoint",
                        t: "Refactoring the query hook",
                        b: "Blocked on missing API credentials in local dev, need 5 mins after standup",
                      },
                      {
                        label: "Code Review + Release",
                        y: "Reviewed 3 PRs and helped QA verify the release branch",
                        t: "Monitoring the production release and cleaning up tech debt",
                        b: "Waiting for final sign-off from design",
                      },
                    ].map((tpl) => (
                      <button
                        key={tpl.label}
                        onClick={() => {
                          setYesterdayEn(tpl.y);
                          setTodayEn(tpl.t);
                          setBlockersEn(tpl.b);
                        }}
                        className="text-xs px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-sky-300 border border-slate-700/80 transition"
                      >
                        {tpl.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Yesterday (Hier, j&apos;ai...)
                    </label>
                    <textarea
                      rows={2}
                      value={yesterdayEn}
                      onChange={(e) => setYesterdayEn(e.target.value)}
                      className="w-full rounded-xl bg-slate-950/80 border border-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                      placeholder="e.g. Fixed the auth bug and opened a PR..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Today (Faque aujourd&apos;hui...)
                    </label>
                    <textarea
                      rows={2}
                      value={todayEn}
                      onChange={(e) => setTodayEn(e.target.value)}
                      className="w-full rounded-xl bg-slate-950/80 border border-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                      placeholder="e.g. Continuing on the same ticket and testing in staging..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Blockers / Questions (De mon bord...)
                    </label>
                    <input
                      type="text"
                      value={blockersEn}
                      onChange={(e) => setBlockersEn(e.target.value)}
                      className="w-full rounded-xl bg-slate-950/80 border border-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                      placeholder="e.g. No blockers / Need 5 mins after standup..."
                    />
                  </div>

                  <button
                    onClick={handleGenerateStandup}
                    disabled={isGeneratingStandup}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 transition disabled:opacity-60"
                  >
                    {isGeneratingStandup ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Generating Montreal Standup...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate My Montreal Standup (+25 XP)
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Emergency Meeting Survival Bar */}
              <div className="bg-[#131b33] border border-slate-800 rounded-2xl p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-sky-400 mb-2.5">
                  Instant Meeting Bail-Out & Chiming-In Lines (Click to Hear)
                </h3>
                <div className="space-y-2">
                  {[
                    {
                      fr: "Scusez, mon français est encore en apprentissage — je vais continuer en anglais!",
                      en: "Sorry, my French is still a work in progress — I'll continue in English!",
                    },
                    {
                      fr: "Rien à signaler de mon bord, tout roule!",
                      en: "Nothing to report on my end, everything's rolling!",
                    },
                    {
                      fr: "Peux-tu répéter ça un peu plus lentement?",
                      en: "Can you repeat that a little more slowly?",
                    },
                    {
                      fr: "Ouais, ça fait ben du sens pour moi!",
                      en: "Yeah, that makes total sense to me!",
                    },
                  ].map((bail, i) => (
                    <button
                      key={i}
                      onClick={() => handlePlayAudio(bail.fr)}
                      className="w-full text-left p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800/80 transition group flex items-start justify-between gap-2"
                    >
                      <div>
                        <p className="text-xs font-medium text-slate-100 group-hover:text-sky-300">
                          &ldquo;{bail.fr}&rdquo;
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {bail.en}
                        </p>
                      </div>
                      <Volume2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Generated Standup Script & Pronunciation Coach */}
            <div className="lg:col-span-7 space-y-4">
              {standupResult ? (
                <div className="bg-[#131b33] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
                  {/* Register Selector */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                      {[
                        {
                          key: "beginnerFr",
                          label: "🌱 Day-1 Survival",
                        },
                        {
                          key: "franglaisFr",
                          label: "⚜️ Montreal Dev Franglais",
                        },
                        {
                          key: "proFr",
                          label: "💼 Clean Pro French",
                        },
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          onClick={() =>
                            setSelectedRegister(
                              tab.key as
                                | "beginnerFr"
                                | "franglaisFr"
                                | "proFr"
                            )
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            selectedRegister === tab.key
                              ? "bg-sky-500 text-white shadow"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <span className="text-[11px] text-slate-400">
                      Voice: <strong className="text-slate-200">{voiceLabel}</strong>
                    </span>
                  </div>

                  {/* Active Script Display */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-sky-500/30 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-lg font-medium text-white leading-relaxed">
                        {standupResult[selectedRegister]}
                      </p>
                      <button
                        onClick={() =>
                          handleCopy(
                            standupResult[selectedRegister],
                            "standup-script"
                          )
                        }
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 shrink-0"
                        title="Copy script"
                      >
                        {copiedId === "standup-script" ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {standupResult.phoneticGuide && (
                      <div className="pt-2 border-t border-slate-800/80">
                        <span className="text-[11px] uppercase tracking-wider text-sky-400 font-semibold">
                          Phonetic Pronunciation Guide:
                        </span>
                        <p className="text-xs font-mono text-slate-300 mt-1">
                          /{standupResult.phoneticGuide}/
                        </p>
                      </div>
                    )}

                    {/* Audio & Mic Action Buttons */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        onClick={() =>
                          handlePlayAudio(
                            standupResult[selectedRegister],
                            0.78
                          )
                        }
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-sky-300 transition"
                      >
                        <Volume2 className="w-4 h-4" />
                        Listen Slow (0.75x)
                      </button>
                      <button
                        onClick={() =>
                          handlePlayAudio(
                            standupResult[selectedRegister],
                            1.0
                          )
                        }
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-xs font-semibold text-white transition"
                      >
                        <Volume2 className="w-4 h-4" />
                        Listen Natural (fr-CA)
                      </button>
                      <button
                        onClick={handleToggleMic}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                          isListening
                            ? "bg-rose-500 text-white animate-pulse"
                            : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30"
                        }`}
                      >
                        <Mic className="w-4 h-4" />
                        {isListening
                          ? "Listening (fr-CA)... Speak now"
                          : "Practice Speaking Out Loud"}
                      </button>
                    </div>

                    {spokenTranscript && (
                      <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs space-y-1">
                        <div className="text-emerald-300 font-semibold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          What the fr-CA recognizer heard you say:
                        </div>
                        <p className="text-white font-medium text-sm">
                          &ldquo;{spokenTranscript}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Key Vocab & 1-Click Add to SRS Deck */}
                  {standupResult.keyVocab && standupResult.keyVocab.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                        Key Expressions from Your Update (Click + to Save to
                        Flashcards)
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {standupResult.keyVocab.map((v, i) => (
                          <div
                            key={i}
                            className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start justify-between gap-2"
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handlePlayAudio(v.fr)}
                                  className="text-sm font-semibold text-sky-300 hover:underline flex items-center gap-1"
                                >
                                  <Volume2 className="w-3.5 h-3.5" />
                                  {v.fr}
                                </button>
                              </div>
                              <p className="text-xs text-slate-200 mt-0.5">
                                {v.en}
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {v.note}
                              </p>
                            </div>
                            <button
                              onClick={() =>
                                handleQuickSaveCard({
                                  french: v.fr,
                                  english: v.en,
                                  quebecoisNote: v.note,
                                  category: "standup",
                                  exampleFr: standupResult.franglaisFr,
                                })
                              }
                              className="p-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 shrink-0"
                              title="Add to SRS Flashcards"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Coaching Tips */}
                  {standupResult.tips && standupResult.tips.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-sky-950/30 border border-sky-500/20">
                      <h4 className="text-xs font-semibold text-sky-300 mb-1.5">
                        💡 Montreal Team Coaching Notes:
                      </h4>
                      <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
                        {standupResult.tips.map((tip, idx) => (
                          <li key={idx}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-[#131b33] border border-slate-800 rounded-2xl p-8 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center mx-auto text-sky-400">
                    <MessageSquareCode className="w-6 h-6" />
                  </div>
                  <div className="max-w-md mx-auto space-y-1.5">
                    <h3 className="text-base font-semibold text-white">
                      Ready to Prep Your Next Standup?
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Click <strong>&ldquo;Generate My Montreal Standup&rdquo;</strong> on the
                      left to see how your update sounds in beginner survival
                      French, authentic Montreal Dev Franglais, and clean
                      professional French—complete with <code>fr-CA</code> audio!
                    </p>
                  </div>
                  <button
                    onClick={handleGenerateStandup}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold transition"
                  >
                    <Sparkles className="w-4 h-4" />
                    Try With Sample Standup Now
                  </button>
                </div>
              )}

              {/* Recent Standup History from Firestore */}
              {recentStandups.length > 0 && (
                <div className="bg-[#131b33] border border-slate-800 rounded-2xl p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
                    Recent Saved Standups (Cloud Firestore)
                  </h3>
                  <div className="space-y-2">
                    {recentStandups.slice(0, 3).map((s) => (
                      <div
                        key={s.id}
                        className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-sky-300 truncate">
                            {s.franglaisFr}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            EN: {s.yesterdayEn} → {s.todayEn}
                          </p>
                        </div>
                        <button
                          onClick={() => handlePlayAudio(s.franglaisFr)}
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 shrink-0"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 2: MEETING FRANGLAIS DECODER & EAR TRAINER
           ============================================================ */}
        {activeTab === "decoder" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Live Meeting / Slack Phrase Decoder */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-[#131b33] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-sky-400" />
                      Meeting & Slack &ldquo;Franglais&rdquo; Decoder
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Heard something fast in a meeting or saw a Slack message?
                      Paste it below to see what it really means vs. Duolingo
                      French.
                    </p>
                  </div>
                </div>

                {/* Preset Overheard Phrases */}
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block mb-1.5">
                    Try Decoding Overheard Montreal Phrases:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "Faque mettons qu'on merge ça tantôt, c'est-tu correct de ton bord?",
                      "Chus un peu dans le jus ce matin, on s'en reparle cet après-midi!",
                      "Dans le fond, ça marche pas pantoute en staging.",
                      "Laisse faire, j'ai trouvé le bug drette là!",
                    ].map((sample, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleDecodePhrase(sample)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-sky-300 border border-slate-800 transition text-left"
                      >
                        &ldquo;{sample}&rdquo;
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={phraseToDecode}
                    onChange={(e) => setPhraseToDecode(e.target.value)}
                    placeholder="Paste a Québécois or Franglais phrase..."
                    className="flex-1 rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                  <button
                    onClick={() => handleDecodePhrase()}
                    disabled={isDecoding}
                    className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm flex items-center gap-1.5 transition shrink-0 disabled:opacity-60"
                  >
                    {isDecoding ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    Decode
                  </button>
                </div>

                {/* Decoded Output */}
                {decodeResult && (
                  <div className="p-4 rounded-2xl bg-slate-950/90 border border-sky-500/30 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-sky-500/20 text-sky-300">
                          {decodeResult.register}
                        </span>
                        <h3 className="text-lg font-bold text-white mt-1.5">
                          &ldquo;{decodeResult.original}&rdquo;
                        </h3>
                        {decodeResult.phonetic && (
                          <p className="text-xs font-mono text-slate-400 mt-0.5">
                            /{decodeResult.phonetic}/
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => handlePlayAudio(decodeResult.original)}
                          className="p-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white"
                          title="Listen in fr-CA"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            handleQuickSaveCard({
                              french: decodeResult.original,
                              english: decodeResult.meaningEn,
                              quebecoisNote: `Standard FR: ${decodeResult.standardFr}`,
                              phonetic: decodeResult.phonetic,
                              category: "meetings",
                              exampleFr: decodeResult.exampleReplyFr,
                              exampleEn: decodeResult.exampleReplyEn,
                            })
                          }
                          className="px-2.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Save Card
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-semibold">
                          What Your Teammate Means:
                        </span>
                        <p className="text-sm font-medium text-white mt-1">
                          {decodeResult.meaningEn}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[11px] uppercase tracking-wider text-amber-400 font-semibold">
                          Standard / Duolingo French Equivalent:
                        </span>
                        <p className="text-sm font-medium text-slate-200 mt-1">
                          {decodeResult.standardFr}
                        </p>
                      </div>
                    </div>

                    {/* Word-by-word Breakdown */}
                    {decodeResult.breakdown &&
                      decodeResult.breakdown.length > 0 && (
                        <div>
                          <span className="text-xs font-semibold text-slate-300 block mb-2">
                            Québécois & Slang Breakdown:
                          </span>
                          <div className="space-y-1.5">
                            {decodeResult.breakdown.map((item, i) => (
                              <div
                                key={i}
                                className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80 text-xs flex flex-wrap items-baseline gap-2"
                              >
                                <span className="font-bold text-sky-300">
                                  {item.term}
                                </span>
                                <span className="text-slate-400">→</span>
                                <span className="font-semibold text-white">
                                  {item.meaning}
                                </span>
                                <span className="text-slate-400">
                                  ({item.note})
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Suggested Reply */}
                    {decodeResult.exampleReplyFr && (
                      <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-500/30 flex items-center justify-between gap-3">
                        <div>
                          <span className="text-[11px] font-semibold text-sky-300 uppercase">
                            Natural Reply You Can Say or Slack Back:
                          </span>
                          <p className="text-sm font-semibold text-white mt-0.5">
                            &ldquo;{decodeResult.exampleReplyFr}&rdquo;
                          </p>
                          <p className="text-xs text-slate-400">
                            {decodeResult.exampleReplyEn}
                          </p>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() =>
                              handlePlayAudio(decodeResult.exampleReplyFr)
                            }
                            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleCopy(
                                decodeResult.exampleReplyFr,
                                "reply-copy"
                              )
                            }
                            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                          >
                            {copiedId === "reply-copy" ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Recent Decoded History */}
              {recentDecodes.length > 0 && (
                <div className="bg-[#131b33] border border-slate-800 rounded-2xl p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
                    Recently Decoded Meeting Phrases (Cloud Firestore)
                  </h3>
                  <div className="space-y-2">
                    {recentDecodes.map((d) => (
                      <div
                        key={d.id}
                        className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <span className="font-semibold text-sky-300">
                            &ldquo;{d.original}&rdquo;
                          </span>{" "}
                          <span className="text-slate-400">→</span>{" "}
                          <span className="text-slate-200">{d.meaningEn}</span>
                        </div>
                        <button
                          onClick={() => handlePlayAudio(d.original)}
                          className="p-1.5 rounded-lg bg-slate-800 text-sky-400 shrink-0"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Québécois Connector & Filler Ear-Training Drill */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-[#131b33] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                      Ear-Training Mini-Game
                    </span>
                    <h2 className="text-base font-bold text-white">
                      Montreal Glue Words & Connectors
                    </h2>
                  </div>
                  <div className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    Score: {drillScore}
                  </div>
                </div>

                <p className="text-xs text-slate-400">
                  Your Montreal teammates keep tech terms in English, so the
                  hardest part of meetings is catching fast Québécois connector
                  words. Listen and pick the meaning!
                </p>

                {/* Active Drill Card */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400">
                        Connector #{(drillIndex % CONNECTOR_DRILLS.length) + 1}{" "}
                        of {CONNECTOR_DRILLS.length}
                      </span>
                      <h3 className="text-xl font-bold text-sky-300 mt-0.5">
                        &ldquo;{currentDrill.word}&rdquo;
                      </h3>
                      <span className="text-xs font-mono text-slate-400">
                        /{currentDrill.phonetic}/ • Standard FR:{" "}
                        {currentDrill.standardFrench}
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        handlePlayAudio(currentDrill.audioSentenceFr)
                      }
                      className="p-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/20"
                      title="Hear in context"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
                    <span className="text-slate-400 block mb-0.5">
                      In a Montreal meeting:
                    </span>
                    <p className="text-white font-medium text-sm">
                      &ldquo;{currentDrill.audioSentenceFr}&rdquo;
                    </p>
                  </div>

                  {/* Multiple Choice Options */}
                  <div className="space-y-2 pt-1">
                    {currentDrill.options.map((opt) => {
                      const isPicked = selectedOption === opt;
                      const isCorrect = opt === currentDrill.correctAnswer;
                      let btnStyle =
                        "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200";
                      if (selectedOption) {
                        if (isCorrect) {
                          btnStyle =
                            "bg-emerald-500/20 border-emerald-500/50 text-emerald-200 font-semibold";
                        } else if (isPicked) {
                          btnStyle =
                            "bg-rose-500/20 border-rose-500/50 text-rose-200";
                        }
                      }

                      return (
                        <button
                          key={opt}
                          disabled={Boolean(selectedOption)}
                          onClick={() => {
                            setSelectedOption(opt);
                            if (opt === currentDrill.correctAnswer) {
                              setDrillScore((s) => s + 1);
                              awardXp(10);
                            }
                          }}
                          className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-xs transition flex items-center justify-between ${btnStyle}`}
                        >
                          <span>{opt}</span>
                          {selectedOption && isCorrect && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {selectedOption && (
                    <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-500/30 text-xs space-y-2 animate-fadeIn">
                      <p className="text-slate-200">
                        <strong className="text-sky-300">Translation:</strong>{" "}
                        &ldquo;{currentDrill.audioSentenceEn}&rdquo;
                      </p>
                      <p className="text-slate-300">
                        <strong className="text-amber-300">Tip:</strong>{" "}
                        {currentDrill.tip}
                      </p>
                      <button
                        onClick={() => {
                          setSelectedOption(null);
                          setDrillIndex((i) => i + 1);
                        }}
                        className="w-full py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-semibold flex items-center justify-center gap-1"
                      >
                        Next Connector Drill
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 3: MONTREAL SWE PHRASEBOOK & SPACED REPETITION (SRS)
           ============================================================ */}
        {activeTab === "deck" && (
          <div className="space-y-6">
            {/* Sub-navigation for Deck Mode */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#131b33] border border-slate-800 p-3 rounded-2xl">
              <div className="flex gap-2">
                <button
                  onClick={() => setDeckMode("srs")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                    deckMode === "srs"
                      ? "bg-sky-500 text-white"
                      : "bg-slate-900 text-slate-300 hover:text-white"
                  }`}
                >
                  ⚡ Spaced Repetition Review ({dueCards.length} Due)
                </button>
                <button
                  onClick={() => setDeckMode("browse")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                    deckMode === "browse"
                      ? "bg-sky-500 text-white"
                      : "bg-slate-900 text-slate-300 hover:text-white"
                  }`}
                >
                  📚 Browse All {cards.length} Phrases
                </button>
                <button
                  onClick={() => setDeckMode("add")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1 ${
                    deckMode === "add"
                      ? "bg-emerald-500 text-white"
                      : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25"
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Phrase from Work
                </button>
              </div>

              <span className="text-xs text-slate-400">
                Backed by Cloud Firestore (<code>users/&#123;uid&#125;/cards</code>)
              </span>
            </div>

            {/* MODE A: SPACED REPETITION FLASHCARD REVIEW */}
            {deckMode === "srs" && activeSrsCard && (
              <div className="max-w-2xl mx-auto space-y-4">
                <div className="bg-[#131b33] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">
                      {activeSrsCard.category}
                    </span>
                    <span>
                      Interval: {activeSrsCard.interval}d • Ease:{" "}
                      {activeSrsCard.easeFactor}x
                    </span>
                  </div>

                  {/* Front of Card */}
                  <div className="text-center space-y-4 py-4">
                    <p className="text-xl sm:text-2xl font-bold text-white leading-snug">
                      &ldquo;{activeSrsCard.french}&rdquo;
                    </p>
                    {activeSrsCard.phonetic && (
                      <p className="text-xs font-mono text-sky-300/90">
                        /{activeSrsCard.phonetic}/
                      </p>
                    )}

                    <div className="flex justify-center gap-2 pt-2">
                      <button
                        onClick={() =>
                          handlePlayAudio(activeSrsCard.french, 0.78)
                        }
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-sky-300 flex items-center gap-1.5"
                      >
                        <Volume2 className="w-4 h-4" />
                        Slow (0.75x)
                      </button>
                      <button
                        onClick={() =>
                          handlePlayAudio(activeSrsCard.french, 1.0)
                        }
                        className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-xs font-semibold text-white flex items-center gap-1.5 shadow-lg shadow-sky-500/20"
                      >
                        <Volume2 className="w-4 h-4" />
                        Hear fr-CA Audio
                      </button>
                    </div>
                  </div>

                  {/* Flip Reveal Area */}
                  {!isFlipped ? (
                    <button
                      onClick={() => setIsFlipped(true)}
                      className="w-full py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sm font-semibold text-sky-300 transition flex items-center justify-center gap-2"
                    >
                      <HelpCircle className="w-4 h-4" />
                      Show English Meaning & Québécois Breakdown
                    </button>
                  ) : (
                    <div className="space-y-4 pt-4 border-t border-slate-800 animate-fadeIn">
                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                        <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-semibold">
                          English Meaning:
                        </span>
                        <p className="text-base font-semibold text-white">
                          {activeSrsCard.english}
                        </p>
                        {activeSrsCard.quebecoisNote && (
                          <p className="text-xs text-amber-300/90 pt-1">
                            ⚜️ <strong>Québécois Note:</strong>{" "}
                            {activeSrsCard.quebecoisNote}
                          </p>
                        )}
                      </div>

                      {activeSrsCard.exampleFr && (
                        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3">
                          <div className="text-xs">
                            <span className="text-slate-400">
                              Example in context:
                            </span>
                            <p className="text-sky-300 font-medium mt-0.5">
                              &ldquo;{activeSrsCard.exampleFr}&rdquo;
                            </p>
                            <p className="text-slate-400">
                              {activeSrsCard.exampleEn}
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              handlePlayAudio(activeSrsCard.exampleFr)
                            }
                            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 shrink-0"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {/* SM-2 Rating Buttons */}
                      <div className="grid grid-cols-4 gap-2 pt-2">
                        <button
                          onClick={() => handleGradeCard(0)}
                          className="py-2.5 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold flex flex-col items-center"
                        >
                          <span>Again</span>
                          <span className="text-[10px] text-rose-400/80">
                            &lt; 1m
                          </span>
                        </button>
                        <button
                          onClick={() => handleGradeCard(3)}
                          className="py-2.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold flex flex-col items-center"
                        >
                          <span>Hard</span>
                          <span className="text-[10px] text-amber-400/80">
                            1d
                          </span>
                        </button>
                        <button
                          onClick={() => handleGradeCard(4)}
                          className="py-2.5 px-3 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-xs font-semibold flex flex-col items-center"
                        >
                          <span>Good</span>
                          <span className="text-[10px] text-sky-400/80">
                            3d
                          </span>
                        </button>
                        <button
                          onClick={() => handleGradeCard(5)}
                          className="py-2.5 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex flex-col items-center"
                        >
                          <span>Easy</span>
                          <span className="text-[10px] text-emerald-400/80">
                            7d+
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* MODE B: BROWSE ALL PHRASES */}
            {deckMode === "browse" && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: "all", label: "All Categories" },
                      { id: "standup", label: "Standup & Sprint" },
                      { id: "code-review", label: "Code Review" },
                      { id: "meetings", label: "Meetings & Small Talk" },
                      { id: "connectors", label: "Québécois Connectors" },
                      { id: "slack", label: "Slack Replies" },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() =>
                          setCategoryFilter(cat.id as PhraseCategory | "all")
                        }
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                          categoryFilter === cat.id
                            ? "bg-sky-500 text-white"
                            : "bg-[#131b33] text-slate-400 hover:text-white border border-slate-800"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search Franglais, PR, tantôt..."
                      className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#131b33] border border-slate-800 text-xs text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredBrowseCards.map((card) => (
                    <div
                      key={card.id}
                      className="bg-[#131b33] border border-slate-800 rounded-2xl p-4 flex flex-col justify-between gap-3 hover:border-slate-700 transition"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-slate-900 text-sky-400 border border-slate-800">
                            {card.category}
                          </span>
                          <button
                            onClick={() => handlePlayAudio(card.french)}
                            className="p-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30"
                            title="Listen in fr-CA"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>
                        <h3 className="text-base font-bold text-white">
                          &ldquo;{card.french}&rdquo;
                        </h3>
                        {card.phonetic && (
                          <p className="text-xs font-mono text-slate-400">
                            /{card.phonetic}/
                          </p>
                        )}
                        <p className="text-sm font-medium text-emerald-300">
                          {card.english}
                        </p>
                        {card.quebecoisNote && (
                          <p className="text-xs text-slate-300 bg-slate-900/70 p-2.5 rounded-xl border border-slate-800/80">
                            ⚜️ {card.quebecoisNote}
                          </p>
                        )}
                      </div>

                      {card.exampleFr && (
                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                          <span>
                            Ex: <em className="text-slate-200">{card.exampleFr}</em>
                          </span>
                          <button
                            onClick={() => handlePlayAudio(card.exampleFr)}
                            className="text-sky-400 hover:underline ml-2 shrink-0"
                          >
                            Play Ex
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MODE C: ADD CUSTOM PHRASE TO FIRESTORE */}
            {deckMode === "add" && (
              <div className="max-w-xl mx-auto bg-[#131b33] border border-slate-800 rounded-2xl p-6 space-y-4">
                <h2 className="text-base font-bold text-white">
                  Add a New Montreal Expression to Your Firestore Deck
                </h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">
                      French / Québécois Phrase *
                    </label>
                    <input
                      type="text"
                      value={newFr}
                      onChange={(e) => setNewFr(e.target.value)}
                      placeholder="e.g. On se calle tantôt pour regarder le bug?"
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">
                      English Meaning *
                    </label>
                    <input
                      type="text"
                      value={newEn}
                      onChange={(e) => setNewEn(e.target.value)}
                      placeholder="e.g. Shall we hop on a call later today to look at the bug?"
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">
                        Category
                      </label>
                      <select
                        value={newCategory}
                        onChange={(e) =>
                          setNewCategory(e.target.value as PhraseCategory)
                        }
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white"
                      >
                        <option value="standup">Standup & Sprint</option>
                        <option value="code-review">Code Review</option>
                        <option value="meetings">Meetings & Small Talk</option>
                        <option value="connectors">Québécois Connectors</option>
                        <option value="slack">Slack Replies</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">
                        Phonetic Hint (Optional)
                      </label>
                      <input
                        type="text"
                        value={newPhonetic}
                        onChange={(e) => setNewPhonetic(e.target.value)}
                        placeholder="e.g. on suh kawl tan-toh"
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">
                      Québécois / Context Note
                    </label>
                    <input
                      type="text"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="e.g. 'Se caller' is a common Montreal verb from English 'to call'"
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">
                        Example Sentence (FR)
                      </label>
                      <input
                        type="text"
                        value={newExFr}
                        onChange={(e) => setNewExFr(e.target.value)}
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">
                        Example Translation (EN)
                      </label>
                      <input
                        type="text"
                        value={newExEn}
                        onChange={(e) => setNewExEn(e.target.value)}
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white"
                      />
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      if (!newFr.trim() || !newEn.trim()) return;
                      await handleQuickSaveCard({
                        french: newFr.trim(),
                        english: newEn.trim(),
                        quebecoisNote: newNote.trim(),
                        phonetic: newPhonetic.trim(),
                        category: newCategory,
                        exampleFr: newExFr.trim(),
                        exampleEn: newExEn.trim(),
                      });
                      setNewFr("");
                      setNewEn("");
                      setNewNote("");
                      setNewPhonetic("");
                      setNewExFr("");
                      setNewExEn("");
                      setDeckMode("browse");
                    }}
                    className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm transition"
                  >
                    Save Card to Firestore Deck (+15 XP)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#131b33] border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base">
                AI & Firebase Configuration
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Close ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
              <div className="text-emerald-400 font-semibold">
                ✓ Connected Firebase Project: <code>faque-mtl-dev-2026</code>
              </div>
              <div className="text-slate-400">
                Firestore Region: <code>northamerica-northeast1</code> (Montréal)
              </div>
              <div className="text-slate-400">
                Active Voice: <code>{voiceLabel}</code>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  AI Provider
                </label>
                <select
                  value={aiProvider}
                  onChange={(e) => {
                    const val = e.target.value as
                      | "firebase"
                      | "gemini"
                      | "openai";
                    setAiProvider(val);
                    localStorage.setItem("faque_ai_provider", val);
                  }}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white"
                >
                  <option value="firebase">
                    Firebase AI Logic (Gemini 3.8 Flash — Built-In, No Key
                    Required)
                  </option>
                  <option value="gemini">Custom Gemini API Key</option>
                  <option value="openai">Custom OpenAI API Key (gpt-4o-mini)</option>
                </select>
              </div>

              {aiProvider !== "firebase" && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {aiProvider === "openai"
                      ? "OpenAI API Key (sk-...)"
                      : "Gemini API Key (AIza...)"}
                  </label>
                  <input
                    type="password"
                    value={customApiKey}
                    onChange={(e) => {
                      setCustomApiKey(e.target.value);
                      localStorage.setItem("faque_ai_key", e.target.value);
                    }}
                    placeholder="Paste your API key..."
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
