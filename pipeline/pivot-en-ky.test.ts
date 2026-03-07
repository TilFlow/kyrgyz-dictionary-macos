import { describe, test, expect } from "bun:test";
import { pivotJoin, type RuEnPair } from "./pivot-en-ky";
import type { DictionaryEntry } from "../src/schema";

const ruEnPairs: RuEnPair[] = [
  { ru: "дом", en: "house", pos: "noun", sense: "a building" },
  { ru: "дом", en: "home", pos: "noun", sense: "a place" },
  { ru: "идти", en: "to go", pos: "verb", sense: "to move" },
  { ru: "большой", en: "big", pos: "adj", sense: "large" },
];

const ruKyEntries: DictionaryEntry[] = [
  { id: "ru-дом-001", ru: "дом", ky: "үй", pos: "noun", source: "wiktionary-en" },
  { id: "ru-идти-001", ru: "идти", ky: "баруу", pos: "verb", source: "wiktionary-en" },
  { id: "ru-большой-001", ru: "большой", ky: "чоң", pos: "adj", source: "manual" },
];

describe("pivotJoin", () => {
  test("creates en-ky pairs from ru-en + ru-ky", () => {
    const result = pivotJoin(ruEnPairs, ruKyEntries, new Set());
    expect(result.length).toBe(4);
  });

  test("sets source to pivot-ru", () => {
    const result = pivotJoin(ruEnPairs, ruKyEntries, new Set());
    for (const pair of result) {
      expect(pair.source).toBe("pivot-ru");
    }
  });

  test("includes ruPivot field", () => {
    const result = pivotJoin(ruEnPairs, ruKyEntries, new Set());
    const housePair = result.find((p) => p.en === "house");
    expect(housePair?.ruPivot).toBe("дом");
  });

  test("skips pairs already in existing set", () => {
    const existing = new Set(["house|үй|noun"]);
    const result = pivotJoin(ruEnPairs, ruKyEntries, existing);
    expect(result.find((p) => p.en === "house")).toBeUndefined();
    expect(result.length).toBe(3);
  });

  test("strict POS matching — no cross-POS join", () => {
    const ruEn: RuEnPair[] = [
      { ru: "дом", en: "house", pos: "verb", sense: "n/a" },
    ];
    const result = pivotJoin(ruEn, ruKyEntries, new Set());
    expect(result.length).toBe(0);
  });
});
