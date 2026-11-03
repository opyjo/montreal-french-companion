"use client";

import { getFirebaseTtsModel } from "./firebase";

export type GeminiHdVoice = "Aoede" | "Achird" | "Sulafat" | "Puck";

export const GEMINI_HD_VOICES: {
  id: GeminiHdVoice;
  label: string;
  desc: string;
}[] = [
  { id: "Aoede", label: "Aoede (HD Female)", desc: "Natural, breezy fr-CA" },
  { id: "Achird", label: "Achird (HD Male)", desc: "Friendly Montreal dev" },
  { id: "Sulafat", label: "Sulafat (HD Female)", desc: "Warm & clear fr-CA" },
  { id: "Puck", label: "Puck (HD Male)", desc: "Upbeat & energetic" },
];

// Cache decoded 24kHz PCM Float32Arrays in memory by voice + text so replays are instant
const pcmCache = new Map<string, Float32Array>();
let activeAudioCtx: AudioContext | null = null;
let activeSourceNode: AudioBufferSourceNode | null = null;

function getAudioContext(): AudioContext {
  if (!activeAudioCtx || activeAudioCtx.state === "closed") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    activeAudioCtx = new AudioCtx({ sampleRate: 24000 });
  }
  if (activeAudioCtx.state === "suspended") {
    activeAudioCtx.resume();
  }
  return activeAudioCtx;
}

function stopCurrentAudio() {
  if (activeSourceNode) {
    try {
      activeSourceNode.stop();
      activeSourceNode.disconnect();
    } catch {
      // ignore if already stopped
    }
    activeSourceNode = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

function decodeBase64Pcm16ToFloat32(base64: string): Float32Array {
  const binaryStr = atob(base64);
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768.0;
  }
  return float32;
}

function playFloat32Pcm(float32: Float32Array, rate = 1.0) {
  stopCurrentAudio();
  const ctx = getAudioContext();
  const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
  audioBuffer.getChannelData(0).set(float32);

  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;
  source.playbackRate.value = rate;
  source.connect(ctx.destination);
  activeSourceNode = source;
  source.start(0);
}

export function getCanadianFrenchVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return null;
  }
  const voices = window.speechSynthesis.getVoices();
  const frCa = voices.find(
    (v) =>
      v.lang.toLowerCase() === "fr-ca" ||
      v.lang.toLowerCase().startsWith("fr-ca") ||
      v.name.toLowerCase().includes("amélie") ||
      v.name.toLowerCase().includes("amelie") ||
      v.name.toLowerCase().includes("nicolas")
  );
  if (frCa) return frCa;
  return voices.find((v) => v.lang.toLowerCase().startsWith("fr")) || null;
}

function fallbackBrowserSpeak(text: string, rate = 1.0): string {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return "Audio unavailable";
  }
  stopCurrentAudio();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "fr-CA";
  utterance.rate = rate;
  const voice = getCanadianFrenchVoice();
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
  return voice ? `${voice.name} (Browser fallback)` : "Browser fr-CA";
}

/**
 * Generates ultra-natural Canadian French / Montreal Québécois speech using
 * Firebase AI Logic (`gemini-3.1-flash-tts-preview`) with 24kHz PCM playback and caching.
 */
export async function speakFrench(
  text: string,
  rate = 1.0,
  voiceName: GeminiHdVoice = "Aoede",
  onLoadingChange?: (loading: boolean) => void
): Promise<string> {
  if (typeof window === "undefined") return "SSR";

  const cacheKey = `${voiceName}:${text.trim()}`;
  const cachedPcm = pcmCache.get(cacheKey);
  if (cachedPcm) {
    playFloat32Pcm(cachedPcm, rate);
    return `Gemini HD (${voiceName} • fr-CA Cached)`;
  }

  onLoadingChange?.(true);
  // Structured prompt per Firebase AI Logic TTS documentation to ensure natural Montreal Québécois cadence
  const prompt = `[Audio Profile: A warm, friendly native Montreal software engineer speaking natural Canadian French (Québécois / Franglais)]
[Scene: A casual daily standup or team chat in Montreal]
[Director's Notes: Read the following French text naturally and conversationally with an authentic Montreal Canadian French (fr-CA) pronunciation. Read ONLY the text below:]
${text}`;

  // Up to 2 attempts in case of transient 500 text-token return per Gemini TTS docs
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const model = getFirebaseTtsModel(voiceName);
      const result = await model.generateContent(prompt);
      const inlineDataParts = result.response.inlineDataParts();
      if (inlineDataParts?.[0]?.inlineData?.data) {
        const float32 = decodeBase64Pcm16ToFloat32(
          inlineDataParts[0].inlineData.data
        );
        pcmCache.set(cacheKey, float32);
        onLoadingChange?.(false);
        playFloat32Pcm(float32, rate);
        return `Gemini HD (${voiceName} • fr-CA)`;
      }
    } catch (err) {
      console.warn(`Gemini TTS attempt ${attempt + 1} failed:`, err);
    }
  }

  onLoadingChange?.(false);
  return fallbackBrowserSpeak(text, rate);
}
