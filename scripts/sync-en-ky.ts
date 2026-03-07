#!/usr/bin/env bun
/**
 * Sync en-ky dictionary entries from all sources into entries-en/*.json.
 *
 * Sources (in priority order):
 *   1. Manual entries (entries-en/*.json, source="manual") — preserved
 *   2. Wiktionary entries (data/en-ky-pairs.json, source="wiktionary-en")
 *   3. Pivot entries (data/en-ky-pivot.json, source="pivot-ru")
 *
 * Enrichment from:
 *   - data/ky-enrichment.json (pronunciation, etymology)
 *   - data/manas-frequency.json (frequency)
 *   - data/gourmet-examples.json (examples)
 */

import { readdir, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { EnKyEntrySchema, type EnKyEntry } from "../src/schema-en";

const ROOT = resolve(import.meta.dir, "..");
const ENTRIES_EN_DIR = join(ROOT, "entries-en");

interface RawWiktionaryPair {
  en: string;
  ky: string;
  sense: string;
  pos: string | null;
}

interface RawPivotPair {
  en: string;
  ky: string;
  pos: string;
  source: "pivot-ru";
  ruPivot: string;
  sense: string;
}

interface KyEnrichmentEntry {
  word: string;
  pos: string;
  etymology?: string;
  pronunciation?: string;
}

interface FrequencyEntry {
  lemma: string;
  pos: string;
  count: number;
}

interface GoURMETExample {
  ky: string;
  ru: string;
}

async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    return await Bun.file(path).json();
  } catch {
    return fallback;
  }
}

async function loadExistingEntries(): Promise<EnKyEntry[]> {
  const entries: EnKyEntry[] = [];
  try {
    const files = await readdir(ENTRIES_EN_DIR);
    for (const file of files.filter((f) => f.endsWith(".json")).sort()) {
      const raw = await Bun.file(join(ENTRIES_EN_DIR, file)).json();
      if (!Array.isArray(raw)) continue;
      for (const item of raw) {
        const result = EnKyEntrySchema.safeParse(item);
        if (result.success) entries.push(result.data);
      }
    }
  } catch {
    // No entries-en dir yet
  }
  return entries;
}

function dedupKey(en: string, ky: string, pos: string): string {
  return `${en.toLowerCase()}|${ky.toLowerCase()}|${pos}`;
}

function splitByLetter(entries: EnKyEntry[]): Map<string, EnKyEntry[]> {
  const letterMap = new Map<string, EnKyEntry[]>();
  for (const entry of entries) {
    const firstChar = entry.en.charAt(0).toLowerCase();
    const letter = /^[a-z]$/.test(firstChar) ? firstChar : "_";
    let arr = letterMap.get(letter);
    if (!arr) {
      arr = [];
      letterMap.set(letter, arr);
    }
    arr.push(entry);
  }
  return letterMap;
}

async function main() {
  console.log("=== En-Ky Sync ===\n");

  // 1. Load all sources
  console.log("Loading sources...");

  const [wiktionaryPairs, pivotPairs, existingEntries] = await Promise.all([
    readJson<RawWiktionaryPair[]>(join(ROOT, "data/en-ky-pairs.json"), []),
    readJson<RawPivotPair[]>(join(ROOT, "data/en-ky-pivot.json"), []),
    loadExistingEntries(),
  ]);

  console.log(`  Wiktionary pairs: ${wiktionaryPairs.length}`);
  console.log(`  Pivot pairs:      ${pivotPairs.length}`);
  console.log(`  Existing entries: ${existingEntries.length}`);

  // 2. Load enrichment data
  const [kyEnrichment, frequency, gourmetExamples] = await Promise.all([
    readJson<Record<string, KyEnrichmentEntry>>(join(ROOT, "data/ky-enrichment.json"), {}),
    readJson<FrequencyEntry[]>(join(ROOT, "data/manas-frequency.json"), []),
    readJson<GoURMETExample[]>(join(ROOT, "data/gourmet-examples.json"), []),
  ]);

  // Build frequency lookup
  const freqMap = new Map<string, number>();
  for (const f of frequency) {
    const existing = freqMap.get(f.lemma) ?? 0;
    freqMap.set(f.lemma, existing + f.count);
  }

  // Build example index
  const exampleIndex = new Map<string, { ky: string; en: string }[]>();
  for (const ex of gourmetExamples) {
    const words = ex.ky.toLowerCase().split(/\s+/);
    const seen = new Set<string>();
    for (const w of words) {
      if (w.length < 3 || seen.has(w)) continue;
      seen.add(w);
      let arr = exampleIndex.get(w);
      if (!arr) {
        arr = [];
        exampleIndex.set(w, arr);
      }
      if (arr.length < 3) {
        arr.push({ ky: ex.ky, en: ex.ru });
      }
    }
  }

  // 3. Merge with priority: manual > wiktionary > pivot
  const merged = new Map<string, EnKyEntry>();

  // 3a. Manual entries first
  const manualEntries = existingEntries.filter((e) => e.source === "manual");
  for (const entry of manualEntries) {
    const key = dedupKey(entry.en, entry.ky, entry.pos);
    merged.set(key, entry);
  }
  console.log(`\n  Manual entries preserved: ${manualEntries.length}`);

  // 3b. Wiktionary entries
  let wiktAdded = 0;
  for (const pair of wiktionaryPairs) {
    const pos = pair.pos ?? "noun";
    const key = dedupKey(pair.en, pair.ky, pos);
    if (merged.has(key)) continue;

    const senses = pair.sense
      ? pair.sense.split("; ").map((s) => s.trim()).filter(Boolean)
      : undefined;

    merged.set(key, {
      id: "",
      en: pair.en,
      ky: pair.ky.normalize("NFC"),
      pos: pos as EnKyEntry["pos"],
      source: "wiktionary-en",
      ...(senses && senses.length > 0 ? { senses } : {}),
    });
    wiktAdded++;
  }
  console.log(`  Wiktionary entries added: ${wiktAdded}`);

  // 3c. Pivot entries
  let pivotAdded = 0;
  for (const pair of pivotPairs) {
    const key = dedupKey(pair.en, pair.ky, pair.pos);
    if (merged.has(key)) continue;

    const senses = pair.sense
      ? pair.sense.split("; ").map((s) => s.trim()).filter(Boolean)
      : undefined;

    merged.set(key, {
      id: "",
      en: pair.en,
      ky: pair.ky.normalize("NFC"),
      pos: pair.pos as EnKyEntry["pos"],
      source: "pivot-ru",
      ruPivot: pair.ruPivot,
      ...(senses && senses.length > 0 ? { senses } : {}),
    });
    pivotAdded++;
  }
  console.log(`  Pivot entries added:      ${pivotAdded}`);

  // 4. Assign IDs and enrich
  const counters = new Map<string, number>();
  const allEntries: EnKyEntry[] = [];
  let enrichedPron = 0;
  let enrichedEtym = 0;
  let enrichedFreq = 0;

  for (const entry of merged.values()) {
    // Assign ID (skip for manual entries that already have one)
    if (!entry.id || entry.source !== "manual") {
      const enKey = entry.en.toLowerCase().replace(/\s+/g, "-");
      const count = (counters.get(enKey) ?? 0) + 1;
      counters.set(enKey, count);
      entry.id = `en-ky-${enKey}-${String(count).padStart(3, "0")}`;
    }

    // Enrich from ky-enrichment
    const enrichKey = `${entry.ky}:${entry.pos}`;
    const enrichData = kyEnrichment[enrichKey];
    if (enrichData?.pronunciation && !entry.pronunciation) {
      entry.pronunciation = enrichData.pronunciation;
      enrichedPron++;
    }
    if (enrichData?.etymology && !entry.etymology) {
      entry.etymology = enrichData.etymology;
      enrichedEtym++;
    }

    // Frequency
    const freq = freqMap.get(entry.ky.toLowerCase());
    if (freq && !entry.frequency) {
      entry.frequency = freq;
      enrichedFreq++;
    }

    // Wiktionary URL
    if (!entry.wiktionaryUrl) {
      entry.wiktionaryUrl = `https://en.wiktionary.org/wiki/${encodeURIComponent(entry.ky)}`;
    }

    allEntries.push(entry);
  }

  console.log(`\n  Total entries: ${allEntries.length}`);
  console.log(`  Enriched: ${enrichedPron} pronunciation, ${enrichedEtym} etymology, ${enrichedFreq} frequency`);

  // 5. Split by letter and save
  await mkdir(ENTRIES_EN_DIR, { recursive: true });
  const letterMap = splitByLetter(allEntries);

  // Remove old JSON files first
  try {
    const oldFiles = await readdir(ENTRIES_EN_DIR);
    for (const f of oldFiles.filter((f) => f.endsWith(".json"))) {
      const { unlinkSync } = await import("node:fs");
      unlinkSync(join(ENTRIES_EN_DIR, f));
    }
  } catch {}

  for (const [letter, entries] of letterMap) {
    const filePath = join(ENTRIES_EN_DIR, `${letter}.json`);
    await Bun.write(filePath, JSON.stringify(entries, null, 2) + "\n");
  }

  console.log(`  Letter files: ${letterMap.size}`);

  // Stats
  const bySource: Record<string, number> = {};
  const byPos: Record<string, number> = {};
  for (const e of allEntries) {
    bySource[e.source] = (bySource[e.source] ?? 0) + 1;
    byPos[e.pos] = (byPos[e.pos] ?? 0) + 1;
  }

  console.log("\nBy source:");
  for (const [s, c] of Object.entries(bySource).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${s}: ${c}`);
  }
  console.log("\nBy POS:");
  for (const [p, c] of Object.entries(byPos).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${p}: ${c}`);
  }

  console.log("\nSync complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
