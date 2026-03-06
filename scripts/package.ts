import { exists, mkdir } from "node:fs/promises";
import { join } from "node:path";

const ROOT = import.meta.dir.replace(/\/scripts$/, "");
const DIST_DIR = join(ROOT, "dist");
const OUT_DIR = join(ROOT, "release");

const REQUIRED_FILES = ["MyDictionary.xml", "dictionary.css", "Info.plist", "Makefile"];

const DICTIONARIES = [
  { dir: "ru-ky", zip: "ru-ky-dictionary.zip", label: "Русско-кыргызский словарь" },
  { dir: "ky-ru", zip: "ky-ru-dictionary.zip", label: "Кыргызско-русский словарь" },
  { dir: "en-ky", zip: "en-ky-dictionary.zip", label: "English-Kyrgyz Dictionary" },
  { dir: "ky-en", zip: "ky-en-dictionary.zip", label: "Kyrgyz-English Dictionary" },
];

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });

  for (const dict of DICTIONARIES) {
    const dictDir = join(DIST_DIR, dict.dir);

    // Check required files exist
    let missing = false;
    for (const file of REQUIRED_FILES) {
      if (!(await exists(join(dictDir, file)))) {
        console.log(`Skipping ${dict.dir}: missing ${file}. Run 'bun run build' first.`);
        missing = true;
        break;
      }
    }
    if (missing) continue;

    const zipPath = join(OUT_DIR, dict.zip);

    const proc = Bun.spawn(
      ["zip", "-j", zipPath, ...REQUIRED_FILES.map((f) => join(dictDir, f))],
      { stdout: "pipe", stderr: "pipe" }
    );
    await proc.exited;

    if (proc.exitCode !== 0) {
      const err = await new Response(proc.stderr).text();
      console.error(`zip failed for ${dict.dir}:`, err);
      process.exit(1);
    }

    const stat = Bun.file(zipPath);
    const sizeMB = ((await stat.size) / 1024 / 1024).toFixed(1);
    console.log(`Packaged: ${zipPath} (${sizeMB} MB) — ${dict.label}`);
  }

  console.log(`\nTo install on a Mac:`);
  console.log(`  1. Unzip the dictionary archive`);
  console.log(`  2. Install Dictionary Development Kit (from Apple developer downloads)`);
  console.log(`  3. Run: make && make install`);
  console.log(`  4. Open Dictionary.app → Preferences → Enable the dictionary`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
