import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_VERBS, VERB_BY_KEY, table, type Tense } from "./conjugate";

/** Full forms, je → ils, written out by hand as the reference. */
const EXPECTED: [string, Tense, string][] = [
  // Présent
  ["être", "present", "je suis|tu es|il/elle/on est|nous sommes|vous êtes|ils/elles sont"],
  ["avoir", "present", "j'ai|tu as|il/elle/on a|nous avons|vous avez|ils/elles ont"],
  ["aller", "present", "je vais|tu vas|il/elle/on va|nous allons|vous allez|ils/elles vont"],
  ["parler", "present", "je parle|tu parles|il/elle/on parle|nous parlons|vous parlez|ils/elles parlent"],
  ["aimer", "present", "j'aime|tu aimes|il/elle/on aime|nous aimons|vous aimez|ils/elles aiment"],
  ["habiter", "present", "j'habite|tu habites|il/elle/on habite|nous habitons|vous habitez|ils/elles habitent"],
  ["manger", "present", "je mange|tu manges|il/elle/on mange|nous mangeons|vous mangez|ils/elles mangent"],
  ["commencer", "present", "je commence|tu commences|il/elle/on commence|nous commençons|vous commencez|ils/elles commencent"],
  ["acheter", "present", "j'achète|tu achètes|il/elle/on achète|nous achetons|vous achetez|ils/elles achètent"],
  ["finir", "present", "je finis|tu finis|il/elle/on finit|nous finissons|vous finissez|ils/elles finissent"],
  ["attendre", "present", "j'attends|tu attends|il/elle/on attend|nous attendons|vous attendez|ils/elles attendent"],
  ["s'appeler", "present", "je m'appelle|tu t'appelles|il/elle/on s'appelle|nous nous appelons|vous vous appelez|ils/elles s'appellent"],
  ["se lever", "present", "je me lève|tu te lèves|il/elle/on se lève|nous nous levons|vous vous levez|ils/elles se lèvent"],
  ["ouvrir", "present", "j'ouvre|tu ouvres|il/elle/on ouvre|nous ouvrons|vous ouvrez|ils/elles ouvrent"],
  ["étudier", "present", "j'étudie|tu étudies|il/elle/on étudie|nous étudions|vous étudiez|ils/elles étudient"],

  // Passé composé
  ["parler", "passe-compose", "j'ai parlé|tu as parlé|il/elle/on a parlé|nous avons parlé|vous avez parlé|ils/elles ont parlé"],
  ["aller", "passe-compose", "je suis allé(e)|tu es allé(e)|il/elle/on est allé(e)|nous sommes allé(e)s|vous êtes allé(e)(s)|ils/elles sont allé(e)s"],
  ["avoir", "passe-compose", "j'ai eu|tu as eu|il/elle/on a eu|nous avons eu|vous avez eu|ils/elles ont eu"],
  ["être", "passe-compose", "j'ai été|tu as été|il/elle/on a été|nous avons été|vous avez été|ils/elles ont été"],
  ["finir", "passe-compose", "j'ai fini|tu as fini|il/elle/on a fini|nous avons fini|vous avez fini|ils/elles ont fini"],
  ["vendre", "passe-compose", "j'ai vendu|tu as vendu|il/elle/on a vendu|nous avons vendu|vous avez vendu|ils/elles ont vendu"],
  ["prendre", "passe-compose", "j'ai pris|tu as pris|il/elle/on a pris|nous avons pris|vous avez pris|ils/elles ont pris"],
  ["ouvrir", "passe-compose", "j'ai ouvert|tu as ouvert|il/elle/on a ouvert|nous avons ouvert|vous avez ouvert|ils/elles ont ouvert"],
  ["se lever", "passe-compose", "je me suis levé(e)|tu t'es levé(e)|il/elle/on s'est levé(e)|nous nous sommes levé(e)s|vous vous êtes levé(e)(s)|ils/elles se sont levé(e)s"],
  ["arriver", "passe-compose", "je suis arrivé(e)|tu es arrivé(e)|il/elle/on est arrivé(e)|nous sommes arrivé(e)s|vous êtes arrivé(e)(s)|ils/elles sont arrivé(e)s"],
  ["venir", "passe-compose", "je suis venu(e)|tu es venu(e)|il/elle/on est venu(e)|nous sommes venu(e)s|vous êtes venu(e)(s)|ils/elles sont venu(e)s"],

  // Futur proche
  ["manger", "futur-proche", "je vais manger|tu vas manger|il/elle/on va manger|nous allons manger|vous allez manger|ils/elles vont manger"],
  ["s'appeler", "futur-proche", "je vais m'appeler|tu vas t'appeler|il/elle/on va s'appeler|nous allons nous appeler|vous allez vous appeler|ils/elles vont s'appeler"],

  // Imparfait
  ["être", "imparfait", "j'étais|tu étais|il/elle/on était|nous étions|vous étiez|ils/elles étaient"],
  ["avoir", "imparfait", "j'avais|tu avais|il/elle/on avait|nous avions|vous aviez|ils/elles avaient"],
  ["aller", "imparfait", "j'allais|tu allais|il/elle/on allait|nous allions|vous alliez|ils/elles allaient"],
  ["faire", "imparfait", "je faisais|tu faisais|il/elle/on faisait|nous faisions|vous faisiez|ils/elles faisaient"],
  ["manger", "imparfait", "je mangeais|tu mangeais|il/elle/on mangeait|nous mangions|vous mangiez|ils/elles mangeaient"],
  ["commencer", "imparfait", "je commençais|tu commençais|il/elle/on commençait|nous commencions|vous commenciez|ils/elles commençaient"],
  ["finir", "imparfait", "je finissais|tu finissais|il/elle/on finissait|nous finissions|vous finissiez|ils/elles finissaient"],
  ["boire", "imparfait", "je buvais|tu buvais|il/elle/on buvait|nous buvions|vous buviez|ils/elles buvaient"],
  ["étudier", "imparfait", "j'étudiais|tu étudiais|il/elle/on étudiait|nous étudiions|vous étudiiez|ils/elles étudiaient"],
  ["voir", "imparfait", "je voyais|tu voyais|il/elle/on voyait|nous voyions|vous voyiez|ils/elles voyaient"],
  ["se lever", "imparfait", "je me levais|tu te levais|il/elle/on se levait|nous nous levions|vous vous leviez|ils/elles se levaient"],

  // Futur simple
  ["être", "futur", "je serai|tu seras|il/elle/on sera|nous serons|vous serez|ils/elles seront"],
  ["avoir", "futur", "j'aurai|tu auras|il/elle/on aura|nous aurons|vous aurez|ils/elles auront"],
  ["aller", "futur", "j'irai|tu iras|il/elle/on ira|nous irons|vous irez|ils/elles iront"],
  ["faire", "futur", "je ferai|tu feras|il/elle/on fera|nous ferons|vous ferez|ils/elles feront"],
  ["parler", "futur", "je parlerai|tu parleras|il/elle/on parlera|nous parlerons|vous parlerez|ils/elles parleront"],
  ["finir", "futur", "je finirai|tu finiras|il/elle/on finira|nous finirons|vous finirez|ils/elles finiront"],
  ["prendre", "futur", "je prendrai|tu prendras|il/elle/on prendra|nous prendrons|vous prendrez|ils/elles prendront"],
  ["boire", "futur", "je boirai|tu boiras|il/elle/on boira|nous boirons|vous boirez|ils/elles boiront"],
  ["acheter", "futur", "j'achèterai|tu achèteras|il/elle/on achètera|nous achèterons|vous achèterez|ils/elles achèteront"],
  ["s'appeler", "futur", "je m'appellerai|tu t'appelleras|il/elle/on s'appellera|nous nous appellerons|vous vous appellerez|ils/elles s'appelleront"],
  ["venir", "futur", "je viendrai|tu viendras|il/elle/on viendra|nous viendrons|vous viendrez|ils/elles viendront"],
  ["pouvoir", "futur", "je pourrai|tu pourras|il/elle/on pourra|nous pourrons|vous pourrez|ils/elles pourront"],
  ["voir", "futur", "je verrai|tu verras|il/elle/on verra|nous verrons|vous verrez|ils/elles verront"],
  ["écrire", "futur", "j'écrirai|tu écriras|il/elle/on écrira|nous écrirons|vous écrirez|ils/elles écriront"],
  ["ouvrir", "futur", "j'ouvrirai|tu ouvriras|il/elle/on ouvrira|nous ouvrirons|vous ouvrirez|ils/elles ouvriront"],
];

for (const [inf, tense, expected] of EXPECTED) {
  test(`${inf} — ${tense}`, () => {
    const v = ALL_VERBS.find((x) => x.inf === inf);
    assert.ok(v, `verb ${inf} exists`);
    assert.equal(table(v, tense).map((f) => f.full).join("|"), expected);
  });
}

test("every verb conjugates in every tense without empty forms", () => {
  const tenses: Tense[] = ["present", "passe-compose", "futur-proche", "imparfait", "futur"];
  for (const v of ALL_VERBS) {
    for (const t of tenses) {
      for (const f of table(v, t)) {
        assert.ok(f.verb.length > 0 && !f.verb.includes("undefined"), `${v.inf} ${t} ${f.person}`);
        assert.ok(!/\s{2}/.test(f.full), `double space in ${f.full}`);
      }
    }
  }
});

test("verb keys are unique and database-safe", () => {
  const keys = ALL_VERBS.map((v) => v.key);
  assert.equal(new Set(keys).size, keys.length);
  for (const k of keys) assert.match(k, /^[\p{L}_]+$/u);
  assert.equal(VERB_BY_KEY["se_lever"].inf, "se lever");
  assert.equal(VERB_BY_KEY["sappeler"].inf, "s'appeler");
});
