/**
 * Utilities for extracting Russian-Kyrgyz translation pairs from Wiktionary data.
 */

/** A Russian-Kyrgyz translation pair extracted from a Wiktionary entry. */
export interface RuKyPair {
  ru: string;
  ky: string;
  sense: string;
  pos: string | null;
  ruTags?: string[];
  kyTags?: string[];
}

/**
 * Extract Russian-Kyrgyz pairs from a Wiktionary JSONL entry.
 * Pairs are formed when both a Russian and Kyrgyz translation share
 * the same `sense` string within the entry's translations array.
 */
export function extractRuKyPairs(entry: any): RuKyPair[] {
  const translations: any[] = entry?.translations;
  if (!Array.isArray(translations) || translations.length === 0) {
    return [];
  }

  // Group translations by sense
  const bySense = new Map<string, { ru: Array<{ word: string; tags?: string[] }>; ky: Array<{ word: string; tags?: string[] }> }>();

  for (const t of translations) {
    if (!t.word || !t.code || !t.sense) continue;
    const sense = String(t.sense);

    if (t.code === "ru" || t.code === "ky") {
      let group = bySense.get(sense);
      if (!group) {
        group = { ru: [], ky: [] };
        bySense.set(sense, group);
      }
      const tags: string[] | undefined = Array.isArray(t.tags) ? t.tags.filter((tag: string) => !["masculine", "feminine", "neuter", "singular", "plural", "imperfective", "perfective", "transitive", "intransitive", "animate", "inanimate", "indeclinable"].includes(tag)) : undefined;
      group[t.code].push({ word: String(t.word), tags: tags?.length ? tags : undefined });
    }
  }

  const pos = mapWiktionaryPos(entry.pos);
  const pairs: RuKyPair[] = [];

  for (const [sense, group] of bySense) {
    if (group.ru.length === 0 || group.ky.length === 0) continue;
    // Create cartesian product of ru x ky for each sense
    for (const ru of group.ru) {
      for (const ky of group.ky) {
        pairs.push({
          ru: ru.word, ky: ky.word, sense, pos,
          ruTags: ru.tags,
          kyTags: ky.tags,
        });
      }
    }
  }

  return pairs;
}

/**
 * Normalize a Russian word: strip combining acute accent (U+0301)
 * and NFC-normalize.
 */
export function normalizeRussian(word: string): string {
  // Strip leading parenthetical English glosses e.g. "(calm down)успокаиваться"
  let cleaned = word.replace(/^\([^)]*\)\s*/g, "");
  // Remove combining acute accent (used for stress marks)
  cleaned = cleaned.replace(/\u0301/g, "");
  // NFC normalize
  return cleaned.normalize("NFC");
}

/** Map Wiktionary POS strings to our schema POS values. */
const POS_MAP: Record<string, string> = {
  noun: "noun",
  verb: "verb",
  adj: "adj",
  adv: "adv",
  name: "noun",
  pron: "pron",
  num: "num",
  conj: "conj",
  intj: "intj",
  postp: "post",
};

/**
 * Map a Wiktionary POS string to our schema's POS enum value.
 * Returns null for unknown POS values.
 */
export function mapWiktionaryPos(pos: string): string | null {
  if (!pos) return null;
  return POS_MAP[pos.toLowerCase()] ?? null;
}
