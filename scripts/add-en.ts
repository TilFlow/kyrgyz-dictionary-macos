import { join } from "node:path";
import { createInterface } from "node:readline";
import { EnKyEntrySchema, type EnKyEntry } from "../src/schema-en";

const ENTRIES_DIR = join(import.meta.dirname, "..", "entries-en");

const POS_OPTIONS = [
  { value: "noun", label: "noun" },
  { value: "verb", label: "verb" },
  { value: "adj", label: "adjective" },
  { value: "adv", label: "adverb" },
  { value: "pron", label: "pronoun" },
  { value: "post", label: "postposition" },
  { value: "num", label: "numeral" },
  { value: "conj", label: "conjunction" },
  { value: "intj", label: "interjection" },
] as const;

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  try {
    const en = (await ask("English word: ")).trim();
    if (!en) {
      console.error("Word cannot be empty.");
      process.exit(1);
    }

    const ky = (await ask("Kyrgyz translation: ")).trim();
    if (!ky) {
      console.error("Translation cannot be empty.");
      process.exit(1);
    }

    console.log("\nPart of speech:");
    for (let i = 0; i < POS_OPTIONS.length; i++) {
      console.log(`  ${i + 1}. ${POS_OPTIONS[i].label}`);
    }
    const posInput = (await ask("Choose number: ")).trim();
    const posIndex = parseInt(posInput, 10) - 1;
    if (isNaN(posIndex) || posIndex < 0 || posIndex >= POS_OPTIONS.length) {
      console.error("Invalid number.");
      process.exit(1);
    }
    const pos = POS_OPTIONS[posIndex].value;

    const sensesInput = (await ask("Senses (comma-separated): ")).trim();
    const senses = sensesInput
      ? sensesInput.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;

    // Determine letter file
    const letter = en[0].toLowerCase();
    const letterKey = /^[a-z]$/.test(letter) ? letter : "_";
    const filePath = join(ENTRIES_DIR, `${letterKey}.json`);

    // Read existing entries
    let entries: EnKyEntry[] = [];
    const file = Bun.file(filePath);
    if (await file.exists()) {
      entries = await file.json();
    }

    // Generate ID
    const enKey = en.toLowerCase().replace(/\s+/g, "-");
    const prefix = `en-ky-${enKey}-`;
    const existingSeqs = entries
      .filter((e) => e.id.startsWith(prefix))
      .map((e) => parseInt(e.id.slice(prefix.length), 10))
      .filter((n) => !isNaN(n));
    const nextSeq = existingSeqs.length > 0 ? Math.max(...existingSeqs) + 1 : 1;
    const id = `${prefix}${String(nextSeq).padStart(3, "0")}`;

    const entry: EnKyEntry = {
      id,
      en,
      ky: ky.normalize("NFC"),
      pos,
      source: "manual",
      ...(senses && senses.length > 0 ? { senses } : {}),
    };

    // Preview
    console.log("\nPreview:");
    console.log(JSON.stringify(entry, null, 2));

    const confirm = (await ask("\nAdd? (y/n): ")).trim().toLowerCase();
    if (confirm !== "y" && confirm !== "yes") {
      console.log("Cancelled.");
      process.exit(0);
    }

    // Validate
    const result = EnKyEntrySchema.safeParse(entry);
    if (!result.success) {
      console.error("Validation error:");
      for (const issue of result.error.issues) {
        const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
        console.error(`  ${path}: ${issue.message}`);
      }
      process.exit(1);
    }

    // Save
    entries.push(entry);
    await Bun.write(filePath, JSON.stringify(entries, null, 2) + "\n");

    console.log(`Added! ID: ${id}`);
  } finally {
    rl.close();
  }
}

main();
