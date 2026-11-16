import { VERBS, type VerbDef } from "@/data/verbs";

export type Tense = "present" | "passe-compose" | "futur-proche" | "imparfait" | "futur";

export interface TenseInfo {
  id: Tense;
  name: string;
  english: string; // what it means in English
  when: string;
  how: string;
}

/** In the order Duolingo introduces them. */
export const TENSES: TenseInfo[] = [
  {
    id: "present",
    name: "Présent",
    english: "I eat / I am eating",
    when: "Now, habits, and general facts. French has no separate \"-ing\" form: je mange = I eat AND I am eating.",
    how: "Regular -er: drop -er, add -e, -es, -e, -ons, -ez, -ent. Regular -ir: -is, -is, -it, -issons, -issez, -issent. Regular -re: -s, -s, (nothing), -ons, -ez, -ent.",
  },
  {
    id: "passe-compose",
    name: "Passé composé",
    english: "I ate / I have eaten",
    when: "Finished actions in the past: what happened.",
    how: "avoir (or être) in the present + past participle: j'ai mangé. Verbs of movement like aller, venir, partir, arriver, plus all reflexive verbs, use être, and the participle agrees: elle est allée, ils sont partis.",
  },
  {
    id: "futur-proche",
    name: "Futur proche",
    english: "I'm going to eat",
    when: "Plans and the near future. It's the easiest future, and the most common in speech.",
    how: "aller in the present + infinitive: je vais manger, nous allons partir.",
  },
  {
    id: "imparfait",
    name: "Imparfait",
    english: "I was eating / I used to eat",
    when: "Background in the past: what was going on, what used to happen, descriptions (il faisait beau).",
    how: "Take the nous form of the present, drop -ons, add -ais, -ais, -ait, -ions, -iez, -aient. Only être is irregular: j'étais.",
  },
  {
    id: "futur",
    name: "Futur simple",
    english: "I will eat",
    when: "The future, a bit more formal or certain than futur proche.",
    how: "Infinitive (drop the final e of -re verbs) + -ai, -as, -a, -ons, -ez, -ont. A handful of verbs have irregular stems: ser-, aur-, ir-, fer-, pourr-, voudr-, viendr-, verr-…",
  },
];

export const TENSE_BY_ID = Object.fromEntries(TENSES.map((t) => [t.id, t])) as Record<Tense, TenseInfo>;

export const PERSONS = ["je", "tu", "il/elle/on", "nous", "vous", "ils/elles"] as const;
const REFLEXIVE = ["me", "te", "se", "nous", "vous", "se"];

export interface Form {
  person: number; // 0–5
  verb: string; // what you type: "mange", "suis allé(e)", "vais m'appeler"
  full: string; // with the subject pronoun: "je mange", "j'ai mangé"
  subject: string; // "je" / "j'" / "il/elle/on"…
}

export interface Verb extends VerbDef {
  key: string; // url/db-safe id: "se_lever"
  base: string; // without reflexive pronoun: "lever"
  reflexive: boolean;
  rank: number;
}

const VOWEL = /^[aeiouhàâäéèêëîïôöùûüœ]/i;

export function startsWithVowelSound(s: string): boolean {
  return VOWEL.test(s);
}

/** je → j', me → m'… before a vowel or silent h. */
function elide(word: "je" | "me" | "te" | "se", next: string): string {
  return startsWithVowelSound(next) ? `${word[0]}'` : word;
}

function joinElided(first: string, rest: string): string {
  return first.endsWith("'") ? first + rest : `${first} ${rest}`;
}

function withReflexive(v: Verb, person: number, rest: string): string {
  if (!v.reflexive) return rest;
  const p = REFLEXIVE[person];
  const pron = p === "me" || p === "te" || p === "se" ? elide(p, rest) : p;
  return joinElided(pron, rest);
}

export const ALL_VERBS: Verb[] = VERBS.map((d, i) => {
  const reflexive = /^(se |s')/.test(d.inf);
  const base = d.inf.replace(/^(se |s')/, "");
  return { ...d, key: d.inf.replace(/'/g, "").replace(/\s+/g, "_"), base, reflexive, rank: i + 1 };
});

export const VERB_BY_KEY = Object.fromEntries(ALL_VERBS.map((v) => [v.key, v])) as Record<string, Verb>;

// ---------------------------------------------------------------------------

function presentStems(v: Verb): string[] {
  if (v.present) return v.present;
  const b = v.base;
  if (v.group === "er") {
    const stem = b.slice(0, -2);
    let nous = stem + "ons";
    if (stem.endsWith("g")) nous = stem + "eons"; // mangeons
    if (stem.endsWith("c")) nous = stem.slice(0, -1) + "çons"; // commençons
    return [stem + "e", stem + "es", stem + "e", nous, stem + "ez", stem + "ent"];
  }
  if (v.group === "ir") {
    const stem = b.slice(0, -2);
    return [stem + "is", stem + "is", stem + "it", stem + "issons", stem + "issez", stem + "issent"];
  }
  if (v.group === "re") {
    const stem = b.slice(0, -2);
    return [stem + "s", stem + "s", stem, stem + "ons", stem + "ez", stem + "ent"];
  }
  throw new Error(`Irregular verb ${v.inf} needs a present table`);
}

export function pastParticiple(v: Verb): string {
  if (v.pp) return v.pp;
  if (v.base === "aller") return "allé";
  const b = v.base;
  if (b.endsWith("er")) return b.slice(0, -2) + "é";
  if (b.endsWith("ir")) return b.slice(0, -2) + "i";
  if (b.endsWith("re")) return b.slice(0, -2) + "u";
  return b;
}

export function auxiliary(v: Verb): "avoir" | "être" {
  return v.reflexive ? "être" : v.aux ?? "avoir";
}

const AVOIR = ["ai", "as", "a", "avons", "avez", "ont"];
const ETRE = ["suis", "es", "est", "sommes", "êtes", "sont"];
const ALLER = ["vais", "vas", "va", "allons", "allez", "vont"];
const AGREE = ["(e)", "(e)", "(e)", "(e)s", "(e)(s)", "(e)s"];

/** Keep the g soft / c soft before the -i- endings: mangions, commencions. */
function imperfectStemFor(stem: string, ending: string): string {
  if (ending.startsWith("i")) {
    if (stem.endsWith("ge")) return stem.slice(0, -1);
    if (stem.endsWith("ç")) return stem.slice(0, -1) + "c";
  }
  return stem;
}

function verbPart(v: Verb, tense: Tense, person: number): string {
  switch (tense) {
    case "present":
      return withReflexive(v, person, presentStems(v)[person]);
    case "imparfait": {
      const stem = v.imperfectStem ?? presentStems(v)[3].replace(/ons$/, "");
      const ending = ["ais", "ais", "ait", "ions", "iez", "aient"][person];
      return withReflexive(v, person, imperfectStemFor(stem, ending) + ending);
    }
    case "futur": {
      const stem = v.futureStem ?? (v.base.endsWith("re") ? v.base.slice(0, -1) : v.base);
      return withReflexive(v, person, stem + ["ai", "as", "a", "ons", "ez", "ont"][person]);
    }
    case "futur-proche":
      return `${ALLER[person]} ${withReflexive(v, person, v.base)}`;
    case "passe-compose": {
      const etre = auxiliary(v) === "être";
      const aux = (etre ? ETRE : AVOIR)[person];
      const pp = pastParticiple(v) + (etre ? AGREE[person] : "");
      return `${withReflexive(v, person, aux)} ${pp}`;
    }
  }
}

function subjectFor(person: number, verb: string, pronoun?: string): string {
  if (person === 0) return elide("je", verb);
  return pronoun ?? PERSONS[person];
}

export function conjugate(v: Verb, tense: Tense, person: number, pronoun?: string): Form {
  const verb = verbPart(v, tense, person);
  const subject = subjectFor(person, verb, pronoun);
  return { person, verb, subject, full: joinElided(subject, verb) };
}

export function table(v: Verb, tense: Tense): Form[] {
  return [0, 1, 2, 3, 4, 5].map((p) => conjugate(v, tense, p));
}

/**
 * For colouring endings: the stem shared by all six forms (only for simple
 * tenses, and only when it's meaningful — irregular verbs often share none).
 */
export function sharedStem(forms: Form[]): string {
  const words = forms.map((f) => f.verb.split(" ").pop() || "");
  let prefix = words[0];
  for (const w of words) {
    let i = 0;
    while (i < prefix.length && i < w.length && prefix[i] === w[i]) i++;
    prefix = prefix.slice(0, i);
  }
  return prefix.length >= 2 ? prefix : "";
}

/** "Which forms sound identical?" — the classic -er trap. */
export function soundsAlikeNote(v: Verb, tense: Tense): string | null {
  if (tense === "present" && (v.group === "er" || v.base === "ouvrir"))
    return `Je, tu, il and ils forms all sound the same; only the spelling changes. Listen: ${table(v, "present")[0].full}.`;
  if (tense === "imparfait")
    return "Je, tu, il and ils forms (-ais, -ais, -ait, -aient) all sound the same.";
  if (tense === "present" && (v.group === "ir" || v.group === "re" || v.group === "irregular")) {
    const t = table(v, "present").map((f) => f.verb.split(" ").pop() || "");
    const je = t[0].replace(/[sx]$/, "");
    if (t[0] === t[1] && (t[2] === je || t[2].replace(/t$/, "") === je))
      return "Je, tu and il forms sound the same (the final s / x / t / d is silent).";
  }
  return null;
}

export function groupLabel(v: Verb): string {
  if (v.group === "irregular") return "irregular";
  if (v.present) return `-${v.group} (spelling change)`;
  if (v.group === "er" && /[gc]er$/.test(v.base)) return "-er (spelling change)";
  return `regular -${v.group}`;
}
