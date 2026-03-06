import { describe, expect, test } from "bun:test";
import {
  mergeEntries,
  normalizeRussianWord,
  splitByLetter,
  assignIds,
  type InputPair,
  type KyEnrichmentMap,
  type ApertiumLemma,
} from "./merge";

describe("mergeEntries", () => {
  test("deduplicates pairs with same (ru, ky) and keeps best metadata", () => {
    const ruPairs: InputPair[] = [
      { ru: "собака", ky: "ит", sense: "animal", pos: "noun" },
    ];
    const enPairs: InputPair[] = [
      { ru: "собака", ky: "ит", sense: "dog, animal", pos: "noun" },
    ];

    const result = mergeEntries(ruPairs, enPairs, {}, []);
    // Should have only one entry for собака|ит
    const matching = result.entries.filter(
      (e) => e.ru === "собака" && e.ky === "ит"
    );
    expect(matching).toHaveLength(1);
    // ru-wikt source wins
    expect(matching[0].source).toBe("wiktionary-ru");
  });

  test("Russian Wiktionary pair takes priority over English Wiktionary pair", () => {
    const ruPairs: InputPair[] = [
      { ru: "кошка", ky: "мышык", sense: "cat", pos: "noun" },
    ];
    const enPairs: InputPair[] = [
      { ru: "кошка", ky: "мышык", sense: "feline", pos: null },
    ];

    const result = mergeEntries(ruPairs, enPairs, {}, []);
    const entry = result.entries.find(
      (e) => e.ru === "кошка" && e.ky === "мышык"
    );
    expect(entry).toBeDefined();
    expect(entry!.source).toBe("wiktionary-ru");
    // sense from ru-wikt preserved
    expect(entry!.senses).toEqual(["cat"]);
  });

  test("POS conflicts resolved: prefer ru-wikt source", () => {
    const ruPairs: InputPair[] = [
      { ru: "бегу", ky: "чуркоо", sense: "run", pos: "verb" },
    ];
    const enPairs: InputPair[] = [
      { ru: "бегу", ky: "чуркоо", sense: "run", pos: "noun" },
    ];

    const result = mergeEntries(ruPairs, enPairs, {}, []);
    const entry = result.entries.find(
      (e) => e.ru === "бегу" && e.ky === "чуркоо"
    );
    expect(entry!.pos).toBe("verb");
  });

  test("both sources agree on POS — use it", () => {
    const ruPairs: InputPair[] = [
      { ru: "вода", ky: "суу", sense: "water", pos: "noun" },
    ];
    const enPairs: InputPair[] = [
      { ru: "вода", ky: "суу", sense: "water", pos: "noun" },
    ];

    const result = mergeEntries(ruPairs, enPairs, {}, []);
    const entry = result.entries.find(
      (e) => e.ru === "вода" && e.ky === "суу"
    );
    expect(entry!.pos).toBe("noun");
  });

  test("etymology and pronunciation from ky-enrichment are attached", () => {
    const ruPairs: InputPair[] = [
      { ru: "книга", ky: "китеп", sense: "book", pos: "noun" },
    ];

    const enrichment: KyEnrichmentMap = {
      "китеп:noun": {
        word: "китеп",
        pos: "noun",
        etymology: "от араб. kitab",
        pronunciation: "/kitep/",
      },
    };

    const result = mergeEntries(ruPairs, [], enrichment, []);
    const entry = result.entries.find(
      (e) => e.ru === "книга" && e.ky === "китеп"
    );
    expect(entry!.etymology).toBe("от араб. kitab");
    expect(entry!.pronunciation).toBe("/kitep/");
  });

  test("Kyrgyz words validated against Apertium lemma set — unmatched flagged but not removed", () => {
    const ruPairs: InputPair[] = [
      { ru: "книга", ky: "китеп", sense: "book", pos: "noun" },
      { ru: "дом", ky: "уй", sense: "house", pos: "noun" },
    ];

    const lemmas: ApertiumLemma[] = [{ lemma: "китеп", pos: "noun" }];

    const result = mergeEntries(ruPairs, [], {}, lemmas);
    // Both entries should be present (unmatched not removed)
    expect(result.entries).toHaveLength(2);
    // Stats should report 1 matched, 1 unmatched
    expect(result.stats.apertiumMatched).toBe(1);
    expect(result.stats.apertiumUnmatched).toBe(1);
  });

  test("en-wikt pairs added when not present in ru-wikt", () => {
    const ruPairs: InputPair[] = [
      { ru: "книга", ky: "китеп", sense: "book", pos: "noun" },
    ];
    const enPairs: InputPair[] = [
      { ru: "дом", ky: "уй", sense: "house", pos: "noun" },
    ];

    const result = mergeEntries(ruPairs, enPairs, {}, []);
    expect(result.entries).toHaveLength(2);
    const book = result.entries.find((e) => e.ru === "книга");
    const house = result.entries.find((e) => e.ru === "дом");
    expect(book!.source).toBe("wiktionary-ru");
    expect(house!.source).toBe("wiktionary-en");
  });
});

describe("normalizeRussianWord", () => {
  test("NFC normalization", () => {
    // "й" can be composed (U+0439) or decomposed (U+0438 + U+0306)
    const decomposed = "\u0438\u0306";
    const composed = "\u0439";
    expect(normalizeRussianWord(decomposed)).toBe(composed);
  });

  test("strips acute stress marks (U+0301)", () => {
    // "мо́ре" with combining acute
    const withStress = "мо\u0301ре";
    expect(normalizeRussianWord(withStress)).toBe("море");
  });

  test("handles word with both stress mark and NFC normalization", () => {
    const input = "при\u0301ве\u0301т";
    expect(normalizeRussianWord(input)).toBe("привет");
  });
});

describe("splitByLetter", () => {
  test("entries split by first Russian letter (lowercase)", () => {
    const entries = [
      { id: "ru-арбуз-001", ru: "арбуз", ky: "дарбыз", pos: "noun" as const, source: "wiktionary-ru" as const },
      { id: "ru-Апельсин-001", ru: "Апельсин", ky: "апельсин", pos: "noun" as const, source: "wiktionary-ru" as const },
      { id: "ru-банк-001", ru: "банк", ky: "банк", pos: "noun" as const, source: "wiktionary-en" as const },
    ];

    const letterMap = splitByLetter(entries as any);
    expect(letterMap.get("а")).toHaveLength(2);
    expect(letterMap.get("б")).toHaveLength(1);
  });
});

describe("assignIds", () => {
  test("assigns sequential IDs for same Russian word", () => {
    const entries = [
      { ru: "банк", ky: "банк", pos: "noun" as const, source: "wiktionary-en" as const },
      { ru: "банк", ky: "банка", pos: "noun" as const, source: "wiktionary-en" as const },
      { ru: "вода", ky: "суу", pos: "noun" as const, source: "wiktionary-ru" as const },
    ];

    const result = assignIds(entries as any);
    expect(result[0].id).toBe("ru-банк-001");
    expect(result[1].id).toBe("ru-банк-002");
    expect(result[2].id).toBe("ru-вода-001");
  });
});

describe("senses parsing", () => {
  test("sense string split on '; ' into array", () => {
    const ruPairs: InputPair[] = [
      { ru: "свет", ky: "жарык", sense: "light; illumination; brightness", pos: "noun" },
    ];

    const result = mergeEntries(ruPairs, [], {}, []);
    const entry = result.entries.find((e) => e.ru === "свет");
    expect(entry!.senses).toEqual(["light", "illumination", "brightness"]);
  });
});

describe("wiktionaryUrl", () => {
  test("generates correct wiktionary URL for ky word", () => {
    const ruPairs: InputPair[] = [
      { ru: "книга", ky: "китеп", sense: "book", pos: "noun" },
    ];

    const result = mergeEntries(ruPairs, [], {}, []);
    const entry = result.entries.find((e) => e.ky === "китеп");
    expect(entry!.wiktionaryUrl).toBe(
      "https://en.wiktionary.org/wiki/%D0%BA%D0%B8%D1%82%D0%B5%D0%BF"
    );
  });
});
