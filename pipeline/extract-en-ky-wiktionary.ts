#!/usr/bin/env bun
/**
 * Extract English-Kyrgyz translation pairs from the English Wiktionary
 * kaikki.org JSONL dump.
 *
 * Input:  data/raw-wiktextract-data.jsonl.gz
 * Output: data/en-ky-pairs.json
 *
 * Extracts entries where the English headword has a Kyrgyz translation.
 */

import { createReadStream } from "fs";
import { createInterface } from "readline";
import { createGunzip } from "zlib";
import { writeFileSync } from "fs";
import { resolve } from "path";
import { normalizeRussian, mapWiktionaryPos } from "./wiktionary-utils";

const ROOT = resolve(import.meta.dir, "..");
const INPUT = resolve(ROOT, "data/raw-wiktextract-data.jsonl.gz");
const OUTPUT = resolve(ROOT, "data/en-ky-pairs.json");

interface OutputPair {
  en: string;
  ky: string;
  sense: string;
  pos: string | null;
}

async function main() {
  console.log(`Reading: ${INPUT}`);
  console.log(`Output:  ${OUTPUT}`);

  const seen = new Set<string>();
  const pairs: OutputPair[] = [];
  let lineCount = 0;
  let skipped = 0;

  const gunzip = createGunzip();
  const fileStream = createReadStream(INPUT);
  const rl = createInterface({
    input: fileStream.pipe(gunzip),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    lineCount++;

    if (lineCount % 500_000 === 0) {
      console.log(`  ... ${(lineCount / 1_000_000).toFixed(1)}M lines processed, ${pairs.length} pairs found`);
    }

    let entry: any;
    try {
      entry = JSON.parse(line);
    } catch {
      skipped++;
      continue;
    }

    // Only English entries with translations
    if (!entry.translations || !entry.word) continue;
    if (entry.lang_code && entry.lang_code !== "en") continue;

    const enWord = entry.word.trim();
    if (!enWord) continue;

    const pos = mapWiktionaryPos(entry.pos ?? "");

    for (const t of entry.translations) {
      if (t.code !== "ky" || !t.word) continue;

      const kyWord = t.word.trim().normalize("NFC");
      if (!kyWord) continue;

      const key = `${enWord}\t${kyWord}`;
      if (seen.has(key)) continue;
      seen.add(key);

      pairs.push({
        en: enWord,
        ky: kyWord,
        sense: t.sense?.trim() || "",
        pos,
      });
    }
  }

  console.log(`\nDone.`);
  console.log(`  Total lines:   ${lineCount.toLocaleString()}`);
  console.log(`  Parse errors:  ${skipped.toLocaleString()}`);
  console.log(`  Unique pairs:  ${pairs.length.toLocaleString()}`);

  writeFileSync(OUTPUT, JSON.stringify(pairs, null, 2));
  console.log(`Written to ${OUTPUT}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
