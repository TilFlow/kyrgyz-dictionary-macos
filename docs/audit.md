# Audit Script

Analyzes Kyrgyz text files against the dictionary to find missing words.

## Quick Start

1. Place `.txt` files with Kyrgyz text into `texts/`
2. Run the audit:

```bash
bun run audit
```

## How It Works

1. Loads all dictionary entries from `entries/*.json`
2. Forward-generates every inflected word form using `src/morphology.ts`:
   - **Nouns:** 6 cases x singular/plural, possessive forms (5 persons), possessive+case combos, attributive forms
   - **Verbs:** active/passive/causative/reciprocal voices x present/past/future/conditional/gerund x persons, plus negation
   - **Other POS:** base form only
3. Tokenizes text files, filters noise (short words, numbers, latin)
4. Checks each word against the generated form set
5. Reports missing words sorted by frequency

## Output Modes

### Console (default)

```bash
bun run audit
```

Shows a human-readable table with coverage stats, missing words, their frequency, source files, and context snippets.

### JSON

```bash
bun run audit -- --json
```

Outputs structured JSON:

```json
{
  "summary": {
    "totalWords": 1234,
    "uniqueWords": 456,
    "knownCount": 400,
    "missingCount": 56,
    "coverage": 87.7
  },
  "missing": [
    {
      "word": "example",
      "count": 5,
      "files": ["article.txt"],
      "contexts": ["...context snippet..."]
    }
  ]
}
```

## Stopwords

Add words to `texts/stopwords.txt` (one per line) to exclude them from the report:

```
# Proper nouns
бишкек
ооганстан

# Abbreviations
км
```

Lines starting with `#` are ignored.

## Typical Workflow

1. Copy a Kyrgyz article or text into `texts/article.txt`
2. Run `bun run audit`
3. Review missing words — identify real gaps vs proper nouns
4. Add proper nouns to `texts/stopwords.txt`
5. Add missing dictionary entries via `bun run add`
6. Re-run audit to verify improved coverage
