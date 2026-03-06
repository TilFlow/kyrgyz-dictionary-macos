# Contributing

## Add a Word Manually

```bash
bun run add
```

The script will prompt for the Russian word, Kyrgyz translation, part of speech, and senses. Noun morphology is generated automatically.

Or edit `entries/{letter}.json` directly — each file is a JSON array of entries.

## Entry Format

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

Full schema: `src/schema.ts`.

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
