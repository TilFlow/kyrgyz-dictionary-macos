import { describe, test, expect } from "bun:test";
import { pivotJoin, type RuEnPair, type EnKyPair } from "./pivot-en-ky";
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

const senseRuEnPairs: RuEnPair[] = [
  { ru: "сеть", en: "grid", pos: "noun", sense: "grid" },
  { ru: "сеть", en: "network, system", pos: "noun", sense: "network, system" },
  { ru: "кот", en: "tomcat", pos: "noun", sense: "tomcat" },
  { ru: "кошка", en: "cat", pos: "noun", sense: "cat" },
  { ru: "кошка", en: "cat-o'-nine-tails", pos: "noun", sense: "cat-o'-nine-tails" },
  { ru: "кошка", en: "grapple fork", pos: "noun", sense: "grapple fork" },
];

const senseRuKyEntries: DictionaryEntry[] = [
  {
    id: "t-001", ru: "сеть", ky: "тармак", pos: "noun", source: "wiktionary-en",
    senses: ["multiple computers and other devices connected together"],
  },
  {
    id: "t-002", ru: "сеть", ky: "панжара", pos: "noun", source: "wiktionary-en",
    senses: ["rectangular array of squares or rectangles of equal size"],
  },
  {
    id: "t-003", ru: "кот", ky: "мышык", pos: "noun", source: "wiktionary-ru",
  },
  {
    id: "t-004", ru: "кошка", ky: "мышык", pos: "noun", source: "wiktionary-en",
    senses: ["animal"],
  },
];

const senseEnKyPairs: EnKyPair[] = [
  { en: "network", ky: "тармак", pos: "noun", sense: "multiple computers and other devices connected together" },
  { en: "grid", ky: "панжара", pos: "noun", sense: "rectangular array of squares or rectangles of equal size" },
  { en: "cat", ky: "мышык", pos: "noun", sense: "animal" },
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

describe("pivotJoin with sense filter", () => {
  test("accepts pair when en-word definition matches ru-ky sense", () => {
    const result = pivotJoin(senseRuEnPairs, senseRuKyEntries, new Set(), senseEnKyPairs);
    const networkTarmak = result.find((p) => p.en === "network, system" && p.ky === "тармак");
    expect(networkTarmak).toBeDefined();
  });

  test("rejects pair when en-word definition does NOT match ru-ky sense", () => {
    const result = pivotJoin(senseRuEnPairs, senseRuKyEntries, new Set(), senseEnKyPairs);
    const gridTarmak = result.find((p) => p.en === "grid" && p.ky === "тармак");
    expect(gridTarmak).toBeUndefined();
  });

  test("accepts unverifiable pair when ru word has low polysemy (≤2)", () => {
    const result = pivotJoin(senseRuEnPairs, senseRuKyEntries, new Set(), senseEnKyPairs);
    const tomcat = result.find((p) => p.en === "tomcat" && p.ky === "мышык");
    expect(tomcat).toBeDefined();
  });

  test("rejects unverifiable pair when ru word has high polysemy (≥3)", () => {
    const result = pivotJoin(senseRuEnPairs, senseRuKyEntries, new Set(), senseEnKyPairs);
    const catNineTails = result.find((p) => p.en === "cat-o'-nine-tails" && p.ky === "мышык");
    expect(catNineTails).toBeUndefined();
    const grapple = result.find((p) => p.en === "grapple fork" && p.ky === "мышык");
    expect(grapple).toBeUndefined();
  });

  test("backward compatible: no enKyPairs param → no filtering", () => {
    const result = pivotJoin(senseRuEnPairs, senseRuKyEntries, new Set());
    expect(result.length).toBe(8);
  });
});
