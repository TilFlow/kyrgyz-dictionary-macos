#!/usr/bin/env bun
/**
 * Extract Russian word enrichment data from OpenRussian.org TSV files.
 *
 * Reads:  data/openrussian/nouns.csv
 *         data/openrussian/verbs.csv
 *         data/openrussian/adjectives.csv
 * Writes: data/openrussian-enrichment.json
 *
 * Produces a lookup map keyed by bare Russian word with stress marks,
 * gender, animacy, aspect, and POS information.
 */

import { resolve } from "path";

const ROOT = resolve(import.meta.dir, "..");
const DATA_DIR = resolve(ROOT, "data/openrussian");
const OUTPUT = resolve(ROOT, "data/openrussian-enrichment.json");

interface RuEnrichment {
  accented: string;
  gender?: string;
  animate?: boolean;
  aspect?: string;
  pos: string;
}

function parseTsv(content: string): Record<string, string>[] {
  const lines = content.split("\n").filter((l) => l.trim());
  if (lines.length === 0) return [];

  const headers = lines[0].split("\t");
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split("\t");
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? "";
    }
    rows.push(row);
  }

  return rows;
}

async function readTsv(filename: string): Promise<Record<string, string>[]> {
  const path = resolve(DATA_DIR, filename);
  const content = await Bun.file(path).text();
  return parseTsv(content);
}

// Priority: noun > verb > adj (higher number = higher priority)
const PRIORITY: Record<string, number> = { adj: 1, verb: 2, noun: 3 };

const map = new Map<string, RuEnrichment>();

function addToMap(bare: string, entry: RuEnrichment) {
  if (!bare) return;
  const existing = map.get(bare);
  if (existing && (PRIORITY[existing.pos] ?? 0) >= (PRIORITY[entry.pos] ?? 0)) {
    return; // existing entry has equal or higher priority
  }
  map.set(bare, entry);
}

// --- Nouns ---
const nouns = await readTsv("nouns.csv");
console.log(`nouns.csv: ${nouns.length} rows`);

for (const row of nouns) {
  const bare = row.bare?.trim();
  const accented = row.accented?.trim();
  if (!bare || !accented) continue;

  const entry: RuEnrichment = {
    accented,
    pos: "noun",
  };

  const gender = row.gender?.trim();
  if (gender === "m" || gender === "f" || gender === "n") {
    entry.gender = gender;
  }

  if (row.animate?.trim() === "1") {
    entry.animate = true;
  }

  addToMap(bare, entry);
}

// --- Verbs ---
const verbs = await readTsv("verbs.csv");
console.log(`verbs.csv: ${verbs.length} rows`);

for (const row of verbs) {
  const bare = row.bare?.trim();
  const accented = row.accented?.trim();
  if (!bare || !accented) continue;

  const entry: RuEnrichment = {
    accented,
    pos: "verb",
  };

  const aspect = row.aspect?.trim();
  if (aspect === "perfective" || aspect === "imperfective") {
    entry.aspect = aspect;
  }

  addToMap(bare, entry);
}

// --- Adjectives ---
const adjectives = await readTsv("adjectives.csv");
console.log(`adjectives.csv: ${adjectives.length} rows`);

for (const row of adjectives) {
  const bare = row.bare?.trim();
  const accented = row.accented?.trim();
  if (!bare || !accented) continue;

  addToMap(bare, { accented, pos: "adj" });
}

// --- Write output ---
const output: Record<string, RuEnrichment> = {};
for (const [key, value] of [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], "ru"))) {
  output[key] = value;
}

await Bun.write(OUTPUT, JSON.stringify(output, null, 2) + "\n");

// --- Stats ---
console.log(`\nMerged map: ${map.size} unique words`);
const byPos = new Map<string, number>();
for (const { pos } of map.values()) {
  byPos.set(pos, (byPos.get(pos) ?? 0) + 1);
}
console.log("By POS:");
for (const [pos, count] of [...byPos.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${pos}: ${count}`);
}
console.log(`\nWritten to ${OUTPUT}`);
