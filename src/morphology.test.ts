import { describe, expect, test } from "bun:test";
import {
  classifyStem,
  generatePlural,
  generateNounForms,
  generateNounPluralForms,
  generatePossessiveForms,
  generatePossessiveCaseForms,
  generateAttributiveForms,
  generatePluralPossessiveCaseForms,
  generateRule,
  enrichEntry,
  extractVerbStem,
  generateVerbForms,
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

describe("generateAttributiveForms", () => {
  test("китеп (voiceless, group 2): locative+attributive", () => {
    const forms = generateAttributiveForms("китеп", { stemType: "voiceless", vowelGroup: 2 });
    expect(forms).toContain("китептеги");
  });

  test("бала (vowel, group 1): locative+attributive", () => {
    const forms = generateAttributiveForms("бала", { stemType: "vowel", vowelGroup: 1 });
    expect(forms).toContain("баладагы");
  });

  test("сөз (voiced, group 4): locative+attributive", () => {
    const forms = generateAttributiveForms("сөз", { stemType: "voiced", vowelGroup: 4 });
    expect(forms).toContain("сөздөгү");
  });

  test("жол (voiced, group 3): locative+attributive", () => {
    const forms = generateAttributiveForms("жол", { stemType: "voiced", vowelGroup: 3 });
    expect(forms).toContain("жолдогу");
  });

  test("includes 3sg poss+loc+attributive", () => {
    const forms = generateAttributiveForms("календар", classifyStem("календар"));
    expect(forms).toContain("календардагы");
    expect(forms).toContain("календарындагы");
  });

  test("includes plural+loc+attributive", () => {
    const forms = generateAttributiveForms("китеп", { stemType: "voiceless", vowelGroup: 2 });
    expect(forms).toContain("китептеги");
    expect(forms).toContain("китептердеги");
  });
});

describe("generatePluralPossessiveCaseForms", () => {
  test("мусулман (voiced, group 1): plural+3sg poss+cases", () => {
    const stem = classifyStem("мусулман");
    const forms = generatePluralPossessiveCaseForms("мусулман", stem);
    expect(forms).toContain("мусулмандары");       // pl+3sg poss nom
    expect(forms).toContain("мусулмандарынын");    // pl+3sg poss gen
    expect(forms).toContain("мусулмандарына");     // pl+3sg poss dat
    expect(forms).toContain("мусулмандарын");      // pl+3sg poss acc
    expect(forms).toContain("мусулмандарында");    // pl+3sg poss loc
    expect(forms).toContain("мусулмандарынан");    // pl+3sg poss abl
  });

  test("иш (voiced, group 2): plural+3sg poss", () => {
    const stem = classifyStem("иш");
    const forms = generatePluralPossessiveCaseForms("иш", stem);
    expect(forms).toContain("иштери");             // pl+3sg poss nom
    expect(forms).toContain("иштеринин");          // pl+3sg poss gen
  });

  test("тармак (voiceless, group 1): plural+3sg poss+loc", () => {
    const stem = classifyStem("тармак");
    const forms = generatePluralPossessiveCaseForms("тармак", stem);
    expect(forms).toContain("тармактары");         // pl+3sg poss nom
    expect(forms).toContain("тармактарында");      // pl+3sg poss loc
  });

  test("generates 7+ forms (nom + 5 cases + attributive)", () => {
    const stem = classifyStem("мусулман");
    const forms = generatePluralPossessiveCaseForms("мусулман", stem);
    expect(forms.length).toBeGreaterThanOrEqual(7);
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

  test('regenerates morphology even if already present', () => {
    const entry: DictionaryEntry = {
      id: "ru-книга-001",
      ru: "книга",
      ky: "китеп",
      pos: "noun",
      source: "wiktionary-en",
      morphology: {
        stemType: "voiced",
        vowelGroup: 2,
        rule: "old wrong rule",
      },
    };
    const enriched = enrichEntry(entry);
    expect(enriched.morphology!.stemType).toBe("voiceless");
    expect(enriched.morphology!.rule).not.toBe("old wrong rule");
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

describe("extractVerbStem", () => {
  test("strips -уу infinitive suffix", () => {
    expect(extractVerbStem("баруу")).toBe("бар");
    expect(extractVerbStem("алуу")).toBe("ал");
  });

  test("strips -үү infinitive suffix", () => {
    expect(extractVerbStem("берүү")).toBe("бер");
    expect(extractVerbStem("билүү")).toBe("бил");
  });

  test("strips -оо/-өө infinitive suffix", () => {
    expect(extractVerbStem("суроо")).toBe("сура");
    expect(extractVerbStem("иштөө")).toBe("иште");
  });

  test("returns word as-is if no infinitive suffix", () => {
    expect(extractVerbStem("бар")).toBe("бар");
    expect(extractVerbStem("кел")).toBe("кел");
  });

  test("strips trailing hyphens", () => {
    expect(extractVerbStem("кеч-")).toBe("кеч");
  });

  test("handles compound verbs", () => {
    expect(extractVerbStem("забастовка чыгаруу")).toBe("забастовка чыгар");
    expect(extractVerbStem("иш ташто")).toBe("иш ташто");
  });
});

describe("generateVerbForms", () => {
  test("бар (voiced, group 1): present aorist forms", () => {
    const forms = generateVerbForms("баруу");
    expect(forms).toContain("барам");
    expect(forms).toContain("барасың");
    expect(forms).toContain("барат");
    expect(forms).toContain("барабыз");
    expect(forms).toContain("барасыңар");
  });

  test("бар: definite past forms", () => {
    const forms = generateVerbForms("баруу");
    expect(forms).toContain("бардым");
    expect(forms).toContain("бардың");
    expect(forms).toContain("барды");
    expect(forms).toContain("бардык");
    expect(forms).toContain("бардыңар");
  });

  test("бар: general past (participle)", () => {
    const forms = generateVerbForms("баруу");
    expect(forms).toContain("барган");
  });

  test("бар: future and conditional", () => {
    const forms = generateVerbForms("баруу");
    expect(forms).toContain("барар");
    expect(forms).toContain("барса");
    expect(forms).toContain("барсам");
  });

  test("бер (voiced, group 2): vowel harmony", () => {
    const forms = generateVerbForms("берүү");
    expect(forms).toContain("берет");
    expect(forms).toContain("берди");
    expect(forms).toContain("берген");
    expect(forms).toContain("берер");
    expect(forms).toContain("берсе");
  });

  test("өткөр: passive forms (the original failing lookup)", () => {
    const forms = generateVerbForms("өткөрүү");
    expect(forms).toContain("өткөрүлөт");
    expect(forms).toContain("өткөрүлдү");
    expect(forms).toContain("өткөрүлгөн");
  });

  test("negation forms", () => {
    const forms = generateVerbForms("баруу");
    expect(forms).toContain("барбайт");
    expect(forms).toContain("барбады");
    expect(forms).toContain("барбаган");
  });

  test("causative forms", () => {
    const forms = generateVerbForms("баруу");
    expect(forms).toContain("бардырат");
    expect(forms).toContain("бардырды");
  });

  test("non-finite forms", () => {
    const forms = generateVerbForms("баруу");
    expect(forms).toContain("барып");
    expect(forms).toContain("барганча");
  });

  test("compound verb conjugation", () => {
    const forms = generateVerbForms("иш таштоо");
    expect(forms).toContain("иш таштайт");
    expect(forms).toContain("иш таштады");
  });

  test("irregular verb: де → дейт", () => {
    const forms = generateVerbForms("деуу");
    expect(forms).toContain("дейт");
    expect(forms).toContain("деди");
    expect(forms).toContain("деген");
  });

  test("bare stem verb works", () => {
    const forms = generateVerbForms("бар");
    expect(forms).toContain("барат");
    expect(forms).toContain("барды");
  });

  test("күтүү: collective voice forms (күтүшөт, күтүштү)", () => {
    const forms = generateVerbForms("күтүү");
    expect(forms).toContain("күтүшөт");    // collective present 3sg
    expect(forms).toContain("күтүштү");    // collective past 3sg
    expect(forms).toContain("күтүшкөн");   // collective participle
  });

  test("баруу: collective voice forms (барышат)", () => {
    const forms = generateVerbForms("баруу");
    expect(forms).toContain("барышат");     // collective present 3sg
    expect(forms).toContain("барышты");     // collective past 3sg
  });

  test("иштөө: collective voice forms (vowel stem)", () => {
    const forms = generateVerbForms("иштөө");
    expect(forms).toContain("иштешет");     // collective present 3sg
    expect(forms).toContain("иштешти");     // collective past 3sg
  });

  test("generates 80+ unique forms per simple verb", () => {
    const forms = generateVerbForms("баруу");
    expect(forms.length).toBeGreaterThanOrEqual(80);
  });
});
