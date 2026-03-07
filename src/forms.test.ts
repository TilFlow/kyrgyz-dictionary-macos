import { describe, test, expect } from "bun:test";
import { buildFormSet } from "./forms";
import type { DictionaryEntry } from "./schema";

const noun: DictionaryEntry = {
  id: "test-noun",
  ru: "дом",
  ky: "үй",
  pos: "noun",
  source: "manual",
};

const verb: DictionaryEntry = {
  id: "test-verb",
  ru: "идти",
  ky: "баруу",
  pos: "verb",
  source: "manual",
};

const adj: DictionaryEntry = {
  id: "test-adj",
  ru: "большой",
  ky: "чоң",
  pos: "adj",
  source: "manual",
};

describe("buildFormSet", () => {
  test("includes base noun form", () => {
    const set = buildFormSet([noun]);
    expect(set.has("үй")).toBe(true);
  });

  test("includes noun case forms", () => {
    const set = buildFormSet([noun]);
    expect(set.has("үйдүн")).toBe(true);
    expect(set.has("үйгө")).toBe(true);
    expect(set.has("үйлөр")).toBe(true);
  });

  test("includes noun possessive forms", () => {
    const set = buildFormSet([noun]);
    expect(set.has("үйүм")).toBe(true);
    expect(set.has("үйү")).toBe(true);
  });

  test("includes verb conjugated forms", () => {
    const set = buildFormSet([verb]);
    expect(set.has("баруу")).toBe(true);
    expect(set.size).toBeGreaterThan(10);
  });

  test("includes adjective base form", () => {
    const set = buildFormSet([adj]);
    expect(set.has("чоң")).toBe(true);
  });

  test("handles empty input", () => {
    const set = buildFormSet([]);
    expect(set.size).toBe(0);
  });
});
