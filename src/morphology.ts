import type { DictionaryEntry } from "./schema";

export type StemType = "vowel" | "voiced" | "voiceless";
export type VowelGroup = 1 | 2 | 3 | 4;
export type StemInfo = { stemType: StemType; vowelGroup: VowelGroup };

// Kyrgyz vowels by group
const VOWELS: Record<string, VowelGroup> = {
  "а": 1, "ы": 1,   // back unrounded
  "е": 2, "и": 2,   // front unrounded
  "о": 3, "у": 3,   // back rounded
  "ө": 4, "ү": 4,   // front rounded
};

const ALL_VOWELS = new Set(Object.keys(VOWELS));

const VOICELESS = new Set(["п", "к", "т", "с", "ш", "ч", "ц", "щ", "ф", "х"]);

/**
 * Classify a Kyrgyz word stem by its final character type and last vowel group.
 */
export function classifyStem(word: string): StemInfo {
  const lastChar = word[word.length - 1];

  let stemType: StemType;
  if (ALL_VOWELS.has(lastChar)) {
    stemType = "vowel";
  } else if (VOICELESS.has(lastChar)) {
    stemType = "voiceless";
  } else {
    stemType = "voiced";
  }

  // Find last vowel for vowel group
  let vowelGroup: VowelGroup = 1; // default fallback
  for (let i = word.length - 1; i >= 0; i--) {
    const group = VOWELS[word[i]];
    if (group !== undefined) {
      vowelGroup = group;
      break;
    }
  }

  return { stemType, vowelGroup };
}

// Suffix tables indexed by [stemType][vowelGroup-1]
// Each suffix type maps stemType → array of 4 suffixes (groups 1-4)

const PLURAL: Record<StemType, string[]> = {
  vowel:     ["лар", "лер", "лор", "лөр"],
  voiced:    ["дар", "дер", "дор", "дөр"],
  voiceless: ["тар", "тер", "тор", "төр"],
};

const GENITIVE: Record<StemType, string[]> = {
  vowel:     ["нын", "нин", "нун", "нүн"],
  voiced:    ["дын", "дин", "дун", "дүн"],
  voiceless: ["тын", "тин", "тун", "түн"],
};

const DATIVE: Record<StemType, string[]> = {
  vowel:     ["га", "ге", "го", "гө"],
  voiced:    ["га", "ге", "го", "гө"],
  voiceless: ["ка", "ке", "ко", "кө"],
};

const ACCUSATIVE: Record<StemType, string[]> = {
  vowel:     ["ны", "ни", "ну", "нү"],
  voiced:    ["ды", "ди", "ду", "дү"],
  voiceless: ["ты", "ти", "ту", "тү"],
};

const LOCATIVE: Record<StemType, string[]> = {
  vowel:     ["да", "де", "до", "дө"],
  voiced:    ["да", "де", "до", "дө"],
  voiceless: ["та", "те", "то", "тө"],
};

const ABLATIVE: Record<StemType, string[]> = {
  vowel:     ["дан", "ден", "дон", "дөн"],
  voiced:    ["дан", "ден", "дон", "дөн"],
  voiceless: ["тан", "тен", "тон", "төн"],
};

function getSuffix(table: Record<StemType, string[]>, stem: { stemType: string; vowelGroup: number }): string {
  return table[stem.stemType as StemType][(stem.vowelGroup as number) - 1];
}

/**
 * Generate the plural form of a Kyrgyz noun.
 */
export function generatePlural(word: string, stem: { stemType: string; vowelGroup: number }): string {
  return word + getSuffix(PLURAL, stem);
}

/**
 * Generate singular case forms of a Kyrgyz noun.
 */
export function generateNounForms(
  word: string,
  stem: { stemType: string; vowelGroup: number },
): Record<string, string> {
  return {
    nominative: word,
    genitive: word + getSuffix(GENITIVE, stem),
    dative: word + getSuffix(DATIVE, stem),
    accusative: word + getSuffix(ACCUSATIVE, stem),
    locative: word + getSuffix(LOCATIVE, stem),
    ablative: word + getSuffix(ABLATIVE, stem),
  };
}

/**
 * Determine the vowel group of a plural suffix.
 * -лар/-дар/-тар → group 1 (а)
 * -лер/-дер/-тер → group 2 (е)
 * -лор/-дор/-тор → group 3 (о)
 * -лөр/-дөр/-төр → group 4 (ө)
 */
function pluralSuffixVowelGroup(vowelGroup: number): VowelGroup {
  // The plural suffix vowel matches the original vowel group
  return vowelGroup as VowelGroup;
}

/**
 * Generate plural case forms of a Kyrgyz noun.
 * The plural stem always ends in р (voiced), and the suffix vowel
 * determines the vowel group for subsequent suffixes.
 */
export function generateNounPluralForms(
  word: string,
  stem: { stemType: string; vowelGroup: number },
): Record<string, string> {
  const plural = generatePlural(word, stem);
  // Plural always ends in р which is voiced
  const pluralStem: { stemType: string; vowelGroup: number } = {
    stemType: "voiced",
    vowelGroup: pluralSuffixVowelGroup(stem.vowelGroup),
  };

  return {
    nominative: plural,
    genitive: plural + getSuffix(GENITIVE, pluralStem),
    dative: plural + getSuffix(DATIVE, pluralStem),
    accusative: plural + getSuffix(ACCUSATIVE, pluralStem),
    locative: plural + getSuffix(LOCATIVE, pluralStem),
    ablative: plural + getSuffix(ABLATIVE, pluralStem),
  };
}

// ── Possessive suffixes ──────────────────────────────────────────────
// Person suffixes indexed by [stemType][vowelGroup-1]
// After vowel stems, consonant-initial suffixes are used
// After consonant stems, vowel-initial suffixes are used

const POSS_1SG: Record<StemType, string[]> = {
  vowel:     ["м", "м", "м", "м"],
  voiced:    ["ым", "им", "ум", "үм"],
  voiceless: ["ым", "им", "ум", "үм"],
};

const POSS_2SG: Record<StemType, string[]> = {
  vowel:     ["ң", "ң", "ң", "ң"],
  voiced:    ["ың", "иң", "уң", "үң"],
  voiceless: ["ың", "иң", "уң", "үң"],
};

const POSS_3SG: Record<StemType, string[]> = {
  vowel:     ["сы", "си", "су", "сү"],
  voiced:    ["ы", "и", "у", "ү"],
  voiceless: ["ы", "и", "у", "ү"],
};

const POSS_1PL: Record<StemType, string[]> = {
  vowel:     ["быз", "биз", "буз", "бүз"],
  voiced:    ["ыбыз", "ибиз", "убуз", "үбүз"],
  voiceless: ["ыбыз", "ибиз", "убуз", "үбүз"],
};

const POSS_2PL: Record<StemType, string[]> = {
  vowel:     ["ңыз", "ңиз", "ңуз", "ңүз"],
  voiced:    ["ыңыз", "иңиз", "уңуз", "үңүз"],
  voiceless: ["ыңыз", "иңиз", "уңуз", "үңүз"],
};

// 3pl same as 3sg in Kyrgyz

const POSSESSIVE_TABLES = [
  POSS_1SG, POSS_2SG, POSS_3SG, POSS_1PL, POSS_2PL,
];

// After 3sg possessive (vowel-final: -ы/-и/-у/-ү/-сы/-си/-су/-сү),
// case suffixes use linking "н":
//   genitive:   -нын/-нин/-нун/-нүн
//   dative:     -на/-не/-но/-нө
//   accusative: -н
//   locative:   -нда/-нде/-ндо/-ндө
//   ablative:   -нан/-нен/-нон/-нөн
// After other persons (consonant-final: -м, -ң, -быз/-биз, -ңыз/-ңиз),
// regular voiced-stem case suffixes apply (all end in voiced consonants).

const POSS3_GENITIVE: string[]   = ["нын", "нин", "нун", "нүн"];
const POSS3_DATIVE: string[]     = ["на", "не", "но", "нө"];
const POSS3_ACCUSATIVE: string[] = ["н", "н", "н", "н"];
const POSS3_LOCATIVE: string[]   = ["нда", "нде", "ндо", "ндө"];
const POSS3_ABLATIVE: string[]   = ["нан", "нен", "нон", "нөн"];

/**
 * Generate all possessive forms of a noun (nominative only).
 * Returns an array of unique possessive forms for indexing.
 */
export function generatePossessiveForms(
  word: string,
  stem: StemInfo,
): string[] {
  const forms = new Set<string>();
  for (const table of POSSESSIVE_TABLES) {
    const suffix = getSuffix(table, stem);
    forms.add(word + suffix);
  }
  return Array.from(forms);
}

/**
 * Generate possessive + case combinations for a noun.
 *
 * For 3sg possessive (vowel-final: -ы/-и/-у/-ү/-сы/-си/-су/-сү),
 * case suffixes use linking "н" (e.g. күнү+нөн = күнүнөн).
 *
 * For other persons (consonant-final: -м, -ң, -быз/-биз, -ңыз/-ңиз),
 * regular voiced-stem case suffixes apply (e.g. күнүм+дөн = күнүмдөн).
 */
export function generatePossessiveCaseForms(
  word: string,
  stem: StemInfo,
): string[] {
  const forms = new Set<string>();
  const vgIdx = stem.vowelGroup - 1;

  // 3sg possessive (vowel-final) — special linking-н suffixes
  const poss3sg = word + getSuffix(POSS_3SG, stem);
  forms.add(poss3sg);
  forms.add(poss3sg + POSS3_GENITIVE[vgIdx]);
  forms.add(poss3sg + POSS3_DATIVE[vgIdx]);
  forms.add(poss3sg + POSS3_ACCUSATIVE[vgIdx]);
  forms.add(poss3sg + POSS3_LOCATIVE[vgIdx]);
  forms.add(poss3sg + POSS3_ABLATIVE[vgIdx]);

  // Other persons (consonant-final: м, ң, з) — voiced-stem case suffixes
  const consonantTables = [POSS_1SG, POSS_2SG, POSS_1PL, POSS_2PL];
  for (const table of consonantTables) {
    const possForm = word + getSuffix(table, stem);
    forms.add(possForm);
    // All end in voiced consonants, use voiced-stem suffixes with same vowel group
    const possStem: StemInfo = { stemType: "voiced", vowelGroup: stem.vowelGroup };
    forms.add(possForm + getSuffix(GENITIVE, possStem));
    forms.add(possForm + getSuffix(DATIVE, possStem));
    forms.add(possForm + getSuffix(ACCUSATIVE, possStem));
    forms.add(possForm + getSuffix(LOCATIVE, possStem));
    forms.add(possForm + getSuffix(ABLATIVE, possStem));
  }

  return Array.from(forms);
}

// Attributive suffix -гы/-ги/-гу/-гү added to locative forms
// Locative forms end in а/е/о/ө (all vowels), so the suffix always starts with г
const ATTRIBUTIVE_SUFFIX: string[] = ["гы", "ги", "гу", "гү"];

/**
 * Generate attributive forms from locative bases.
 * Covers: singular locative, 3sg possessive + locative, plural + locative.
 * Each gets the attributive suffix -гы/-ги/-гу/-гү based on vowel group.
 */
export function generateAttributiveForms(
  word: string,
  stem: StemInfo,
): string[] {
  const forms = new Set<string>();
  const vgIdx = stem.vowelGroup - 1;
  const attrSuffix = ATTRIBUTIVE_SUFFIX[vgIdx];

  // 1. Singular locative + attributive
  const locative = word + getSuffix(LOCATIVE, stem);
  forms.add(locative + attrSuffix);

  // 2. 3sg possessive + locative + attributive
  const poss3sg = word + getSuffix(POSS_3SG, stem);
  const poss3LocSuffix = POSS3_LOCATIVE[vgIdx];
  forms.add(poss3sg + poss3LocSuffix + attrSuffix);

  // 3. Plural + locative + attributive
  const plural = generatePlural(word, stem);
  const pluralStem: StemInfo = {
    stemType: "voiced",
    vowelGroup: stem.vowelGroup as VowelGroup,
  };
  const pluralLocative = plural + getSuffix(LOCATIVE, pluralStem);
  forms.add(pluralLocative + attrSuffix);

  return Array.from(forms);
}

/**
 * Generate plural + 3sg possessive + case chain forms.
 * E.g., мусулман → мусулмандар+ы (nom), мусулмандар+ы+нын (gen), etc.
 * Also includes attributive on the poss+locative form.
 */
export function generatePluralPossessiveCaseForms(
  word: string,
  stem: StemInfo,
): string[] {
  const forms = new Set<string>();
  const vgIdx = stem.vowelGroup - 1;

  // 1. Generate plural form (always ends in р = voiced)
  const plural = generatePlural(word, stem);
  const pluralStem: StemInfo = {
    stemType: "voiced",
    vowelGroup: stem.vowelGroup as VowelGroup,
  };

  // 2. Add 3sg possessive on plural stem: voiced → -ы/-и/-у/-ү
  const poss3sg = plural + getSuffix(POSS_3SG, pluralStem);
  forms.add(poss3sg);

  // 3. Poss3sg is vowel-final, so linking-н case suffixes apply
  forms.add(poss3sg + POSS3_GENITIVE[vgIdx]);
  forms.add(poss3sg + POSS3_DATIVE[vgIdx]);
  forms.add(poss3sg + POSS3_ACCUSATIVE[vgIdx]);
  forms.add(poss3sg + POSS3_LOCATIVE[vgIdx]);
  forms.add(poss3sg + POSS3_ABLATIVE[vgIdx]);

  // 4. Attributive on poss+locative form
  const poss3Locative = poss3sg + POSS3_LOCATIVE[vgIdx];
  forms.add(poss3Locative + ATTRIBUTIVE_SUFFIX[vgIdx]);

  return Array.from(forms);
}

const STEM_TYPE_LABELS: Record<StemType, string> = {
  vowel: "гласную",
  voiced: "звонкую согласную",
  voiceless: "глухую согласную",
};

const GROUP_VOWELS: Record<VowelGroup, string> = {
  1: "а/ы",
  2: "е/и",
  3: "о/у",
  4: "ө/ү",
};

const STEM_CONSONANT_PREFIX: Record<StemType, string> = {
  vowel: "-н-/-л-",
  voiced: "-д-",
  voiceless: "-т-",
};

/**
 * Generate a Russian-language explanation of the morphological rule.
 */
export function generateRule(
  word: string,
  stem: { stemType: string; vowelGroup: number },
): string {
  const st = stem.stemType as StemType;
  const vg = stem.vowelGroup as VowelGroup;
  const lastChar = word[word.length - 1];

  return (
    `Основа на ${STEM_TYPE_LABELS[st]} -${lastChar}, ` +
    `гласная группа ${vg} (${GROUP_VOWELS[vg]}) → ` +
    `суффиксы с ${STEM_CONSONANT_PREFIX[st]}, гласные ${GROUP_VOWELS[vg]} (гармония гласных)`
  );
}

// ── Verb morphology ────────────────────────────────────────────────

const INFINITIVE_ENDINGS = ["уу", "үү", "оо", "өө"];

const IRREGULAR_VERBS: Record<string, { stem: string; presentStem: string }> = {
  "де":  { stem: "де",  presentStem: "дей" },
  "же":  { stem: "же",  presentStem: "жей" },
};

/**
 * Extract the verb stem from a Kyrgyz verb.
 * Infinitives end in -уу/-үү/-оо/-өө; stem = strip last 2 chars.
 * Compound verbs: operate on the last word only.
 * Bare stems (e.g. "бар", "кеч-") returned cleaned of trailing hyphens.
 */
export function extractVerbStem(word: string): string {
  const cleaned = word.replace(/-$/, "");
  const spaceIdx = cleaned.lastIndexOf(" ");

  function stripInfinitive(w: string): string {
    // -оо → stem originally ended in -а; -өө → stem ended in -е
    if (w.endsWith("оо") && w.length > 2) return w.slice(0, -2) + "а";
    if (w.endsWith("өө") && w.length > 2) return w.slice(0, -2) + "е";
    // -уу/-үү → consonant-final stem, just strip
    if (w.endsWith("уу") && w.length > 2) return w.slice(0, -2);
    if (w.endsWith("үү") && w.length > 2) return w.slice(0, -2);
    return w;
  }

  if (spaceIdx === -1) {
    return stripInfinitive(cleaned);
  }

  const prefix = cleaned.slice(0, spaceIdx + 1);
  const lastWord = cleaned.slice(spaceIdx + 1);
  return prefix + stripInfinitive(lastWord);
}

// Verb suffix tables

// Definite past: stem + {D}{I}
const V_PAST: Record<StemType, string[]> = {
  vowel:     ["ды", "ди", "ду", "дү"],
  voiced:    ["ды", "ди", "ду", "дү"],
  voiceless: ["ты", "ти", "ту", "тү"],
};

// General past / participle: stem + {G}{A}н
const V_PARTICIPLE: Record<StemType, string[]> = {
  vowel:     ["ган", "ген", "гон", "гөн"],
  voiced:    ["ган", "ген", "гон", "гөн"],
  voiceless: ["кан", "кен", "кон", "көн"],
};

// Future: stem + {A}р
const V_FUTURE: Record<StemType, string[]> = {
  vowel:     ["р", "р", "р", "р"],
  voiced:    ["ар", "ер", "ор", "өр"],
  voiceless: ["ар", "ер", "ор", "өр"],
};

// Conditional: stem + с{A}
const V_CONDITIONAL: Record<StemType, string[]> = {
  vowel:     ["са", "се", "со", "сө"],
  voiced:    ["са", "се", "со", "сө"],
  voiceless: ["са", "се", "со", "сө"],
};

// Negation: stem + {B}{A}
const V_NEGATION: Record<StemType, string[]> = {
  vowel:     ["ба", "бе", "бо", "бө"],
  voiced:    ["ба", "бе", "бо", "бө"],
  voiceless: ["па", "пе", "по", "пө"],
};

// Gerund: stem + {I}п
const V_GERUND: Record<StemType, string[]> = {
  vowel:     ["п", "п", "п", "п"],
  voiced:    ["ып", "ип", "уп", "үп"],
  voiceless: ["ып", "ип", "уп", "үп"],
};

// Passive: stem + {I}л
const V_PASSIVE: Record<StemType, string[]> = {
  vowel:     ["л", "л", "л", "л"],
  voiced:    ["ыл", "ил", "ул", "үл"],
  voiceless: ["ыл", "ил", "ул", "үл"],
};

// Causative: stem + {D}{I}р
const V_CAUSATIVE: Record<StemType, string[]> = {
  vowel:     ["тыр", "тир", "тур", "түр"],
  voiced:    ["дыр", "дир", "дур", "дүр"],
  voiceless: ["тыр", "тир", "тур", "түр"],
};

// Link vowels by vowel group (used for present tense stem)
const LINK_VOWELS = ["а", "е", "о", "ө"];

function addPresentForms(
  forms: Set<string>,
  stem: string,
  stemInfo: StemInfo,
  prefix: string,
): void {
  const irregular = IRREGULAR_VERBS[stem];
  let base: string;

  if (irregular?.presentStem) {
    base = prefix + irregular.presentStem;
  } else if (stemInfo.stemType === "vowel") {
    // Vowel-final stems use -й- link: ташта+й+т, иште+й+т
    base = prefix + stem + "й";
  } else {
    base = prefix + stem + LINK_VOWELS[stemInfo.vowelGroup - 1];
  }

  forms.add(base + "м");
  forms.add(base + "сың");
  forms.add(base + "т");
  forms.add(base + "быз");
  forms.add(base + "сыңар");
}

function addPastForms(
  forms: Set<string>,
  stem: string,
  stemInfo: StemInfo,
  prefix: string,
): void {
  const pastSuffix = getSuffix(V_PAST, stemInfo);
  const base = prefix + stem + pastSuffix;
  // Person: 1sg -м, 2sg -ң, 3sg ∅, 1pl -к, 2pl -ңар
  forms.add(base + "м");
  forms.add(base + "ң");
  forms.add(base);
  forms.add(base + "к");
  forms.add(base + "ңар");
}

function conjugateAll(
  forms: Set<string>,
  stem: string,
  stemInfo: StemInfo,
  prefix: string,
): void {
  addPresentForms(forms, stem, stemInfo, prefix);
  addPastForms(forms, stem, stemInfo, prefix);

  // General past / participle
  const participle = prefix + stem + getSuffix(V_PARTICIPLE, stemInfo);
  forms.add(participle);

  // Future
  forms.add(prefix + stem + getSuffix(V_FUTURE, stemInfo));

  // Conditional + person
  const cond = prefix + stem + getSuffix(V_CONDITIONAL, stemInfo);
  forms.add(cond);
  forms.add(cond + "м");
  forms.add(cond + "ң");
  forms.add(cond + "к");
  forms.add(cond + "ңар");

  // Gerund
  forms.add(prefix + stem + getSuffix(V_GERUND, stemInfo));

  // Until-gerund: participle + ча/че
  const untilV = ["а", "е", "о", "ө"];
  forms.add(participle + "ч" + untilV[stemInfo.vowelGroup - 1]);
}

/**
 * Generate all conjugated forms of a Kyrgyz verb for indexing.
 * Covers: active/passive/causative × 5 tenses × 5 persons + negation + non-finite forms.
 */
export function generateVerbForms(word: string): string[] {
  const forms = new Set<string>();
  const fullStem = extractVerbStem(word);

  const spaceIdx = fullStem.lastIndexOf(" ");
  const prefix = spaceIdx === -1 ? "" : fullStem.slice(0, spaceIdx + 1);
  const stem = spaceIdx === -1 ? fullStem : fullStem.slice(spaceIdx + 1);
  const stemInfo = classifyStem(stem);

  // Active voice
  conjugateAll(forms, stem, stemInfo, prefix);

  // Passive voice: stem + {I}л
  const passiveStem = stem + getSuffix(V_PASSIVE, stemInfo);
  const passiveInfo = classifyStem(passiveStem);
  conjugateAll(forms, passiveStem, passiveInfo, prefix);

  // Causative voice: stem + {D}{I}р
  const causativeStem = stem + getSuffix(V_CAUSATIVE, stemInfo);
  const causativeInfo = classifyStem(causativeStem);
  conjugateAll(forms, causativeStem, causativeInfo, prefix);

  // Negation (active): stem + {B}{A} + й + person (special present)
  const negSuffix = getSuffix(V_NEGATION, stemInfo);
  const negStem = stem + negSuffix;
  const negInfo = classifyStem(negStem);
  // Neg present: -байт/-бейт etc.
  const negPresBase = prefix + negStem + "й";
  forms.add(negPresBase + "м");
  forms.add(negPresBase + "сың");
  forms.add(negPresBase + "т");
  forms.add(negPresBase + "быз");
  forms.add(negPresBase + "сыңар");
  // Neg past/participle/future/conditional
  addPastForms(forms, negStem, negInfo, prefix);
  forms.add(prefix + negStem + getSuffix(V_PARTICIPLE, negInfo));
  forms.add(prefix + negStem + getSuffix(V_FUTURE, negInfo));
  const negCond = prefix + negStem + getSuffix(V_CONDITIONAL, negInfo);
  forms.add(negCond);
  forms.add(negCond + "м");
  forms.add(negCond + "ң");
  forms.add(prefix + negStem + getSuffix(V_GERUND, negInfo));

  // Negation (passive)
  const negPassiveStem = passiveStem + getSuffix(V_NEGATION, passiveInfo);
  const negPassiveInfo = classifyStem(negPassiveStem);
  const negPassPresBase = prefix + negPassiveStem + "й";
  forms.add(negPassPresBase + "т");
  addPastForms(forms, negPassiveStem, negPassiveInfo, prefix);
  forms.add(prefix + negPassiveStem + getSuffix(V_PARTICIPLE, negPassiveInfo));

  return Array.from(forms);
}

/**
 * Enrich a DictionaryEntry with morphological data if it's a noun without morphology.
 */
export function enrichEntry(entry: DictionaryEntry): DictionaryEntry {
  if (entry.pos !== "noun" || entry.morphology) {
    return entry;
  }

  const stem = classifyStem(entry.ky);
  const forms = generateNounForms(entry.ky, stem);
  const pluralForms = generateNounPluralForms(entry.ky, stem);
  const rule = generateRule(entry.ky, stem);

  // Remove nominative from forms records (it's just the word/plural itself)
  const { nominative: _n, ...singularCases } = forms;
  const { nominative: _np, ...pluralCases } = pluralForms;

  return {
    ...entry,
    morphology: {
      stemType: stem.stemType,
      vowelGroup: stem.vowelGroup,
      forms: singularCases,
      pluralForms: pluralCases,
      rule,
    },
  };
}
