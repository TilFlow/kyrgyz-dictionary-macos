#!/usr/bin/env bun
/**
 * Update dictionary from all data sources.
 *
 * Downloads latest data, re-runs extraction and merge,
 * preserves manual entries, and reports changes.
 *
 * Usage:
 *   bun run update                    # full update (download + extract + merge + enrich)
 *   bun run update --skip-download    # re-run extraction + merge without downloading
 *   bun run update --merge-only       # re-run merge + enrich from existing extracted data
 */

import { resolve } from "path";
import { readdirSync, existsSync } from "fs";
import { mkdir } from "fs/promises";
import type { DictionaryEntry } from "../src/schema";

const ROOT = resolve(import.meta.dir, "..");
const DATA_DIR = resolve(ROOT, "data");
const ENTRIES_DIR = resolve(ROOT, "entries");

const DOWNLOADS = [
  {
    name: "English Wiktionary",
    file: "raw-wiktextract-data.jsonl.gz",
    url: "https://kaikki.org/dictionary/raw-wiktextract-data.jsonl.gz",
    size: "~2.4 GB",
  },
  {
    name: "Russian Wiktionary",
    file: "ru-extract.jsonl.gz",
    url: "https://kaikki.org/dictionary/downloads/ru/ru-extract.jsonl.gz",
    size: "~265 MB",
  },
  {
    name: "Kyrgyz extract",
    file: "kaikki-kyrgyz.jsonl",
    url: "https://kaikki.org/dictionary/Kyrgyz/kaikki.org-dictionary-Kyrgyz.jsonl",
    size: "~25 MB",
  },
  {
    name: "GoURMET ky-ru parallel corpus",
    file: "gourmet-ky-ru.zip",
    url: "https://object.pouta.csc.fi/OPUS-GoURMET/v1/moses/ky-ru.txt.zip",
    size: "~2 MB",
  },
  {
    name: "Manas-UdS Kyrgyz Corpus",
    file: "manas-uds.zip",
    url: "https://fedora.clarin-d.uni-saarland.de/kyrgyz/kyrgyz_2022_10_03.zip",
    size: "~12 MB",
  },
];

const EXTRACTION_SCRIPTS = [
  { name: "EN Wiktionary", script: "pipeline/extract-en-wiktionary.ts" },
  { name: "RU Wiktionary", script: "pipeline/extract-ru-wiktionary.ts" },
  { name: "Kyrgyz enrichment", script: "pipeline/extract-ky-wiktionary.ts" },
  { name: "Apertium", script: "pipeline/extract-apertium.ts" },
  { name: "GoURMET examples", script: "pipeline/extract-gourmet.ts" },
  { name: "OpenRussian", script: "pipeline/extract-openrussian.ts" },
  { name: "Manas-UdS frequency", script: "pipeline/extract-manas.ts" },
  { name: "EN-KY Wiktionary", script: "pipeline/extract-en-ky-wiktionary.ts" },
];

// --- Helpers ---

function parseArgs(): { skipDownload: boolean; mergeOnly: boolean } {
  const args = new Set(process.argv.slice(2));
  return {
    skipDownload: args.has("--skip-download") || args.has("--merge-only"),
    mergeOnly: args.has("--merge-only"),
  };
}

async function runScript(script: string): Promise<void> {
  const proc = Bun.spawn(["bun", "run", resolve(ROOT, script)], {
    cwd: ROOT,
    stdout: "inherit",
    stderr: "inherit",
  });
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`${script} exited with code ${code}`);
  }
}

async function download(file: string, url: string): Promise<void> {
  const dest = resolve(DATA_DIR, file);
  const proc = Bun.spawn(
    ["curl", "-L", "--retry", "3", "-o", dest, url],
    { cwd: ROOT, stdout: "inherit", stderr: "inherit" }
  );
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`Failed to download ${file}`);
  }
}

/** Load all entries from entries/*.json, keyed by id */
function loadEntries(): Map<string, DictionaryEntry> {
  const map = new Map<string, DictionaryEntry>();
  if (!existsSync(ENTRIES_DIR)) return map;

  for (const file of readdirSync(ENTRIES_DIR)) {
    if (!file.endsWith(".json")) continue;
    const entries: DictionaryEntry[] = JSON.parse(
      require("fs").readFileSync(resolve(ENTRIES_DIR, file), "utf-8")
    );
    for (const entry of entries) {
      map.set(entry.id, entry);
    }
  }
  return map;
}

/** Collect manual entries from existing entries/*.json */
function collectManualEntries(): DictionaryEntry[] {
  const manual: DictionaryEntry[] = [];
  if (!existsSync(ENTRIES_DIR)) return manual;

  for (const file of readdirSync(ENTRIES_DIR)) {
    if (!file.endsWith(".json")) continue;
    const entries: DictionaryEntry[] = JSON.parse(
      require("fs").readFileSync(resolve(ENTRIES_DIR, file), "utf-8")
    );
    for (const entry of entries) {
      if (entry.source === "manual") {
        manual.push(entry);
      }
    }
  }
  return manual;
}

/** Inject manual entries back into entries/*.json after merge */
async function injectManualEntries(manualEntries: DictionaryEntry[]): Promise<number> {
  if (manualEntries.length === 0) return 0;

  // Group manual entries by first letter
  const byLetter = new Map<string, DictionaryEntry[]>();
  for (const entry of manualEntries) {
    const letter = entry.ru.charAt(0).toLowerCase();
    let arr = byLetter.get(letter);
    if (!arr) {
      arr = [];
      byLetter.set(letter, arr);
    }
    arr.push(entry);
  }

  let injected = 0;

  for (const [letter, manual] of byLetter) {
    const filePath = resolve(ENTRIES_DIR, `${letter}.json`);
    let existing: DictionaryEntry[] = [];
    if (existsSync(filePath)) {
      existing = JSON.parse(require("fs").readFileSync(filePath, "utf-8"));
    }

    // Build set of existing ru|ky keys to avoid duplicates
    const existingKeys = new Set(existing.map((e) => `${e.ru}|${e.ky}`));

    for (const entry of manual) {
      const key = `${entry.ru}|${entry.ky}`;
      if (!existingKeys.has(key)) {
        existing.push(entry);
        injected++;
      }
    }

    await Bun.write(filePath, JSON.stringify(existing, null, 2) + "\n");
  }

  return injected;
}

// --- Main ---

async function main() {
  const { skipDownload, mergeOnly } = parseArgs();
  const startTime = Date.now();

  console.log("=== Dictionary Update ===\n");

  // Snapshot current state
  const before = loadEntries();
  const manualEntries = collectManualEntries();
  console.log(`Current state: ${before.size} entries (${manualEntries.length} manual)\n`);

  // Step 1: Download
  if (!skipDownload) {
    console.log("--- Step 1: Download fresh data ---\n");
    await mkdir(DATA_DIR, { recursive: true });

    for (const dl of DOWNLOADS) {
      console.log(`Downloading ${dl.name} (${dl.size})...`);
      await download(dl.file, dl.url);
      console.log();
    }

    // Unzip GoURMET
    console.log("Unpacking GoURMET...");
    await mkdir(resolve(DATA_DIR, "gourmet-ky-ru"), { recursive: true });
    const unzipGourmet = Bun.spawn(
      ["unzip", "-o", resolve(DATA_DIR, "gourmet-ky-ru.zip"), "-d", resolve(DATA_DIR, "gourmet-ky-ru")],
      { stdout: "inherit", stderr: "inherit" }
    );
    await unzipGourmet.exited;

    // Unzip Manas-UdS
    console.log("Unpacking Manas-UdS...");
    await mkdir(resolve(DATA_DIR, "manas-uds"), { recursive: true });
    const unzipManas = Bun.spawn(
      ["unzip", "-o", resolve(DATA_DIR, "manas-uds.zip"), "-d", resolve(DATA_DIR, "manas-uds")],
      { stdout: "inherit", stderr: "inherit" }
    );
    await unzipManas.exited;

    // Clone OpenRussian.org dataset
    const openrussianDir = resolve(DATA_DIR, "openrussian");
    if (existsSync(openrussianDir)) {
      console.log("Updating OpenRussian...");
      const proc = Bun.spawn(["git", "pull"], {
        cwd: openrussianDir,
        stdout: "inherit",
        stderr: "inherit",
      });
      await proc.exited;
    } else {
      console.log("Cloning OpenRussian...");
      const proc = Bun.spawn(
        ["git", "clone", "--depth", "1", "https://github.com/Badestrand/russian-dictionary.git", openrussianDir],
        { stdout: "inherit", stderr: "inherit" }
      );
      await proc.exited;
    }

    // Update Apertium
    const apertiumDir = resolve(DATA_DIR, "apertium-kir");
    if (existsSync(apertiumDir)) {
      console.log("Updating Apertium-kir...");
      const proc = Bun.spawn(["git", "pull"], {
        cwd: apertiumDir,
        stdout: "inherit",
        stderr: "inherit",
      });
      await proc.exited;
    } else {
      console.log("Cloning Apertium-kir...");
      const proc = Bun.spawn(
        ["git", "clone", "--depth", "1", "https://github.com/apertium/apertium-kir.git", apertiumDir],
        { stdout: "inherit", stderr: "inherit" }
      );
      await proc.exited;
    }
    console.log();
  } else {
    console.log("--- Skipping download (using existing data) ---\n");
  }

  // Step 2: Extract
  if (!mergeOnly) {
    console.log("--- Step 2: Extract from sources ---\n");
    for (const { name, script } of EXTRACTION_SCRIPTS) {
      console.log(`\n>> Extracting: ${name}`);
      await runScript(script);
    }
    console.log();
  } else {
    console.log("--- Skipping extraction (merge-only mode) ---\n");
  }

  // Step 3: Merge
  console.log("--- Step 3: Merge ---\n");
  await runScript("pipeline/merge.ts");

  // Step 4: Re-inject manual entries
  if (manualEntries.length > 0) {
    console.log(`\n--- Step 4: Preserving ${manualEntries.length} manual entries ---`);
    const injected = await injectManualEntries(manualEntries);
    console.log(`  Injected: ${injected} (${manualEntries.length - injected} already present)`);
  }

  // Step 5: Enrich
  console.log("\n--- Step 5: Enrich ---\n");
  await runScript("pipeline/enrich.ts");

  // Step 6: Diff report
  console.log("\n--- Update Report ---\n");
  const after = loadEntries();

  let added = 0;
  let removed = 0;
  let updated = 0;

  for (const [id, entry] of after) {
    const old = before.get(id);
    if (!old) {
      added++;
    } else if (JSON.stringify(old) !== JSON.stringify(entry)) {
      updated++;
    }
  }
  for (const id of before.keys()) {
    if (!after.has(id)) {
      removed++;
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  console.log(`Before: ${before.size} entries`);
  console.log(`After:  ${after.size} entries`);
  console.log(`  Added:   +${added}`);
  console.log(`  Removed: -${removed}`);
  console.log(`  Updated: ~${updated}`);
  console.log(`  Manual:  ${manualEntries.length} (preserved)`);
  console.log(`\nCompleted in ${elapsed} min`);
}

main().catch((err) => {
  console.error("\nUpdate failed:", err);
  process.exit(1);
});
