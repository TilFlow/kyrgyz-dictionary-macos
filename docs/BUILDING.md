# Building from Source

## Requirements

- [Bun](https://bun.sh/) v1.0+
- Apple Dictionary Development Kit (for final compilation, macOS only)

DDK is included in "Additional Tools for Xcode" — download from [developer.apple.com/download/more](https://developer.apple.com/download/more/). Mirror: [SebastianSzturo/Dictionary-Development-Kit](https://github.com/SebastianSzturo/Dictionary-Development-Kit).

## Quick Start

```bash
bun install
bun run build
```

This produces four dictionaries in `dist/`:

| Directory | Dictionary |
|---|---|
| `dist/ru-ky/` | Russian-Kyrgyz |
| `dist/ky-ru/` | Kyrgyz-Russian |
| `dist/en-ky/` | English-Kyrgyz |
| `dist/ky-en/` | Kyrgyz-English |

To compile and install (macOS only):

```bash
cd dist/ru-ky && make && make install
```

Then open Dictionary.app → Preferences → Enable the dictionary.

## Commands

| Command | Description |
|---------|------------|
| `bun run build` | Build all dictionaries (JSON → Apple Dictionary XML) |
| `bun run validate` | Validate all entries against schema |
| `bun run stats` | Show dictionary statistics |
| `bun run add` | Interactively add a ru-ky word |
| `bun run add:en` | Interactively add an en-ky word |
| `bun run audit` | Text coverage analysis (requires texts in `texts/`) |
| `bun run sync:en` | Merge all en-ky sources → `entries-en/` |
| `bun run sync:ru` | Merge all ru-ky sources → `entries/` |
| `bun run package` | Package dist/ into zip files for distribution |
| `bun run update` | Full data refresh (download + extract + merge + enrich) |
| `bun run version:set <ver>` | Update version in package.json + all plist files |

## Project Structure

```
entries/            # ru-ky entries (JSON, grouped by first letter)
entries-en/         # en-ky entries (JSON, grouped by first letter)
src/                # Core
  schema.ts         # Zod schema for DictionaryEntry (ru-ky)
  schema-en.ts      # Zod schema for EnKyEntry (en-ky)
  morphology.ts     # Kyrgyz morphology (vowel harmony, declension)
  forms.ts          # Forward-generates all word forms (~528K forms)
  xml-generator.ts  # JSON → Apple Dictionary XML (4 directions, stem dedup, source scoring)
scripts/            # Build scripts
  build.ts          # Main build (entries → dist/)
  validate.ts       # Schema validation
  stats.ts          # Statistics
  add.ts            # Interactive ru-ky entry
  add-en.ts         # Interactive en-ky entry
  audit.ts          # Text coverage analysis
  sync-en-ky.ts     # Merge all en-ky sources → entries-en/
  sync-ru-ky.ts     # Merge all ru-ky sources → entries/
  package.ts        # Zip packaging
  update.ts         # Full data refresh
pipeline/           # Data extraction from sources
  pivot-en-ky.ts    # ru-en + ru-ky → en-ky pivot
  pivot-ru-ky.ts    # en-ky + ru-en → ru-ky reverse pivot
templates/          # Apple Dictionary templates (Info.plist, CSS)
data/               # Raw data (not committed)
dist/               # Build output (not committed)
texts/              # Kyrgyz texts for audit (not committed)
```

## Releasing

Always use the version script to update the version — never edit version numbers manually:

```bash
bun run version:set 0.2.0
git add -A && git commit -m "chore: bump version to 0.2.0"
git tag v0.2.0
git push origin main --tags
```

The script updates `package.json` and all `templates/Info*.plist` files.

GitHub Actions automatically compiles all four dictionaries on macOS and publishes them to Releases when a tag is pushed.

Manual trigger: Actions → "Build Dictionary" → "Run workflow".
