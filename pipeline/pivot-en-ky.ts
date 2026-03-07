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

export interface EnKyPair {
  en: string;
  ky: string;
  pos: string;
  sense: string;
}

interface SenseFilter {
  enWordToDefs: Map<string, Set<string>>;
  ruPolysemy: Map<string, number>;
}

function buildSenseFilter(
  enKyPairs: EnKyPair[],
  ruEnPairs: RuEnPair[],
): SenseFilter {
  const enWordToDefs = new Map<string, Set<string>>();
  for (const p of enKyPairs) {
    if (!p.sense) continue;
    const enLower = p.en.toLowerCase().trim();
    const senseLower = p.sense.toLowerCase().trim();
    let defs = enWordToDefs.get(enLower);
    if (!defs) {
      defs = new Set();
      enWordToDefs.set(enLower, defs);
    }
    defs.add(senseLower);
  }

  const ruPolysemy = new Map<string, number>();
  const ruEnWords = new Map<string, Set<string>>();
  for (const p of ruEnPairs) {
    if (!p.pos) continue;
    const key = `${p.ru.toLowerCase()}\0${p.pos}`;
    let words = ruEnWords.get(key);
    if (!words) {
      words = new Set();
      ruEnWords.set(key, words);
    }
    words.add(p.en.toLowerCase());
  }
  for (const [key, words] of ruEnWords) {
    ruPolysemy.set(key, words.size);
  }

  return { enWordToDefs, ruPolysemy };
}

const POLYSEMY_THRESHOLD = 3;

function checkSense(
  ruEnPair: RuEnPair,
  ruKyEntry: DictionaryEntry,
  filter: SenseFilter,
): "accept" | "reject" {
  const hasSenses = ruKyEntry.senses && ruKyEntry.senses.length > 0;

  const enParts = ruEnPair.en
    .toLowerCase()
    .split(/,\s*/)
    .map((s) => s.trim())
    .filter(Boolean);

  const enDefs = new Set<string>();
  for (const part of enParts) {
    const defs = filter.enWordToDefs.get(part);
    if (defs) {
      for (const d of defs) enDefs.add(d);
    }
  }

  const canVerify = hasSenses && enDefs.size > 0;

  if (canVerify) {
    for (const s of ruKyEntry.senses!) {
      if (enDefs.has(s.toLowerCase().trim())) {
        return "accept";
      }
    }
    return "reject";
  }

  // Fallback: polysemy check
  const polyKey = `${ruEnPair.ru.toLowerCase()}\0${ruEnPair.pos}`;
  const polysemy = filter.ruPolysemy.get(polyKey) ?? 1;
  return polysemy < POLYSEMY_THRESHOLD ? "accept" : "reject";
}

/**
 * Join ru-en pairs with ru-ky entries by ru+POS (strict).
 * @param existing - Set of "en|ky|pos" keys to skip (dedup)
 * @param enKyPairs - Optional en-ky pairs for sense-based filtering
 */
export function pivotJoin(
  ruEnPairs: RuEnPair[],
  ruKyEntries: DictionaryEntry[],
  existing: Set<string>,
  enKyPairs?: EnKyPair[],
): PivotPair[] {
  const filter = enKyPairs ? buildSenseFilter(enKyPairs, ruEnPairs) : null;
  const stats = { accepted: 0, rejected: 0 };

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

      if (filter) {
        const verdict = checkSense(ruEn, match, filter);
        if (verdict === "reject") {
          stats.rejected++;
          continue;
        }
        stats.accepted++;
      }

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

  if (filter) {
    console.log(`  Sense filter: ${stats.accepted} accepted, ${stats.rejected} rejected`);
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

  console.log("Running pivot join with sense filter...");
  const pivotPairs = pivotJoin(ruEnPairs, ruKyEntries, existingSet, existingEnKy as EnKyPair[]);

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
