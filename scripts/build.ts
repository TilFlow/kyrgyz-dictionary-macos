import { Glob } from "bun";
import { readdir, mkdir, copyFile, exists } from "node:fs/promises";
import { join } from "node:path";
import { DictionaryEntrySchema, type DictionaryEntry } from "../src/schema";
import { generateDictionary, generateEnKyDictionary, generateKyEnDictionary, type DictDirection, type EnKyEntry } from "../src/xml-generator";

const ROOT = import.meta.dir.replace(/\/scripts$/, "");
const ENTRIES_DIR = join(ROOT, "entries");
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

interface KyEnrichmentEntry {
  word: string;
  pos: string;
  etymology?: string;
  pronunciation?: string;
}

interface FrequencyEntry {
  lemma: string;
  pos: string;
  count: number;
}

interface GoURMETExample {
  ky: string;
  ru: string;
}

async function loadJsonSafe<T>(path: string, fallback: T): Promise<T> {
  try {
    return await Bun.file(path).json();
  } catch {
    return fallback;
  }
}

function enrichEnKyPairs(
  pairs: EnKyEntry[],
  kyEnrichment: Record<string, KyEnrichmentEntry>,
  frequency: FrequencyEntry[],
  gourmetExamples: GoURMETExample[]
): { entries: EnKyEntry[]; stats: Record<string, number> } {
  // Build frequency lookup
  const freqMap = new Map<string, number>();
  for (const f of frequency) {
    const existing = freqMap.get(f.lemma) ?? 0;
    freqMap.set(f.lemma, existing + f.count);
  }

  // Build GoURMET example index: ky word → examples
  const exampleIndex = new Map<string, { ky: string; ru: string }[]>();
  for (const ex of gourmetExamples) {
    const words = ex.ky.toLowerCase().split(/\s+/);
    const seen = new Set<string>();
    for (const w of words) {
      if (w.length < 3 || seen.has(w)) continue;
      seen.add(w);
      let arr = exampleIndex.get(w);
      if (!arr) {
        arr = [];
        exampleIndex.set(w, arr);
      }
      if (arr.length < 3) {
        arr.push({ ky: ex.ky, ru: ex.ru });
      }
    }
  }

  const stats = {
    withPronunciation: 0,
    withEtymology: 0,
    withFrequency: 0,
    withExamples: 0,
  };

  const entries = pairs.map((pair) => {
    const enriched: EnKyEntry = { ...pair };
    const kyLower = pair.ky.toLowerCase();

    // Kyrgyz enrichment (pronunciation, etymology)
    const enrichKey = `${pair.ky}:${pair.pos ?? "noun"}`;
    const enrichData = kyEnrichment[enrichKey];
    if (enrichData?.pronunciation) {
      enriched.pronunciation = enrichData.pronunciation;
      stats.withPronunciation++;
    }
    if (enrichData?.etymology) {
      enriched.etymology = enrichData.etymology;
      stats.withEtymology++;
    }

    // Frequency
    const freq = freqMap.get(kyLower);
    if (freq) {
      enriched.frequency = freq;
      stats.withFrequency++;
    }

    // Examples
    const examples = exampleIndex.get(kyLower);
    if (examples?.length) {
      enriched.examples = examples.slice(0, 2);
      stats.withExamples++;
    }

    // Wiktionary URL
    enriched.wiktionaryUrl = `https://en.wiktionary.org/wiki/${encodeURIComponent(pair.ky)}`;

    return enriched;
  });

  return { entries, stats };
}

async function loadEnrichedEnKyPairs(): Promise<{ pairs: EnKyEntry[]; stats: Record<string, number> } | null> {
  const enKyPath = join(ROOT, "data/en-ky-pairs.json");

  let rawPairs: EnKyEntry[];
  try {
    rawPairs = await Bun.file(enKyPath).json();
  } catch {
    console.log("  Skipping en-ky/ky-en: data/en-ky-pairs.json not found. Run the extraction first.");
    return null;
  }

  console.log(`  Loaded ${rawPairs.length} en-ky pairs`);

  const [kyEnrichment, frequency, gourmetExamples] = await Promise.all([
    loadJsonSafe<Record<string, KyEnrichmentEntry>>(join(ROOT, "data/ky-enrichment.json"), {}),
    loadJsonSafe<FrequencyEntry[]>(join(ROOT, "data/manas-frequency.json"), []),
    loadJsonSafe<GoURMETExample[]>(join(ROOT, "data/gourmet-examples.json"), []),
  ]);

  console.log(`  Enrichment: ${Object.keys(kyEnrichment).length} ky entries, ${frequency.length} freq entries, ${gourmetExamples.length} examples`);

  const { entries: pairs, stats } = enrichEnKyPairs(
    rawPairs, kyEnrichment, frequency, gourmetExamples
  );

  return { pairs, stats };
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

function printEnKyStats(pairs: EnKyEntry[], stats: Record<string, number>, label: string): void {
  console.log(`\n${label} stats:`);
  console.log(`  Total pairs: ${pairs.length}`);
  const byPos: Record<string, number> = {};
  for (const p of pairs) {
    const pos = p.pos ?? "unknown";
    byPos[pos] = (byPos[pos] ?? 0) + 1;
  }
  console.log(`  By POS:`);
  for (const [pos, count] of Object.entries(byPos).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${pos}: ${count}`);
  }
  console.log(`  Enrichment:`);
  console.log(`    With pronunciation: ${stats.withPronunciation}`);
  console.log(`    With etymology: ${stats.withEtymology}`);
  console.log(`    With frequency: ${stats.withFrequency}`);
  console.log(`    With examples: ${stats.withExamples}`);
}

async function main(): Promise<void> {
  console.log("Building dictionaries...\n");

  // Load and validate entries
  const entries = await loadEntries();

  // Build ru→ky
  await buildDictionary(entries, "ru-ky", join(ROOT, "dist/ru-ky"));

  // Build ky→ru
  await buildDictionary(entries, "ky-ru", join(ROOT, "dist/ky-ru"));

  // Build en→ky and ky→en from same enriched data
  const enKyData = await loadEnrichedEnKyPairs();
  if (enKyData) {
    const { pairs, stats } = enKyData;

    console.log("\nBuilding English-Kyrgyz dictionary...");
    await writeDistFiles(
      join(ROOT, "dist/en-ky"),
      generateEnKyDictionary(pairs),
      "Info-en-ky.plist",
      "English-Kyrgyz Dictionary"
    );
    printEnKyStats(pairs, stats, "English-Kyrgyz");

    console.log("\nBuilding Kyrgyz-English dictionary...");
    await writeDistFiles(
      join(ROOT, "dist/ky-en"),
      generateKyEnDictionary(pairs),
      "Info-ky-en.plist",
      "Kyrgyz-English Dictionary"
    );
    printEnKyStats(pairs, stats, "Kyrgyz-English");
  }

  // Build JSON if requested
  if (process.argv.includes("--json")) {
    const jsonDir = join(ROOT, "dist/json");
    await mkdir(jsonDir, { recursive: true });
    console.log("\nBuilding JSON...");

    await Bun.write(join(jsonDir, "ru-ky.json"), JSON.stringify(entries, null, 2));
    await Bun.write(join(jsonDir, "ky-ru.json"), JSON.stringify(entries, null, 2));
    console.log(`  ru-ky.json / ky-ru.json: ${entries.length} entries`);

    if (enKyData) {
      await Bun.write(join(jsonDir, "en-ky.json"), JSON.stringify(enKyData.pairs, null, 2));
      await Bun.write(join(jsonDir, "ky-en.json"), JSON.stringify(enKyData.pairs, null, 2));
      console.log(`  en-ky.json / ky-en.json: ${enKyData.pairs.length} entries`);
    }
  }

  console.log("\nBuild complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
