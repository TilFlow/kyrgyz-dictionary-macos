# En-Ky Pivot Enrichment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enrich the English-Kyrgyz dictionary by pivoting through Russian (ru-en from kaikki.org + existing ru-ky entries), storing results in `entries-en/` as source of truth.

**Architecture:** Extract ru-en pairs from English Wiktionary kaikki.org dump (entries with `lang_code="ru"` have English glosses in `senses[].glosses`). Join with existing ru-ky entries by `ru+POS` to create pivot en-ky pairs. Merge with existing wiktionary-en pairs and manual entries into `entries-en/*.json`. Switch `build.ts` to read from `entries-en/`.

**Tech Stack:** Bun, TypeScript, Zod, existing pipeline patterns (streaming JSONL.gz, dedup, normalization)

---

### Task 1: Create `src/schema-en.ts` — EnKyEntry schema

**Files:**
- Create: `src/schema-en.ts`
- Test: `src/schema-en.test.ts`

**Step 1: Write the test**

```typescript
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
```

**Step 2: Run test to verify it fails**

```bash
bun test src/schema-en.test.ts
```

Expected: FAIL — `Cannot find module "./schema-en"`

**Step 3: Implement `src/schema-en.ts`**

```typescript
import { z } from "zod/v4";

export const EnKyEntrySchema = z.object({
  id: z.string(),
  en: z.string(),
  ky: z.string(),
  pos: z.enum(["noun", "verb", "adj", "adv", "pron", "post", "num", "conj", "intj"]),
  source: z.enum(["wiktionary-en", "pivot-ru", "manual"]),
  senses: z.array(z.string()).optional(),
  examples: z.array(z.object({ ky: z.string(), en: z.string() })).optional(),
  pronunciation: z.string().optional(),
  etymology: z.string().optional(),
  frequency: z.number().optional(),
  ruPivot: z.string().optional(),
  wiktionaryUrl: z.string().optional(),
});

export type EnKyEntry = z.infer<typeof EnKyEntrySchema>;

export function validateEnKyEntry(data: unknown): z.SafeParseReturnType<unknown, EnKyEntry> {
  return EnKyEntrySchema.safeParse(data);
}
```

**Step 4: Run test to verify it passes**

```bash
bun test src/schema-en.test.ts
```

Expected: All 5 tests PASS

**Step 5: Commit**

```bash
git add src/schema-en.ts src/schema-en.test.ts
git commit -m "feat: add EnKyEntry schema for en-ky dictionary entries"
```

---

### Task 2: Create `entries-en/` folder structure

**Files:**
- Create: `entries-en/.gitkeep`

**Step 1: Create folder**

```bash
mkdir -p entries-en
touch entries-en/.gitkeep
```

**Step 2: Commit**

```bash
git add entries-en/.gitkeep
git commit -m "chore: add entries-en/ folder for en-ky dictionary entries"
```

---

### Task 3: Create `pipeline/extract-ru-en-wiktionary.ts` — ru-en extraction

This script extracts Russian-English pairs from the English Wiktionary kaikki.org dump. Russian word entries (`lang_code="ru"`) have English definitions in `senses[].glosses`.

**Files:**
- Create: `pipeline/extract-ru-en-wiktionary.ts`

**Step 1: Implement the extraction script**

```typescript
#!/usr/bin/env bun
/**
 * Extract Russian-English translation pairs from the English Wiktionary
 * kaikki.org JSONL dump.
 *
 * Input:  data/raw-wiktextract-data.jsonl.gz
 * Output: data/ru-en-pairs.json
 *
 * Russian word entries (lang_code="ru") have English definitions in
 * senses[].glosses. We extract these as ru→en pairs.
 */

import { createReadStream } from "fs";
import { createInterface } from "readline";
import { createGunzip } from "zlib";
import { writeFileSync } from "fs";
import { resolve } from "path";
import { mapWiktionaryPos, normalizeRussian } from "./wiktionary-utils";

const ROOT = resolve(import.meta.dir, "..");
const INPUT = resolve(ROOT, "data/raw-wiktextract-data.jsonl.gz");
const OUTPUT = resolve(ROOT, "data/ru-en-pairs.json");

interface RuEnPair {
  ru: string;
  en: string;
  pos: string | null;
  sense: string;
}

/**
 * Clean an English gloss: remove parenthetical qualifiers, wiki markup,
 * and other noise to extract a clean English translation.
 * Returns null if the gloss is not a usable translation.
 */
function cleanGloss(gloss: string): string | null {
  if (!gloss) return null;

  let cleaned = gloss.trim();

  // Skip meta-glosses that aren't actual translations
  if (/^(Alternative|Obsolete|Archaic|Dated)\s+(form|spelling)/i.test(cleaned)) return null;
  if (/^(See|Compare|Synonym|Used)/i.test(cleaned)) return null;
  if (cleaned.startsWith("(") && cleaned.endsWith(")")) return null;

  // Remove leading parenthetical qualifiers: "(colloquial) word" → "word"
  cleaned = cleaned.replace(/^\([^)]*\)\s*/g, "");

  // Remove trailing parenthetical notes
  cleaned = cleaned.replace(/\s*\([^)]*\)$/g, "");

  // Skip if too long (likely a definition, not a translation word)
  if (cleaned.split(/\s+/).length > 6) return null;

  // Skip if empty after cleaning
  if (!cleaned || cleaned.length < 2) return null;

  return cleaned;
}

async function main() {
  console.log(`Reading: ${INPUT}`);
  console.log(`Output:  ${OUTPUT}`);

  const seen = new Set<string>();
  const pairs: RuEnPair[] = [];
  let lineCount = 0;
  let skipped = 0;
  let ruEntries = 0;

  const gunzip = createGunzip();
  const fileStream = createReadStream(INPUT);
  const rl = createInterface({
    input: fileStream.pipe(gunzip),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    lineCount++;

    if (lineCount % 500_000 === 0) {
      console.log(`  ... ${(lineCount / 1_000_000).toFixed(1)}M lines, ${ruEntries} ru entries, ${pairs.length} pairs`);
    }

    let entry: any;
    try {
      entry = JSON.parse(line);
    } catch {
      skipped++;
      continue;
    }

    // Only Russian entries
    if (entry.lang_code !== "ru") continue;
    if (!entry.word) continue;

    ruEntries++;

    const ruWord = normalizeRussian(entry.word.trim());
    if (!ruWord) continue;

    const pos = mapWiktionaryPos(entry.pos ?? "");
    const senses: any[] = entry.senses ?? [];

    for (const sense of senses) {
      const glosses: string[] = sense.glosses ?? [];
      if (glosses.length === 0) continue;

      // First gloss is typically the main English definition
      // For multi-word definitions, try each gloss
      for (const rawGloss of glosses) {
        const enWord = cleanGloss(rawGloss);
        if (!enWord) continue;

        const key = `${ruWord}\t${enWord.toLowerCase()}\t${pos ?? ""}`;
        if (seen.has(key)) continue;
        seen.add(key);

        pairs.push({
          ru: ruWord,
          en: enWord,
          pos,
          sense: rawGloss,
        });
      }
    }
  }

  console.log(`\nDone.`);
  console.log(`  Total lines:    ${lineCount.toLocaleString()}`);
  console.log(`  Parse errors:   ${skipped.toLocaleString()}`);
  console.log(`  Russian entries: ${ruEntries.toLocaleString()}`);
  console.log(`  Unique ru-en:   ${pairs.length.toLocaleString()}`);

  writeFileSync(OUTPUT, JSON.stringify(pairs, null, 2));
  console.log(`Written to ${OUTPUT}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
```

**Step 2: Test manually** (requires the kaikki.org dump)

```bash
bun run pipeline/extract-ru-en-wiktionary.ts
```

Expected: Creates `data/ru-en-pairs.json` with ~50-80K pairs. Console output shows progress and final stats.

**Step 3: Commit**

```bash
git add pipeline/extract-ru-en-wiktionary.ts
git commit -m "feat: add ru-en extraction from kaikki.org for pivot"
```

---

### Task 4: Create `pipeline/pivot-en-ky.ts` — pivot join

Joins ru-en pairs with ru-ky entries by `ru+POS` to produce new en-ky pivot pairs.

**Files:**
- Create: `pipeline/pivot-en-ky.ts`
- Test: `pipeline/pivot-en-ky.test.ts`

**Step 1: Write the test**

```typescript
import { describe, test, expect } from "bun:test";
import { pivotJoin, type RuEnPair } from "./pivot-en-ky";
import type { DictionaryEntry } from "../src/schema";

const ruEnPairs: RuEnPair[] = [
  { ru: "дом", en: "house", pos: "noun", sense: "a building" },
  { ru: "дом", en: "home", pos: "noun", sense: "a place" },
  { ru: "идти", en: "to go", pos: "verb", sense: "to move" },
  { ru: "большой", en: "big", pos: "adj", sense: "large" },
];

const ruKyEntries: DictionaryEntry[] = [
  { id: "ru-дом-001", ru: "дом", ky: "үй", pos: "noun", source: "wiktionary-en" },
  { id: "ru-идти-001", ru: "идти", ky: "баруу", pos: "verb", source: "wiktionary-en" },
  { id: "ru-большой-001", ru: "большой", ky: "чоң", pos: "adj", source: "manual" },
];

describe("pivotJoin", () => {
  test("creates en-ky pairs from ru-en + ru-ky", () => {
    const result = pivotJoin(ruEnPairs, ruKyEntries, new Set());
    // дом(noun): house→үй, home→үй
    // идти(verb): to go→баруу
    // большой(adj): big→чоң
    expect(result.length).toBe(4);
  });

  test("sets source to pivot-ru", () => {
    const result = pivotJoin(ruEnPairs, ruKyEntries, new Set());
    for (const pair of result) {
      expect(pair.source).toBe("pivot-ru");
    }
  });

  test("includes ruPivot field", () => {
    const result = pivotJoin(ruEnPairs, ruKyEntries, new Set());
    const housePair = result.find((p) => p.en === "house");
    expect(housePair?.ruPivot).toBe("дом");
  });

  test("skips pairs already in existing set", () => {
    const existing = new Set(["house|үй|noun"]);
    const result = pivotJoin(ruEnPairs, ruKyEntries, existing);
    expect(result.find((p) => p.en === "house")).toBeUndefined();
    expect(result.length).toBe(3); // home→үй, to go→баруу, big→чоң
  });

  test("strict POS matching — no cross-POS join", () => {
    const ruEn: RuEnPair[] = [
      { ru: "дом", en: "house", pos: "verb", sense: "n/a" }, // wrong POS
    ];
    const result = pivotJoin(ruEn, ruKyEntries, new Set());
    expect(result.length).toBe(0); // дом is noun in ruKy, verb in ruEn — no match
  });
});
```

**Step 2: Run test to verify it fails**

```bash
bun test pipeline/pivot-en-ky.test.ts
```

Expected: FAIL — `Cannot find module "./pivot-en-ky"`

**Step 3: Implement `pipeline/pivot-en-ky.ts`**

```typescript
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

      // Skip if already exists in wiktionary/manual or already seen
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

  // Stats
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
```

**Step 4: Run test to verify it passes**

```bash
bun test pipeline/pivot-en-ky.test.ts
```

Expected: All 5 tests PASS

**Step 5: Commit**

```bash
git add pipeline/pivot-en-ky.ts pipeline/pivot-en-ky.test.ts
git commit -m "feat: add pivot join for en-ky via ru-en intermediary"
```

---

### Task 5: Create `scripts/sync-en-ky.ts` — main sync script

Merges all en-ky sources (wiktionary, pivot, manual) into `entries-en/*.json`.

**Files:**
- Create: `scripts/sync-en-ky.ts`
- Modify: `package.json` (add `"sync:en"` script)

**Step 1: Implement `scripts/sync-en-ky.ts`**

```typescript
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

import { Glob } from "bun";
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

/** Load existing entries-en/*.json (manual + previously synced). */
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

function generateId(en: string, seq: number): string {
  return `en-ky-${en.toLowerCase().replace(/\s+/g, "-")}-${String(seq).padStart(3, "0")}`;
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
        arr.push({ ky: ex.ky, en: ex.ru }); // GoURMET has ky-ru, we store as ky-en context
      }
    }
  }

  // 3. Merge with priority: manual > wiktionary > pivot
  const merged = new Map<string, EnKyEntry>();

  // 3a. Manual entries first (highest priority)
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
      id: "", // assigned later
      en: pair.en,
      ky: pair.ky.normalize("NFC"),
      pos: pos as EnKyEntry["pos"],
      source: "wiktionary-en",
      ...(senses && senses.length > 0 ? { senses } : {}),
    });
    wiktAdded++;
  }
  console.log(`  Wiktionary entries added: ${wiktAdded}`);

  // 3c. Pivot entries (lowest priority)
  let pivotAdded = 0;
  for (const pair of pivotPairs) {
    const key = dedupKey(pair.en, pair.ky, pair.pos);
    if (merged.has(key)) continue;

    const senses = pair.sense
      ? pair.sense.split("; ").map((s) => s.trim()).filter(Boolean)
      : undefined;

    merged.set(key, {
      id: "", // assigned later
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
    // Assign ID
    const enKey = entry.en.toLowerCase().replace(/\s+/g, "-");
    const count = (counters.get(enKey) ?? 0) + 1;
    counters.set(enKey, count);
    entry.id = `en-ky-${enKey}-${String(count).padStart(3, "0")}`;

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

  // Remove old files
  try {
    const oldFiles = await readdir(ENTRIES_EN_DIR);
    for (const f of oldFiles.filter((f) => f.endsWith(".json"))) {
      await Bun.write(join(ENTRIES_EN_DIR, f), ""); // will be overwritten
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
```

**Step 2: Add scripts to `package.json`**

Add to `"scripts"` section:

```json
"sync:en": "bun run scripts/sync-en-ky.ts"
```

**Step 3: Test manually** (after Tasks 3 and 4 data exists)

```bash
bun run sync:en
```

Expected: Loads sources, merges, enriches, saves to `entries-en/*.json`. Console shows stats.

**Step 4: Commit**

```bash
git add scripts/sync-en-ky.ts package.json
git commit -m "feat: add en-ky sync script merging wiktionary + pivot + manual"
```

---

### Task 6: Modify `scripts/build.ts` — read from `entries-en/`

Switch the en-ky/ky-en build from reading `data/en-ky-pairs.json` to reading `entries-en/*.json`.

**Files:**
- Modify: `scripts/build.ts`

**Step 1: Modify `build.ts`**

Replace the `loadEnrichedEnKyPairs()` function and its callers. The new approach:
- Load `entries-en/*.json` via `EnKyEntrySchema` validation
- Remove the `enrichEnKyPairs()` function (enrichment now happens in `sync-en-ky.ts`)
- The `EnKyEntry` from `entries-en/` already has all fields needed

Replace the existing `loadEnrichedEnKyPairs` function (approximately lines 257-283) with:

```typescript
import { EnKyEntrySchema, type EnKyEntry } from "../src/schema-en";

const ENTRIES_EN_DIR = join(ROOT, "entries-en");

async function loadEnKyEntries(): Promise<EnKyEntry[] | null> {
  const entries: EnKyEntry[] = [];
  try {
    const glob = new Glob("*.json");
    const files: string[] = [];
    for await (const file of glob.scan(ENTRIES_EN_DIR)) {
      files.push(file);
    }
    if (files.length === 0) {
      console.log("  Skipping en-ky/ky-en: no entries in entries-en/. Run sync:en first.");
      return null;
    }
    files.sort();

    for (const file of files) {
      const path = join(ENTRIES_EN_DIR, file);
      const raw = await Bun.file(path).json();
      if (!Array.isArray(raw)) continue;
      for (const item of raw) {
        const result = EnKyEntrySchema.safeParse(item);
        if (result.success) entries.push(result.data);
      }
    }
  } catch {
    console.log("  Skipping en-ky/ky-en: entries-en/ not found. Run sync:en first.");
    return null;
  }

  console.log(`  Loaded ${entries.length} en-ky entries from entries-en/`);
  return entries;
}
```

Update the `main()` function to use `loadEnKyEntries()` instead of `loadEnrichedEnKyPairs()`. The `EnKyEntry` interface already has the `en`, `ky`, `pos`, `source`, `senses`, `pronunciation`, `etymology`, `frequency`, `examples`, `wiktionaryUrl` fields needed by `generateEnKyDictionary()` and `generateKyEnDictionary()`.

The `EnKyEntry` type from `schema-en.ts` needs to be compatible with what `generateEnKyDictionary()` expects. Check the `EnKyEntry` interface in `build.ts` and the `xml-generator.ts` to ensure compatibility. You may need to adapt the grouping/merging code in the JSON output section.

**Key changes:**
1. Import `EnKyEntrySchema, type EnKyEntry` from `../src/schema-en`
2. Add `ENTRIES_EN_DIR` constant
3. Replace `loadEnrichedEnKyPairs()` with `loadEnKyEntries()`
4. Update `main()` to call `loadEnKyEntries()` and pass results to existing XML generators
5. Remove `enrichEnKyPairs()` function and related interfaces (`KyEnrichmentEntry`, `FrequencyEntry`, `GoURMETExample`) that are now unused in build.ts
6. Update the JSON output section's `mergeEnKyGroup` to work with the new `EnKyEntry` type

**Step 2: Verify build works**

```bash
bun run build
```

Expected: Build completes, generating all 4 dictionaries (ru-ky, ky-ru, en-ky, ky-en). The en-ky/ky-en dictionaries now read from `entries-en/`.

**Step 3: Commit**

```bash
git add scripts/build.ts
git commit -m "refactor: switch en-ky build to read from entries-en/"
```

---

### Task 7: Create `scripts/add-en.ts` — manual en-ky entry addition

Interactive script for adding manual en-ky entries, analogous to `scripts/add.ts`.

**Files:**
- Create: `scripts/add-en.ts`
- Modify: `package.json` (add `"add:en"` script)

**Step 1: Implement `scripts/add-en.ts`**

```typescript
import { join } from "node:path";
import { createInterface } from "node:readline";
import { EnKyEntrySchema, type EnKyEntry } from "../src/schema-en";

const ENTRIES_DIR = join(import.meta.dirname, "..", "entries-en");

const POS_OPTIONS = [
  { value: "noun", label: "noun" },
  { value: "verb", label: "verb" },
  { value: "adj", label: "adjective" },
  { value: "adv", label: "adverb" },
  { value: "pron", label: "pronoun" },
  { value: "post", label: "postposition" },
  { value: "num", label: "numeral" },
  { value: "conj", label: "conjunction" },
  { value: "intj", label: "interjection" },
] as const;

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  try {
    const en = (await ask("English word: ")).trim();
    if (!en) {
      console.error("Word cannot be empty.");
      process.exit(1);
    }

    const ky = (await ask("Kyrgyz translation: ")).trim();
    if (!ky) {
      console.error("Translation cannot be empty.");
      process.exit(1);
    }

    console.log("\nPart of speech:");
    for (let i = 0; i < POS_OPTIONS.length; i++) {
      console.log(`  ${i + 1}. ${POS_OPTIONS[i].label}`);
    }
    const posInput = (await ask("Choose number: ")).trim();
    const posIndex = parseInt(posInput, 10) - 1;
    if (isNaN(posIndex) || posIndex < 0 || posIndex >= POS_OPTIONS.length) {
      console.error("Invalid number.");
      process.exit(1);
    }
    const pos = POS_OPTIONS[posIndex].value;

    const sensesInput = (await ask("Senses (comma-separated): ")).trim();
    const senses = sensesInput
      ? sensesInput.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;

    // Determine letter file
    const letter = en[0].toLowerCase();
    const letterKey = /^[a-z]$/.test(letter) ? letter : "_";
    const filePath = join(ENTRIES_DIR, `${letterKey}.json`);

    // Read existing entries
    let entries: EnKyEntry[] = [];
    const file = Bun.file(filePath);
    if (await file.exists()) {
      entries = await file.json();
    }

    // Generate ID
    const enKey = en.toLowerCase().replace(/\s+/g, "-");
    const prefix = `en-ky-${enKey}-`;
    const existingSeqs = entries
      .filter((e) => e.id.startsWith(prefix))
      .map((e) => parseInt(e.id.slice(prefix.length), 10))
      .filter((n) => !isNaN(n));
    const nextSeq = existingSeqs.length > 0 ? Math.max(...existingSeqs) + 1 : 1;
    const id = `${prefix}${String(nextSeq).padStart(3, "0")}`;

    const entry: EnKyEntry = {
      id,
      en,
      ky: ky.normalize("NFC"),
      pos,
      source: "manual",
      ...(senses && senses.length > 0 ? { senses } : {}),
    };

    // Preview
    console.log("\nPreview:");
    console.log(JSON.stringify(entry, null, 2));

    const confirm = (await ask("\nAdd? (y/n): ")).trim().toLowerCase();
    if (confirm !== "y" && confirm !== "yes") {
      console.log("Cancelled.");
      process.exit(0);
    }

    // Validate
    const result = EnKyEntrySchema.safeParse(entry);
    if (!result.success) {
      console.error("Validation error:");
      for (const issue of result.error.issues) {
        const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
        console.error(`  ${path}: ${issue.message}`);
      }
      process.exit(1);
    }

    // Save
    entries.push(entry);
    await Bun.write(filePath, JSON.stringify(entries, null, 2) + "\n");

    console.log(`Added! ID: ${id}`);
  } finally {
    rl.close();
  }
}

main();
```

**Step 2: Add to `package.json`**

```json
"add:en": "bun run scripts/add-en.ts"
```

**Step 3: Commit**

```bash
git add scripts/add-en.ts package.json
git commit -m "feat: add interactive script for manual en-ky entries"
```

---

### Task 8: Integration test — run full pipeline

**Step 1: Run extraction** (requires kaikki.org dump)

```bash
bun run pipeline/extract-ru-en-wiktionary.ts
```

Expected: Creates `data/ru-en-pairs.json`

**Step 2: Run pivot**

```bash
bun run pipeline/pivot-en-ky.ts
```

Expected: Creates `data/en-ky-pivot.json` with new pivot pairs

**Step 3: Run sync**

```bash
bun run sync:en
```

Expected: Creates `entries-en/*.json` with merged entries from all sources

**Step 4: Run build**

```bash
bun run build
```

Expected: All 4 dictionaries build successfully

**Step 5: Run all tests**

```bash
bun test
```

Expected: All tests pass

**Step 6: Commit entries-en**

```bash
git add entries-en/
git commit -m "feat: initial en-ky entries from wiktionary + pivot"
```
