import { describe, expect, test } from "bun:test";
import {
  classifyStem,
  generatePlural,
  generateNounForms,
  generateNounPluralForms,
  generatePossessiveForms,
  generatePossessiveCaseForms,
  generateRule,
  enrichEntry,
} from "./morphology";
import type { DictionaryEntry } from "./schema";

describe("classifyStem", () => {
  test('китеп → voiceless stem, vowel group 2', () => {
    expect(classifyStem("китеп")).toEqual({ stemType: "voiceless", vowelGroup: 2 });
  });

  test('бала → vowel stem, vowel group 1', () => {
    expect(classifyStem("бала")).toEqual({ stemType: "vowel", vowelGroup: 1 });
  });

  test('сөз → voiced stem, vowel group 4', () => {
    expect(classifyStem("сөз")).toEqual({ stemType: "voiced", vowelGroup: 4 });
  });

  test('тоо → vowel stem, vowel group 3', () => {
    expect(classifyStem("тоо")).toEqual({ stemType: "vowel", vowelGroup: 3 });
  });

  test('үй → voiced stem, vowel group 4', () => {
    expect(classifyStem("үй")).toEqual({ stemType: "voiced", vowelGroup: 4 });
  });

  test('жол → voiced stem, vowel group 3', () => {
    expect(classifyStem("жол")).toEqual({ stemType: "voiced", vowelGroup: 3 });
  });
});

describe("generateNounForms", () => {
  test('китеп (voiceless, group 2) → correct case forms', () => {
    const forms = generateNounForms("китеп", { stemType: "voiceless", vowelGroup: 2 });
    expect(forms.nominative).toBe("китеп");
    expect(forms.genitive).toBe("китептин");
    expect(forms.dative).toBe("китепке");
    expect(forms.accusative).toBe("китепти");
    expect(forms.locative).toBe("китепте");
    expect(forms.ablative).toBe("китептен");
  });

  test('бала (vowel, group 1) → correct case forms', () => {
    const forms = generateNounForms("бала", { stemType: "vowel", vowelGroup: 1 });
    expect(forms.nominative).toBe("бала");
    expect(forms.genitive).toBe("баланын");
    expect(forms.dative).toBe("балага");
    expect(forms.accusative).toBe("баланы");
    expect(forms.locative).toBe("балада");
    expect(forms.ablative).toBe("баладан");
  });

  test('сөз (voiced, group 4) → correct case forms', () => {
    const forms = generateNounForms("сөз", { stemType: "voiced", vowelGroup: 4 });
    expect(forms.nominative).toBe("сөз");
    expect(forms.genitive).toBe("сөздүн");
    expect(forms.dative).toBe("сөзгө");
    expect(forms.accusative).toBe("сөздү");
    expect(forms.locative).toBe("сөздө");
    expect(forms.ablative).toBe("сөздөн");
  });
});

describe("generatePlural", () => {
  test('китеп (voiceless, group 2) → китептер', () => {
    expect(generatePlural("китеп", { stemType: "voiceless", vowelGroup: 2 })).toBe("китептер");
  });

  test('бала (vowel, group 1) → балалар', () => {
    expect(generatePlural("бала", { stemType: "vowel", vowelGroup: 1 })).toBe("балалар");
  });

  test('сөз (voiced, group 4) → сөздөр', () => {
    expect(generatePlural("сөз", { stemType: "voiced", vowelGroup: 4 })).toBe("сөздөр");
  });

  test('тоо (vowel, group 3) → тоолор', () => {
    expect(generatePlural("тоо", { stemType: "vowel", vowelGroup: 3 })).toBe("тоолор");
  });
});

describe("generateNounPluralForms", () => {
  test('китеп plural forms: voiced stem with group 2 suffixes', () => {
    const forms = generateNounPluralForms("китеп", { stemType: "voiceless", vowelGroup: 2 });
    // plural "китептер" ends in р (voiced), suffix vowel е → group 2
    expect(forms.nominative).toBe("китептер");
    expect(forms.genitive).toBe("китептердин");
    expect(forms.dative).toBe("китептерге");
    expect(forms.accusative).toBe("китептерди");
    expect(forms.locative).toBe("китептерде");
    expect(forms.ablative).toBe("китептерден");
  });

  test('бала plural forms: voiced stem with group 1 suffixes', () => {
    const forms = generateNounPluralForms("бала", { stemType: "vowel", vowelGroup: 1 });
    // plural "балалар" ends in р (voiced), suffix vowel а → group 1
    expect(forms.nominative).toBe("балалар");
    expect(forms.genitive).toBe("балалардын");
    expect(forms.dative).toBe("балаларга");
  });

  test('сөз plural forms: voiced stem with group 4 suffixes', () => {
    const forms = generateNounPluralForms("сөз", { stemType: "voiced", vowelGroup: 4 });
    // plural "сөздөр" ends in р (voiced), suffix vowel ө → group 4
    expect(forms.nominative).toBe("сөздөр");
    expect(forms.genitive).toBe("сөздөрдүн");
    expect(forms.dative).toBe("сөздөргө");
    expect(forms.accusative).toBe("сөздөрдү");
    expect(forms.locative).toBe("сөздөрдө");
    expect(forms.ablative).toBe("сөздөрдөн");
  });
});

describe("generatePossessiveForms", () => {
  test('күн (voiced, group 4) → correct possessive nominatives', () => {
    const forms = generatePossessiveForms("күн", { stemType: "voiced", vowelGroup: 4 });
    expect(forms).toContain("күнүм");   // 1sg: my day
    expect(forms).toContain("күнүң");   // 2sg: your day
    expect(forms).toContain("күнү");    // 3sg: his/her day
    expect(forms).toContain("күнүбүз"); // 1pl: our day
    expect(forms).toContain("күнүңүз"); // 2pl: your (formal) day
  });

  test('бала (vowel, group 1) → correct possessive nominatives', () => {
    const forms = generatePossessiveForms("бала", { stemType: "vowel", vowelGroup: 1 });
    expect(forms).toContain("балам");   // 1sg
    expect(forms).toContain("балаң");   // 2sg
    expect(forms).toContain("баласы");  // 3sg
    expect(forms).toContain("балабыз"); // 1pl
    expect(forms).toContain("балаңыз"); // 2pl
  });

  test('китеп (voiceless, group 2) → correct possessive nominatives', () => {
    const forms = generatePossessiveForms("китеп", { stemType: "voiceless", vowelGroup: 2 });
    // Consonant voicing (п→б) is not modeled; forms use base stem
    expect(forms).toContain("китепим");   // 1sg
    expect(forms).toContain("китепиң");   // 2sg
    expect(forms).toContain("китепи");    // 3sg
    expect(forms).toContain("китепибиз"); // 1pl
    expect(forms).toContain("китепиңиз"); // 2pl
  });
});

describe("generatePossessiveCaseForms", () => {
  test('күн 3sg possessive + cases (linking-н)', () => {
    const forms = generatePossessiveCaseForms("күн", { stemType: "voiced", vowelGroup: 4 });
    // 3sg possessive: күнү (vowel-final) → linking-н case suffixes
    expect(forms).toContain("күнү");      // 3sg poss nom
    expect(forms).toContain("күнүнөн");   // 3sg poss ablative — the original failing lookup
    expect(forms).toContain("күнүнүн");   // 3sg poss genitive
    expect(forms).toContain("күнүнө");    // 3sg poss dative
    expect(forms).toContain("күнүн");     // 3sg poss accusative
    expect(forms).toContain("күнүндө");   // 3sg poss locative
  });

  test('бала 3sg possessive + cases (linking-н)', () => {
    const forms = generatePossessiveCaseForms("бала", { stemType: "vowel", vowelGroup: 1 });
    // 3sg possessive: баласы (vowel-final) → linking-н case suffixes
    expect(forms).toContain("баласы");     // 3sg poss nom
    expect(forms).toContain("баласынан");  // 3sg poss ablative
    expect(forms).toContain("баласынын");  // 3sg poss genitive
  });

  test('1sg/2sg possessive + cases (voiced-stem suffixes)', () => {
    const forms = generatePossessiveCaseForms("күн", { stemType: "voiced", vowelGroup: 4 });
    // 1sg possessive: күнүм (м = voiced consonant) → voiced-stem suffixes
    expect(forms).toContain("күнүм");      // 1sg nom
    expect(forms).toContain("күнүмдөн");   // 1sg ablative (voiced: -дөн)
    expect(forms).toContain("күнүмдүн");   // 1sg genitive
    expect(forms).toContain("күнүмгө");    // 1sg dative
    // 2sg possessive: күнүң (ң = voiced consonant) → voiced-stem suffixes
    expect(forms).toContain("күнүң");      // 2sg nom
    expect(forms).toContain("күнүңдөн");   // 2sg ablative
  });

  test('generates significant number of forms', () => {
    const forms = generatePossessiveCaseForms("күн", { stemType: "voiced", vowelGroup: 4 });
    // 5 persons × 6 cases (nom + 5 oblique) = 30 forms max (some may merge)
    expect(forms.length).toBeGreaterThanOrEqual(20);
  });
});

describe("generateRule", () => {
  test('returns a non-empty Russian string', () => {
    const rule = generateRule("китеп", { stemType: "voiceless", vowelGroup: 2 });
    expect(typeof rule).toBe("string");
    expect(rule.length).toBeGreaterThan(0);
    expect(rule).toMatch(/[а-яА-Я]/);
  });
});

describe("enrichEntry", () => {
  test('enriches a noun entry without morphology', () => {
    const entry: DictionaryEntry = {
      id: "ru-книга-001",
      ru: "книга",
      ky: "китеп",
      pos: "noun",
      source: "wiktionary-en",
    };
    const enriched = enrichEntry(entry);
    expect(enriched.morphology).toBeDefined();
    expect(enriched.morphology!.stemType).toBe("voiceless");
    expect(enriched.morphology!.vowelGroup).toBe(2);
    expect(enriched.morphology!.forms).toBeDefined();
    expect(enriched.morphology!.pluralForms).toBeDefined();
    expect(enriched.morphology!.rule).toBeDefined();
  });

  test('does not overwrite existing morphology', () => {
    const entry: DictionaryEntry = {
      id: "ru-книга-001",
      ru: "книга",
      ky: "китеп",
      pos: "noun",
      source: "wiktionary-en",
      morphology: {
        stemType: "voiceless",
        vowelGroup: 2,
        rule: "custom rule",
      },
    };
    const enriched = enrichEntry(entry);
    expect(enriched.morphology!.rule).toBe("custom rule");
  });

  test('does not enrich non-noun entries', () => {
    const entry: DictionaryEntry = {
      id: "ru-большой-001",
      ru: "большой",
      ky: "чоң",
      pos: "adj",
      source: "wiktionary-en",
    };
    const enriched = enrichEntry(entry);
    expect(enriched.morphology).toBeUndefined();
  });
});
