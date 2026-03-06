/**
 * Extract Russian-Kyrgyz translation pairs from Russian Wiktionary dump.
 *
 * Streams data/ru-extract.jsonl.gz line by line, finds Kyrgyz translations,
 * and writes deduplicated pairs to data/ru-wiktionary-pairs.json.
 */

import { createReadStream } from "fs";
import { createInterface } from "readline";
import { createGunzip } from "zlib";
import { writeFile } from "fs/promises";
import { resolve } from "path";

import { normalizeRussian, mapWiktionaryPos } from "./wiktionary-utils.ts";

interface RuWiktionaryTranslation {
  word?: string;
  lang_code?: string;
  lang?: string;
  code?: string;
  sense?: string;
}

interface RuWiktionaryEntry {
  word?: string;
  title?: string;
  pos?: string;
  translations?: RuWiktionaryTranslation[];
}

export interface RuKyPair {
  ru: string;
  ky: string;
  pos: string | null;
  sense: string | null;
}

const ROOT = resolve(import.meta.dir, "..");
const INPUT = resolve(ROOT, "data/ru-extract.jsonl.gz");
const OUTPUT = resolve(ROOT, "data/ru-wiktionary-pairs.json");

function isKyrgyz(t: RuWiktionaryTranslation): boolean {
  if (t.lang_code === "ky" || t.code === "ky") return true;
  const lang = t.lang ?? "";
  return lang.includes("Киргизский") || lang.includes("Кыргызский");
}

async function main() {
  console.log("Extracting ru-ky pairs from Russian Wiktionary...");
  console.log(`Input: ${INPUT}`);

  const gunzip = createGunzip();
  const stream = createReadStream(INPUT).pipe(gunzip);
  const rl = createInterface({ input: stream, crlfDelay: Infinity });

  const seen = new Set<string>();
  const pairs: RuKyPair[] = [];
  let lineCount = 0;
  let skippedLines = 0;

  for await (const line of rl) {
    lineCount++;
    if (lineCount % 100_000 === 0) {
      console.log(`  ...processed ${lineCount.toLocaleString()} lines, ${pairs.length.toLocaleString()} pairs found`);
    }

    let entry: RuWiktionaryEntry;
    try {
      entry = JSON.parse(line);
    } catch {
      skippedLines++;
      continue;
    }

    const translations = entry.translations;
    if (!translations || !Array.isArray(translations)) continue;

    const headword = entry.word ?? entry.title;
    if (!headword) continue;

    const ru = normalizeRussian(headword);
    const pos = mapWiktionaryPos(entry.pos ?? "");

    for (const t of translations) {
      if (!isKyrgyz(t)) continue;
      const kyWord = t.word?.trim();
      if (!kyWord) continue;

      const key = `${ru}\t${kyWord}`;
      if (seen.has(key)) continue;
      seen.add(key);

      pairs.push({
        ru,
        ky: kyWord,
        pos,
        sense: t.sense?.trim() || null,
      });
    }
  }

  console.log(`\nDone. Processed ${lineCount.toLocaleString()} lines (${skippedLines} unparseable).`);
  console.log(`Found ${pairs.length.toLocaleString()} unique ru-ky pairs.`);

  await writeFile(OUTPUT, JSON.stringify(pairs, null, 2), "utf-8");
  console.log(`Written to ${OUTPUT}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
