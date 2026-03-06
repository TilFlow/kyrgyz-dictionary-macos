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
| `bun run add` | Interactively add a new word |
| `bun run package` | Package dist/ into zip files for distribution |
| `bun run update` | Full data refresh (download + extract + merge + enrich) |

## Project Structure

```
entries/          # Dictionary entries (JSON, grouped by first letter)
src/              # Core
  schema.ts       # Zod schema for DictionaryEntry
  morphology.ts   # Kyrgyz morphology (vowel harmony, declension)
  xml-generator.ts # JSON → Apple Dictionary XML (4 directions, stem dedup, source scoring)
scripts/          # Build scripts
  build.ts        # Main build (entries → dist/)
  validate.ts     # Schema validation
  stats.ts        # Statistics
  add.ts          # Interactive word entry
  package.ts      # Zip packaging
  update.ts       # Full data refresh
pipeline/         # Data extraction from sources
templates/        # Apple Dictionary templates (Info.plist, CSS)
data/             # Raw data (not committed)
dist/             # Build output (not committed)
```

## CI / Automated Build

GitHub Actions automatically compiles all four dictionaries on macOS and publishes them to Releases when a tag is created:

```bash
git tag v1.0.0
git push --tags
```

Manual trigger: Actions → "Build Dictionary" → "Run workflow".
