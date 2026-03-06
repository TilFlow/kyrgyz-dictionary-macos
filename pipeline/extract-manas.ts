#!/usr/bin/env bun
/**
 * Extract lemma frequency data from the Manas-UdS Kyrgyz Corpus (VRT format).
 *
 * Input:  data/manas-uds/kyrgyz_2022_10_03.vrt
 * Output: data/manas-frequency.json
 *
 * The VRT file contains ~2.5M POS-tagged tokens across 1,019 texts.
 * We stream it line by line, aggregate (lemma, pos) pair counts, and output
 * a frequency list sorted descending by count.
 */

import { resolve } from "path";
import { createReadStream } from "fs";
import { createInterface } from "readline";

const ROOT = resolve(import.meta.dir, "..");
const INPUT = resolve(ROOT, "data/manas-uds/kyrgyz_2022_10_03.vrt");
const OUTPUT = resolve(ROOT, "data/manas-frequency.json");

interface FrequencyEntry {
  lemma: string;
  pos: string;
  count: number;
}

/** Punctuation POS tags to skip. */
const PUNCT_TAGS = new Set(["sent", "cm", "lpar", "rpar", "lquot", "rquot", "guio"]);

/** Map an Apertium POS tag to a simplified POS string. */
function simplifyPos(tag: string): string {
  if (tag.startsWith("n_") || tag === "n") return "noun";
  if (tag.startsWith("np_") || tag === "np") return "noun";
  if (tag.startsWith("v_") || tag === "v") return "verb";
  if (tag.startsWith("adj")) return "adj";
  if (tag.startsWith("adv")) return "adv";
  if (tag.startsWith("num")) return "num";
  if (tag.startsWith("prn_") || tag === "prn") return "pron";
  if (tag.startsWith("post")) return "post";
  if (tag === "cnjcoo" || tag === "cnjsub" || tag === "cnjadv") return "conj";
  if (tag === "ij") return "intj";
  return "other";
}

/** Clean a lemma: strip possessive ` э` suffix, lowercase. */
function cleanLemma(raw: string): string {
  const spaceIdx = raw.indexOf(" ");
  const lemma = spaceIdx !== -1 ? raw.slice(0, spaceIdx) : raw;
  return lemma.toLowerCase();
}

async function main() {
  console.log(`Reading: ${INPUT}`);
  console.log(`Output:  ${OUTPUT}`);

  const counts = new Map<string, number>();
  let totalTokens = 0;
  let skippedPunct = 0;
  let skippedUnknown = 0;
  let skippedTags = 0;

  const rl = createInterface({
    input: createReadStream(INPUT, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    // Skip XML-like tags
    if (line.startsWith("<")) {
      skippedTags++;
      continue;
    }

    const parts = line.split("\t");
    if (parts.length < 3) continue;

    const [, rawLemma, posTag] = parts;
    totalTokens++;

    // Skip punctuation
    if (PUNCT_TAGS.has(posTag)) {
      skippedPunct++;
      continue;
    }

    // Skip unknown words (lemma starts with *)
    if (rawLemma.startsWith("*")) {
      skippedUnknown++;
      continue;
    }

    const lemma = cleanLemma(rawLemma);
    if (!lemma) continue;

    const pos = simplifyPos(posTag);
    const key = `${lemma}\t${pos}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  // Build frequency entries, filter count >= 2
  const entries: FrequencyEntry[] = [];
  for (const [key, count] of counts) {
    if (count < 2) continue;
    const [lemma, pos] = key.split("\t");
    entries.push({ lemma, pos, count });
  }

  // Sort by count descending
  entries.sort((a, b) => b.count - a.count);

  // Collect unique lemmas
  const uniqueLemmas = new Set<string>();
  for (const [key] of counts) {
    uniqueLemmas.add(key.split("\t")[0]);
  }

  // Print stats
  console.log();
  console.log(`Total tokens:       ${totalTokens.toLocaleString()}`);
  console.log(`  Punctuation:      ${skippedPunct.toLocaleString()}`);
  console.log(`  Unknown (*):      ${skippedUnknown.toLocaleString()}`);
  console.log(`  XML tags:         ${skippedTags.toLocaleString()}`);
  console.log(`Unique lemmas:      ${uniqueLemmas.size.toLocaleString()}`);
  console.log(`Entries (count>=2): ${entries.length.toLocaleString()}`);
  console.log(`Singletons dropped: ${(counts.size - entries.length).toLocaleString()}`);

  console.log();
  console.log("Top 20 by frequency:");
  for (const entry of entries.slice(0, 20)) {
    console.log(`  ${entry.count.toLocaleString().padStart(8)}  ${entry.pos.padEnd(6)} ${entry.lemma}`);
  }

  // Write output
  await Bun.write(OUTPUT, JSON.stringify(entries, null, 2) + "\n");
  console.log(`\nWritten ${entries.length.toLocaleString()} entries to ${OUTPUT}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
