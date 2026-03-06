import { describe, expect, test } from "bun:test";
import {
  classifyStem,
  generatePlural,
  generateNounForms,
  generateNounPluralForms,
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
