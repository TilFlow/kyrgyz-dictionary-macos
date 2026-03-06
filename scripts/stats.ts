import { readdir } from "node:fs/promises";
import { join } from "node:path";
import type { DictionaryEntry } from "../src/schema";

const ENTRIES_DIR = join(import.meta.dirname, "..", "entries");

const RUSSIAN_ALPHABET = "абвгдеёжзийклмнопрстуфхцчшщъыьэюя";

function padLabel(label: string, width: number): string {
  return label.padEnd(width);
}

function printSection(title: string, data: Record<string, number>, total: number) {
  console.log(`\n${title}`);
  console.log("-".repeat(40));

  const maxKey = Math.max(...Object.keys(data).map((k) => k.length), 10);

  const sorted = Object.entries(data).sort(([, a], [, b]) => b - a);
  for (const [key, count] of sorted) {
    const pct = ((count / total) * 100).toFixed(1);
    console.log(`  ${padLabel(key, maxKey)}  ${String(count).padStart(6)}  (${pct.padStart(5)}%)`);
  }
}

async function main() {
  const files = (await readdir(ENTRIES_DIR)).filter((f) => f.endsWith(".json"));

  if (files.length === 0) {
    console.log("No entry files found in entries/");
    process.exit(0);
  }

  const allEntries: DictionaryEntry[] = [];

  for (const file of files.sort()) {
    const filePath = join(ENTRIES_DIR, file);
    const data = await Bun.file(filePath).json();
    if (Array.isArray(data)) {
      allEntries.push(...data);
    }
  }

  const total = allEntries.length;

  // Header
  console.log("=".repeat(40));
  console.log("  Dictionary Statistics");
  console.log("=".repeat(40));
  console.log(`\n  Total entries:  ${total}`);
  console.log(`  Entry files:    ${files.length}`);

  // By source
  const bySource: Record<string, number> = {};
  for (const e of allEntries) {
    bySource[e.source] = (bySource[e.source] ?? 0) + 1;
  }
  printSection("Entries by source", bySource, total);

  // By POS
  const byPos: Record<string, number> = {};
  for (const e of allEntries) {
    byPos[e.pos] = (byPos[e.pos] ?? 0) + 1;
  }
  printSection("Entries by POS", byPos, total);

  // Field coverage
  let withMorphology = 0;
  let withExamples = 0;
  let withEtymology = 0;

  for (const e of allEntries) {
    if (e.morphology) withMorphology++;
    if (e.examples && e.examples.length > 0) withExamples++;
    if (e.etymology) withEtymology++;
  }

  console.log("\nField coverage");
  console.log("-".repeat(40));
  const fieldWidth = 22;
  const countWidth = 6;

  for (const [label, count] of [
    ["with morphology", withMorphology],
    ["without morphology", total - withMorphology],
    ["with examples", withExamples],
    ["without examples", total - withExamples],
    ["with etymology", withEtymology],
    ["without etymology", total - withEtymology],
  ] as [string, number][]) {
    const pct = ((count / total) * 100).toFixed(1);
    console.log(
      `  ${padLabel(label, fieldWidth)}  ${String(count).padStart(countWidth)}  (${pct.padStart(5)}%)`,
    );
  }

  // Alphabet coverage
  const presentLetters = new Set<string>();
  for (const e of allEntries) {
    const first = e.ru.charAt(0).toLowerCase();
    presentLetters.add(first);
  }

  const missing = [...RUSSIAN_ALPHABET].filter((ch) => !presentLetters.has(ch));
  const present = [...RUSSIAN_ALPHABET].filter((ch) => presentLetters.has(ch));

  console.log("\nAlphabet coverage");
  console.log("-".repeat(40));
  console.log(`  Present (${present.length}/33):  ${present.join(" ")}`);
  console.log(`  Missing (${missing.length}/33):  ${missing.join(" ")}`);
  console.log();
}

main();
