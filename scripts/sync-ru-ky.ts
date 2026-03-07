#!/usr/bin/env bun
/**
 * Sync ru-ky dictionary entries from all sources into entries/*.json.
 *
 * Sources (in priority order):
 *   1. Manual entries (entries/*.json, source="manual") — preserved as-is
 *   2. Russian Wiktionary (data/ru-wiktionary-pairs.json, source="wiktionary-ru")
 *   3. English Wiktionary (data/en-wiktionary-pairs.json, source="wiktionary-en")
 *   4. Pivot entries (data/ru-ky-pivot.json, source="pivot-en") — optional
 *
 * Enrichment from:
 *   - data/ky-enrichment.json (pronunciation, etymology)
 *   - data/openrussian-enrichment.json (accented form, gender)
 *   - data/manas-frequency.json (frequency)
 *   - data/gourmet-examples.json (examples)
 *   - data/apertium-lemmas.json (validation)
 */

import { readdir, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { unlinkSync } from "node:fs";
import { DictionaryEntrySchema, type DictionaryEntry } from "../src/schema";
import {
  normalizeRussianWord,
  fixKyrgyzSpelling,
  assignIds,
  splitByLetter,
  type KyEnrichmentEntry,
  type RuEnrichment,
  type FrequencyEntry,
  type GoURMETExample,
  type ApertiumLemma,
} from "../pipeline/merge";

const ROOT = resolve(import.meta.dir, "..");
const ENTRIES_DIR = join(ROOT, "entries");

interface RawWiktionaryPair {
  ru: string;
  ky: string;
  sense: string;
  pos: string | null;
  ruTags?: string[];
  kyTags?: string[];
}

interface RawPivotPair {
  ru: string;
  ky: string;
  pos: string;
  source: "pivot-en";
  enPivot: string;
  sense: string;
}

async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    return await Bun.file(path).json();
  } catch {
    return fallback;
  }
}

async function loadExistingEntries(): Promise<DictionaryEntry[]> {
  const entries: DictionaryEntry[] = [];
  try {
    const files = await readdir(ENTRIES_DIR);
    for (const file of files.filter((f) => f.endsWith(".json")).sort()) {
      const raw = await Bun.file(join(ENTRIES_DIR, file)).json();
      if (!Array.isArray(raw)) continue;
      for (const item of raw) {
        const result = DictionaryEntrySchema.safeParse(item);
        if (result.success) entries.push(result.data);
      }
    }
  } catch {
    // No entries dir yet
  }
  return entries;
}

function dedupKey(ru: string, ky: string): string {
  return `${ru.toLowerCase()}|${ky.toLowerCase()}`;
}

const VALID_POS = new Set([
  "noun", "verb", "adj", "adv", "pron", "post", "num", "conj", "intj",
]);

const ARCHAIC_TAGS = new Set(["archaic", "obsolete", "dated", "poetic"]);

async function main() {
  console.log("=== Ru-Ky Sync ===\n");

  // 1. Load all sources
  console.log("Loading sources...");

  const [enWiktPairs, ruWiktPairs, pivotPairs, existingEntries] = await Promise.all([
    readJson<RawWiktionaryPair[]>(join(ROOT, "data/en-wiktionary-pairs.json"), []),
    readJson<RawWiktionaryPair[]>(join(ROOT, "data/ru-wiktionary-pairs.json"), []),
    readJson<RawPivotPair[]>(join(ROOT, "data/ru-ky-pivot.json"), []),
    loadExistingEntries(),
  ]);

  console.log(`  En-Wiktionary pairs: ${enWiktPairs.length}`);
  console.log(`  Ru-Wiktionary pairs: ${ruWiktPairs.length}`);
  console.log(`  Pivot pairs:         ${pivotPairs.length}`);
  console.log(`  Existing entries:    ${existingEntries.length}`);

  // 2. Load enrichment data
  const [kyEnrichment, ruEnrichment, frequency, gourmetExamples, apertiumLemmas] =
    await Promise.all([
      readJson<Record<string, KyEnrichmentEntry>>(join(ROOT, "data/ky-enrichment.json"), {}),
      readJson<Record<string, RuEnrichment>>(join(ROOT, "data/openrussian-enrichment.json"), {}),
      readJson<FrequencyEntry[]>(join(ROOT, "data/manas-frequency.json"), []),
      readJson<GoURMETExample[]>(join(ROOT, "data/gourmet-examples.json"), []),
      readJson<ApertiumLemma[]>(join(ROOT, "data/apertium-lemmas.json"), []),
    ]);

  // Build frequency lookup
  const freqMap = new Map<string, number>();
  for (const f of frequency) {
    const existing = freqMap.get(f.lemma) ?? 0;
    freqMap.set(f.lemma, existing + f.count);
  }

  // Build example index: ky word -> examples containing it
  const exampleIndex = new Map<string, { ky: string; ru: string }[]>();
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
        arr.push({ ky: ex.ky, ru: ex.ru });
      }
    }
  }

  // Build Apertium lemma set for validation
  const apertiumSet = new Set(apertiumLemmas.map((l) => l.lemma));

  // 3. Merge with priority: manual > wiktionary-ru > wiktionary-en > pivot-en
  const merged = new Map<string, Omit<DictionaryEntry, "id">>();

  // 3a. Manual entries first (preserved as-is)
  const manualEntries = existingEntries.filter((e) => e.source === "manual");
  for (const entry of manualEntries) {
    const key = dedupKey(entry.ru, entry.ky);
    // Strip id so we can re-assign later for consistent ordering
    const { id: _, ...rest } = entry;
    merged.set(key, rest);
  }
  console.log(`\n  Manual entries preserved: ${manualEntries.length}`);

  // 3b. Russian Wiktionary pairs (higher priority than English)
  let ruWiktAdded = 0;
  for (const pair of ruWiktPairs) {
    const ru = normalizeRussianWord(pair.ru);
    const ky = pair.ky.normalize("NFC");
    const key = dedupKey(ru, ky);
    if (merged.has(key)) continue;

    const pos = pair.pos && VALID_POS.has(pair.pos) ? pair.pos : "noun";
    const senses = pair.sense
      ? pair.sense.split("; ").map((s) => fixKyrgyzSpelling(s.trim())).filter(Boolean)
      : undefined;

    merged.set(key, {
      ru,
      ky,
      pos: pos as DictionaryEntry["pos"],
      source: "wiktionary-ru",
      ...(senses && senses.length > 0 ? { senses } : {}),
    });
    ruWiktAdded++;
  }
  console.log(`  Ru-Wiktionary added:     ${ruWiktAdded}`);

  // 3c. English Wiktionary pairs
  let enWiktAdded = 0;
  for (const pair of enWiktPairs) {
    // Skip archaic/obsolete/dated/poetic
    if (pair.ruTags?.some((t) => ARCHAIC_TAGS.has(t))) continue;

    const ru = normalizeRussianWord(pair.ru);
    const ky = pair.ky.normalize("NFC");
    const key = dedupKey(ru, ky);
    if (merged.has(key)) continue;

    const pos = pair.pos && VALID_POS.has(pair.pos) ? pair.pos : "noun";
    const senses = pair.sense
      ? pair.sense.split("; ").map((s) => fixKyrgyzSpelling(s.trim())).filter(Boolean)
      : undefined;

    merged.set(key, {
      ru,
      ky,
      pos: pos as DictionaryEntry["pos"],
      source: "wiktionary-en",
      ...(senses && senses.length > 0 ? { senses } : {}),
    });
    enWiktAdded++;
  }
  console.log(`  En-Wiktionary added:     ${enWiktAdded}`);

  // 3d. Pivot entries
  let pivotAdded = 0;
  for (const pair of pivotPairs) {
    const ru = normalizeRussianWord(pair.ru);
    const ky = pair.ky.normalize("NFC");
    const key = dedupKey(ru, ky);
    if (merged.has(key)) continue;

    const pos = pair.pos && VALID_POS.has(pair.pos) ? pair.pos : "noun";
    const senses = pair.sense
      ? pair.sense.split("; ").map((s) => fixKyrgyzSpelling(s.trim())).filter(Boolean)
      : undefined;

    merged.set(key, {
      ru,
      ky,
      pos: pos as DictionaryEntry["pos"],
      source: "pivot-en",
      enPivot: pair.enPivot,
      ...(senses && senses.length > 0 ? { senses } : {}),
    });
    pivotAdded++;
  }
  console.log(`  Pivot entries added:     ${pivotAdded}`);

  // 4. Enrich all entries and assign IDs
  const enrichedEntries: Omit<DictionaryEntry, "id">[] = [];
  let enrichedPron = 0;
  let enrichedEtym = 0;
  let enrichedFreq = 0;
  let enrichedExamples = 0;
  let enrichedAccented = 0;
  let enrichedGender = 0;
  let apertiumMatched = 0;

  for (const entry of merged.values()) {
    // Skip enrichment for manual entries (already enriched)
    if (entry.source === "manual") {
      enrichedEntries.push(entry);
      if (apertiumSet.has(entry.ky)) apertiumMatched++;
      continue;
    }

    // Kyrgyz enrichment (pronunciation, etymology)
    const enrichKey = `${entry.ky}:${entry.pos}`;
    const enrichData = kyEnrichment[enrichKey];
    if (enrichData?.pronunciation) {
      entry.pronunciation = enrichData.pronunciation;
      enrichedPron++;
    }
    if (enrichData?.etymology) {
      entry.etymology = enrichData.etymology;
      enrichedEtym++;
    }

    // Russian enrichment (accented form, gender)
    const ruData = ruEnrichment[entry.ru];
    if (ruData) {
      entry.ruAccented = ruData.accented;
      enrichedAccented++;
      if (ruData.gender && entry.pos === "noun") {
        entry.ruGender = ruData.gender as "m" | "f" | "n";
        enrichedGender++;
      }
    }

    // Frequency
    const freq = freqMap.get(entry.ky.toLowerCase());
    if (freq) {
      entry.frequency = freq;
      enrichedFreq++;
    }

    // GoURMET examples
    const kyLower = entry.ky.toLowerCase();
    const examples = exampleIndex.get(kyLower);
    if (examples && examples.length > 0) {
      entry.examples = examples.slice(0, 2);
      enrichedExamples++;
    }

    // Wiktionary URL
    entry.wiktionaryUrl = `https://en.wiktionary.org/wiki/${encodeURIComponent(entry.ky)}`;

    // Apertium validation
    if (apertiumSet.has(entry.ky)) apertiumMatched++;

    enrichedEntries.push(entry);
  }

  // Assign IDs
  const allEntries = assignIds(enrichedEntries as any) as DictionaryEntry[];

  console.log(`\n  Total entries: ${allEntries.length}`);
  console.log(`  Enriched: ${enrichedPron} pronunciation, ${enrichedEtym} etymology`);
  console.log(`  Enriched: ${enrichedAccented} ruAccented, ${enrichedGender} ruGender`);
  console.log(`  Enriched: ${enrichedFreq} frequency, ${enrichedExamples} examples`);
  console.log(`  Apertium matched: ${apertiumMatched}`);

  // 5. Split by letter and save
  await mkdir(ENTRIES_DIR, { recursive: true });
  const letterMap = splitByLetter(allEntries);

  // Remove old JSON files first
  try {
    const oldFiles = await readdir(ENTRIES_DIR);
    for (const f of oldFiles.filter((f) => f.endsWith(".json"))) {
      unlinkSync(join(ENTRIES_DIR, f));
    }
  } catch {}

  for (const [letter, entries] of letterMap) {
    const filePath = join(ENTRIES_DIR, `${letter}.json`);
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
