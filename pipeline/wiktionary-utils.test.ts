import { describe, expect, test } from "bun:test";
import {
  extractRuKyPairs,
  normalizeRussian,
  mapWiktionaryPos,
} from "./wiktionary-utils";

describe("extractRuKyPairs", () => {
  test("returns pairs when both ru and ky translations exist under the same sense", () => {
    const entry = {
      word: "dog",
      lang: "English",
      lang_code: "en",
      pos: "noun",
      translations: [
        { code: "ru", lang: "Russian", word: "собака", sense: "animal" },
        { code: "ky", lang: "Kyrgyz", word: "ит", sense: "animal" },
      ],
    };

    const pairs = extractRuKyPairs(entry);
    expect(pairs).toEqual([
      { ru: "собака", ky: "ит", sense: "animal", pos: "noun" },
    ]);
  });

  test("returns empty array when only one language is present", () => {
    const entryOnlyRu = {
      word: "cat",
      lang: "English",
      lang_code: "en",
      pos: "noun",
      translations: [
        { code: "ru", lang: "Russian", word: "кошка", sense: "animal" },
        { code: "fr", lang: "French", word: "chat", sense: "animal" },
      ],
    };
    expect(extractRuKyPairs(entryOnlyRu)).toEqual([]);

    const entryOnlyKy = {
      word: "horse",
      lang: "English",
      lang_code: "en",
      pos: "noun",
      translations: [
        { code: "ky", lang: "Kyrgyz", word: "ат", sense: "animal" },
        { code: "de", lang: "German", word: "Pferd", sense: "animal" },
      ],
    };
    expect(extractRuKyPairs(entryOnlyKy)).toEqual([]);
  });

  test("returns empty array when no translations key exists", () => {
    expect(extractRuKyPairs({ word: "test", pos: "noun" })).toEqual([]);
    expect(extractRuKyPairs({})).toEqual([]);
  });

  test("returns multiple pairs for multiple senses", () => {
    const entry = {
      word: "light",
      lang: "English",
      lang_code: "en",
      pos: "noun",
      translations: [
        { code: "ru", lang: "Russian", word: "свет", sense: "electromagnetic waves" },
        { code: "ky", lang: "Kyrgyz", word: "жарык", sense: "electromagnetic waves" },
        { code: "ru", lang: "Russian", word: "огонь", sense: "source of illumination" },
        { code: "ky", lang: "Kyrgyz", word: "чырак", sense: "source of illumination" },
      ],
    };

    const pairs = extractRuKyPairs(entry);
    expect(pairs).toHaveLength(2);
    expect(pairs).toContainEqual({
      ru: "свет",
      ky: "жарык",
      sense: "electromagnetic waves",
      pos: "noun",
    });
    expect(pairs).toContainEqual({
      ru: "огонь",
      ky: "чырак",
      sense: "source of illumination",
      pos: "noun",
    });
  });

  test("creates cartesian product when multiple ru/ky words share a sense", () => {
    const entry = {
      word: "dog",
      lang: "English",
      lang_code: "en",
      pos: "noun",
      translations: [
        { code: "ru", lang: "Russian", word: "собака", sense: "animal" },
        { code: "ru", lang: "Russian", word: "пёс", sense: "animal" },
        { code: "ky", lang: "Kyrgyz", word: "ит", sense: "animal" },
      ],
    };

    const pairs = extractRuKyPairs(entry);
    expect(pairs).toHaveLength(2);
    expect(pairs).toContainEqual({ ru: "собака", ky: "ит", sense: "animal", pos: "noun" });
    expect(pairs).toContainEqual({ ru: "пёс", ky: "ит", sense: "animal", pos: "noun" });
  });

  test("ignores translations without sense field", () => {
    const entry = {
      word: "water",
      lang: "English",
      lang_code: "en",
      pos: "noun",
      translations: [
        { code: "ru", lang: "Russian", word: "вода" },
        { code: "ky", lang: "Kyrgyz", word: "суу" },
      ],
    };
    expect(extractRuKyPairs(entry)).toEqual([]);
  });

  test("does not match ru and ky from different senses", () => {
    const entry = {
      word: "spring",
      lang: "English",
      lang_code: "en",
      pos: "noun",
      translations: [
        { code: "ru", lang: "Russian", word: "весна", sense: "season" },
        { code: "ky", lang: "Kyrgyz", word: "булак", sense: "water source" },
      ],
    };
    expect(extractRuKyPairs(entry)).toEqual([]);
  });
});

describe("normalizeRussian", () => {
  test("strips combining acute accent (U+0301)", () => {
    // "соба́ка" with combining acute on а
    const stressed = "соба\u0301ка";
    expect(normalizeRussian(stressed)).toBe("собака");
  });

  test("strips multiple stress marks", () => {
    const word = "домо\u0301строи\u0301тельный";
    expect(normalizeRussian(word)).toBe("домостроительный");
  });

  test("returns already-clean words unchanged", () => {
    expect(normalizeRussian("собака")).toBe("собака");
  });

  test("handles NFC normalization", () => {
    // й can be represented as и + combining breve (U+0306)
    const decomposed = "и\u0306";
    const nfc = normalizeRussian(decomposed);
    expect(nfc).toBe("й");
  });
});

describe("mapWiktionaryPos", () => {
  test("maps known POS strings correctly", () => {
    expect(mapWiktionaryPos("noun")).toBe("noun");
    expect(mapWiktionaryPos("verb")).toBe("verb");
    expect(mapWiktionaryPos("adj")).toBe("adj");
    expect(mapWiktionaryPos("adv")).toBe("adv");
    expect(mapWiktionaryPos("name")).toBe("noun");
    expect(mapWiktionaryPos("pron")).toBe("pron");
    expect(mapWiktionaryPos("num")).toBe("num");
    expect(mapWiktionaryPos("conj")).toBe("conj");
    expect(mapWiktionaryPos("intj")).toBe("intj");
    expect(mapWiktionaryPos("postp")).toBe("post");
  });

  test("returns null for unknown POS", () => {
    expect(mapWiktionaryPos("particle")).toBeNull();
    expect(mapWiktionaryPos("phrase")).toBeNull();
    expect(mapWiktionaryPos("")).toBeNull();
  });

  test("is case-insensitive", () => {
    expect(mapWiktionaryPos("Noun")).toBe("noun");
    expect(mapWiktionaryPos("VERB")).toBe("verb");
  });
});
