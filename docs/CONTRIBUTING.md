# Contributing

## Add a Word Manually

```bash
bun run add       # Russian-Kyrgyz entry
bun run add:en    # English-Kyrgyz entry
```

The scripts prompt for the word, translation, part of speech, and senses. Noun morphology is generated automatically for ru-ky entries.

Or edit `entries/{letter}.json` / `entries-en/{letter}.json` directly — each file is a JSON array of entries.

## Entry Formats

**ru-ky** (`entries/*.json`, schema: `src/schema.ts`):

```json
{
  "id": "ru-книга-001",
  "ru": "книга",
  "ky": "китеп",
  "pos": "noun",
  "senses": ["книга", "письменное произведение"],
  "source": "manual"
}
```

**en-ky** (`entries-en/*.json`, schema: `src/schema-en.ts`):

```json
{
  "id": "en-ky-book-001",
  "en": "book",
  "ky": "китеп",
  "pos": "noun",
  "senses": ["book", "written work"],
  "source": "manual"
}
```

## Before Submitting a PR

```bash
bun run validate    # all entries must be valid
bun test            # all tests must pass
bun run build       # all 4 dictionaries must build
```

## Report an Error

Open an Issue with:
- The word that has the error
- What's wrong (incorrect translation, morphology, pronunciation)
- The correct version, if you know it
