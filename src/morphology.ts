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
