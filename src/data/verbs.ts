/**
 * The ~60 most useful verbs for a beginner, in learning order.
 *
 * Regular verbs are generated from rules (see lib/conjugate.ts). Irregular
 * verbs list their present tense and any irregular stems explicitly.
 * Present-tense arrays are [je, tu, il, nous, vous, ils] WITHOUT pronouns.
 */

export type VerbGroup = "er" | "ir" | "re" | "irregular";

type Six = [string, string, string, string, string, string];

export interface VerbDef {
  inf: string; // "parler", "s'appeler", "se lever"
  en: string;
  group: VerbGroup;
  aux?: "avoir" | "être"; // default avoir (reflexive verbs always use être)
  pp?: string; // past participle override
  present?: Six; // full present-tense override
  futureStem?: string; // irregular future/conditional stem
  imperfectStem?: string; // only être needs this
  tip?: string;
  exFr: string;
  exEn: string;
}

export const VERBS: VerbDef[] = [
  {
    inf: "être", en: "to be", group: "irregular", pp: "été", futureStem: "ser", imperfectStem: "ét",
    present: ["suis", "es", "est", "sommes", "êtes", "sont"],
    tip: "The most irregular verb in French. Learn it as a chant: suis, es, est, sommes, êtes, sont. Careful: ils sont (s sound) vs ils ont (z sound).",
    exFr: "Je suis fatigué.", exEn: "I am tired.",
  },
  {
    inf: "avoir", en: "to have", group: "irregular", pp: "eu", futureStem: "aur",
    present: ["ai", "as", "a", "avons", "avez", "ont"],
    tip: "Also used for age (j'ai 30 ans = I am 30) and to build the past tense (j'ai mangé). Ils ont is said with a z: \"eel-ZON\".",
    exFr: "J'ai un chat.", exEn: "I have a cat.",
  },
  {
    inf: "aller", en: "to go", group: "irregular", aux: "être", futureStem: "ir",
    present: ["vais", "vas", "va", "allons", "allez", "vont"],
    tip: "Looks like an -er verb but isn't. vais/vas/va/vont all start with v; only nous and vous keep \"all-\". Also builds the near future: je vais manger = I'm going to eat.",
    exFr: "Nous allons au parc.", exEn: "We are going to the park.",
  },
  {
    inf: "faire", en: "to do / to make", group: "irregular", pp: "fait", futureStem: "fer",
    present: ["fais", "fais", "fait", "faisons", "faites", "font"],
    tip: "Vous faites (not faisez!) is one of only three -tes forms: vous êtes, vous faites, vous dites. Ils font rhymes with ils sont and ils ont.",
    exFr: "Qu'est-ce que tu fais ?", exEn: "What are you doing?",
  },
  {
    inf: "parler", en: "to speak / to talk", group: "er",
    tip: "The model -er verb. Endings -e, -es, -e, -ons, -ez, -ent. Je parle, tu parles, il parle and ils parlent all sound exactly the same.",
    exFr: "Je parle un peu français.", exEn: "I speak a little French.",
  },
  {
    inf: "aimer", en: "to like / to love", group: "er",
    tip: "J'aime (je + aime → j'aime). With people it means love; with things it means like. To say \"like\" a person, use aimer bien.",
    exFr: "J'aime le chocolat.", exEn: "I like chocolate.",
  },
  {
    inf: "manger", en: "to eat", group: "er",
    tip: "Regular, except nous mangeons: the extra e keeps the g soft (a hard g would sound like \"mangons\").",
    exFr: "Nous mangeons à midi.", exEn: "We eat at noon.",
  },
  {
    inf: "vouloir", en: "to want", group: "irregular", pp: "voulu", futureStem: "voudr",
    present: ["veux", "veux", "veut", "voulons", "voulez", "veulent"],
    tip: "A \"boot\" verb: je, tu, il and ils change the stem (veu-), while nous and vous keep the infinitive stem (voul-). Je voudrais = I would like (polite).",
    exFr: "Je veux un café.", exEn: "I want a coffee.",
  },
  {
    inf: "pouvoir", en: "to be able to / can", group: "irregular", pp: "pu", futureStem: "pourr",
    present: ["peux", "peux", "peut", "pouvons", "pouvez", "peuvent"],
    tip: "Same boot shape as vouloir: peux/peux/peut/peuvent vs pouvons/pouvez. Future has a double r: je pourrai.",
    exFr: "Tu peux m'aider ?", exEn: "Can you help me?",
  },
  {
    inf: "s'appeler", en: "to be called (name)", group: "er",
    present: ["appelle", "appelles", "appelle", "appelons", "appelez", "appellent"], futureStem: "appeller",
    tip: "Literally \"to call oneself\". Double l when the ending is silent (je m'appelle), single l for nous/vous (nous nous appelons).",
    exFr: "Je m'appelle Léa.", exEn: "My name is Léa.",
  },
  {
    inf: "habiter", en: "to live (somewhere)", group: "er",
    tip: "The h is silent, so je becomes j': j'habite. Use habiter for where you live, vivre for living in general.",
    exFr: "J'habite à Montréal.", exEn: "I live in Montreal.",
  },
  {
    inf: "boire", en: "to drink", group: "irregular", pp: "bu",
    present: ["bois", "bois", "boit", "buvons", "buvez", "boivent"],
    tip: "Three stems: boi- (je/tu/il), buv- (nous/vous), boiv- (ils). Past: j'ai bu.",
    exFr: "Je bois de l'eau.", exEn: "I drink water.",
  },
  {
    inf: "prendre", en: "to take", group: "irregular", pp: "pris",
    present: ["prends", "prends", "prend", "prenons", "prenez", "prennent"],
    tip: "Used for food and drinks too: je prends un café = I'll have a coffee. Ils prennent has a double n. Comprendre and apprendre work exactly the same.",
    exFr: "Je prends le bus.", exEn: "I take the bus.",
  },
  {
    inf: "venir", en: "to come", group: "irregular", aux: "être", pp: "venu", futureStem: "viendr",
    present: ["viens", "viens", "vient", "venons", "venez", "viennent"],
    tip: "Je viens de + infinitive = I have just done something: je viens de manger = I just ate.",
    exFr: "Tu viens avec nous ?", exEn: "Are you coming with us?",
  },
  {
    inf: "savoir", en: "to know (a fact / how to)", group: "irregular", pp: "su", futureStem: "saur",
    present: ["sais", "sais", "sait", "savons", "savez", "savent"],
    tip: "Savoir = know facts or know how to do something (je sais nager). For people and places, use connaître.",
    exFr: "Je ne sais pas.", exEn: "I don't know.",
  },
  {
    inf: "devoir", en: "to have to / must", group: "irregular", pp: "dû", futureStem: "devr",
    present: ["dois", "dois", "doit", "devons", "devez", "doivent"],
    tip: "Je dois partir = I have to leave. The past participle dû keeps its accent to differ from du (some).",
    exFr: "Je dois travailler.", exEn: "I have to work.",
  },
  {
    inf: "dire", en: "to say / to tell", group: "irregular", pp: "dit",
    present: ["dis", "dis", "dit", "disons", "dites", "disent"],
    tip: "Vous dites (not disez), like vous faites and vous êtes.",
    exFr: "Qu'est-ce que tu dis ?", exEn: "What are you saying?",
  },
  {
    inf: "voir", en: "to see", group: "irregular", pp: "vu", futureStem: "verr",
    present: ["vois", "vois", "voit", "voyons", "voyez", "voient"],
    tip: "The i becomes y for nous and vous (voyons, voyez). Future: je verrai, with a double r.",
    exFr: "Je vois la mer.", exEn: "I see the sea.",
  },
  {
    inf: "travailler", en: "to work", group: "er",
    tip: "Regular. The -ill- sounds like y: \"tra-va-YAY\".",
    exFr: "Je travaille à la maison.", exEn: "I work at home.",
  },
  {
    inf: "regarder", en: "to watch / to look at", group: "er",
    tip: "No \"at\" needed: je regarde la télé = I watch TV, je regarde la photo = I look at the photo.",
    exFr: "Nous regardons un film.", exEn: "We are watching a movie.",
  },
  {
    inf: "écouter", en: "to listen (to)", group: "er",
    tip: "No \"to\" needed: j'écoute la radio = I listen to the radio.",
    exFr: "J'écoute de la musique.", exEn: "I listen to music.",
  },
  {
    inf: "lire", en: "to read", group: "irregular", pp: "lu",
    present: ["lis", "lis", "lit", "lisons", "lisez", "lisent"],
    tip: "An s appears in the plural: lisons, lisez, lisent. Past: j'ai lu.",
    exFr: "Elle lit un livre.", exEn: "She is reading a book.",
  },
  {
    inf: "écrire", en: "to write", group: "irregular", pp: "écrit",
    present: ["écris", "écris", "écrit", "écrivons", "écrivez", "écrivent"],
    tip: "A v appears in the plural: écrivons, écrivez, écrivent.",
    exFr: "J'écris un message.", exEn: "I'm writing a message.",
  },
  {
    inf: "comprendre", en: "to understand", group: "irregular", pp: "compris",
    present: ["comprends", "comprends", "comprend", "comprenons", "comprenez", "comprennent"],
    tip: "Conjugates exactly like prendre. Je ne comprends pas = I don't understand.",
    exFr: "Je comprends un peu.", exEn: "I understand a little.",
  },
  {
    inf: "apprendre", en: "to learn", group: "irregular", pp: "appris",
    present: ["apprends", "apprends", "apprend", "apprenons", "apprenez", "apprennent"],
    tip: "Conjugates exactly like prendre. J'apprends le français!",
    exFr: "J'apprends le français.", exEn: "I am learning French.",
  },
  {
    inf: "finir", en: "to finish", group: "ir",
    tip: "The model regular -ir verb: -is, -is, -it, -issons, -issez, -issent. Past: j'ai fini.",
    exFr: "Je finis à cinq heures.", exEn: "I finish at five o'clock.",
  },
  {
    inf: "choisir", en: "to choose", group: "ir",
    tip: "Like finir: je choisis, nous choisissons.",
    exFr: "Tu choisis le dessert ?", exEn: "Are you choosing the dessert?",
  },
  {
    inf: "sortir", en: "to go out", group: "irregular", aux: "être", pp: "sorti",
    present: ["sors", "sors", "sort", "sortons", "sortez", "sortent"],
    tip: "Drop the t in the singular (sors, sors, sort); keep it in the plural. Uses être in the past: je suis sorti(e).",
    exFr: "Je sors ce soir.", exEn: "I'm going out tonight.",
  },
  {
    inf: "partir", en: "to leave", group: "irregular", aux: "être", pp: "parti",
    present: ["pars", "pars", "part", "partons", "partez", "partent"],
    tip: "Same pattern as sortir and dormir. Uses être: elle est partie.",
    exFr: "Le train part à midi.", exEn: "The train leaves at noon.",
  },
  {
    inf: "dormir", en: "to sleep", group: "irregular", pp: "dormi",
    present: ["dors", "dors", "dort", "dormons", "dormez", "dorment"],
    tip: "Drop the m in the singular (dors), keep it in the plural (dormons).",
    exFr: "Le bébé dort.", exEn: "The baby is sleeping.",
  },
  {
    inf: "mettre", en: "to put / to put on", group: "irregular", pp: "mis",
    present: ["mets", "mets", "met", "mettons", "mettez", "mettent"],
    tip: "One t in the singular, two in the plural. Also for clothes: je mets un manteau.",
    exFr: "Je mets la table.", exEn: "I set the table.",
  },
  {
    inf: "connaître", en: "to know (a person / place)", group: "irregular", pp: "connu",
    present: ["connais", "connais", "connaît", "connaissons", "connaissez", "connaissent"],
    tip: "For people and places: je connais Paris. For facts, use savoir.",
    exFr: "Tu connais Marie ?", exEn: "Do you know Marie?",
  },
  {
    inf: "croire", en: "to believe / to think", group: "irregular", pp: "cru",
    present: ["crois", "crois", "croit", "croyons", "croyez", "croient"],
    tip: "Same i→y switch as voir: croyons, croyez.",
    exFr: "Je crois que oui.", exEn: "I think so.",
  },
  {
    inf: "attendre", en: "to wait (for)", group: "re",
    tip: "The model regular -re verb: -s, -s, (nothing), -ons, -ez, -ent. No \"for\" needed: j'attends le bus.",
    exFr: "J'attends le bus.", exEn: "I'm waiting for the bus.",
  },
  {
    inf: "vendre", en: "to sell", group: "re",
    tip: "Regular -re: il vend (no ending). Past: j'ai vendu.",
    exFr: "Il vend des fruits.", exEn: "He sells fruit.",
  },
  {
    inf: "répondre", en: "to answer", group: "re",
    tip: "Regular -re. Répondre à quelqu'un = to answer someone.",
    exFr: "Je réponds au message.", exEn: "I'm answering the message.",
  },
  {
    inf: "entendre", en: "to hear", group: "re",
    tip: "Regular -re. Entendre = hear; écouter = listen.",
    exFr: "Tu entends ce bruit ?", exEn: "Do you hear that noise?",
  },
  {
    inf: "perdre", en: "to lose", group: "re",
    tip: "Regular -re. J'ai perdu mes clés = I lost my keys.",
    exFr: "Je perds toujours mes clés.", exEn: "I always lose my keys.",
  },
  {
    inf: "chercher", en: "to look for", group: "er",
    tip: "No \"for\" needed: je cherche mon téléphone.",
    exFr: "Je cherche mon téléphone.", exEn: "I'm looking for my phone.",
  },
  {
    inf: "trouver", en: "to find", group: "er",
    tip: "Also \"to think (opinion)\": je trouve que c'est bon = I think it's good.",
    exFr: "Je ne trouve pas la clé.", exEn: "I can't find the key.",
  },
  {
    inf: "donner", en: "to give", group: "er",
    tip: "Regular. Donner quelque chose à quelqu'un = give something to someone.",
    exFr: "Je donne un cadeau à Paul.", exEn: "I'm giving Paul a present.",
  },
  {
    inf: "jouer", en: "to play", group: "er",
    tip: "Jouer à + sport/game (au foot), jouer de + instrument (du piano).",
    exFr: "Ils jouent au foot.", exEn: "They play soccer.",
  },
  {
    inf: "arriver", en: "to arrive", group: "er", aux: "être",
    tip: "Uses être in the past: je suis arrivé(e).",
    exFr: "J'arrive dans cinq minutes.", exEn: "I'll be there in five minutes.",
  },
  {
    inf: "rester", en: "to stay", group: "er", aux: "être",
    tip: "False friend: rester = to stay, not to rest (se reposer). Uses être: je suis resté(e).",
    exFr: "Je reste à la maison.", exEn: "I'm staying home.",
  },
  {
    inf: "entrer", en: "to enter / to come in", group: "er", aux: "être",
    tip: "Uses être: elle est entrée. Entrez ! = Come in!",
    exFr: "Entrez, s'il vous plaît.", exEn: "Come in, please.",
  },
  {
    inf: "penser", en: "to think", group: "er",
    tip: "Penser à = to think about: je pense à toi.",
    exFr: "Je pense à toi.", exEn: "I'm thinking of you.",
  },
  {
    inf: "demander", en: "to ask", group: "er",
    tip: "False friend: demander = to ask, not to demand.",
    exFr: "Je demande l'addition.", exEn: "I'm asking for the bill.",
  },
  {
    inf: "acheter", en: "to buy", group: "er",
    present: ["achète", "achètes", "achète", "achetons", "achetez", "achètent"], futureStem: "achèter",
    tip: "Gets a grave accent (è) when the ending is silent: j'achète, but nous achetons.",
    exFr: "J'achète du pain.", exEn: "I'm buying bread.",
  },
  {
    inf: "commencer", en: "to begin / to start", group: "er",
    tip: "Regular, except nous commençons: the ç keeps the c soft (s sound) before o.",
    exFr: "Le film commence à huit heures.", exEn: "The movie starts at eight.",
  },
  {
    inf: "préférer", en: "to prefer", group: "er",
    present: ["préfère", "préfères", "préfère", "préférons", "préférez", "préfèrent"],
    tip: "The second é becomes è when the ending is silent: je préfère, but nous préférons.",
    exFr: "Je préfère le thé.", exEn: "I prefer tea.",
  },
  {
    inf: "se lever", en: "to get up", group: "er",
    present: ["lève", "lèves", "lève", "levons", "levez", "lèvent"], futureStem: "lèver",
    tip: "A reflexive verb (\"to raise oneself\"): je me lève. The past uses être: je me suis levé(e).",
    exFr: "Je me lève à sept heures.", exEn: "I get up at seven.",
  },
  {
    inf: "ouvrir", en: "to open", group: "irregular", pp: "ouvert",
    present: ["ouvre", "ouvres", "ouvre", "ouvrons", "ouvrez", "ouvrent"],
    tip: "Ends in -ir but takes -er endings in the present (j'ouvre). Past: j'ai ouvert.",
    exFr: "J'ouvre la fenêtre.", exEn: "I'm opening the window.",
  },
  {
    inf: "devenir", en: "to become", group: "irregular", aux: "être", pp: "devenu", futureStem: "deviendr",
    present: ["deviens", "deviens", "devient", "devenons", "devenez", "deviennent"],
    tip: "Conjugates like venir and also uses être: il est devenu.",
    exFr: "Il devient médecin.", exEn: "He is becoming a doctor.",
  },
  {
    inf: "revenir", en: "to come back", group: "irregular", aux: "être", pp: "revenu", futureStem: "reviendr",
    present: ["reviens", "reviens", "revient", "revenons", "revenez", "reviennent"],
    tip: "Conjugates like venir. Je reviens = I'll be right back.",
    exFr: "Je reviens tout de suite.", exEn: "I'll be right back.",
  },
  {
    inf: "cuisiner", en: "to cook", group: "er",
    tip: "Regular. Also faire la cuisine.",
    exFr: "Mon père cuisine bien.", exEn: "My father cooks well.",
  },
  {
    inf: "voyager", en: "to travel", group: "er",
    tip: "Like manger: nous voyageons keeps the e.",
    exFr: "Nous voyageons en été.", exEn: "We travel in the summer.",
  },
  {
    inf: "étudier", en: "to study", group: "er",
    tip: "Regular. Watch the double i in the imperfect: nous étudiions.",
    exFr: "J'étudie le soir.", exEn: "I study in the evening.",
  },
  {
    inf: "porter", en: "to wear / to carry", group: "er",
    tip: "Both meanings: je porte une veste (wear), je porte un sac (carry).",
    exFr: "Elle porte une robe rouge.", exEn: "She is wearing a red dress.",
  },
  {
    inf: "recevoir", en: "to receive", group: "irregular", pp: "reçu", futureStem: "recevr",
    present: ["reçois", "reçois", "reçoit", "recevons", "recevez", "reçoivent"],
    tip: "The ç appears before o and u to keep the s sound: je reçois, j'ai reçu.",
    exFr: "Je reçois beaucoup d'e-mails.", exEn: "I get a lot of emails.",
  },
  {
    inf: "rentrer", en: "to go home / to come back", group: "er", aux: "être",
    tip: "Uses être: je suis rentré(e). Rentrer = go back home; revenir = come back.",
    exFr: "Je rentre à six heures.", exEn: "I get home at six.",
  },
];

/** Verbs a new learner starts with (the first in the list). */
export const STARTER_VERB_COUNT = 10;
