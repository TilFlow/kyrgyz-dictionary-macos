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
    }
    // adj, adv, pron, post, num, conj, intj: base form only
  }

  return forms;
}
