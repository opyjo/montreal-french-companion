/**
 * Beginner grammar cheat sheets (Duolingo sections 1–2), written by hand.
 * Blocks render generically; every quiz answer must be one of its options
 * (checked by grammar.test.ts).
 */

export type Block =
  | { type: "text"; text: string }
  | { type: "table"; head: string[]; rows: string[][]; speak?: number } // speak = column index read aloud
  | { type: "examples"; items: { fr: string; en: string }[] }
  | { type: "tip"; text: string }
  | { type: "trap"; text: string };

export interface QuizQuestion {
  prompt: string;
  options: string[];
  answer: string;
  explain: string;
}

export interface GrammarTopic {
  id: string;
  title: string;
  summary: string;
  blocks: Block[];
  quiz: QuizQuestion[];
}

export const GRAMMAR: GrammarTopic[] = [
  {
    id: "articles",
    title: "Le, la, les, un, une, des",
    summary: "Every noun is masculine or feminine, and the little word in front tells you which.",
    blocks: [
      { type: "text", text: "Always learn a noun together with its article. That's how you remember its gender." },
      {
        type: "table",
        head: ["", "masculine", "feminine", "plural"],
        rows: [
          ["the", "le (l')", "la (l')", "les"],
          ["a / some", "un", "une", "des"],
        ],
      },
      { type: "tip", text: "le and la become l' before a vowel or a silent h: l'ami, l'eau, l'hôtel." },
      {
        type: "examples",
        items: [
          { fr: "le chat", en: "the cat" },
          { fr: "la maison", en: "the house" },
          { fr: "l'école", en: "the school (feminine)" },
          { fr: "les enfants", en: "the children" },
          { fr: "un livre", en: "a book" },
          { fr: "une pomme", en: "an apple" },
          { fr: "des amis", en: "(some) friends" },
        ],
      },
      {
        type: "trap",
        text: "English often drops the article; French doesn't. \"I like cheese\" = J'aime le fromage. \"I have friends\" = J'ai des amis.",
      },
    ],
    quiz: [
      { prompt: "___ maison est grande.", options: ["Le", "La", "L'", "Les"], answer: "La", explain: "maison is feminine → la." },
      { prompt: "J'ai ___ chien.", options: ["un", "une", "des", "le"], answer: "un", explain: "chien is masculine, and \"a dog\" → un." },
      { prompt: "___ école est fermée.", options: ["Le", "La", "L'", "Les"], answer: "L'", explain: "école starts with a vowel, so la → l'." },
      { prompt: "J'aime ___ chocolat. (I like chocolate)", options: ["le", "un", "du", "de"], answer: "le", explain: "After aimer, adorer, détester, préférer, use le / la / les." },
      { prompt: "Il y a ___ enfants dans le parc.", options: ["des", "les", "un", "de"], answer: "des", explain: "\"(some) children\" → des." },
    ],
  },
  {
    id: "gender",
    title: "Is it le or la? Ending clues",
    summary: "No rule is perfect, but the end of a word is a strong hint.",
    blocks: [
      {
        type: "table",
        head: ["usually feminine (la)", "usually masculine (le)"],
        rows: [
          ["-tion, -sion: la nation, la télévision", "-age: le fromage, le voyage"],
          ["-té: la liberté, la santé", "-ment: le moment, le bâtiment"],
          ["-ette: la baguette", "-eau: le bateau, le gâteau"],
          ["-ance, -ence: la chance, la science", "-isme: le tourisme"],
          ["-ure: la voiture, la culture", "-oir: le soir, le miroir"],
          ["-ie: la boulangerie, la vie", "-ier: le cahier, le panier"],
        ],
      },
      { type: "tip", text: "Many nouns ending in -e are feminine, but plenty aren't: le livre, le monde, le problème." },
      {
        type: "trap",
        text: "Common exceptions: la plage, la page, l'image (f.) despite -age; l'eau (f.) and la peau despite -eau.",
      },
    ],
    quiz: [
      { prompt: "___ télévision", options: ["le", "la"], answer: "la", explain: "-sion words are feminine." },
      { prompt: "___ fromage", options: ["le", "la"], answer: "le", explain: "-age words are usually masculine." },
      { prompt: "___ plage", options: ["le", "la"], answer: "la", explain: "A famous exception: la plage." },
      { prompt: "___ moment", options: ["le", "la"], answer: "le", explain: "-ment words are masculine." },
      { prompt: "___ liberté", options: ["le", "la"], answer: "la", explain: "-té words are feminine." },
    ],
  },
  {
    id: "partitive",
    title: "Du, de la, des (some)",
    summary: "For things you can't count, French says \"some\" even when English says nothing.",
    blocks: [
      {
        type: "table",
        head: ["", "use", "example"],
        rows: [
          ["masculine", "du", "du pain (bread)"],
          ["feminine", "de la", "de la musique (music)"],
          ["before a vowel", "de l'", "de l'eau (water)"],
          ["plural", "des", "des pâtes (pasta)"],
        ],
      },
      {
        type: "examples",
        items: [
          { fr: "Je bois du café.", en: "I drink coffee." },
          { fr: "Tu veux de la soupe ?", en: "Do you want some soup?" },
          { fr: "Il mange des fraises.", en: "He's eating strawberries." },
        ],
      },
      { type: "trap", text: "After a negative they all become de (d'): Je ne mange pas de viande. Je n'ai pas d'argent." },
      { type: "tip", text: "With aimer, adorer, détester and préférer, use le / la / les: J'aime le café, but je bois du café." },
    ],
    quiz: [
      { prompt: "Je bois ___ eau.", options: ["du", "de la", "de l'", "des"], answer: "de l'", explain: "eau starts with a vowel → de l'." },
      { prompt: "Tu veux ___ pain ?", options: ["du", "de la", "le", "un"], answer: "du", explain: "pain is masculine and uncountable → du." },
      { prompt: "Je ne mange pas ___ viande.", options: ["de", "de la", "la", "du"], answer: "de", explain: "After ne… pas, du / de la / des → de." },
      { prompt: "J'adore ___ fromage.", options: ["du", "le", "de", "un"], answer: "le", explain: "After adorer, use the definite article: le." },
      { prompt: "Elle mange ___ pâtes.", options: ["des", "du", "de la", "les"], answer: "des", explain: "pâtes is plural → des." },
    ],
  },
  {
    id: "negation",
    title: "Saying no: ne… pas",
    summary: "Wrap the verb: ne + verb + pas.",
    blocks: [
      {
        type: "table",
        head: ["French", "meaning"],
        rows: [
          ["ne… pas", "not"],
          ["ne… jamais", "never"],
          ["ne… plus", "no longer, not anymore"],
          ["ne… rien", "nothing"],
          ["ne… personne", "nobody"],
        ],
      },
      {
        type: "examples",
        items: [
          { fr: "Je ne parle pas anglais.", en: "I don't speak English." },
          { fr: "Je n'aime pas le thé.", en: "I don't like tea." },
          { fr: "Il ne mange jamais de viande.", en: "He never eats meat." },
          { fr: "Je ne travaille plus.", en: "I don't work anymore." },
          { fr: "Je n'ai pas mangé.", en: "I didn't eat." },
        ],
      },
      { type: "tip", text: "ne becomes n' before a vowel. In the passé composé, wrap the helper verb: je n'ai pas mangé, il n'est pas venu." },
      { type: "trap", text: "un, une, du, de la and des become de after a negative: J'ai un chat → Je n'ai pas de chat." },
      { type: "tip", text: "In casual speech people often drop ne (\"Je sais pas\"), but Duolingo expects it." },
    ],
    quiz: [
      { prompt: "Je ___ aime pas le thé.", options: ["ne", "n'", "pas", "non"], answer: "n'", explain: "aime starts with a vowel → n'." },
      { prompt: "Il ne mange ___ de viande. (never)", options: ["jamais", "plus", "rien", "pas"], answer: "jamais", explain: "ne… jamais = never." },
      { prompt: "Je n'ai pas ___ voiture. (I don't have a car)", options: ["une", "de", "la", "d'"], answer: "de", explain: "une → de after a negative (voiture starts with a consonant)." },
      {
        prompt: "\"I didn't go\"",
        options: ["Je ne suis pas allé.", "Je ne suis allé pas.", "Je suis ne pas allé.", "Je pas suis allé."],
        answer: "Je ne suis pas allé.",
        explain: "In the passé composé, ne… pas wraps the helper verb (suis).",
      },
      { prompt: "Je ne vois ___. (I don't see anything)", options: ["rien", "personne", "jamais", "plus"], answer: "rien", explain: "ne… rien = nothing." },
    ],
  },
  {
    id: "questions",
    title: "Asking questions",
    summary: "Three ways to ask, from casual to formal, plus the question words.",
    blocks: [
      {
        type: "examples",
        items: [
          { fr: "Tu parles français ?", en: "Casual: just raise your voice at the end." },
          { fr: "Est-ce que tu parles français ?", en: "Neutral: put est-ce que in front." },
          { fr: "Parles-tu français ?", en: "Formal: swap the verb and pronoun, add a hyphen." },
        ],
      },
      {
        type: "table",
        head: ["French", "English"],
        rows: [
          ["qui", "who"],
          ["que / qu'est-ce que / quoi", "what"],
          ["où", "where"],
          ["quand", "when"],
          ["comment", "how"],
          ["pourquoi", "why (answer: parce que)"],
          ["combien (de)", "how much / how many"],
          ["quel / quelle", "which / what"],
        ],
        speak: 0,
      },
      {
        type: "examples",
        items: [
          { fr: "Où est la gare ?", en: "Where is the station?" },
          { fr: "Qu'est-ce que tu fais ?", en: "What are you doing?" },
          { fr: "Comment tu t'appelles ?", en: "What's your name?" },
          { fr: "Quelle heure est-il ?", en: "What time is it?" },
        ],
      },
      { type: "tip", text: "With inversion, il / elle after a vowel gets an extra -t-: A-t-il un chien ? Parle-t-elle anglais ?" },
    ],
    quiz: [
      { prompt: "___ habites-tu ? (where)", options: ["Où", "Quand", "Qui", "Comment"], answer: "Où", explain: "où = where." },
      { prompt: "___ est-ce que tu fais ? (what)", options: ["Qu'", "Quoi", "Quel", "Qui"], answer: "Qu'", explain: "qu'est-ce que = what (que → qu' before est-ce)." },
      { prompt: "___ tu t'appelles ? (What's your name?)", options: ["Comment", "Quel", "Quoi", "Où"], answer: "Comment", explain: "Literally \"How do you call yourself?\"" },
      { prompt: "___ coûte le livre ? (how much)", options: ["Combien", "Comment", "Quand", "Pourquoi"], answer: "Combien", explain: "combien = how much." },
      {
        prompt: "The formal way to ask \"Tu parles anglais ?\"",
        options: ["Parles-tu anglais ?", "Tu parles-tu anglais ?", "Est-ce tu parles anglais ?", "Parle-tu anglais ?"],
        answer: "Parles-tu anglais ?",
        explain: "Inversion: verb, hyphen, pronoun, and the verb keeps its tu ending (-es).",
      },
    ],
  },
  {
    id: "adjectives",
    title: "Adjectives: agreement and position",
    summary: "Adjectives match the noun, and most go after it.",
    blocks: [
      {
        type: "table",
        head: ["", "masculine", "feminine"],
        rows: [
          ["singular", "petit", "petite"],
          ["plural", "petits", "petites"],
        ],
      },
      { type: "text", text: "Add -e for feminine, -s for plural, -es for both. An adjective that already ends in -e doesn't add another: un livre rouge, une voiture rouge." },
      {
        type: "text",
        text: "Most adjectives go AFTER the noun: une voiture rouge, un film intéressant. A few short common ones go BEFORE. Remember BAGS: Beauty (beau, joli), Age (jeune, vieux, nouveau), Goodness (bon, mauvais), Size (grand, petit, gros).",
      },
      {
        type: "table",
        head: ["masculine", "feminine"],
        rows: [
          ["beau", "belle"],
          ["nouveau", "nouvelle"],
          ["vieux", "vieille"],
          ["bon", "bonne"],
          ["blanc", "blanche"],
          ["gentil", "gentille"],
        ],
        speak: 0,
      },
      {
        type: "examples",
        items: [
          { fr: "un grand appartement", en: "a big apartment" },
          { fr: "une petite maison", en: "a small house" },
          { fr: "une robe noire", en: "a black dress" },
          { fr: "des chaussures noires", en: "black shoes" },
        ],
      },
    ],
    quiz: [
      { prompt: "une maison ___ (white)", options: ["blanc", "blanche", "blancs", "blanches"], answer: "blanche", explain: "maison is feminine singular, and blanc → blanche." },
      { prompt: "\"a small cat\"", options: ["un petit chat", "un chat petit", "une petite chat", "un petits chat"], answer: "un petit chat", explain: "petit is a size adjective (BAGS), so it goes before the noun." },
      { prompt: "des voitures ___ (red)", options: ["rouge", "rouges", "rougees", "roux"], answer: "rouges", explain: "Feminine plural; rouge already ends in -e, so just add -s." },
      { prompt: "une ___ idée (good)", options: ["bon", "bonne", "bons", "bien"], answer: "bonne", explain: "idée is feminine: bon → bonne." },
      { prompt: "C'est une ___ femme. (beautiful)", options: ["beau", "belle", "bel", "beaux"], answer: "belle", explain: "Feminine of beau is belle." },
    ],
  },
  {
    id: "possessives",
    title: "My, your, his: mon, ma, mes",
    summary: "The possessive agrees with the thing owned, not the owner.",
    blocks: [
      {
        type: "table",
        head: ["", "masc.", "fem.", "plural"],
        rows: [
          ["my", "mon", "ma", "mes"],
          ["your (tu)", "ton", "ta", "tes"],
          ["his / her", "son", "sa", "ses"],
          ["our", "notre", "notre", "nos"],
          ["your (vous)", "votre", "votre", "vos"],
          ["their", "leur", "leur", "leurs"],
        ],
      },
      { type: "trap", text: "sa voiture can mean his car OR her car: it's feminine because voiture is, not because of the owner." },
      { type: "tip", text: "Before a feminine word starting with a vowel, use mon / ton / son: mon amie, ton école, son adresse." },
      {
        type: "examples",
        items: [
          { fr: "mon frère et ma sœur", en: "my brother and my sister" },
          { fr: "mes parents", en: "my parents" },
          { fr: "leur maison", en: "their house" },
          { fr: "leurs enfants", en: "their children" },
        ],
      },
    ],
    quiz: [
      { prompt: "___ mère (my)", options: ["mon", "ma", "mes", "me"], answer: "ma", explain: "mère is feminine → ma." },
      { prompt: "___ amie (my, a female friend)", options: ["mon", "ma", "m'", "mes"], answer: "mon", explain: "Feminine but starts with a vowel → mon." },
      { prompt: "Paul aime ___ voiture. (his)", options: ["sa", "son", "ses", "leur"], answer: "sa", explain: "voiture is feminine → sa, even though Paul is male." },
      { prompt: "___ enfants (our)", options: ["notre", "nos", "nous", "votre"], answer: "nos", explain: "Plural → nos." },
      { prompt: "Ils aiment ___ maison. (their)", options: ["leur", "leurs", "son", "sa"], answer: "leur", explain: "One house, several owners → leur." },
    ],
  },
  {
    id: "places",
    title: "à, au, en, chez: going places",
    summary: "Small words for places, and the contractions you can't skip.",
    blocks: [
      {
        type: "table",
        head: ["", "+ le", "+ la", "+ l'", "+ les"],
        rows: [
          ["à (to / at)", "au", "à la", "à l'", "aux"],
          ["de (from / of)", "du", "de la", "de l'", "des"],
        ],
      },
      { type: "trap", text: "à + le and de + le must contract: never à le or de le. Je vais au parc. Je viens du parc." },
      {
        type: "table",
        head: ["place", "word", "example"],
        rows: [
          ["city", "à", "J'habite à Paris."],
          ["feminine country (most end in -e)", "en", "en France, en Italie"],
          ["masculine country", "au", "au Canada, au Japon"],
          ["plural country", "aux", "aux États-Unis"],
          ["someone's place", "chez", "chez Marie, chez le médecin"],
        ],
      },
      {
        type: "examples",
        items: [
          { fr: "Je vais au cinéma.", en: "I'm going to the cinema." },
          { fr: "Elle est à la plage.", en: "She's at the beach." },
          { fr: "On va à l'école.", en: "We're going to school." },
          { fr: "Je viens du Canada.", en: "I'm from Canada." },
        ],
      },
    ],
    quiz: [
      { prompt: "Je vais ___ cinéma.", options: ["à le", "au", "à la", "en"], answer: "au", explain: "cinéma is masculine: à + le → au." },
      { prompt: "Elle habite ___ France.", options: ["en", "au", "à", "à la"], answer: "en", explain: "France is a feminine country → en." },
      { prompt: "Nous allons ___ Canada.", options: ["au", "en", "à", "aux"], answer: "au", explain: "Canada is masculine → au." },
      { prompt: "Il habite ___ Montréal.", options: ["à", "en", "au", "dans"], answer: "à", explain: "Cities take à." },
      { prompt: "Je reviens ___ parc.", options: ["du", "de le", "de la", "des"], answer: "du", explain: "de + le → du." },
    ],
  },
  {
    id: "numbers",
    title: "Numbers 0–100",
    summary: "Easy up to 69, then French starts doing maths.",
    blocks: [
      {
        type: "table",
        head: ["", "", ""],
        rows: [
          ["0 zéro", "10 dix", "20 vingt"],
          ["1 un", "11 onze", "30 trente"],
          ["2 deux", "12 douze", "40 quarante"],
          ["3 trois", "13 treize", "50 cinquante"],
          ["4 quatre", "14 quatorze", "60 soixante"],
          ["5 cinq", "15 quinze", "70 soixante-dix"],
          ["6 six", "16 seize", "80 quatre-vingts"],
          ["7 sept", "17 dix-sept", "90 quatre-vingt-dix"],
          ["8 huit", "18 dix-huit", "100 cent"],
          ["9 neuf", "19 dix-neuf", ""],
        ],
      },
      { type: "text", text: "21, 31, 41, 51, 61 and 71 use \"et un\": vingt et un, soixante et onze. The others use a hyphen: vingt-deux, trente-cinq." },
      {
        type: "text",
        text: "70–99 count on from 60 and 80: 70 = 60 + 10 (soixante-dix), 75 = soixante-quinze, 80 = 4 × 20 (quatre-vingts), 85 = quatre-vingt-cinq (the s drops), 90 = quatre-vingt-dix, 99 = quatre-vingt-dix-neuf.",
      },
      {
        type: "examples",
        items: [
          { fr: "soixante-douze", en: "72" },
          { fr: "quatre-vingt-trois", en: "83" },
          { fr: "quatre-vingt-dix-sept", en: "97" },
        ],
      },
      { type: "tip", text: "In Belgium and Switzerland, 70 is septante and 90 is nonante. Duolingo uses the France forms." },
    ],
    quiz: [
      { prompt: "17", options: ["dix-sept", "sept-dix", "soixante-sept", "dix et sept"], answer: "dix-sept", explain: "10 + 7: dix-sept." },
      { prompt: "21", options: ["vingt et un", "vingt-un", "deux-un", "vingt-deux"], answer: "vingt et un", explain: "21, 31… 71 use et un." },
      { prompt: "72", options: ["soixante-douze", "soixante-dix-deux", "soixante-deux", "quatre-vingt-douze"], answer: "soixante-douze", explain: "72 = 60 + 12." },
      { prompt: "80", options: ["quatre-vingts", "huit-dix", "quatre-vingt-dix", "soixante-vingt"], answer: "quatre-vingts", explain: "80 = 4 × 20." },
      { prompt: "95", options: ["quatre-vingt-quinze", "quatre-vingt-cinq", "soixante-quinze", "quatre-vingt-dix-cinq"], answer: "quatre-vingt-quinze", explain: "95 = 80 + 15." },
    ],
  },
  {
    id: "time",
    title: "Time, days and dates",
    summary: "Telling the time, and why days and months are lowercase.",
    blocks: [
      {
        type: "examples",
        items: [
          { fr: "Quelle heure est-il ?", en: "What time is it?" },
          { fr: "Il est trois heures.", en: "It's 3:00." },
          { fr: "Il est trois heures et quart.", en: "It's 3:15." },
          { fr: "Il est trois heures et demie.", en: "It's 3:30." },
          { fr: "Il est quatre heures moins le quart.", en: "It's 3:45 (four minus a quarter)." },
          { fr: "Il est midi. / Il est minuit.", en: "It's noon. / It's midnight." },
        ],
      },
      {
        type: "table",
        head: ["French", "English"],
        rows: [
          ["lundi", "Monday"],
          ["mardi", "Tuesday"],
          ["mercredi", "Wednesday"],
          ["jeudi", "Thursday"],
          ["vendredi", "Friday"],
          ["samedi", "Saturday"],
          ["dimanche", "Sunday"],
        ],
        speak: 0,
      },
      { type: "text", text: "Days and months are lowercase: lundi, janvier. Dates are le + number + month: le 14 juillet. The 1st is le premier: le premier mai." },
      { type: "tip", text: "le lundi = on Mondays (every week). lundi = on Monday (this coming one)." },
      { type: "tip", text: "Timetables use the 24-hour clock: Le train part à 18 h 30 (dix-huit heures trente)." },
    ],
    quiz: [
      {
        prompt: "3:30",
        options: ["Il est trois heures et demie.", "Il est trois heures et moitié.", "Il est trois heures demi.", "Il est trois et demie heures."],
        answer: "Il est trois heures et demie.",
        explain: "et demie = half past.",
      },
      {
        prompt: "\"On Mondays, I work.\"",
        options: ["Le lundi, je travaille.", "Lundis, je travaille.", "En lundi, je travaille.", "Le Lundi, je travaille."],
        answer: "Le lundi, je travaille.",
        explain: "le + day = every week; days are lowercase.",
      },
      { prompt: "May 1st", options: ["le premier mai", "le un mai", "le premier Mai", "la première mai"], answer: "le premier mai", explain: "The 1st is le premier; months are lowercase." },
      {
        prompt: "4:45",
        options: ["cinq heures moins le quart", "quatre heures moins le quart", "cinq heures et quart", "quatre heures et demie"],
        answer: "cinq heures moins le quart",
        explain: "4:45 = five o'clock minus a quarter.",
      },
      { prompt: "12:00 noon: Il est ___", options: ["midi", "minuit", "douze", "le midi"], answer: "midi", explain: "midi = noon, minuit = midnight." },
    ],
  },
  {
    id: "pronouns",
    title: "Je, tu, vous, on",
    summary: "Subject pronouns, and when to use tu or vous.",
    blocks: [
      {
        type: "table",
        head: ["French", "English"],
        rows: [
          ["je (j')", "I"],
          ["tu", "you (one friend, family, a child)"],
          ["il / elle", "he / she (or it)"],
          ["on", "we (casual), one, people"],
          ["nous", "we"],
          ["vous", "you (polite, or more than one person)"],
          ["ils", "they (males, or a mixed group)"],
          ["elles", "they (all female)"],
        ],
      },
      { type: "tip", text: "Use vous with strangers, at work and with older people; tu with friends, family and kids. If unsure, start with vous." },
      { type: "tip", text: "on takes the il form of the verb: on mange = we eat. It's extremely common in everyday speech." },
      { type: "trap", text: "A group with even one male is ils: Marie et Paul → ils." },
    ],
    quiz: [
      { prompt: "To your boss: ___ êtes prêt ?", options: ["Tu", "Vous", "Il", "On"], answer: "Vous", explain: "vous is polite." },
      { prompt: "Marie et Sophie → ___ sont là.", options: ["Ils", "Elles", "Nous", "On"], answer: "Elles", explain: "All female → elles." },
      { prompt: "Marie et Paul → ___ sont là.", options: ["Ils", "Elles", "Nous", "On"], answer: "Ils", explain: "Mixed group → ils." },
      { prompt: "On ___ au restaurant ce soir. (we're going)", options: ["va", "allons", "vont", "vas"], answer: "va", explain: "on takes the il form: on va." },
      { prompt: "To two friends: ___ venez ?", options: ["Vous", "Tu", "Ils", "Nous"], answer: "Vous", explain: "More than one person → vous, even friends." },
    ],
  },
];

export const GRAMMAR_BY_ID = Object.fromEntries(GRAMMAR.map((g) => [g.id, g])) as Record<string, GrammarTopic>;

/** Which cheat sheet explains a given kind of Duolingo mistake. */
export const TOPIC_FOR_MISTAKE: Partial<Record<string, string>> = {
  article: "articles",
  agreement: "adjectives",
  "missing-word": "articles",
};
