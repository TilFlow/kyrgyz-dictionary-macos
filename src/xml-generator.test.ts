import { describe, expect, test } from "bun:test";
import { generateEntry, generateDictionary, generateFrontMatter } from "./xml-generator";
import type { DictionaryEntry } from "./schema";

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
