/**
 * Parser for Apertium LEXC format files.
 * Extracts lemmas and their parts of speech from LEXICON sections.
 */

export interface LexcEntry {
  lemma: string;
  pos: string;
}

/**
 * Map a LEXC continuation class to a simplified POS tag.
 * Returns null if the class doesn't map to a known POS.
 */
export function mapContinuationClass(cls: string): string | null {
  // Order matters: check more specific patterns before generic ones
  if (/Interj/i.test(cls)) return "intj";
  if (/Postadv/i.test(cls)) return "adv";
  if (/Post/i.test(cls)) return "post";
  if (/Pron/i.test(cls)) return "pron";
  if (/Adv/i.test(cls)) return "adv";
  if (/Noun/i.test(cls) || /N-/.test(cls) || /^N1/.test(cls)) return "noun";
  if (/Verb/i.test(cls) || /V-/.test(cls) || /VAUX/.test(cls)) return "verb";
  if (/Adj/i.test(cls) || /^A[1-6]$/.test(cls) || /^A[1-6]\b/.test(cls))
    return "adj";
  if (/Num/i.test(cls)) return "num";
  if (/Conj/i.test(cls) || /^CC$/.test(cls) || /^CA$/.test(cls) || /^CS$/.test(cls))
    return "conj";
  if (/Cop/i.test(cls)) return "verb";
  return null;
}

/**
 * Parse LEXC file content and extract deduplicated lemmas with POS tags.
 *
 * Skips:
 * - Empty lines
 * - Comment lines (starting with !)
 * - LEXICON header lines
 * - Lines with multichar symbol tags (%<...%>) in the lemma (morphological rules, not lexical entries)
 * - Entries whose continuation class doesn't map to a known POS
 *
 * Deduplicates by lemma, keeping the first POS encountered.
 */
export function parseLexc(content: string): LexcEntry[] {
  const seen = new Map<string, string>();
  const lines = content.split("\n");

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Skip empty lines, comments, LEXICON headers, and multichar symbol defs
    if (!line) continue;
    if (line.startsWith("!")) continue;
    if (line.startsWith("LEXICON")) continue;
    if (line.startsWith("Multichar_Symbols")) continue;
    if (line.startsWith("%")) continue;

    // Must contain a semicolon to be an entry line
    if (!line.includes(";")) continue;

    // Extract the part before the semicolon
    const beforeSemicolon = line.split(";")[0].trim();
    if (!beforeSemicolon) continue;

    // Replace escaped spaces with a placeholder before splitting by whitespace
    const placeholder = "\x00";
    const escaped = beforeSemicolon.replace(/% /g, placeholder);

    // Split into tokens by whitespace
    const tokens = escaped.split(/\s+/);
    if (tokens.length < 2) continue;

    // Restore escaped spaces in the entry part
    const entryPart = tokens[0].replace(new RegExp(placeholder, "g"), "% ");
    const continuationClass = tokens[tokens.length - 1];

    // Extract lemma: part before ':' or the whole thing if no ':'
    let lemma: string;
    if (entryPart.includes(":")) {
      lemma = entryPart.split(":")[0];
    } else {
      lemma = entryPart;
    }

    // Skip entries with morphological tags in the lemma (e.g., мен%<prn%>%<pers%>...)
    if (lemma.includes("%<") || lemma.includes("%>")) continue;

    // Clean up escaped spaces: replace '% ' with ' '
    lemma = lemma.replace(/% /g, " ");

    // Skip empty lemmas
    if (!lemma) continue;

    // Map continuation class to POS
    const pos = mapContinuationClass(continuationClass);
    if (!pos) continue;

    // Deduplicate: keep first POS encountered
    if (!seen.has(lemma)) {
      seen.set(lemma, pos);
    }
  }

  return Array.from(seen.entries()).map(([lemma, pos]) => ({ lemma, pos }));
}
