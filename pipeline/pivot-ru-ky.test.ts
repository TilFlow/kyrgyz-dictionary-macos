import { describe, test, expect } from "bun:test";
import { pivotRuKyJoin, type EnKyPair, type RuEnPair } from "./pivot-ru-ky";

const enKyPairs: EnKyPair[] = [
  { en: "house", ky: "үй", pos: "noun", sense: "a building" },
  { en: "big", ky: "чоң", pos: "adj", sense: "large" },
  { en: "to go", ky: "баруу", pos: "verb", sense: "to move" },
];

const ruEnPairs: RuEnPair[] = [
  { ru: "дом", en: "house", pos: "noun", sense: "a building" },
  { ru: "жилище", en: "house", pos: "noun", sense: "dwelling" },
  { ru: "большой", en: "big", pos: "adj", sense: "large" },
  { ru: "идти", en: "to go", pos: "verb", sense: "to move" },
];

describe("pivotRuKyJoin", () => {
  test("creates ru-ky pairs from en-ky + ru-en", () => {
    const result = pivotRuKyJoin(enKyPairs, ruEnPairs);
    // house(noun): дом→үй, жилище→үй
    // big(adj): большой→чоң
    // to go(verb): идти→баруу
    expect(result.length).toBe(4);
  });

  test("sets source to pivot-en", () => {
    const result = pivotRuKyJoin(enKyPairs, ruEnPairs);
    for (const pair of result) {
      expect(pair.source).toBe("pivot-en");
    }
  });

  test("includes enPivot field", () => {
    const result = pivotRuKyJoin(enKyPairs, ruEnPairs);
    const domPair = result.find((p) => p.ru === "дом");
    expect(domPair?.enPivot).toBe("house");
  });

  test("self-deduplicates identical pairs", () => {
    const dupeEnKy: EnKyPair[] = [
      { en: "house", ky: "үй", pos: "noun", sense: "a building" },
      { en: "house", ky: "үй", pos: "noun", sense: "dwelling" },
    ];
    const ruEn: RuEnPair[] = [
      { ru: "дом", en: "house", pos: "noun", sense: "a building" },
    ];
    const result = pivotRuKyJoin(dupeEnKy, ruEn);
    expect(result.length).toBe(1);
  });

  test("strict POS matching", () => {
    const ruEn: RuEnPair[] = [
      { ru: "дом", en: "house", pos: "verb", sense: "n/a" },
    ];
    const result = pivotRuKyJoin(enKyPairs, ruEn);
    expect(result.length).toBe(0);
  });
});
