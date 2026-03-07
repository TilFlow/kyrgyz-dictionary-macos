#!/usr/bin/env bun
/**
 * Reverse pivot: join en-ky pairs with ru-en pairs to create new ru-ky pairs.
 *
 * Input:
 *   data/en-ky-pairs.json (direct en→ky from Wiktionary)
 *   data/ru-en-pairs.json (ru→en from kaikki.org)
 *   entries/*.json (existing ru-ky, for dedup)
 * Output:
 *   data/ru-ky-pivot.json
 */

import { resolve } from "path";
import { Glob } from "bun";
import { DictionaryEntrySchema, type DictionaryEntry } from "../src/schema";

const ROOT = resolve(import.meta.dir, "..");

export interface EnKyPair {
  en: string;
  ky: string;
  pos: string | null;
  sense: string;
}

export interface RuEnPair {
  ru: string;
  en: string;
  pos: string | null;
  sense: string;
}

export interface PivotRuKyPair {
  ru: string;
  ky: string;
  pos: string;
  source: "pivot-en";
  enPivot: string;
  sense: string;
}

/**
 * Join en-ky pairs with ru-en pairs by en+POS (strict).
 * @param existing - Set of "ru|ky|pos" keys to skip (dedup)
 */
export function pivotRuKyJoin(
  enKyPairs: EnKyPair[],
  ruEnPairs: RuEnPair[],
  existing: Set<string>,
): PivotRuKyPair[] {
  // Build index: "en_lower\0pos" → RuEnPair[]
  const ruEnIndex = new Map<string, RuEnPair[]>();
  for (const pair of ruEnPairs) {
    if (!pair.pos) continue;
    const key = `${pair.en.toLowerCase()}\0${pair.pos}`;
    let arr = ruEnIndex.get(key);
    if (!arr) {
      arr = [];
      ruEnIndex.set(key, arr);
    }
    arr.push(pair);
  }

  const seen = new Set<string>();
  const results: PivotRuKyPair[] = [];

  for (const enKy of enKyPairs) {
    if (!enKy.pos) continue;

    const key = `${enKy.en.toLowerCase()}\0${enKy.pos}`;
    const matches = ruEnIndex.get(key);
    if (!matches) continue;

    for (const match of matches) {
      const ruLower = match.ru.toLowerCase();
      const kyLower = enKy.ky.toLowerCase();
      const dedupKey = `${ruLower}|${kyLower}|${enKy.pos}`;

      if (existing.has(dedupKey)) continue;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);

      results.push({
        ru: match.ru,
        ky: enKy.ky,
        pos: enKy.pos,
        source: "pivot-en",
        enPivot: enKy.en,
        sense: enKy.sense || match.sense,
      });
    }
  }

  return results;
}

// --- CLI ---

async function loadRuKyEntries(): Promise<DictionaryEntry[]> {
  const entriesDir = resolve(ROOT, "entries");
  const entries: DictionaryEntry[] = [];
  const glob = new Glob("*.json");

  for await (const file of glob.scan(entriesDir)) {
    const path = resolve(entriesDir, file);
    const raw = await Bun.file(path).json();
    if (!Array.isArray(raw)) continue;
    for (const item of raw) {
      const result = DictionaryEntrySchema.safeParse(item);
      if (result.success) entries.push(result.data);
    }
  }

  return entries;
}

async function main() {
  const enKyPath = resolve(ROOT, "data/en-ky-pairs.json");
  const ruEnPath = resolve(ROOT, "data/ru-en-pairs.json");
  const outputPath = resolve(ROOT, "data/ru-ky-pivot.json");

  console.log("Loading en-ky pairs...");
  const enKyPairs: EnKyPair[] = await Bun.file(enKyPath).json();
  console.log(`  ${enKyPairs.length} en-ky pairs`);

  console.log("Loading ru-en pairs...");
  const ruEnPairs: RuEnPair[] = await Bun.file(ruEnPath).json();
  console.log(`  ${ruEnPairs.length} ru-en pairs`);

  console.log("Loading existing ru-ky entries...");
  const ruKyEntries = await loadRuKyEntries();
  console.log(`  ${ruKyEntries.length} ru-ky entries`);

  const existingSet = new Set<string>();
  for (const entry of ruKyEntries) {
    const key = `${entry.ru.toLowerCase()}|${entry.ky.toLowerCase()}|${entry.pos}`;
    existingSet.add(key);
  }
  console.log(`  ${existingSet.size} existing ru-ky combinations`);

  console.log("Running reverse pivot join...");
  const pivotPairs = pivotRuKyJoin(enKyPairs, ruEnPairs, existingSet);

  console.log(`\nDone.`);
  console.log(`  New pivot pairs: ${pivotPairs.length}`);

  const byPos: Record<string, number> = {};
  for (const p of pivotPairs) {
    byPos[p.pos] = (byPos[p.pos] ?? 0) + 1;
  }
  console.log("  By POS:");
  for (const [pos, count] of Object.entries(byPos).sort(
    (a, b) => b[1] - a[1],
  )) {
    console.log(`    ${pos}: ${count}`);
  }

  await Bun.write(outputPath, JSON.stringify(pivotPairs, null, 2));
  console.log(`Written to ${outputPath}`);
}

if (import.meta.main) {
  main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
