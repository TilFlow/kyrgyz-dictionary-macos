import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { validateEntry } from "../src/schema";

const ENTRIES_DIR = join(import.meta.dirname, "..", "entries");

async function main() {
  const files = (await readdir(ENTRIES_DIR)).filter((f) => f.endsWith(".json"));

  if (files.length === 0) {
    console.log("No entry files found in entries/");
    process.exit(0);
  }

  let totalEntries = 0;
  let totalErrors = 0;

  for (const file of files.sort()) {
    const filePath = join(ENTRIES_DIR, file);
    const data = await Bun.file(filePath).json();

    if (!Array.isArray(data)) {
      console.error(`${file}: expected JSON array, got ${typeof data}`);
      totalErrors++;
      continue;
    }

    for (let i = 0; i < data.length; i++) {
      totalEntries++;
      const entry = data[i];
      const result = validateEntry(entry);

      if (!result.success) {
        totalErrors++;
        const id = entry?.id ?? `[index ${i}]`;
        console.error(`\n${file} -> ${id}:`);
        for (const issue of result.error.issues) {
          const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
          console.error(`  ${path}: ${issue.message}`);
        }
      }
    }
  }

  console.log(`\nValidated ${totalEntries} entries across ${files.length} files.`);

  if (totalErrors > 0) {
    console.error(`Found ${totalErrors} invalid entries.`);
    process.exit(1);
  } else {
    console.log("All entries valid.");
    process.exit(0);
  }
}

main();
