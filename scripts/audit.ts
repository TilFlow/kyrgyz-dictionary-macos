import { Glob } from "bun";
import { readdir, exists } from "node:fs/promises";
import { join } from "node:path";
import { DictionaryEntrySchema, type DictionaryEntry } from "../src/schema";
import { buildFormSet } from "../src/forms";

const ROOT = import.meta.dir.replace(/\/scripts$/, "");
const ENTRIES_DIR = join(ROOT, "entries");
const TEXTS_DIR = join(ROOT, "texts");
const STOPWORDS_PATH = join(TEXTS_DIR, "stopwords.txt");

// ── Load dictionary entries ────────────────────────────────────────

async function loadEntries(): Promise<DictionaryEntry[]> {
  const allEntries: DictionaryEntry[] = [];
  const glob = new Glob("*.json");
  const files: string[] = [];
  for await (const file of glob.scan(ENTRIES_DIR)) {
    files.push(file);
  }
  files.sort();

  for (const file of files) {
    const path = join(ENTRIES_DIR, file);
    const raw = await Bun.file(path).json();
    if (!Array.isArray(raw)) continue;
    for (const item of raw) {
      const result = DictionaryEntrySchema.safeParse(item);
      if (result.success) allEntries.push(result.data);
    }
  }

  return allEntries;
}

// ── Load stopwords ─────────────────────────────────────────────────

async function loadStopwords(): Promise<Set<string>> {
  const stopwords = new Set<string>();
  try {
    const content = await Bun.file(STOPWORDS_PATH).text();
    for (const line of content.split("\n")) {
      const trimmed = line.trim().toLowerCase();
      if (trimmed && !trimmed.startsWith("#")) {
        stopwords.add(trimmed);
      }
    }
  } catch {
    // No stopwords file — that's fine
  }
  return stopwords;
}

// ── Tokenize & filter ──────────────────────────────────────────────

const CYRILLIC_WORD = /[а-яёөүңА-ЯЁӨҮҢ]+/g;

function tokenize(text: string): string[] {
  return (text.match(CYRILLIC_WORD) ?? []).map((w) => w.toLowerCase());
}

function isNoise(word: string): boolean {
  if (word.length < 2) return true;
  if (/^[a-zA-Z]+$/.test(word)) return true;
  if (/^\d+$/.test(word)) return true;
  return false;
}

// ── Reporting ──────────────────────────────────────────────────────

interface MissingWord {
  word: string;
  count: number;
  files: string[];
  contexts: string[];
}

function extractContext(text: string, word: string): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(word);
  if (idx === -1) return "";
  const start = Math.max(0, idx - 30);
  const end = Math.min(text.length, idx + word.length + 30);
  let ctx = text.slice(start, end).replace(/\n/g, " ").trim();
  if (start > 0) ctx = "..." + ctx;
  if (end < text.length) ctx = ctx + "...";
  return ctx;
}

function printReport(missing: MissingWord[], totalWords: number, uniqueWords: number, knownCount: number): void {
  console.log("=".repeat(60));
  console.log("  Audit Report");
  console.log("=".repeat(60));
  console.log();
  console.log(`  Total word tokens:      ${totalWords}`);
  console.log(`  Unique words:           ${uniqueWords}`);
  console.log(`  Known (in dictionary):  ${knownCount}`);
  console.log(`  Missing:                ${missing.length}`);
  const coverage = uniqueWords > 0 ? ((knownCount / uniqueWords) * 100).toFixed(1) : "0.0";
  console.log(`  Coverage:               ${coverage}%`);
  console.log();

  if (missing.length === 0) {
    console.log("  All words are covered!");
    return;
  }

  console.log("Missing words (sorted by frequency):");
  console.log("-".repeat(60));

  const maxWord = Math.max(...missing.map((m) => m.word.length), 4);

  for (const m of missing) {
    console.log(`  ${m.word.padEnd(maxWord)}  x${String(m.count).padStart(3)}  [${m.files.join(", ")}]`);
    if (m.contexts.length > 0) {
      console.log(`  ${"".padEnd(maxWord)}       ${m.contexts[0]}`);
    }
  }
}

function printJsonReport(missing: MissingWord[], totalWords: number, uniqueWords: number, knownCount: number): void {
  const report = {
    summary: {
      totalWords,
      uniqueWords,
      knownCount,
      missingCount: missing.length,
      coverage: uniqueWords > 0 ? +(knownCount / uniqueWords * 100).toFixed(1) : 0,
    },
    missing,
  };
  console.log(JSON.stringify(report, null, 2));
}

// ── Main ───────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const jsonMode = process.argv.includes("--json");

  if (!(await exists(TEXTS_DIR))) {
    console.error("Error: texts/ directory not found. Create it and add .txt files.");
    process.exit(1);
  }

  const allFiles = await readdir(TEXTS_DIR);
  const textFiles = allFiles.filter((f) => f.endsWith(".txt") && f !== "stopwords.txt");

  if (textFiles.length === 0) {
    console.error("Error: No .txt files found in texts/. Add Kyrgyz text files to audit.");
    process.exit(1);
  }

  if (!jsonMode) {
    console.log("Loading dictionary...");
  }

  const entries = await loadEntries();
  const formSet = buildFormSet(entries);

  if (!jsonMode) {
    console.log(`  ${entries.length} entries -> ${formSet.size} word forms`);
    console.log("Loading stopwords...");
  }

  const stopwords = await loadStopwords();

  if (!jsonMode) {
    console.log(`  ${stopwords.size} stopwords loaded`);
    console.log(`Analyzing ${textFiles.length} text file(s)...\n`);
  }

  const wordCounts = new Map<string, number>();
  const wordFiles = new Map<string, Set<string>>();
  const wordContexts = new Map<string, string>();
  const fileTexts = new Map<string, string>();
  let totalTokens = 0;

  for (const file of textFiles.sort()) {
    const content = await Bun.file(join(TEXTS_DIR, file)).text();
    fileTexts.set(file, content);
    const tokens = tokenize(content);
    totalTokens += tokens.length;

    for (const token of tokens) {
      if (isNoise(token) || stopwords.has(token)) continue;
      wordCounts.set(token, (wordCounts.get(token) ?? 0) + 1);
      if (!wordFiles.has(token)) wordFiles.set(token, new Set());
      wordFiles.get(token)!.add(file);
    }
  }

  const uniqueWords = wordCounts.size;
  let knownCount = 0;
  const missing: MissingWord[] = [];

  for (const [word, count] of wordCounts) {
    if (formSet.has(word)) {
      knownCount++;
    } else {
      const files = [...(wordFiles.get(word) ?? [])];
      const contexts: string[] = [];
      for (const f of files) {
        const text = fileTexts.get(f);
        if (text) {
          const ctx = extractContext(text, word);
          if (ctx) {
            contexts.push(ctx);
            break;
          }
        }
      }
      missing.push({ word, count, files, contexts });
    }
  }

  missing.sort((a, b) => b.count - a.count);

  if (jsonMode) {
    printJsonReport(missing, totalTokens, uniqueWords, knownCount);
  } else {
    printReport(missing, totalTokens, uniqueWords, knownCount);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
