import { describe, expect, test } from "bun:test";
import { validateEntry, type DictionaryEntry } from "./schema";

const completeEntry: DictionaryEntry = {
  id: "ru-книга-001",
  ru: "книга",
  ky: "китеп",
  pos: "noun",
  pronunciation: "/kitep/",
  senses: ["книга", "письменное произведение"],
  examples: [
    { ky: "Мен китеп окуйм", ru: "Я читаю книгу" },
  ],
  morphology: {
    stemType: "voiceless",
    vowelGroup: 2,
    forms: { genitive: "китептин", dative: "китепке" },
    pluralForms: { genitive: "китептердин", dative: "китептерге" },
    rule: "voiceless stem + front vowel group",
  },
  derivation: {
    root: "китеп",
    suffix: "-чи",
    explanation: "китепчи = книголюб",
  },
  related: ["китепкана", "китепчи"],
  etymology: "From Arabic kitāb",
  wiktionaryUrl: "https://en.wiktionary.org/wiki/китеп",
  source: "wiktionary-en",
};

const minimalEntry: DictionaryEntry = {
  id: "ru-дом-001",
  ru: "дом",
  ky: "үй",
  pos: "noun",
  source: "apertium",
};

describe("validateEntry", () => {
  test("accepts a complete valid entry", () => {
    const result = validateEntry(completeEntry);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(completeEntry);
    }
  });

  test("accepts a minimal entry (only required fields)", () => {
    const result = validateEntry(minimalEntry);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(minimalEntry);
    }
  });

  test("rejects invalid POS", () => {
    const result = validateEntry({ ...minimalEntry, pos: "particle" });
    expect(result.success).toBe(false);
  });

  test("rejects invalid vowelGroup (5)", () => {
    const result = validateEntry({
      ...minimalEntry,
      morphology: { stemType: "vowel", vowelGroup: 5 },
    });
    expect(result.success).toBe(false);
  });

  test("rejects missing required field: id", () => {
    const { id, ...rest } = minimalEntry;
    const result = validateEntry(rest);
    expect(result.success).toBe(false);
  });

  test("rejects missing required field: ru", () => {
    const { ru, ...rest } = minimalEntry;
    const result = validateEntry(rest);
    expect(result.success).toBe(false);
  });

  test("rejects missing required field: ky", () => {
    const { ky, ...rest } = minimalEntry;
    const result = validateEntry(rest);
    expect(result.success).toBe(false);
  });

  test("rejects missing required field: pos", () => {
    const { pos, ...rest } = minimalEntry;
    const result = validateEntry(rest);
    expect(result.success).toBe(false);
  });

  test("rejects missing required field: source", () => {
    const { source, ...rest } = minimalEntry;
    const result = validateEntry(rest);
    expect(result.success).toBe(false);
  });
});
