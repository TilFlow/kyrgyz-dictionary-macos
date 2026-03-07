#!/usr/bin/env bun
/**
 * Join ru-en pairs with ru-ky entries to create pivot en-ky pairs.
 *
 * Input:
 *   data/ru-en-pairs.json
 *   entries/*.json (ru-ky)
 * Output:
 *   data/en-ky-pivot.json
 */

import { resolve } from "path";
import { Glob } from "bun";
import { DictionaryEntrySchema, type DictionaryEntry } from "../src/schema";

const ROOT = resolve(import.meta.dir, "..");

export interface RuEnPair {
  ru: string;
  en: string;
  pos: string | null;
  sense: string;
}

export interface PivotPair {
  en: string;
  ky: string;
  pos: string;
  source: "pivot-ru";
  ruPivot: string;
  sense: string;
}

/**
 * Join ru-en pairs with ru-ky entries by ru+POS (strict).
 * @param existing - Set of "en|ky|pos" keys to skip (dedup)
 */
export function pivotJoin(
  ruEnPairs: RuEnPair[],
  ruKyEntries: DictionaryEntry[],
  existing: Set<string>,
): PivotPair[] {
  // Build index: "ru\0pos" → DictionaryEntry[]
  const ruKyIndex = new Map<string, DictionaryEntry[]>();
  for (const entry of ruKyEntries) {
    const key = `${entry.ru.toLowerCase()}\0${entry.pos}`;
    let arr = ruKyIndex.get(key);
    if (!arr) {
      arr = [];
      ruKyIndex.set(key, arr);
    }
    arr.push(entry);
  }

  const seen = new Set<string>();
  const results: PivotPair[] = [];

  for (const ruEn of ruEnPairs) {
    if (!ruEn.pos) continue; // strict: POS required

    const key = `${ruEn.ru.toLowerCase()}\0${ruEn.pos}`;
    const matches = ruKyIndex.get(key);
    if (!matches) continue;

    for (const match of matches) {
      const enLower = ruEn.en.toLowerCase();
      const dedupKey = `${enLower}|${match.ky.toLowerCase()}|${ruEn.pos}`;

      if (existing.has(dedupKey)) continue;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);

      results.push({
        en: ruEn.en,
        ky: match.ky,
        pos: ruEn.pos,
        source: "pivot-ru",
        ruPivot: ruEn.ru,
        sense: ruEn.sense,
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
  const ruEnPath = resolve(ROOT, "data/ru-en-pairs.json");
  const enKyPath = resolve(ROOT, "data/en-ky-pairs.json");
  const outputPath = resolve(ROOT, "data/en-ky-pivot.json");

  console.log("Loading ru-en pairs...");
  const ruEnPairs: RuEnPair[] = await Bun.file(ruEnPath).json();
  console.log(`  ${ruEnPairs.length} ru-en pairs`);

  console.log("Loading ru-ky entries...");
  const ruKyEntries = await loadRuKyEntries();
  console.log(`  ${ruKyEntries.length} ru-ky entries`);

  // Build existing en-ky set for dedup
  console.log("Loading existing en-ky pairs...");
  let existingEnKy: any[] = [];
  try {
    existingEnKy = await Bun.file(enKyPath).json();
  } catch {
    console.log("  No existing en-ky pairs found");
  }

  const existingSet = new Set<string>();
  for (const pair of existingEnKy) {
    const key = `${pair.en?.toLowerCase()}|${pair.ky?.toLowerCase()}|${pair.pos ?? ""}`;
    existingSet.add(key);
  }
  console.log(`  ${existingSet.size} existing en-ky combinations`);

  console.log("Running pivot join...");
  const pivotPairs = pivotJoin(ruEnPairs, ruKyEntries, existingSet);

  console.log(`\nDone.`);
  console.log(`  New pivot pairs: ${pivotPairs.length}`);

  const byPos: Record<string, number> = {};
  for (const p of pivotPairs) {
    byPos[p.pos] = (byPos[p.pos] ?? 0) + 1;
  }
  console.log("  By POS:");
  for (const [pos, count] of Object.entries(byPos).sort((a, b) => b[1] - a[1])) {
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
