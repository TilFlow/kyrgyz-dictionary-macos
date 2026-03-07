import { describe, expect, test } from "bun:test";
import { generateEntry, generateDictionary, generateFrontMatter, generateEnKyDictionary, generateKyEnDictionary } from "./xml-generator";
import type { DictionaryEntry } from "./schema";
import type { EnKyEntry } from "./xml-generator";

const fullEntry: DictionaryEntry = {
  id: "ru-книга-001",
  ru: "книга",
  ky: "китеп",
  pos: "noun",
  pronunciation: "/kitep/",
  senses: ["книга", "письменное произведение"],
  examples: [
    { ky: "китеп окуу", ru: "читать книгу" },
    { ky: "китеп жазуу", ru: "написать книгу" },
  ],
  morphology: {
    stemType: "voiceless",
    vowelGroup: 2,
    forms: {
      nominative: "китеп",
      genitive: "китептин",
      dative: "китепке",
      accusative: "китепти",
      locative: "китепте",
      ablative: "китептен",
    },
    pluralForms: {
      nominative: "китептер",
      genitive: "китептердин",
      dative: "китептерге",
      accusative: "китептерди",
      locative: "китептерде",
      ablative: "китептерден",
    },
    rule: "Основа на глухую согласную -п, гласная группа 2",
  },
  derivation: {
    root: "китеп",
    suffix: "-кана, -чи",
    explanation: "китепкана (библиотека), китепчи (книголюб)",
  },
  related: ["китепкана", "китепчи"],
  etymology: "от араб. kitab",
  wiktionaryUrl: "https://en.wiktionary.org/wiki/китеп",
  source: "manual",
};

const minimalEntry: DictionaryEntry = {
  id: "ru-да-001",
  ru: "да",
  ky: "ооба",
  pos: "intj",
  source: "wiktionary-en",
};

describe("generateEntry", () => {
  test("returns valid XML d:entry for a complete entry", () => {
    const xml = generateEntry(fullEntry);
    expect(xml).toContain('<d:entry id="ru-книга-001"');
    expect(xml).toContain('d:title="книга"');
    expect(xml).toContain("</d:entry>");
  });

  test("includes d:index for ru word, ky word, and all morphological forms", () => {
    const xml = generateEntry(fullEntry);
    // ru word index (d:title = headword "книга" for ru-ky direction)
    expect(xml).toContain('d:value="книга" d:title="книга"');
    // ky word index
    expect(xml).toContain('d:value="китеп" d:title="книга"');
    // singular forms
    expect(xml).toContain('d:value="китептин"');
    expect(xml).toContain('d:value="китепке"');
    expect(xml).toContain('d:value="китепти"');
    expect(xml).toContain('d:value="китепте"');
    expect(xml).toContain('d:value="китептен"');
    // plural nominative
    expect(xml).toContain('d:value="китептер"');
    // plural case forms
    expect(xml).toContain('d:value="китептердин"');
    expect(xml).toContain('d:value="китептерге"');
    expect(xml).toContain('d:value="китептерди"');
    expect(xml).toContain('d:value="китептерде"');
    expect(xml).toContain('d:value="китептерден"');
    // all indices have d:title
    const indexCount = (xml.match(/d:index/g) || []).length;
    const titleCount = (xml.match(/d:title="/g) || []).length;
    // Each d:index has d:title, plus d:entry has d:title = indexCount + 1
    expect(titleCount).toBe(indexCount + 1);
  });

  test("has d:priority='1' span with compact view", () => {
    const xml = generateEntry(fullEntry);
    expect(xml).toContain('d:priority="1"');
    expect(xml).toContain('<h1 class="hw">книга</h1>');
    expect(xml).toContain('<span class="pronunciation">/kitep/</span>');
    expect(xml).toContain('<span class="pos">');
    expect(xml).toContain("сущ.");
    // Brief morphology with case labels
    expect(xml).toContain("китептин");
    expect(xml).toContain("(род.)");
    expect(xml).toContain("китепке");
    expect(xml).toContain("(дат.)");
    expect(xml).toContain("китепти");
    expect(xml).toContain("(вин.)");
    // First sense — Kyrgyz translation in compact view
    expect(xml).toContain("<li>китеп</li>");
  });

  test("has d:priority='2' div with full view sections", () => {
    const xml = generateEntry(fullEntry);
    expect(xml).toContain('d:priority="2"');
    expect(xml).toContain('class="full-entry"');

    // Translation section — Kyrgyz translation first, then senses
    expect(xml).toContain("Перевод");
    expect(xml).toContain("<li>китеп</li>");
    expect(xml).toContain("<li>книга</li>");
    expect(xml).toContain("<li>письменное произведение</li>");

    // Examples section
    expect(xml).toContain("Примеры");
    expect(xml).toContain('<span class="ky">китеп окуу</span>');
    expect(xml).toContain('<span class="ru">читать книгу</span>');

    // Morphology section
    expect(xml).toContain("Морфология");
    expect(xml).toContain('class="morph-table"');
    expect(xml).toContain("Именительный");
    expect(xml).toContain("Родительный");
    expect(xml).toContain("Дательный");
    expect(xml).toContain("Винительный");
    expect(xml).toContain("Местный");
    expect(xml).toContain("Исходный");

    // Derivation section
    expect(xml).toContain("Словообразование");
    expect(xml).toContain("китепкана");

    // Etymology section
    expect(xml).toContain("Этимология");
    expect(xml).toContain("от араб. kitab");

    // Wiktionary link
    expect(xml).toContain('class="wiktionary-link"');
    expect(xml).toContain("https://en.wiktionary.org/wiki/китеп");
  });

  test("works for minimal entry without optional fields", () => {
    const xml = generateEntry(minimalEntry);
    expect(xml).toContain('<d:entry id="ru-да-001"');
    expect(xml).toContain('d:value="да" d:title="да"');
    expect(xml).toContain('d:value="ооба" d:title="да"');
    expect(xml).toContain("межд.");
    // Should not contain optional sections
    expect(xml).not.toContain("Морфология");
    expect(xml).not.toContain("Примеры");
    expect(xml).not.toContain("Этимология");
    expect(xml).not.toContain("Словообразование");
    expect(xml).not.toContain("wiktionary-link");
  });

  test("includes verb conjugation forms in d:index for verb entries", () => {
    const verbEntry: DictionaryEntry = {
      id: "ru-идти-001",
      ru: "идти",
      ky: "баруу",
      pos: "verb",
      source: "wiktionary-en",
    };
    const xml = generateEntry(verbEntry);
    expect(xml).toContain('d:value="идти"');
    expect(xml).toContain('d:value="баруу"');
    expect(xml).toContain('d:value="барат"');
    expect(xml).toContain('d:value="барды"');
    expect(xml).toContain('d:value="барган"');
    expect(xml).toContain('d:value="барбайт"');
    expect(xml).toContain('d:value="барылат"');
    const indexMatches = xml.match(/d:index/g) || [];
    expect(indexMatches.length).toBeGreaterThan(10);
  });

  test("includes attributive forms in d:index for noun entries", () => {
    const xml = generateEntry(fullEntry);
    // китеп (voiceless, group 2): locative=китепте, attr=китептеги
    expect(xml).toContain('d:value="китептеги"');
  });

  test("includes plural+possessive+case forms in d:index for noun entries", () => {
    const xml = generateEntry(fullEntry);
    // китеп → китептери (pl+3sg poss), китептеринин (pl+3sg poss+gen)
    expect(xml).toContain('d:value="китептери"');
    expect(xml).toContain('d:value="китептеринин"');
  });

  test("escapes XML special characters in all text fields", () => {
    const entryWithSpecials: DictionaryEntry = {
      id: "ru-test-001",
      ru: 'тест & "кавычки"',
      ky: "тест <тег>",
      pos: "noun",
      senses: ["смысл & <значение>"],
      etymology: 'от "источника" & <языка>',
      source: "manual",
    };
    const xml = generateEntry(entryWithSpecials);
    // Must not contain unescaped special characters in text content
    expect(xml).toContain("тест &amp; &quot;кавычки&quot;");
    expect(xml).toContain("тест &lt;тег&gt;");
    expect(xml).toContain("смысл &amp; &lt;значение&gt;");
    expect(xml).toContain('от &quot;источника&quot; &amp; &lt;языка&gt;');
    // d:index values must also be escaped
    expect(xml).toContain('d:value="тест &amp; &quot;кавычки&quot;"');
    expect(xml).toContain('d:value="тест &lt;тег&gt;"');
  });
});

describe("generateFrontMatter", () => {
  test("produces a front-matter entry with credits and usage instructions", () => {
    const xml = generateFrontMatter();
    expect(xml).toContain('<d:entry id="front-matter"');
    expect(xml).toContain("d:title=");
    // Should have credits info
    expect(xml).toContain("Wiktionary");
    expect(xml).toContain("Apertium");
    // Should have usage instructions
    expect(xml).toContain("CC BY-SA");
    expect(xml).toContain("</d:entry>");
  });
});

describe("generateDictionary", () => {
  test("wraps entries in d:dictionary root with correct namespaces", () => {
    const xml = generateDictionary([minimalEntry]);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain("<d:dictionary");
    expect(xml).toContain(
      'xmlns:d="http://www.apple.com/DTDs/DictionaryService-1.0.rng"'
    );
    expect(xml).toContain('xmlns="http://www.w3.org/1999/xhtml"');
    expect(xml).toContain("</d:dictionary>");
    // Should contain the front matter
    expect(xml).toContain('id="front-matter"');
    // Should contain the entry
    expect(xml).toContain('id="ru-да-001"');
  });

  test("handles empty entries array", () => {
    const xml = generateDictionary([]);
    expect(xml).toContain("<d:dictionary");
    expect(xml).toContain("</d:dictionary>");
    // Still has front matter
    expect(xml).toContain('id="front-matter"');
  });
});

// ── Cross-dictionary integration tests ──────────────────────────────

const солнцеEntry: DictionaryEntry = {
  id: "ru-солнце-001",
  ru: "солнце",
  ky: "күн",
  pos: "noun",
  pronunciation: "/kyn/",
  senses: ["небесное тело"],
  etymology: "From Proto-Turkic *kün",
  source: "wiktionary-en",
};

const sunEnKy: EnKyEntry = {
  en: "sun",
  ky: "күн",
  sense: "the star around which the Earth revolves",
  pos: "noun",
  pronunciation: "/kyn/",
  etymology: "From Proto-Turkic *kün",
  frequency: 5801,
  wiktionaryUrl: "https://en.wiktionary.org/wiki/күн",
};

const жашEntry: DictionaryEntry = {
  id: "ru-возраст-001",
  ru: "возраст",
  ky: "жаш",
  pos: "noun",
  senses: ["возраст"],
  source: "wiktionary-en",
};

const молодойEntry: DictionaryEntry = {
  id: "ru-молодой-001",
  ru: "молодой",
  ky: "жаш",
  pos: "adj",
  senses: ["молодой", "юный"],
  source: "wiktionary-en",
};

const youngEnKy: EnKyEntry = {
  en: "young",
  ky: "жаш",
  sense: "in the early part of life or growth",
  pos: "adj",
  pronunciation: "/d͡ʒɑʃ/",
  etymology: "From жаш (jaş)",
  frequency: 2529,
};

const ageEnKy: EnKyEntry = {
  en: "age",
  ky: "жаш",
  sense: "amount of time since birth",
  pos: "noun",
  pronunciation: "/d͡ʒɑʃ/",
  frequency: 2529,
};

describe("солнце — all 4 directions", () => {
  test("ru-ky: headword солнце, indexes both ru and ky + morphology", () => {
    const xml = generateDictionary([солнцеEntry], "ru-ky");
    expect(xml).toContain('d:title="солнце"');
    expect(xml).toContain('<h1 class="hw">солнце</h1>');
    expect(xml).toContain('d:value="солнце"');
    expect(xml).toContain('d:value="күн"');
    // Morphological forms indexed
    expect(xml).toContain('d:value="күндөр"');
    expect(xml).toContain('d:value="күнүнүн"');
    // Pronunciation shown in compact view
    expect(xml).toContain('<span class="pronunciation">/kyn/</span>');
  });

  test("ky-ru: headword күн, groups by ky, indexes ky + morphology", () => {
    const xml = generateDictionary([солнцеEntry], "ky-ru");
    expect(xml).toContain('d:title="күн"');
    expect(xml).toContain('<h1 class="hw">күн</h1>');
    expect(xml).toContain('d:value="күн"');
    // Morphological forms
    expect(xml).toContain('d:value="күндөр"');
    expect(xml).toContain('d:value="күнүнүн"');
    // Translation is Russian
    expect(xml).toContain("солнце");
  });

  test("en-ky: headword sun, indexes ONLY English word", () => {
    const xml = generateEnKyDictionary([sunEnKy]);
    expect(xml).toContain('d:title="sun"');
    expect(xml).toContain('<h1 class="hw">sun</h1>');
    // Only English index
    expect(xml).toContain('d:value="sun"');
    // NO Kyrgyz index or morphological forms
    expect(xml).not.toContain('d:value="күн"');
    expect(xml).not.toContain('d:value="күндөр"');
    // Translation is Kyrgyz
    expect(xml).toContain("<li>күн</li>");
    // Pronunciation NOT in compact view (it's Kyrgyz, not English)
    expect(xml).not.toMatch(/<span d:priority="1">[\s\S]*?<span class="pronunciation">/);
    // Pronunciation in full view with "Kyrgyz" label
    expect(xml).toContain("Kyrgyz Pronunciation");
    expect(xml).toContain("/kyn/");
    // Etymology labeled as Kyrgyz
    expect(xml).toContain("Kyrgyz Etymology");
  });

  test("ky-en: headword күн, indexes ONLY Kyrgyz word + morphology", () => {
    const xml = generateKyEnDictionary([sunEnKy]);
    expect(xml).toContain('d:title="күн"');
    expect(xml).toContain('<h1 class="hw">күн</h1>');
    // Kyrgyz index + morphology
    expect(xml).toContain('d:value="күн"');
    expect(xml).toContain('d:value="күндөр"');
    expect(xml).toContain('d:value="күнүнүн"');
    // NO English index
    expect(xml).not.toContain('d:value="sun"');
    // Translation is English
    expect(xml).toContain("<li>sun</li>");
    // Pronunciation in compact view (headword is Kyrgyz — correct)
    expect(xml).toContain('<span class="pronunciation">/kyn/</span>');
    // Section labeled just "Pronunciation" (not "Kyrgyz")
    expect(xml).not.toContain("Kyrgyz Pronunciation");
    expect(xml).toContain("Pronunciation");
  });
});

describe("sun — all 4 directions", () => {
  test("en-ky: headword sun, no Kyrgyz in index", () => {
    const xml = generateEnKyDictionary([sunEnKy]);
    const indexMatches = xml.match(/d:index d:value="[^"]*"/g) || [];
    // Only 1 index: "sun"
    expect(indexMatches).toHaveLength(1);
    expect(indexMatches[0]).toContain("sun");
  });

  test("ky-en: headword күн, no English in index, morphological forms present", () => {
    const xml = generateKyEnDictionary([sunEnKy]);
    const indexMatches = xml.match(/d:index d:value="[^"]*"/g) || [];
    // All indices should be Kyrgyz
    for (const idx of indexMatches) {
      expect(idx).not.toContain("sun");
    }
    expect(indexMatches.length).toBeGreaterThan(10); // morphological forms
  });

  test("ru-ky: солнце entry has күн as translation", () => {
    const xml = generateEntry(солнцеEntry, "ru-ky");
    expect(xml).toContain('<h1 class="hw">солнце</h1>');
    expect(xml).toContain("<li>күн</li>");
  });

  test("ky-ru: күн entry has солнце as translation", () => {
    const xml = generateDictionary([солнцеEntry], "ky-ru");
    expect(xml).toContain('<h1 class="hw">күн</h1>');
    expect(xml).toContain("солнце");
  });
});

describe("жаш — all 4 directions", () => {
  test("ru-ky: indexes both возраст→жаш and молодой→жаш separately", () => {
    const xml = generateDictionary([жашEntry, молодойEntry], "ru-ky");
    expect(xml).toContain('d:title="возраст"');
    expect(xml).toContain('d:title="молодой"');
    expect(xml).toContain('<h1 class="hw">возраст</h1>');
    expect(xml).toContain('<h1 class="hw">молодой</h1>');
    // Both index жаш forms
    expect(xml).toContain('d:value="жаш"');
    expect(xml).toContain('d:value="жаштар"');
  });

  test("ky-ru: жаш merges both noun and adj translations", () => {
    const xml = generateDictionary([жашEntry, молодойEntry], "ky-ru");
    // Single merged entry with жаш headword
    expect(xml).toContain('d:title="жаш"');
    expect(xml).toContain('<h1 class="hw">жаш</h1>');
    // Both translations present
    expect(xml).toContain("возраст");
    expect(xml).toContain("молодой");
    // Morphological forms indexed
    expect(xml).toContain('d:value="жаштар"');
    expect(xml).toContain('d:value="жашынын"');
  });

  test("en-ky: age and young have separate entries, no Kyrgyz in index", () => {
    const xml = generateEnKyDictionary([ageEnKy, youngEnKy]);
    expect(xml).toContain('d:title="age"');
    expect(xml).toContain('d:title="young"');
    // No Kyrgyz index values
    expect(xml).not.toContain('d:value="жаш"');
    expect(xml).not.toContain('d:value="жаштар"');
    // English indices only
    expect(xml).toContain('d:value="age"');
    expect(xml).toContain('d:value="young"');
    // No pronunciation in compact view
    expect(xml).not.toMatch(/<span d:priority="1">[\s\S]*?<span class="pronunciation">/);
  });

  test("ky-en: жаш groups age+young, indexes Kyrgyz forms only", () => {
    const xml = generateKyEnDictionary([ageEnKy, youngEnKy]);
    expect(xml).toContain('d:title="жаш"');
    expect(xml).toContain('<h1 class="hw">жаш</h1>');
    // Kyrgyz morphological forms indexed
    expect(xml).toContain('d:value="жаш"');
    expect(xml).toContain('d:value="жаштар"');
    expect(xml).toContain('d:value="жашынын"');
    // No English indices
    expect(xml).not.toContain('d:value="age"');
    expect(xml).not.toContain('d:value="young"');
    // Both translations merged
    expect(xml).toContain("age");
    expect(xml).toContain("young");
    // Pronunciation in compact view (Kyrgyz headword)
    expect(xml).toContain('<span class="pronunciation">/d͡ʒɑʃ/</span>');
  });
});

describe("молодой — all 4 directions", () => {
  test("ru-ky: headword молодой, translation жаш", () => {
    const xml = generateEntry(молодойEntry, "ru-ky");
    expect(xml).toContain('d:title="молодой"');
    expect(xml).toContain('<h1 class="hw">молодой</h1>');
    expect(xml).toContain("<li>жаш</li>");
    // No noun morphology for adj
    expect(xml).not.toContain('d:value="жаштар"');
  });

  test("ky-ru: молодой appears in merged жаш entry", () => {
    const xml = generateDictionary([жашEntry, молодойEntry], "ky-ru");
    const hwMatches = xml.match(/<h1 class="hw">жаш<\/h1>/g) || [];
    // Only one жаш headword (merged)
    expect(hwMatches).toHaveLength(1);
    expect(xml).toContain("молодой");
    expect(xml).toContain("возраст");
  });

  test("en-ky: young has headword young, no Kyrgyz index", () => {
    const xml = generateEnKyDictionary([youngEnKy]);
    expect(xml).toContain('d:title="young"');
    expect(xml).toContain('<h1 class="hw">young</h1>');
    expect(xml).toContain("<li>жаш</li>");
    expect(xml).not.toContain('d:value="жаш"');
    // Kyrgyz pronunciation/etymology labeled
    expect(xml).toContain("Kyrgyz Pronunciation");
    expect(xml).toContain("Kyrgyz Etymology");
  });

  test("ky-en: young translation appears under жаш headword", () => {
    const xml = generateKyEnDictionary([youngEnKy]);
    expect(xml).toContain('d:title="жаш"');
    expect(xml).toContain('<h1 class="hw">жаш</h1>');
    expect(xml).toContain("young");
    // Not labeled "Kyrgyz" — headword IS Kyrgyz
    expect(xml).not.toContain("Kyrgyz Pronunciation");
  });
});
