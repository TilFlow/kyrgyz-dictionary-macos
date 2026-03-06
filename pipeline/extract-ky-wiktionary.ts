/**
 * Extract etymology and pronunciation data from kaikki.org Kyrgyz Wiktionary dump.
 *
 * Reads data/kaikki-kyrgyz.jsonl and produces data/ky-enrichment.json
 * with a lookup map keyed by "word:pos" for enriching dictionary entries.
 */

interface KyEnrichment {
  word: string;
  pos: string;
  etymology?: string;
  pronunciation?: string;
  forms?: { form: string; tags: string[] }[];
}

async function main() {
  const inputPath = "data/kaikki-kyrgyz.jsonl";
  const outputPath = "data/ky-enrichment.json";

  const file = Bun.file(inputPath);
  if (!(await file.exists())) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  const text = await file.text();
  const lines = text.split("\n");

  const enrichment: Record<string, KyEnrichment> = {};

  let total = 0;
  let withEtymology = 0;
  let withPronunciation = 0;
  let withForms = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let entry: any;
    try {
      entry = JSON.parse(trimmed);
    } catch {
      continue;
    }

    const word: string | undefined = entry.word;
    const pos: string | undefined = entry.pos;
    if (!word || !pos) continue;

    total++;

    // Extract etymology
    const etymology: string | undefined = entry.etymology_text || undefined;
    if (etymology) withEtymology++;

    // Extract pronunciation: first sound entry with an ipa field
    let pronunciation: string | undefined;
    if (Array.isArray(entry.sounds)) {
      for (const sound of entry.sounds) {
        if (sound.ipa) {
          pronunciation = sound.ipa;
          break;
        }
      }
    }
    if (pronunciation) withPronunciation++;

    // Extract forms (declension/conjugation)
    let forms: { form: string; tags: string[] }[] | undefined;
    if (Array.isArray(entry.forms)) {
      const extracted = entry.forms
        .filter((f: any) => f.form && Array.isArray(f.tags) && f.tags.length > 0)
        .map((f: any) => ({ form: String(f.form), tags: f.tags.map(String) }));
      if (extracted.length > 0) {
        forms = extracted;
        withForms++;
      }
    }

    const enrichmentEntry: KyEnrichment = { word, pos };
    if (etymology) enrichmentEntry.etymology = etymology;
    if (pronunciation) enrichmentEntry.pronunciation = pronunciation;
    if (forms) enrichmentEntry.forms = forms;

    // Key by word:pos to handle multiple POS for same word
    const key = `${word}:${pos}`;
    enrichment[key] = enrichmentEntry;
  }

  await Bun.write(outputPath, JSON.stringify(enrichment, null, 2));

  console.log("Kyrgyz Wiktionary enrichment extraction complete.");
  console.log(`  Total entries:              ${total}`);
  console.log(`  Entries with etymology:     ${withEtymology}`);
  console.log(`  Entries with pronunciation: ${withPronunciation}`);
  console.log(`  Entries with forms:         ${withForms}`);
  console.log(`  Output: ${outputPath}`);
}

main();
