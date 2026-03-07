#!/usr/bin/env bun
/**
 * Extract Russian-Kyrgyz translation pairs from the English Wiktionary
 * kaikki.org JSONL dump.
 *
 * Input:  data/raw-wiktextract-data.jsonl.gz (~2.3GB compressed, ~20GB uncompressed)
 * Output: data/en-wiktionary-pairs.json
 *
 * Streams the file line-by-line to avoid loading into memory.
 */

import { createReadStream } from "fs";
import { createInterface } from "readline";
import { createGunzip } from "zlib";
import { writeFileSync } from "fs";
import { resolve } from "path";
import { extractRuKyPairs, normalizeRussian, type RuKyPair } from "./wiktionary-utils";

const ROOT = resolve(import.meta.dir, "..");
const INPUT = resolve(ROOT, "data/raw-wiktextract-data.jsonl.gz");
const OUTPUT = resolve(ROOT, "data/en-wiktionary-pairs.json");

interface OutputPair {
  ru: string;
  ky: string;
  sense: string;
  pos: string | null;
  ruTags?: string[];
  kyTags?: string[];
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

    if (!entry.translations) continue;

    const extracted = extractRuKyPairs(entry);
    for (const pair of extracted) {
      const normRu = normalizeRussian(pair.ru);
      const normKy = normalizeRussian(pair.ky); // also normalize Kyrgyz for consistency
      const key = `${normRu}\t${normKy}`;

      if (!seen.has(key)) {
        seen.add(key);
        const out: OutputPair = {
          ru: normRu,
          ky: normKy,
          sense: pair.sense,
          pos: pair.pos,
        };
        if (pair.ruTags) out.ruTags = pair.ruTags;
        if (pair.kyTags) out.kyTags = pair.kyTags;
        pairs.push(out);
      }
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
