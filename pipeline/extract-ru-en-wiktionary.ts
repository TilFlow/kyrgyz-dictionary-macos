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
import { normalizeRussian, mapWiktionaryPos } from "./wiktionary-utils";

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
