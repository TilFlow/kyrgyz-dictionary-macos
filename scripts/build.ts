import { Glob } from "bun";
import { readdir, mkdir, copyFile, exists } from "node:fs/promises";
import { join } from "node:path";
import { DictionaryEntrySchema, type DictionaryEntry } from "../src/schema";
import { EnKyEntrySchema, type EnKyEntry as SchemaEnKyEntry } from "../src/schema-en";
import { generateDictionary, generateEnKyDictionary, generateKyEnDictionary, type DictDirection, type EnKyEntry } from "../src/xml-generator";

const ROOT = import.meta.dir.replace(/\/scripts$/, "");
const ENTRIES_DIR = join(ROOT, "entries");
const ENTRIES_EN_DIR = join(ROOT, "entries-en");
const TEMPLATES_DIR = join(ROOT, "templates");

async function loadEntries(): Promise<DictionaryEntry[]> {
  const allEntries: DictionaryEntry[] = [];
  const errors: string[] = [];

  const glob = new Glob("*.json");
  const files: string[] = [];
  for await (const file of glob.scan(ENTRIES_DIR)) {
    files.push(file);
  }

  if (files.length === 0) {
    console.log("No entry files found in entries/. Generating empty dictionary.");
    return [];
  }

  files.sort();

  for (const file of files) {
    const path = join(ENTRIES_DIR, file);
    const raw = await Bun.file(path).json();

    if (!Array.isArray(raw)) {
      errors.push(`${file}: expected array, got ${typeof raw}`);
      continue;
    }

    for (let i = 0; i < raw.length; i++) {
      const result = DictionaryEntrySchema.safeParse(raw[i]);
      if (!result.success) {
        errors.push(
          `${file}[${i}]: ${result.error.issues.map((e) => e.message).join("; ")}`
        );
      } else {
        allEntries.push(result.data);
      }
    }
  }

  if (errors.length > 0) {
    console.error("Validation errors:");
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  return allEntries;
}

function printStats(entries: DictionaryEntry[], label: string): void {
  console.log(`\n${label} stats:`);
  console.log(`  Total entries: ${entries.length}`);

  const byPos: Record<string, number> = {};
  let withMorphology = 0;

  for (const entry of entries) {
    byPos[entry.pos] = (byPos[entry.pos] ?? 0) + 1;
    if (entry.morphology) withMorphology++;
  }

  console.log(`  By POS:`);
  for (const [pos, count] of Object.entries(byPos).sort(
    (a, b) => b[1] - a[1]
  )) {
    console.log(`    ${pos}: ${count}`);
  }
  console.log(`  With morphology: ${withMorphology}`);
}

function generateMakefile(dictName: string): string {
  return `#
# Makefile for ${dictName}
#

DICT_BUILD_TOOL_DIR = /Applications/Utilities/DictionaryDevelopmentKit/bin
DICT_BUILD_TOOL_BIN = $(DICT_BUILD_TOOL_DIR)/build_dict.sh

DICT_NAME = ${dictName}
DICT_SRC_PATH = MyDictionary.xml
CSS_PATH = dictionary.css
PLIST_PATH = Info.plist

DICT_DEV_KIT_OBJ_DIR = ./objects

all:
\t"$(DICT_BUILD_TOOL_BIN)" "$(DICT_NAME)" $(DICT_SRC_PATH) $(CSS_PATH) $(PLIST_PATH)
\techo "Done. Install the .dictionary bundle from objects/"

install: all
\tcp -r "$(DICT_DEV_KIT_OBJ_DIR)"/*.dictionary ~/Library/Dictionaries/
\techo "Installed to ~/Library/Dictionaries/"

clean:
\trm -rf "$(DICT_DEV_KIT_OBJ_DIR)"

.PHONY: all install clean
`;
}

async function buildDictionary(
  entries: DictionaryEntry[],
  direction: DictDirection,
  distDir: string
): Promise<void> {
  const label = direction === "ru-ky" ? "Русско-кыргызский" : "Кыргызско-русский";
  const dictName = direction === "ru-ky" ? "Russian-Kyrgyz Dictionary" : "Kyrgyz-Russian Dictionary";
  const plistFile = direction === "ru-ky" ? "Info.plist" : "Info-ky-ru.plist";

  console.log(`\nBuilding ${label} словарь...`);

  // Generate XML
  const xml = generateDictionary(entries, direction);

  // Ensure dist directory exists
  await mkdir(distDir, { recursive: true });

  // Write XML
  const xmlPath = join(distDir, "MyDictionary.xml");
  await Bun.write(xmlPath, xml);
  console.log(`  Wrote ${xmlPath}`);

  // Copy CSS
  const cssSrc = join(TEMPLATES_DIR, "dictionary.css");
  if (await exists(cssSrc)) {
    await copyFile(cssSrc, join(distDir, "dictionary.css"));
  }

  // Copy Info.plist (renamed to Info.plist in dist)
  const plistSrc = join(TEMPLATES_DIR, plistFile);
  if (await exists(plistSrc)) {
    await copyFile(plistSrc, join(distDir, "Info.plist"));
  } else {
    console.log(`  Warning: ${plistFile} not found in templates/`);
  }

  // Generate Makefile
  await Bun.write(join(distDir, "Makefile"), generateMakefile(dictName));

  printStats(entries, label);
}

function toXmlEnKyEntry(entry: SchemaEnKyEntry): EnKyEntry & { senses?: string[]; source: string } {
  return {
    en: entry.en,
    ky: entry.ky,
    sense: entry.senses?.join("; ") ?? "",
    pos: entry.pos,
    pronunciation: entry.pronunciation,
    etymology: entry.etymology,
    frequency: entry.frequency,
    examples: entry.examples?.map((ex) => ({ ky: ex.ky, ru: ex.en })),
    wiktionaryUrl: entry.wiktionaryUrl,
    senses: entry.senses,
    source: entry.source,
  };
}

async function loadEnKyEntries(): Promise<EnKyEntry[] | null> {
  if (!(await exists(ENTRIES_EN_DIR))) {
    console.log("  Skipping en-ky/ky-en: entries-en/ directory not found. Run sync-en-ky first.");
    return null;
  }

  const glob = new Glob("*.json");
  const files: string[] = [];
  for await (const file of glob.scan(ENTRIES_EN_DIR)) {
    files.push(file);
  }

  if (files.length === 0) {
    console.log("  Skipping en-ky/ky-en: no entry files found in entries-en/.");
    return null;
  }

  files.sort();

  const allEntries: EnKyEntry[] = [];
  const errors: string[] = [];

  for (const file of files) {
    const path = join(ENTRIES_EN_DIR, file);
    const raw = await Bun.file(path).json();

    if (!Array.isArray(raw)) {
      errors.push(`${file}: expected array, got ${typeof raw}`);
      continue;
    }

    for (let i = 0; i < raw.length; i++) {
      const result = EnKyEntrySchema.safeParse(raw[i]);
      if (!result.success) {
        errors.push(
          `${file}[${i}]: ${result.error.issues.map((e) => e.message).join("; ")}`
        );
      } else {
        allEntries.push(toXmlEnKyEntry(result.data));
      }
    }
  }

  if (errors.length > 0) {
    console.error("en-ky validation errors:");
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log(`  Loaded ${allEntries.length} en-ky entries from entries-en/`);
  return allEntries;
}

async function writeDistFiles(
  distDir: string,
  xml: string,
  plistFile: string,
  makefileLabel: string
): Promise<void> {
  await mkdir(distDir, { recursive: true });

  await Bun.write(join(distDir, "MyDictionary.xml"), xml);
  console.log(`  Wrote ${join(distDir, "MyDictionary.xml")}`);

  const cssSrc = join(TEMPLATES_DIR, "dictionary.css");
  if (await exists(cssSrc)) {
    await copyFile(cssSrc, join(distDir, "dictionary.css"));
  }

  const plistSrc = join(TEMPLATES_DIR, plistFile);
  if (await exists(plistSrc)) {
    await copyFile(plistSrc, join(distDir, "Info.plist"));
  } else {
    console.log(`  Warning: ${plistFile} not found in templates/`);
  }

  await Bun.write(join(distDir, "Makefile"), generateMakefile(makefileLabel));
}

function printEnKyStats(pairs: EnKyEntry[], label: string): void {
  console.log(`\n${label} stats:`);
  console.log(`  Total pairs: ${pairs.length}`);
  const byPos: Record<string, number> = {};
  let withPronunciation = 0;
  let withEtymology = 0;
  let withFrequency = 0;
  let withExamples = 0;
  for (const p of pairs) {
    const pos = p.pos ?? "unknown";
    byPos[pos] = (byPos[pos] ?? 0) + 1;
    if (p.pronunciation) withPronunciation++;
    if (p.etymology) withEtymology++;
    if (p.frequency != null) withFrequency++;
    if (p.examples?.length) withExamples++;
  }
  console.log(`  By POS:`);
  for (const [pos, count] of Object.entries(byPos).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${pos}: ${count}`);
  }
  console.log(`  Enrichment:`);
  console.log(`    With pronunciation: ${withPronunciation}`);
  console.log(`    With etymology: ${withEtymology}`);
  console.log(`    With frequency: ${withFrequency}`);
  console.log(`    With examples: ${withExamples}`);
}

interface MergedEntry {
  headword: string;
  pos: string[];
  translations: string[];
  senses: string[];
  examples: { ky: string; ru: string }[];
  pronunciation?: string;
  etymology?: string;
  morphology?: DictionaryEntry["morphology"];
  frequency?: number;
  sources: string[];
}

function dedupeExamples(examples: { ky: string; ru: string }[]): { ky: string; ru: string }[] {
  const seen = new Set<string>();
  return examples.filter((ex) => {
    if (seen.has(ex.ky)) return false;
    seen.add(ex.ky);
    return true;
  });
}

function mergeGroup(group: DictionaryEntry[], direction: "ru-ky" | "ky-ru"): MergedEntry {
  const primary = group[0];
  const headword = direction === "ky-ru" ? primary.ky : primary.ru;
  const translations = direction === "ky-ru"
    ? [...new Set(group.map((e) => e.ru))]
    : [...new Set(group.map((e) => e.ky))];
  const allSenses = [...new Set(group.flatMap((e) => e.senses ?? []))];
  const allExamples = dedupeExamples(group.flatMap((e) => e.examples ?? []));
  const posSet = [...new Set(group.map((e) => e.pos))];
  const sources = [...new Set(group.map((e) => e.source))];
  const etymologyEntry = group.find((e) => e.etymology);
  const freqEntry = group.find((e) => e.frequency != null);

  return {
    headword,
    pos: posSet,
    translations,
    senses: allSenses,
    examples: allExamples,
    pronunciation: primary.pronunciation,
    etymology: etymologyEntry?.etymology,
    morphology: primary.morphology,
    frequency: freqEntry?.frequency,
    sources,
  };
}

interface MergedEnKyEntry {
  headword: string;
  pos: string[];
  translations: string[];
  senses: string[];
  examples: { ky: string; ru: string }[];
  pronunciation?: string;
  etymology?: string;
  frequency?: number;
  sources: string[];
}

function mergeEnKyGroup(group: EnKyEntry[], headwordField: "en" | "ky"): MergedEnKyEntry {
  const primary = group[0];
  const headword = headwordField === "en" ? primary.en : primary.ky;
  const translations = headwordField === "en"
    ? [...new Set(group.map((e) => e.ky))]
    : [...new Set(group.map((e) => e.en))];
  const allSenses = [...new Set(group.flatMap((e) => e.senses ?? []))];
  const allExamples = dedupeExamples(group.flatMap((e) => e.examples ?? []));
  const posSet = [...new Set(group.map((e) => e.pos))];
  const sources = [...new Set(group.map((e) => e.source))];
  const etymologyEntry = group.find((e) => e.etymology);
  const freqEntry = group.find((e) => e.frequency != null);

  return {
    headword,
    pos: posSet,
    translations,
    senses: allSenses,
    examples: allExamples,
    pronunciation: primary.pronunciation,
    etymology: etymologyEntry?.etymology,
    frequency: freqEntry?.frequency,
    sources,
  };
}

async function main(): Promise<void> {
  console.log("Building dictionaries...\n");

  // Load and validate entries
  const entries = await loadEntries();

  // Build ru→ky
  await buildDictionary(entries, "ru-ky", join(ROOT, "dist/ru-ky"));

  // Build ky→ru
  await buildDictionary(entries, "ky-ru", join(ROOT, "dist/ky-ru"));

  // Build en→ky and ky→en from entries-en/
  const enKyPairs = await loadEnKyEntries();
  if (enKyPairs) {
    console.log("\nBuilding English-Kyrgyz dictionary...");
    await writeDistFiles(
      join(ROOT, "dist/en-ky"),
      generateEnKyDictionary(enKyPairs),
      "Info-en-ky.plist",
      "English-Kyrgyz Dictionary"
    );
    printEnKyStats(enKyPairs, "English-Kyrgyz");

    console.log("\nBuilding Kyrgyz-English dictionary...");
    await writeDistFiles(
      join(ROOT, "dist/ky-en"),
      generateKyEnDictionary(enKyPairs),
      "Info-ky-en.plist",
      "Kyrgyz-English Dictionary"
    );
    printEnKyStats(enKyPairs, "Kyrgyz-English");
  }

  // Build JSON if requested
  if (process.argv.includes("--json")) {
    const jsonDir = join(ROOT, "dist/json");
    await mkdir(jsonDir, { recursive: true });
    console.log("\nBuilding JSON...");

    // ru-ky: group by Russian headword + POS
    const ruKyGroups = new Map<string, DictionaryEntry[]>();
    for (const entry of entries) {
      const key = entry.ru.toLowerCase().replace(/-+$/, "") + "\0" + entry.pos;
      if (!ruKyGroups.has(key)) ruKyGroups.set(key, []);
      ruKyGroups.get(key)!.push(entry);
    }
    const ruKyMerged = [...ruKyGroups.values()].map((group) => mergeGroup(group, "ru-ky"));
    await Bun.write(join(jsonDir, "ru-ky.json"), JSON.stringify(ruKyMerged, null, 2));
    console.log(`  ru-ky.json: ${ruKyMerged.length} entries (from ${entries.length})`);

    // ky-ru: group by Kyrgyz headword + POS
    const kyRuGroups = new Map<string, DictionaryEntry[]>();
    for (const entry of entries) {
      const key = entry.ky.toLowerCase().replace(/-+$/, "") + "\0" + entry.pos;
      if (!kyRuGroups.has(key)) kyRuGroups.set(key, []);
      kyRuGroups.get(key)!.push(entry);
    }
    const kyRuMerged = [...kyRuGroups.values()].map((group) => mergeGroup(group, "ky-ru"));
    await Bun.write(join(jsonDir, "ky-ru.json"), JSON.stringify(kyRuMerged, null, 2));
    console.log(`  ky-ru.json: ${kyRuMerged.length} entries (from ${entries.length})`);

    if (enKyPairs) {
      // en-ky: group by English headword + POS
      const enKyGroups = new Map<string, EnKyEntry[]>();
      for (const entry of enKyPairs) {
        const key = entry.en.toLowerCase().replace(/-+$/, "") + "\0" + (entry.pos ?? "");
        if (!enKyGroups.has(key)) enKyGroups.set(key, []);
        enKyGroups.get(key)!.push(entry);
      }
      const enKyMerged = [...enKyGroups.values()].map((group) => mergeEnKyGroup(group, "en"));
      await Bun.write(join(jsonDir, "en-ky.json"), JSON.stringify(enKyMerged, null, 2));
      console.log(`  en-ky.json: ${enKyMerged.length} entries (from ${enKyPairs.length})`);

      // ky-en: group by Kyrgyz headword + POS
      const kyEnGroups = new Map<string, EnKyEntry[]>();
      for (const entry of enKyPairs) {
        const key = entry.ky.toLowerCase().replace(/-+$/, "") + "\0" + (entry.pos ?? "");
        if (!kyEnGroups.has(key)) kyEnGroups.set(key, []);
        kyEnGroups.get(key)!.push(entry);
      }
      const kyEnMerged = [...kyEnGroups.values()].map((group) => mergeEnKyGroup(group, "ky"));
      await Bun.write(join(jsonDir, "ky-en.json"), JSON.stringify(kyEnMerged, null, 2));
      console.log(`  ky-en.json: ${kyEnMerged.length} entries (from ${enKyPairs.length})`);
    }
  }

  console.log("\nBuild complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
