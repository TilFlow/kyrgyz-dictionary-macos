# Data Pipeline

The pipeline extracts data from open sources and assembles `entries/*.json` and `data/en-ky-pairs.json`.

## Sources

| Source | What we extract | Volume | License |
|--------|----------------|--------|---------|
| English Wiktionary (kaikki.org) | ru↔ky pairs via English pivot | ~18K pairs | CC BY-SA |
| Russian Wiktionary (kaikki.org) | Direct ru→ky pairs | ~5K pairs | CC BY-SA |
| kaikki.org Kyrgyz extract | Etymology, pronunciation | 4K entries | CC BY-SA |
| Apertium-kir | Kyrgyz lemmas for validation | 7K lemmas | GPL-3.0 |
| GoURMET (OPUS) | Parallel ky-ru sentences (examples) | 23K pairs | Open |
| OpenRussian.org | Gender, stress, conjugation of Russian words | ~150K words | CC BY-SA 4.0 |
| Manas-UdS Corpus | Kyrgyz lemma frequency list | 1.2M tokens | CC BY-NC-SA 4.0 |
| English Wiktionary (kaikki.org) | Direct en→ky pairs | ~9K pairs | CC BY-SA |

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
```

EN Wiktionary extraction takes several minutes (10M+ lines).

## 3. Merge and Enrich

```bash
bun run pipeline/merge.ts     # Merge → entries/*.json
bun run pipeline/enrich.ts    # Noun morphology
```

## 4. Verify

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

## How Merge Works

1. Loads pairs from ru-wikt (priority — direct pairs) and en-wikt
2. Deduplication by `(ru, ky)` key
3. Normalization: NFC, strip stress marks from Russian words, strip English glosses in parentheses
4. Enrichment: etymology and pronunciation from kaikki.org Kyrgyz extract
5. Examples: matched from GoURMET by Kyrgyz word occurrence
6. Russian side: stress marks and gender from OpenRussian.org
7. Frequency: from Manas-UdS corpus
8. Validation: check Kyrgyz words against Apertium lemma list
9. Split into `entries/{letter}.json` files

## How EN-KY Enrichment Works

The en-ky pairs are extracted separately and enriched at build time:

1. Pronunciation and etymology from kaikki.org Kyrgyz extract
2. Frequency from Manas-UdS corpus
3. Parallel sentence examples from GoURMET ky-ru corpus
4. Wiktionary links for each Kyrgyz word

The same enriched data is used for both en-ky and ky-en dictionaries.

## How Morphological Enrichment Works

For each noun without morphology:
1. Determine stem type (vowel/voiced/voiceless) and harmony group (1-4)
2. Generate case forms using the 3x4 suffix matrix
3. Generate plural forms
4. Generate a human-readable rule explanation
