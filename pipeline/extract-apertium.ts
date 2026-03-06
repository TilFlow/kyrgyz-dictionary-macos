/**
 * Extract Kyrgyz lemmas from the Apertium LEXC lexicon.
 *
 * Reads: data/apertium-kir/apertium-kir.kir.lexc
 * Writes: data/apertium-lemmas.json
 */

import { parseLexc } from "./lexc-parser";

const LEXC_PATH = "data/apertium-kir/apertium-kir.kir.lexc";
const OUTPUT_PATH = "data/apertium-lemmas.json";

const content = await Bun.file(LEXC_PATH).text();
const entries = parseLexc(content);

// Write output
await Bun.write(OUTPUT_PATH, JSON.stringify(entries, null, 2) + "\n");

// Print stats
const byPos = new Map<string, number>();
for (const { pos } of entries) {
  byPos.set(pos, (byPos.get(pos) ?? 0) + 1);
}

console.log(`Total lemmas: ${entries.length}`);
console.log("By POS:");
for (const [pos, count] of [...byPos.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${pos}: ${count}`);
}
console.log(`\nWritten to ${OUTPUT_PATH}`);
