# Data Pipeline

The pipeline extracts data from open sources and assembles `entries/*.json` (ru-ky) and `entries-en/*.json` (en-ky).

## Sources

| Source | What we extract | Volume | License |
|--------|----------------|--------|---------|
| English Wiktionary (kaikki.org) | ru↔ky pairs via English pivot | ~16K pairs | CC BY-SA |
| English Wiktionary (kaikki.org) | Direct en→ky pairs | ~9K pairs | CC BY-SA |
| English Wiktionary (kaikki.org) | ru→en pairs for pivot | ~383K pairs | CC BY-SA |
| Russian Wiktionary (kaikki.org) | Direct ru→ky pairs | ~5K pairs | CC BY-SA |
| kaikki.org Kyrgyz extract | Etymology, pronunciation | 4K entries | CC BY-SA |
| Apertium-kir | Kyrgyz lemmas for validation | 7K lemmas | GPL-3.0 |
| GoURMET (OPUS) | Parallel ky-ru sentences (examples) | 23K pairs | Open |
| OpenRussian.org | Gender, stress, conjugation of Russian words | ~150K words | CC BY-SA 4.0 |
| Manas-UdS Corpus | Kyrgyz lemma frequency list | 1.2M tokens | CC BY-NC-SA 4.0 |

## 1. Download Data

Automatic:

```bash
bun run update
```

Manual:

```bash
mkdir -p data

# English Wiktionary (~2.4 GB)
curl -L -o data/raw-wiktextract-data.jsonl.gz \
  "https://kaikki.org/dictionary/raw-wiktextract-data.jsonl.gz"

# Russian Wiktionary (~265 MB)
curl -L -o data/ru-extract.jsonl.gz \
  "https://kaikki.org/dictionary/downloads/ru/ru-extract.jsonl.gz"

# Kyrgyz extract (~25 MB)
curl -L -o data/kaikki-kyrgyz.jsonl \
  "https://kaikki.org/dictionary/Kyrgyz/kaikki.org-dictionary-Kyrgyz.jsonl"

# Apertium
git clone --depth 1 https://github.com/apertium/apertium-kir.git data/apertium-kir

# GoURMET ky-ru (~2 MB)
curl -L -o data/gourmet-ky-ru.zip \
  "https://object.pouta.csc.fi/OPUS-GoURMET/v1/moses/ky-ru.txt.zip"
mkdir -p data/gourmet-ky-ru && unzip -o data/gourmet-ky-ru.zip -d data/gourmet-ky-ru

# OpenRussian.org
git clone --depth 1 https://github.com/Badestrand/russian-dictionary.git data/openrussian

# Manas-UdS Corpus (~12 MB)
curl -L -o data/manas-uds.zip \
  "https://fedora.clarin-d.uni-saarland.de/kyrgyz/kyrgyz_2022_10_03.zip"
mkdir -p data/manas-uds && unzip -o data/manas-uds.zip -d data/manas-uds
```

## 2. Extraction

```bash
bun run pipeline/extract-en-wiktionary.ts      # → data/en-wiktionary-pairs.json
bun run pipeline/extract-ru-wiktionary.ts      # → data/ru-wiktionary-pairs.json
bun run pipeline/extract-ky-wiktionary.ts      # → data/ky-enrichment.json
bun run pipeline/extract-apertium.ts           # → data/apertium-lemmas.json
bun run pipeline/extract-gourmet.ts            # → data/gourmet-examples.json
bun run pipeline/extract-openrussian.ts        # → data/openrussian-enrichment.json
bun run pipeline/extract-manas.ts              # → data/manas-frequency.json
bun run pipeline/extract-en-ky-wiktionary.ts   # → data/en-ky-pairs.json
bun run pipeline/extract-ru-en-wiktionary.ts   # → data/ru-en-pairs.json
```

EN Wiktionary extraction takes several minutes (10M+ lines).

## 3. Pivot Translation

Generate cross-lingual pairs using a shared intermediary language:

```bash
bun run pipeline/pivot-en-ky.ts    # ru-en + ru-ky → en-ky (~22K new pairs)
bun run pipeline/pivot-ru-ky.ts    # en-ky + ru-en → ru-ky (~3.5K new pairs)
```

Both scripts use strict POS matching — pairs are joined only when both word AND part-of-speech match exactly.

## 4. Sync (Merge + Enrich)

Sync scripts merge all sources into entries, applying dedup, enrichment, and priority ordering:

```bash
bun run sync:ru    # → entries/*.json  (manual > wiktionary > pivot)
bun run sync:en    # → entries-en/*.json (manual > wiktionary > pivot)
```

Each sync script:
1. Loads pairs from all sources (wiktionary, pivot, manual)
2. Deduplicates by `(word, ky)` key with source priority
3. Normalizes text (NFC, strip stress marks, fix Kyrgyz spelling)
4. Enriches with etymology, pronunciation (kaikki.org), frequency (Manas-UdS), examples (GoURMET), gender/stress (OpenRussian)
5. Validates against Apertium lemma list
6. Splits into `{letter}.json` files

## 5. Verify

```bash
bun run validate   # Schema validation
bun run stats      # Statistics
bun run build      # Build XML for all 4 dictionaries
```

## Automatic Update

```bash
bun run update                 # Full cycle: download + extract + merge + enrich
bun run update --skip-download # Skip download (use existing files)
bun run update --merge-only    # Merge + enrich only
```

The update script preserves entries with `source: "manual"` and shows a diff report.

## How Build-time Translation Processing Works

During XML generation (`bun run build`), translations are processed:

1. **Source scoring**: each translation is scored by the number of distinct sources that attest it (e.g., a word found in both wiktionary-en and wiktionary-ru scores higher)
2. **Stem dedup**: morphologically related Russian translations are collapsed — verb aspect pairs (сообщать/сообщить), noun/verb from same root (уведомление/уведомить), gendered pairs (мерзавец/мерзавка). Uses longest-common-prefix heuristic with Russian verb prefix stripping
3. **Sorting**: translations with more source attestations appear first, then by word length (shorter first)
4. For ky-ru direction, entries are grouped by Kyrgyz headword only (not POS), so cross-POS dedup works

## How Morphological Enrichment Works

For each noun without morphology:
1. Determine stem type (vowel/voiced/voiceless) and harmony group (1-4)
2. Generate case forms using the 3x4 suffix matrix
3. Generate plural forms
4. Generate a human-readable rule explanation
