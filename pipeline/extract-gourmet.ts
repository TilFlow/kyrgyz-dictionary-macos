#!/usr/bin/env bun
/**
 * Extract Russian-Kyrgyz parallel sentence pairs from the GoURMET corpus.
 *
 * Input:  data/gourmet-ky-ru/GoURMET.ky-ru.ky  (Kyrgyz sentences, one per line)
 *         data/gourmet-ky-ru/GoURMET.ky-ru.ru  (Russian sentences, one per line)
 * Output: data/gourmet-examples.json
 *
 * The two files are line-aligned: line N in .ky corresponds to line N in .ru.
 */

import { resolve } from "path";

const ROOT = resolve(import.meta.dir, "..");
const KY_PATH = resolve(ROOT, "data/gourmet-ky-ru/GoURMET.ky-ru.ky");
const RU_PATH = resolve(ROOT, "data/gourmet-ky-ru/GoURMET.ky-ru.ru");
const OUTPUT = resolve(ROOT, "data/gourmet-examples.json");

const MIN_WORDS = 3;
const MAX_CHARS = 200;

interface GoURMETExample {
  ky: string;
  ru: string;
}

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function wordCount(s: string): number {
  return s.split(/\s+/).length;
}

async function main() {
  console.log(`Reading: ${KY_PATH}`);
  console.log(`         ${RU_PATH}`);
  console.log(`Output:  ${OUTPUT}`);

  const kyText = await Bun.file(KY_PATH).text();
  const ruText = await Bun.file(RU_PATH).text();

  const kyLines = kyText.split("\n");
  const ruLines = ruText.split("\n");

  // Remove trailing empty line from split if present
  if (kyLines.at(-1) === "") kyLines.pop();
  if (ruLines.at(-1) === "") ruLines.pop();

  const totalLines = Math.max(kyLines.length, ruLines.length);

  if (kyLines.length !== ruLines.length) {
    console.warn(
      `Warning: line count mismatch — ky: ${kyLines.length}, ru: ${ruLines.length}. ` +
      `Using min(${Math.min(kyLines.length, ruLines.length)}) lines.`
    );
  }

  const lineCount = Math.min(kyLines.length, ruLines.length);

  let emptySkipped = 0;
  let tooShortSkipped = 0;
  let tooLongSkipped = 0;
  let duplicateSkipped = 0;

  const seen = new Set<string>();
  const examples: GoURMETExample[] = [];

  for (let i = 0; i < lineCount; i++) {
    const ky = normalizeWhitespace(kyLines[i]);
    const ru = normalizeWhitespace(ruLines[i]);

    // Skip empty lines
    if (!ky || !ru) {
      emptySkipped++;
      continue;
    }

    // Skip very short sentences
    if (wordCount(ky) < MIN_WORDS || wordCount(ru) < MIN_WORDS) {
      tooShortSkipped++;
      continue;
    }

    // Skip very long sentences
    if (ky.length > MAX_CHARS || ru.length > MAX_CHARS) {
      tooLongSkipped++;
      continue;
    }

    // Deduplicate by Kyrgyz text
    if (seen.has(ky)) {
      duplicateSkipped++;
      continue;
    }
    seen.add(ky);

    examples.push({ ky, ru });
  }

  const totalFiltered = emptySkipped + tooShortSkipped + tooLongSkipped + duplicateSkipped;

  console.log();
  console.log(`Total lines:      ${totalLines.toLocaleString()}`);
  console.log(`Valid pairs:      ${examples.length.toLocaleString()}`);
  console.log(`Filtered out:     ${totalFiltered.toLocaleString()}`);
  console.log(`  Empty:          ${emptySkipped.toLocaleString()}`);
  console.log(`  Too short (<${MIN_WORDS} words): ${tooShortSkipped.toLocaleString()}`);
  console.log(`  Too long (>${MAX_CHARS} chars):  ${tooLongSkipped.toLocaleString()}`);
  console.log(`  Duplicates:     ${duplicateSkipped.toLocaleString()}`);

  await Bun.write(OUTPUT, JSON.stringify(examples, null, 2) + "\n");
  console.log(`\nWritten to ${OUTPUT}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
