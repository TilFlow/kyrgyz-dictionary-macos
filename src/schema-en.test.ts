import { describe, test, expect } from "bun:test";
import { EnKyEntrySchema, type EnKyEntry } from "./schema-en";

describe("EnKyEntrySchema", () => {
  test("validates a minimal entry", () => {
    const entry = {
      id: "en-ky-house-001",
      en: "house",
      ky: "үй",
      pos: "noun",
      source: "wiktionary-en",
    };
    const result = EnKyEntrySchema.safeParse(entry);
    expect(result.success).toBe(true);
  });

  test("validates a pivot entry with ruPivot", () => {
    const entry = {
      id: "en-ky-house-002",
      en: "house",
      ky: "үй",
      pos: "noun",
      source: "pivot-ru",
      ruPivot: "дом",
    };
    const result = EnKyEntrySchema.safeParse(entry);
    expect(result.success).toBe(true);
  });

  test("validates a manual entry with all fields", () => {
    const entry = {
      id: "en-ky-water-001",
      en: "water",
      ky: "суу",
      pos: "noun",
      source: "manual",
      senses: ["liquid", "body of water"],
      pronunciation: "/suu/",
      etymology: "from proto-Turkic",
      frequency: 1234,
    };
    const result = EnKyEntrySchema.safeParse(entry);
    expect(result.success).toBe(true);
  });

  test("rejects invalid source", () => {
    const entry = {
      id: "en-ky-test-001",
      en: "test",
      ky: "тест",
      pos: "noun",
      source: "invalid",
    };
    const result = EnKyEntrySchema.safeParse(entry);
    expect(result.success).toBe(false);
  });

  test("rejects missing required fields", () => {
    const entry = { id: "en-ky-test-001", en: "test" };
    const result = EnKyEntrySchema.safeParse(entry);
    expect(result.success).toBe(false);
  });
});
