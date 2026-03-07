# En-Ky Dictionary Enrichment via Ru-En Pivot — Design

## Goal

Enrich the English-Kyrgyz dictionary by pivoting through Russian: use ru-en pairs from English Wiktionary (kaikki.org) combined with existing ru-ky entries to generate new en-ky pairs. Store en-ky entries in `entries-en/` as source of truth, with full schema validation and sync capability.

## Current State

- **ru-ky:** ~20,900 entries in `entries/*.json` (wiktionary-en, wiktionary-ru, apertium, manual)
- **en-ky:** ~8,800 pairs in `data/en-ky-pairs.json` (wiktionary-en only, not entries-based)
- **kaikki.org JSONL dump:** already downloaded, used for other extractions

## Data Flow

```
kaikki.org JSONL ──► extract-ru-en-wiktionary.ts ──► data/ru-en-pairs.json
                                                          │
entries/*.json (ru-ky, ~21K) ─────────────────────────────┤
                                                          ▼
                                                    pivot-en-ky.ts
                                                          │
data/en-ky-pairs.json (wiktionary, ~8.8K) ────────────────┤
                                                          ▼
                                                    sync-en-ky.ts
                                                          │
                                                          ▼
                                              entries-en/*.json
                                              (source of truth)
                                                          │
                                                          ▼
                                              build.ts ──► dist/en-ky/
                                                           dist/ky-en/
```

## Schema: EnKyEntry (`src/schema-en.ts`)

```typescript
EnKyEntry {
  id: string              // "en-ky-{en}-{ky}-{pos}"
  en: string              // English headword
  ky: string              // Kyrgyz translation
  pos: "noun" | "verb" | "adj" | "adv" | "pron" | "post" | "num" | "conj" | "intj"
  source: "wiktionary-en" | "pivot-ru" | "manual"
  senses?: string[]       // English definitions/contexts
  examples?: { ky: string; en: string }[]
  pronunciation?: string  // IPA
  etymology?: string
  frequency?: number      // from Manas corpus
  ruPivot?: string        // for pivot-ru: the Russian word used as intermediary
}
```

## File Structure

```
entries-en/               # source of truth for en-ky
  a.json, b.json, ...    # keyed by first English letter
src/
  schema-en.ts            # EnKyEntry Zod schema
pipeline/
  extract-ru-en-wiktionary.ts   # kaikki.org → data/ru-en-pairs.json
  pivot-en-ky.ts                # ru-en + ru-ky → data/en-ky-pivot.json
scripts/
  sync-en-ky.ts           # merge all sources → entries-en/*.json
  add-en.ts               # manual en-ky entry addition
```

## Pipeline Scripts

### extract-ru-en-wiktionary.ts

Reads `data/raw-wiktextract-data.jsonl.gz`:
- Filters entries where `lang_code="ru"`
- Extracts English translations from `senses[].glosses` (Russian Wiktionary entries have English glosses as definitions)
- Maps POS via existing `mapWiktionaryPos()`
- Output: `data/ru-en-pairs.json` — `{ ru, en, pos, sense? }[]`

### pivot-en-ky.ts

Join logic:
1. Loads `data/ru-en-pairs.json` → `Map<"ru\0pos", en[]>`
2. Loads `entries/*.json` → all ru-ky entries
3. For each ru-ky entry, looks up ru-en pairs with matching `ru + pos` (strict)
4. Generates en-ky pairs with `source: "pivot-ru"`, `ruPivot: ru`
5. Output: `data/en-ky-pivot.json`

### sync-en-ky.ts

Main sync script. On each run:

1. **Load sources:**
   - `data/en-ky-pairs.json` (wiktionary-en, ~8.8K)
   - `data/en-ky-pivot.json` (pivot-ru)
   - `entries-en/*.json` (current state, if exists)

2. **Merge with priority:**
   - Manual entries (from entries-en): preserved as-is, highest priority
   - Wiktionary-en entries: `source: "wiktionary-en"`
   - Pivot entries: `source: "pivot-ru"` — only if en+ky+pos combo not already present

3. **Update pivot entries:**
   - Remove old pivot entries no longer in `data/en-ky-pivot.json`
   - Add new pivot entries
   - Never touch manual or wiktionary-en entries

4. **Enrich:**
   - Pronunciation, etymology from `data/ky-enrichment.json`
   - Frequency from `data/manas-frequency.json`
   - Examples from `data/gourmet-examples.json`

5. **Save** to `entries-en/*.json` (by first English letter)

### build.ts changes

Switch from reading `data/en-ky-pairs.json` directly to reading `entries-en/*.json` as source of truth for en-ky/ky-en dictionary generation.

## Matching Strategy

- **Strict join:** ru word + POS must match exactly
- **Deduplication key:** `en|ky|pos` — if a combination already exists from any source, pivot does not add it
- **ruPivot field:** stores the Russian intermediary word for traceability

## Expected Results

- ru-en pairs from kaikki.org: estimated ~50-80K
- Intersection with ru-ky by ru+POS: estimated 8-12K new en-ky pivot pairs
- Total en-ky after merge: ~17-21K entries (comparable to ru-ky)

## Package.json Scripts

```json
"sync:en": "bun run scripts/sync-en-ky.ts",
"add:en": "bun run scripts/add-en.ts"
```

## License

All sources CC BY-SA compatible. Pivot pairs are derived facts (word A translates to word B), not copyrightable expression.
