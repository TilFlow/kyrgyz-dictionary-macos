#!/usr/bin/env bun
/**
 * Merge all extracted sources into per-letter entries/*.json files.
 *
 * Reads:
 *   data/en-wiktionary-pairs.json
 *   data/ru-wiktionary-pairs.json
 *   data/ky-enrichment.json
 *   data/apertium-lemmas.json
 *   data/gourmet-examples.json       (optional)
 *   data/openrussian-enrichment.json  (optional)
 *   data/manas-frequency.json         (optional)
 *
 * Writes:
 *   entries/{letter}.json (one file per first Russian letter)
 */

import { resolve } from "path";
import { mkdirSync, rmSync, readdirSync } from "fs";
import type { DictionaryEntry } from "../src/schema";

const ROOT = resolve(import.meta.dir, "..");

// --- Public types for testing ---

export interface InputPair {
  ru: string;
  ky: string;
  sense: string;
  pos: string | null;
  ruTags?: string[];
  kyTags?: string[];
}

export interface KyEnrichmentEntry {
  word: string;
  pos: string;
  etymology?: string;
  pronunciation?: string;
  forms?: { form: string; tags: string[] }[];
}

export type KyEnrichmentMap = Record<string, KyEnrichmentEntry>;

export interface ApertiumLemma {
  lemma: string;
  pos: string;
}

export interface GoURMETExample {
  ky: string;
  ru: string;
}

export interface RuEnrichment {
  accented: string;
  gender?: string;
  animate?: boolean;
  aspect?: string;
  pos: string;
}

export type RuEnrichmentMap = Record<string, RuEnrichment>;

export interface FrequencyEntry {
  lemma: string;
  pos: string;
  count: number;
}

export interface MergeStats {
  total: number;
  bySource: Record<string, number>;
  byPos: Record<string, number>;
  apertiumMatched: number;
  apertiumUnmatched: number;
  withEtymology: number;
  withPronunciation: number;
  withExamples: number;
  withRuAccented: number;
  withRuGender: number;
  withFrequency: number;
  letterFiles: number;
}

export interface MergeResult {
  entries: DictionaryEntry[];
  stats: MergeStats;
}

// --- Normalization ---

/** Normalize a Russian word: strip leading English glosses, acute accent (U+0301), NFC normalize, fix "киргиз" → "кыргыз". */
export function normalizeRussianWord(word: string): string {
  return fixKyrgyzSpelling(
    word.replace(/^\([^)]*\)\s*/g, "").replace(/\u0301/g, "").normalize("NFC")
  );
}

/** Replace outdated/incorrect "киргиз" spellings with correct "кыргыз" forms. */
export function fixKyrgyzSpelling(text: string): string {
  return text
    .replace(/Киргизия/g, "Кыргызстан")
    .replace(/Киргизстан/g, "Кыргызстан")
    .replace(/киргизизирова/g, "кыргызизирова")
    .replace(/киргизизаци/g, "кыргызизаци")
    .replace(/Киргизск/g, "Кыргызск")
    .replace(/киргизск/g, "кыргызск")
    .replace(/по-киргизски/g, "по-кыргызски")
    .replace(/киргизк/g, "кыргызк")
    .replace(/киргиз/g, "кыргыз")
    .replace(/Киргиз/g, "Кыргыз");
}

const VALID_POS = new Set([
  "noun",
  "verb",
  "adj",
  "adv",
  "pron",
  "post",
  "num",
  "conj",
  "intj",
]);

// --- Core merge logic ---

export function mergeEntries(
  ruPairs: InputPair[],
  enPairs: InputPair[],
  enrichment: KyEnrichmentMap,
  lemmas: ApertiumLemma[],
  gourmetExamples: GoURMETExample[] = [],
  ruEnrichment: RuEnrichmentMap = {},
  frequency: FrequencyEntry[] = []
): MergeResult {
  // Build dedup map keyed by "ru|ky"
  const merged = new Map<
    string,
    {
      ru: string;
      ky: string;
      sense: string;
      pos: string | null;
      source: "wiktionary-ru" | "wiktionary-en";
    }
  >();

  // 1. Load ru-wiktionary pairs first (higher priority)
  for (const pair of ruPairs) {
    const ru = normalizeRussianWord(pair.ru);
    const ky = pair.ky.normalize("NFC");
    const key = `${ru}|${ky}`;
    merged.set(key, {
      ru,
      ky,
      sense: pair.sense,
      pos: pair.pos,
      source: "wiktionary-ru",
    });
  }

  // Tags that indicate the Russian headword is not modern standard usage
  const ARCHAIC_TAGS = new Set(["archaic", "obsolete", "dated", "poetic"]);

  // 2. Add en-wiktionary pairs not already present
  for (const pair of enPairs) {
    // Skip pairs where the Russian word is archaic/obsolete/dated/poetic
    if (pair.ruTags?.some((t) => ARCHAIC_TAGS.has(t))) continue;

    const ru = normalizeRussianWord(pair.ru);
    const ky = pair.ky.normalize("NFC");
    const key = `${ru}|${ky}`;
    if (!merged.has(key)) {
      merged.set(key, {
        ru,
        ky,
        sense: pair.sense,
        pos: pair.pos,
        source: "wiktionary-en",
      });
    }
  }

  // Build Apertium lemma set for validation
  const apertiumSet = new Set(lemmas.map((l) => l.lemma));

  // Build GoURMET example index: ky word → examples containing it
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

  // Build frequency lookup: ky lemma → count
  const freqMap = new Map<string, number>();
  for (const f of frequency) {
    const existing = freqMap.get(f.lemma) ?? 0;
    freqMap.set(f.lemma, existing + f.count);
  }

  // Build entries
  const entries: Omit<DictionaryEntry, "id">[] = [];
  const stats: MergeStats = {
    total: 0,
    bySource: {},
    byPos: {},
    apertiumMatched: 0,
    apertiumUnmatched: 0,
    withEtymology: 0,
    withPronunciation: 0,
    withExamples: 0,
    withRuAccented: 0,
    withRuGender: 0,
    withFrequency: 0,
    letterFiles: 0,
  };

  for (const item of merged.values()) {
    // Resolve POS
    let pos = item.pos;
    if (!pos || !VALID_POS.has(pos)) {
      pos = "noun"; // default fallback
    }

    // Parse senses, fix "киргиз" spelling
    const senses = item.sense
      ? item.sense.split("; ").map((s) => fixKyrgyzSpelling(s.trim())).filter(Boolean)
      : undefined;

    // Look up enrichment by "word:pos"
    const enrichKey = `${item.ky}:${pos}`;
    const enrichData = enrichment[enrichKey];

    // Build entry
    const entry: Omit<DictionaryEntry, "id"> = {
      ru: item.ru,
      ky: item.ky,
      pos: pos as DictionaryEntry["pos"],
      source: item.source,
      wiktionaryUrl: `https://en.wiktionary.org/wiki/${encodeURIComponent(item.ky)}`,
    };

    if (senses && senses.length > 0) {
      entry.senses = senses;
    }

    if (enrichData?.etymology) {
      entry.etymology = enrichData.etymology;
      stats.withEtymology++;
    }

    if (enrichData?.pronunciation) {
      entry.pronunciation = enrichData.pronunciation;
      stats.withPronunciation++;
    }

    // GoURMET examples: find sentences containing this Kyrgyz word
    const kyLower = item.ky.toLowerCase();
    const examples = exampleIndex.get(kyLower);
    if (examples && examples.length > 0) {
      entry.examples = examples.slice(0, 2);
      stats.withExamples++;
    }

    // OpenRussian enrichment: accented form and gender
    const ruData = ruEnrichment[item.ru];
    if (ruData) {
      entry.ruAccented = ruData.accented;
      stats.withRuAccented++;
      if (ruData.gender && pos === "noun") {
        entry.ruGender = ruData.gender as "m" | "f" | "n";
        stats.withRuGender++;
      }
    }

    // Manas frequency
    const freq = freqMap.get(kyLower);
    if (freq) {
      entry.frequency = freq;
      stats.withFrequency++;
    }

    // Validate against Apertium
    if (apertiumSet.has(item.ky)) {
      stats.apertiumMatched++;
    } else {
      stats.apertiumUnmatched++;
    }

    // Track stats
    stats.bySource[item.source] = (stats.bySource[item.source] ?? 0) + 1;
    stats.byPos[pos] = (stats.byPos[pos] ?? 0) + 1;

    entries.push(entry);
  }

  // Assign IDs
  const withIds = assignIds(entries as any) as DictionaryEntry[];

  stats.total = withIds.length;

  return { entries: withIds, stats };
}

// --- ID assignment ---

export function assignIds(
  entries: Omit<DictionaryEntry, "id">[]
): DictionaryEntry[] {
  const counters = new Map<string, number>();

  return entries.map((entry) => {
    const count = (counters.get(entry.ru) ?? 0) + 1;
    counters.set(entry.ru, count);
    const seq = String(count).padStart(3, "0");
    return {
      ...entry,
      id: `ru-${entry.ru}-${seq}`,
    } as DictionaryEntry;
  });
}

// --- Split by letter ---

export function splitByLetter(
  entries: DictionaryEntry[]
): Map<string, DictionaryEntry[]> {
  const letterMap = new Map<string, DictionaryEntry[]>();

  for (const entry of entries) {
    const firstChar = entry.ru.charAt(0).toLowerCase();
    let arr = letterMap.get(firstChar);
    if (!arr) {
      arr = [];
      letterMap.set(firstChar, arr);
    }
    arr.push(entry);
  }

  return letterMap;
}

// --- Main CLI ---

async function main() {
  const enPairsPath = resolve(ROOT, "data/en-wiktionary-pairs.json");
  const ruPairsPath = resolve(ROOT, "data/ru-wiktionary-pairs.json");
  const enrichmentPath = resolve(ROOT, "data/ky-enrichment.json");
  const lemmasPath = resolve(ROOT, "data/apertium-lemmas.json");
  const gourmetPath = resolve(ROOT, "data/gourmet-examples.json");
  const openrussianPath = resolve(ROOT, "data/openrussian-enrichment.json");
  const manasPath = resolve(ROOT, "data/manas-frequency.json");
  const entriesDir = resolve(ROOT, "entries");

  const readJson = (path: string, fallback: any) =>
    Bun.file(path)
      .json()
      .catch(() => {
        console.warn(`Warning: ${path} not found, using fallback`);
        return fallback;
      });

  // Read input files
  const [enPairs, ruPairs, enrichment, lemmas, gourmetExamples, ruEnrichment, manasFreq] =
    await Promise.all([
      readJson(enPairsPath, []),
      readJson(ruPairsPath, []),
      readJson(enrichmentPath, {}),
      readJson(lemmasPath, []),
      readJson(gourmetPath, []),
      readJson(openrussianPath, {}),
      readJson(manasPath, []),
    ]);

  console.log(
    `Loaded: ${ruPairs.length} ru-wikt pairs, ${enPairs.length} en-wikt pairs`
  );
  console.log(
    `Enrichment keys: ${Object.keys(enrichment).length}, Apertium lemmas: ${lemmas.length}`
  );
  console.log(
    `GoURMET examples: ${gourmetExamples.length}, OpenRussian words: ${Object.keys(ruEnrichment).length}, Manas frequency entries: ${manasFreq.length}`
  );

  // Merge
  const { entries, stats } = mergeEntries(
    ruPairs as InputPair[],
    enPairs as InputPair[],
    enrichment as KyEnrichmentMap,
    lemmas as ApertiumLemma[],
    gourmetExamples as GoURMETExample[],
    ruEnrichment as RuEnrichmentMap,
    manasFreq as FrequencyEntry[]
  );

  // Split by letter
  const letterMap = splitByLetter(entries);

  // Clean old entries directory and recreate
  mkdirSync(entriesDir, { recursive: true });
  // Remove existing JSON files
  for (const file of readdirSync(entriesDir)) {
    if (file.endsWith(".json")) {
      rmSync(resolve(entriesDir, file));
    }
  }

  // Write per-letter files
  for (const [letter, letterEntries] of letterMap) {
    const filePath = resolve(entriesDir, `${letter}.json`);
    await Bun.write(filePath, JSON.stringify(letterEntries, null, 2) + "\n");
  }

  stats.letterFiles = letterMap.size;

  // Print stats
  console.log("\n=== Merge Stats ===");
  console.log(`Total merged entries: ${stats.total}`);
  console.log("\nBy source:");
  for (const [source, count] of Object.entries(stats.bySource).sort(
    (a, b) => b[1] - a[1]
  )) {
    console.log(`  ${source}: ${count}`);
  }
  console.log("\nBy POS:");
  for (const [pos, count] of Object.entries(stats.byPos).sort(
    (a, b) => b[1] - a[1]
  )) {
    console.log(`  ${pos}: ${count}`);
  }
  console.log(
    `\nApertium validation: ${stats.apertiumMatched} matched, ${stats.apertiumUnmatched} unmatched`
  );
  console.log(`Entries with etymology: ${stats.withEtymology}`);
  console.log(`Entries with pronunciation: ${stats.withPronunciation}`);
  console.log(`Entries with examples: ${stats.withExamples}`);
  console.log(`Entries with ruAccented: ${stats.withRuAccented}`);
  console.log(`Entries with ruGender: ${stats.withRuGender}`);
  console.log(`Entries with frequency: ${stats.withFrequency}`);
  console.log(`Letter files created: ${stats.letterFiles}`);
}

// Run main only when executed directly
if (import.meta.main) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
