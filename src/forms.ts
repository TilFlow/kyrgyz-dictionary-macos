import type { DictionaryEntry } from "./schema";
import {
  classifyStem,
  generateNounForms,
  generatePlural,
  generatePluralCaseForms,
  generatePossessiveForms,
  generatePossessiveCaseForms,
  generateAttributiveForms,
  generatePluralPossessiveCaseForms,
  generateVerbForms,
} from "./morphology";

// Irregular pronoun declensions: nom → [gen, dat, acc, loc, abl]
const PRONOUN_FORMS: Record<string, string[]> = {
  "мен":    ["менин", "мага", "мени", "менде", "менден"],
  "сен":    ["сенин", "сага", "сени", "сенде", "сенден"],
  "сиз":    ["сиздин", "сизге", "сизди", "сизде", "сизден"],
  "ал":     ["анын", "ага", "аны", "анда", "андан"],
  "биз":    ["биздин", "бизге", "бизди", "бизде", "бизден"],
  "силер":  ["силердин", "силерге", "силерди", "силерде", "силерден"],
  "сиздер": ["сиздердин", "сиздерге", "сиздерди", "сиздерде", "сиздерден"],
  "алар":   ["алардын", "аларга", "аларды", "аларда", "алардан"],
  "өз":     ["өзүнүн", "өзүнө", "өзүн", "өзүндө", "өзүнөн", "өзү", "өзүм", "өзүң", "өзүбүз", "өзүңүз",
             "өзүлөрү", "өзүлөрүн", "өзүлөрүнүн", "өзүлөрүнө", "өзүлөрүндө", "өзүлөрүнөн"],
  "бул":    ["мунун", "буга", "муну", "мунда", "мындан"],
  "ошол":   ["ошонун", "ошого", "ошону", "ошондо", "ошондон"],
  "ким":    ["кимдин", "кимге", "кимди", "кимде", "кимден"],
  "эмне":   ["эмненин", "эмнеге", "эмнени", "эмнеде", "эмнеден"],
};

/**
 * Build a Set of all known Kyrgyz word forms from dictionary entries.
 * Nouns: base + cases + plural + possessives + possessive cases + attributives.
 * Verbs: all conjugations via generateVerbForms.
 * Other POS: base form only.
 */
export function buildFormSet(entries: DictionaryEntry[]): Set<string> {
  const forms = new Set<string>();

  for (const entry of entries) {
    const word = entry.ky.toLowerCase();
    forms.add(word);

    if (entry.pos === "noun") {
      const stem = classifyStem(word);

      // Singular case forms
      const caseF = generateNounForms(word, stem);
      for (const f of Object.values(caseF)) forms.add(f);

      // Plural
      const plural = generatePlural(word, stem);
      forms.add(plural);

      // Plural + case forms
      for (const f of generatePluralCaseForms(word, stem)) forms.add(f);

      // Possessive forms (nominative)
      for (const f of generatePossessiveForms(word, stem)) forms.add(f);

      // Possessive + case combinations
      for (const f of generatePossessiveCaseForms(word, stem)) forms.add(f);

      // Attributive forms
      for (const f of generateAttributiveForms(word, stem)) forms.add(f);

      // Plural + possessive + case
      for (const f of generatePluralPossessiveCaseForms(word, stem)) forms.add(f);

    } else if (entry.pos === "verb") {
      // All verb conjugations
      for (const f of generateVerbForms(word)) forms.add(f);

      // Verb infinitives (-уу/-өө/-оо etc.) also function as nouns.
      // Vowel harmony may follow root, not suffix, so generate forms for
      // both the classified group and the root's group to cover all variants.
      const vStem = classifyStem(word);
      const caseF = generateNounForms(word, vStem);
      for (const f of Object.values(caseF)) forms.add(f);
      const vPlural = generatePlural(word, vStem);
      forms.add(vPlural);
      for (const f of generatePluralCaseForms(word, vStem)) forms.add(f);

      // Also generate with root vowel harmony if different
      const verbStemWord = word.replace(/(уу|оо|үү|өө|ыш|иш|уш|үш)$/, "");
      if (verbStemWord.length > 0 && verbStemWord !== word) {
        const rootStem = classifyStem(verbStemWord);
        if (rootStem.vowelGroup !== vStem.vowelGroup) {
          const altStem = { ...vStem, vowelGroup: rootStem.vowelGroup };
          const altForms = generateNounForms(word, altStem);
          for (const f of Object.values(altForms)) forms.add(f);
          const altPlural = generatePlural(word, altStem);
          forms.add(altPlural);
          for (const f of generatePluralCaseForms(word, altStem)) forms.add(f);
        }
      }

    } else if (entry.pos === "pron") {
      // Irregular pronoun declensions
      const pronounForms = PRONOUN_FORMS[word];
      if (pronounForms) {
        for (const f of pronounForms) forms.add(f);
      } else {
        // Fallback: treat as noun for regular case generation
        const stem = classifyStem(word);
        const caseF = generateNounForms(word, stem);
        for (const f of Object.values(caseF)) forms.add(f);
      }
    }
    // adj, adv, post, num, conj, intj: base form only
  }

  return forms;
}
