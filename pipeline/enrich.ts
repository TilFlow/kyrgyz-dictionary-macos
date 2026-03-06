#!/usr/bin/env bun
/**
 * Enrich all entries with morphological data.
 *
 * For each noun entry without morphology, applies enrichEntry() from
 * src/morphology.ts to generate case forms, plural forms, and rules.
 *
 * Also sets wiktionaryUrl for entries missing it.
 *
 * Reads/Writes: entries/*.json
 */

import { resolve } from "path";
import { readdirSync } from "fs";
import { enrichEntry } from "../src/morphology";
import type { DictionaryEntry } from "../src/schema";

const ROOT = resolve(import.meta.dir, "..");
const ENTRIES_DIR = resolve(ROOT, "entries");

async function main() {
  // Find all entry files
  const files = readdirSync(ENTRIES_DIR).filter((f) => f.endsWith(".json"));

  if (files.length === 0) {
    console.log("No entry files found in entries/. Nothing to enrich.");
    return;
  }

  let totalEntries = 0;
  let nounsEnriched = 0;
  let nonNounSkipped = 0;
  let alreadyHadMorphology = 0;
  let wiktionaryUrlsAdded = 0;

  for (const file of files) {
    const filePath = resolve(ENTRIES_DIR, file);
    const entries: DictionaryEntry[] = await Bun.file(filePath).json();

    let modified = false;

    for (let i = 0; i < entries.length; i++) {
      totalEntries++;
      const entry = entries[i];

      // Enrich morphology for nouns (always regenerate to pick up morphology fixes)
      if (entry.pos !== "noun") {
        nonNounSkipped++;
      } else {
        entries[i] = enrichEntry(entry);
        nounsEnriched++;
        modified = true;
      }

      // Add wiktionaryUrl if missing
      if (!entries[i].wiktionaryUrl) {
        entries[i].wiktionaryUrl = `https://en.wiktionary.org/wiki/${encodeURIComponent(entries[i].ky)}`;
        wiktionaryUrlsAdded++;
        modified = true;
      }
    }

    if (modified) {
      await Bun.write(filePath, JSON.stringify(entries, null, 2) + "\n");
    }
  }

  console.log("\n=== Enrichment Stats ===");
  console.log(`Total entries processed: ${totalEntries}`);
  console.log(`Nouns enriched with morphology: ${nounsEnriched}`);
  console.log(`Non-noun entries skipped: ${nonNounSkipped}`);
  console.log(`Entries already had morphology: ${alreadyHadMorphology}`);
  console.log(`Wiktionary URLs added: ${wiktionaryUrlsAdded}`);
  console.log(`Entry files processed: ${files.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
