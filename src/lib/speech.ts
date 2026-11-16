"use client";

import { firebaseConfigured, getTtsModel } from "./firebase";

export type Voice = "Aoede" | "Achird" | "Sulafat" | "Puck" | "browser";

export const VOICES: { id: Voice; label: string }[] = [
  { id: "Aoede", label: "Aoede — HD, female" },
  { id: "Achird", label: "Achird — HD, male" },
  { id: "Sulafat", label: "Sulafat — HD, female, warm" },
  { id: "Puck", label: "Puck — HD, male, upbeat" },
  { id: "browser", label: "Device voice (instant, offline)" },
];

const SAMPLE_RATE = 24000;
const pcmCache = new Map<string, Float32Array>();
// Set when HD voices are refused (e.g. App Check not enforced) so later taps
// go straight to the device voice instead of waiting on a doomed request.
let hdUnavailable = false;
let audioCtx: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === "closed") {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    audioCtx = new Ctx({ sampleRate: SAMPLE_RATE });
  }
  if (audioCtx.state === "suspended") void audioCtx.resume();
  return audioCtx;
}

export function stopSpeaking() {
  if (currentSource) {
    try {
      currentSource.stop();
      currentSource.disconnect();
    } catch {
      // already stopped
    }
    currentSource = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

function pcm16Base64ToFloat32(base64: string): Float32Array {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const int16 = new Int16Array(bytes.buffer, 0, Math.floor(bytes.length / 2));
  const out = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) out[i] = int16[i] / 32768;
  return out;
}

function playPcm(samples: Float32Array, rate: number) {
  stopSpeaking();
  const ctx = getAudioContext();
  const buffer = ctx.createBuffer(1, samples.length, SAMPLE_RATE);
  buffer.getChannelData(0).set(samples);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = rate;
  src.connect(ctx.destination);
  currentSource = src;
  src.start(0);
}

function frenchBrowserVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang.toLowerCase() === "fr-fr") ||
    voices.find((v) => v.lang.toLowerCase().startsWith("fr")) ||
    null
  );
}

function speakWithBrowser(text: string, rate: number): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window))
    return false;
  stopSpeaking();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "fr-FR";
  u.rate = rate;
  const v = frenchBrowserVoice();
  if (v) u.voice = v;
  window.speechSynthesis.speak(u);
  return true;
}

/**
 * Speak French text. Uses Gemini HD voices via Firebase AI Logic when
 * available (cached per text), falling back to the device's French voice.
 */
export async function speakFrench(
  text: string,
  opts: { rate?: number; voice?: Voice } = {}
): Promise<void> {
  if (typeof window === "undefined") return;
  const rate = opts.rate ?? 1;
  const voice = opts.voice ?? "Aoede";
  const clean = text.trim();
  if (!clean) return;

  if (voice === "browser" || !firebaseConfigured || hdUnavailable) {
    speakWithBrowser(clean, rate);
    return;
  }

  const key = `${voice}:${clean}`;
  const cached = pcmCache.get(key);
  if (cached) {
    playPcm(cached, rate);
    return;
  }

  const prompt = `Read the following French text aloud clearly, with standard French pronunciation, at a calm pace suitable for a beginner learner. Read only the text:\n${clean}`;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await getTtsModel(voice).generateContent(prompt);
      const data = res.response.inlineDataParts()?.[0]?.inlineData?.data;
      if (data) {
        const samples = pcm16Base64ToFloat32(data);
        pcmCache.set(key, samples);
        playPcm(samples, rate);
        return;
      }
    } catch (err) {
      console.warn(`HD voice attempt ${attempt + 1} failed`, err);
      const msg = String(err instanceof Error ? err.message : err);
      if (/403|App Check|PERMISSION_DENIED|404|not found/i.test(msg)) {
        hdUnavailable = true;
        break;
      }
    }
  }
  speakWithBrowser(clean, rate);
}
