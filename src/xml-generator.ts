import type { DictionaryEntry } from "./schema";
import { classifyStem, generatePlural, generatePossessiveCaseForms, generateVerbForms, generateAttributiveForms, generatePluralCaseForms, generatePluralPossessiveCaseForms } from "./morphology";

export type DictDirection = "ru-ky" | "ky-ru" | "en-ky" | "ky-en";

export interface EnKyEntry {
  en: string;
  ky: string;
  sense: string;
  pos: string | null;
  pronunciation?: string;
  etymology?: string;
  frequency?: number;
  examples?: { ky: string; ru: string }[];
  wiktionaryUrl?: string;
}

const POS_LABELS: Record<string, string> = {
  noun: "сущ.",
  verb: "гл.",
  adj: "прил.",
  adv: "нареч.",
  pron: "мест.",
  post: "послел.",
  num: "числ.",
  conj: "союз",
  intj: "межд.",
};

const CASE_LABELS: Record<string, string> = {
  nominative: "Именительный",
  genitive: "Родительный",
  dative: "Дательный",
  accusative: "Винительный",
  locative: "Местный",
  ablative: "Исходный",
};

const CASE_ABBREV: Record<string, string> = {
  genitive: "род.",
  dative: "дат.",
  accusative: "вин.",
};

const CASE_ORDER = [
  "nominative",
  "genitive",
  "dative",
  "accusative",
  "locative",
  "ablative",
];

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function deduplicateCI(items: string[]): string[] {
  const seen = new Set<string>();
  return items.filter((t) => {
    const key = t.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Check if two Russian words share a long common prefix,
 * indicating they are likely morphological variants (aspect pairs,
 * noun/verb from same root, gendered pairs).
 */
function areStemRelated(a: string, b: string): boolean {
  const na = normalizeRu(a);
  const nb = normalizeRu(b);

  if (hasLongCommonPrefix(na, nb)) return true;

  // Try stripping common verb prefixes to catch pairs like
  // информировать / проинформировать
  const prefixes = [
    "про", "по", "за", "вы", "при", "пере", "на", "от", "из", "до", "раз", "об",
  ];
  for (const prefix of prefixes) {
    if (na.startsWith(prefix) && !nb.startsWith(prefix)) {
      if (hasLongCommonPrefix(na.slice(prefix.length), nb)) return true;
    }
    if (nb.startsWith(prefix) && !na.startsWith(prefix)) {
      if (hasLongCommonPrefix(na, nb.slice(prefix.length))) return true;
    }
  }

  return false;
}

function normalizeRu(word: string): string {
  return word
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/(ся|сь)$/, "");
}

function hasLongCommonPrefix(a: string, b: string): boolean {
  let common = 0;
  while (common < a.length && common < b.length && a[common] === b[common]) {
    common++;
  }
  const minLen = Math.min(a.length, b.length);
  return common >= 5 && common >= minLen * 0.4;
}

interface ScoredTranslation {
  text: string;
  pos: string;
  sourceCount: number;
}

/**
 * Score translations by source attestation count and deduplicate
 * stem-related Russian words (verb aspect pairs, noun/verb from same root).
 */
function scoreAndDedupTranslations(
  group: DictionaryEntry[],
  direction: DictDirection,
): ScoredTranslation[] {
  // Collect translations with source counts
  const translationData = new Map<string, { text: string; pos: string; sources: Set<string> }>();
  for (const entry of group) {
    const translation = direction === "ky-ru" ? entry.ru : entry.ky;
    const key = translation.toLowerCase();
    if (!translationData.has(key)) {
      translationData.set(key, { text: translation, pos: entry.pos, sources: new Set() });
    }
    translationData.get(key)!.sources.add(entry.source);
  }

  // Build scored list
  const scored: ScoredTranslation[] = [];
  for (const [, { text, pos, sources }] of translationData) {
    scored.push({ text, pos, sourceCount: sources.size });
  }

  // Sort by source count desc, then length asc (prefer shorter/simpler words)
  scored.sort((a, b) => {
    if (b.sourceCount !== a.sourceCount) return b.sourceCount - a.sourceCount;
    return a.text.length - b.text.length;
  });

  // Stem dedup: keep first of each stem cluster
  const result: ScoredTranslation[] = [];
  for (const item of scored) {
    if (!result.some((r) => areStemRelated(r.text, item.text))) {
      result.push(item);
    }
  }

  return result;
}

function collectIndexValues(entry: DictionaryEntry): Set<string> {
  const indices = new Set<string>();
  indices.add(entry.ru);
  indices.add(entry.ky);

  if (entry.morphology?.forms) {
    for (const value of Object.values(entry.morphology.forms)) {
      indices.add(value);
    }
  }
  if (entry.morphology?.pluralForms) {
    for (const value of Object.values(entry.morphology.pluralForms)) {
      indices.add(value);
    }
  }

  // Generate plural nominative + possessive + case forms at build time for indexing
  if (entry.pos === "noun") {
    const stem = classifyStem(entry.ky);
    indices.add(generatePlural(entry.ky, stem));
    for (const form of generatePossessiveCaseForms(entry.ky, stem)) {
      indices.add(form);
    }
    for (const form of generateAttributiveForms(entry.ky, stem)) {
      indices.add(form);
    }
    for (const form of generatePluralCaseForms(entry.ky, stem)) {
      indices.add(form);
    }
    for (const form of generatePluralPossessiveCaseForms(entry.ky, stem)) {
      indices.add(form);
    }
  }

  // Generate verb conjugation forms at build time for indexing
  if (entry.pos === "verb") {
    for (const form of generateVerbForms(entry.ky)) {
      indices.add(form);
    }
  }

  return indices;
}

function generateIndexElements(entry: DictionaryEntry, direction: DictDirection = "ru-ky"): string {
  const indices = collectIndexValues(entry);
  const title = direction === "ky-ru" ? entry.ky : entry.ru;
  return Array.from(indices)
    .map((v) => `<d:index d:value="${escapeXml(v)}" d:title="${escapeXml(title)}"/>`)
    .join("\n");
}

function generateCompactView(entry: DictionaryEntry, direction: DictDirection = "ru-ky"): string {
  const parts: string[] = [];
  const headword = direction === "ky-ru" ? entry.ky : entry.ru;
  const translation = direction === "ky-ru" ? entry.ru : entry.ky;

  parts.push(`<h1 class="hw">${escapeXml(headword)}</h1>`);

  if (entry.pronunciation) {
    parts.push(
      `<span class="pronunciation">${escapeXml(entry.pronunciation)}</span>`
    );
  }

  parts.push(
    `<span class="pos">${escapeXml(POS_LABELS[entry.pos] ?? entry.pos)}</span>`
  );

  // Brief plural form
  if (entry.morphology?.pluralForms?.nominative) {
    parts.push(
      `<span class="forms-brief">(мн. ${escapeXml(entry.morphology.pluralForms.nominative)})</span>`
    );
  }

  // First sense or translation word
  const firstSense = direction === "ky-ru"
    ? (entry.ru)
    : (entry.ky);
  parts.push(
    `<ol class="senses"><li>${escapeXml(firstSense)}</li></ol>`
  );

  // Brief morphology: genitive, dative, accusative
  if (entry.morphology?.forms) {
    const forms = entry.morphology.forms;
    const briefParts: string[] = [];
    for (const caseKey of ["genitive", "dative", "accusative"]) {
      if (forms[caseKey]) {
        briefParts.push(
          `${escapeXml(forms[caseKey])} (${CASE_ABBREV[caseKey]})`
        );
      }
    }
    if (briefParts.length > 0) {
      parts.push(
        `<p class="brief-morph">${briefParts.join(" \u00b7 ")}</p>`
      );
    }
  }

  // Brief rule
  if (entry.morphology?.rule) {
    parts.push(
      `<p class="brief-rule">${escapeXml(entry.morphology.rule)}</p>`
    );
  }

  return `<span d:priority="1">\n${parts.join("\n")}\n</span>`;
}

function generateFullView(entry: DictionaryEntry, direction: DictDirection = "ru-ky"): string {
  const sections: string[] = [];

  // Translation section
  if (direction === "ky-ru") {
    // For ky→ru: show Russian translation + senses as additional meanings
    const translations = [entry.ru, ...(entry.senses ?? [])];
    const unique = [...new Set(translations)];
    sections.push(
      `<div class="section">
<h3 class="section-header">Перевод</h3>
<ol class="senses">${unique.map((s) => `<li>${escapeXml(s)}</li>`).join("")}</ol>
</div>`
    );
  } else {
    // For ru→ky: show Kyrgyz translation, then senses as descriptions
    const items = [entry.ky, ...(entry.senses ?? [])];
    const unique = [...new Set(items)];
    sections.push(
      `<div class="section">
<h3 class="section-header">Перевод</h3>
<ol class="senses">${unique.map((s) => `<li>${escapeXml(s)}</li>`).join("")}</ol>
</div>`
    );
  }

  // Examples section
  if (entry.examples?.length) {
    const exampleItems = entry.examples
      .map(
        (ex) =>
          `<div class="example"><span class="ky">${escapeXml(ex.ky)}</span> — <span class="ru">${escapeXml(ex.ru)}</span></div>`
      )
      .join("\n");
    sections.push(
      `<div class="section">
<h3 class="section-header">Примеры</h3>
${exampleItems}
</div>`
    );
  }

  // Morphology section
  if (entry.morphology?.forms) {
    const forms = entry.morphology.forms;
    const pluralForms = entry.morphology.pluralForms;

    const rows = CASE_ORDER.filter(
      (c) => forms[c] || pluralForms?.[c]
    ).map((c) => {
      const singular = forms[c] ? escapeXml(forms[c]) : "";
      const plural = pluralForms?.[c] ? escapeXml(pluralForms[c]) : "";
      return `<tr><td>${CASE_LABELS[c]}</td><td>${singular}</td><td>${plural}</td></tr>`;
    });

    let morphHtml = `<div class="section">
<h3 class="section-header">Морфология</h3>
<table class="morph-table">
<tr><th>Падеж</th><th>Ед. число</th><th>Мн. число</th></tr>
${rows.join("\n")}
</table>`;

    if (entry.morphology.rule) {
      morphHtml += `\n<p class="morph-rule">${escapeXml(entry.morphology.rule)}</p>`;
    }

    morphHtml += "\n</div>";
    sections.push(morphHtml);
  }

  // Derivation section
  if (entry.derivation) {
    const items: string[] = [];
    if (entry.related?.length) {
      for (const word of entry.related) {
        const explanation = entry.derivation.explanation
          ? ` — ${escapeXml(entry.derivation.explanation)}`
          : "";
        items.push(`<li>${escapeXml(word)}${explanation}</li>`);
      }
    } else if (entry.derivation.explanation) {
      items.push(`<li>${escapeXml(entry.derivation.explanation)}</li>`);
    }
    if (items.length > 0) {
      sections.push(
        `<div class="section">
<h3 class="section-header">Словообразование</h3>
<ul class="derivations">${items.join("")}</ul>
</div>`
      );
    }
  }

  // Etymology section
  if (entry.etymology) {
    sections.push(
      `<div class="section">
<h3 class="section-header">Этимология</h3>
<p class="etymology">${escapeXml(entry.etymology)}</p>
</div>`
    );
  }

  // Wiktionary link
  if (entry.wiktionaryUrl) {
    sections.push(
      `<a class="wiktionary-link" href="${escapeXml(entry.wiktionaryUrl)}">Wiktionary ↗</a>`
    );
  }

  return `<div d:priority="2" class="full-entry">\n${sections.join("\n")}\n</div>`;
}

export function generateEntry(entry: DictionaryEntry, direction: DictDirection = "ru-ky"): string {
  const indices = generateIndexElements(entry, direction);
  const compact = generateCompactView(entry, direction);
  const full = generateFullView(entry, direction);
  const title = direction === "ky-ru" ? entry.ky : entry.ru;

  return `<d:entry id="${escapeXml(entry.id)}" d:title="${escapeXml(title)}">
${indices}
${compact}
${full}
</d:entry>`;
}

const POS_LABELS_EN: Record<string, string> = {
  noun: "n.",
  verb: "v.",
  adj: "adj.",
  adv: "adv.",
  pron: "pron.",
  post: "postp.",
  num: "num.",
  conj: "conj.",
  intj: "intj.",
};

const DICT_NAMES: Record<DictDirection, { title: string; desc: string }> = {
  "ru-ky": {
    title: "Орусча-кыргызча сөздүк",
    desc: "Орус тилинен кыргыз тилине котормолор, морфология маалыматы менен.",
  },
  "ky-ru": {
    title: "Кыргызско-русский словарь",
    desc: "Содержит переводы с кыргызского на русский язык с морфологической информацией.",
  },
  "en-ky": {
    title: "Англисче-кыргызча сөздүк",
    desc: "Wiktionary булагынан англис тилинен кыргыз тилине котормолор.",
  },
  "ky-en": {
    title: "Kyrgyz-English Dictionary",
    desc: "Kyrgyz to English translations sourced from Wiktionary.",
  },
};

export function generateFrontMatter(direction: DictDirection = "ru-ky"): string {
  const name = DICT_NAMES[direction];
  const isKy = direction === "ru-ky" || direction === "en-ky";
  const aboutHeader = isKy ? "Сөздүк жөнүндө" : direction === "ky-en" ? "About" : "О словаре";
  const sourcesHeader = isKy ? "Маалымат булактары" : direction === "ky-en" ? "Data Sources" : "Источники данных";
  const licenseHeader = isKy ? "Лицензия" : direction === "ky-en" ? "License" : "Лицензия";
  const forApp = isKy ? "macOS Dictionary.app үчүн." : direction === "ky-en" ? "for macOS Dictionary.app." : "для macOS Dictionary.app.";

  return `<d:entry id="front-matter" d:title="${name.title}">
<h1 class="hw">${name.title}</h1>
<div class="full-entry">
<div class="section">
<h3 class="section-header">${aboutHeader}</h3>
<p>${name.title} ${forApp}</p>
<p>${name.desc}</p>
</div>
<div class="section">
<h3 class="section-header">${sourcesHeader}</h3>
<ul>
<li>Wiktionary (CC BY-SA)</li>
<li>Apertium (GPL-3.0)</li>
<li>GoURMET (OPUS)</li>
<li>OpenRussian.org (CC BY-SA 4.0)</li>
<li>Manas-UdS (CC BY-NC-SA 4.0)</li>
</ul>
</div>
<div class="section">
<h3 class="section-header">${licenseHeader}</h3>
<p>CC BY-NC-SA 4.0</p>
</div>
</div>
</d:entry>`;
}

/**
 * Generate a merged d:entry for a group of entries sharing the same ky headword.
 * Used for ky-ru direction to avoid duplicate cards in Dictionary.app.
 */
function generateMergedEntry(group: DictionaryEntry[], direction: DictDirection): string {
  const primary = group[0];

  const headword = direction === "ky-ru" ? primary.ky : primary.ru;

  // Collect all index values from all entries, deduplicating
  const allValues = new Set<string>();
  for (const entry of group) {
    for (const v of collectIndexValues(entry)) {
      allValues.add(v);
    }
  }
  const indices = Array.from(allValues)
    .map((v) => `<d:index d:value="${escapeXml(v)}" d:title="${escapeXml(headword)}"/>`)
    .join("\n");

  // Compact view: single headword, merged translations
  const compactParts: string[] = [];
  compactParts.push(`<h1 class="hw">${escapeXml(headword)}</h1>`);

  if (primary.pronunciation) {
    compactParts.push(`<span class="pronunciation">${escapeXml(primary.pronunciation)}</span>`);
  }

  if (primary.morphology?.pluralForms?.nominative) {
    compactParts.push(
      `<span class="forms-brief">(мн. ${escapeXml(primary.morphology.pluralForms.nominative)})</span>`
    );
  }

  // Score translations by source attestation and deduplicate stem-related words
  const scoredTranslations = scoreAndDedupTranslations(group, direction);

  // Group deduped translations by POS for display
  const byPos = new Map<string, string[]>();
  for (const item of scoredTranslations) {
    if (!byPos.has(item.pos)) byPos.set(item.pos, []);
    byPos.get(item.pos)!.push(item.text);
  }

  // Render grouped by POS
  const posEntries = [...byPos.entries()];
  if (posEntries.length === 1) {
    // Single POS — simple list
    const [pos, translations] = posEntries[0];
    const posLabel = POS_LABELS[pos] ?? pos;
    compactParts.push(`<span class="pos">${escapeXml(posLabel)}</span>`);
    const sensesHtml = translations.map((s) => `<li>${escapeXml(s)}</li>`).join("");
    compactParts.push(`<ol class="senses">${sensesHtml}</ol>`);
  } else {
    // Multiple POS — group with labels
    const posLabels = posEntries.map(([p]) => POS_LABELS[p] ?? p);
    compactParts.push(`<span class="pos">${escapeXml(posLabels.join(", "))}</span>`);
    const parts: string[] = [];
    for (const [pos, translations] of posEntries) {
      const posLabel = POS_LABELS[pos] ?? pos;
      parts.push(`<li class="pos-group"><span class="pos-inline">${escapeXml(posLabel)}</span> ${translations.map((t) => escapeXml(t)).join(", ")}</li>`);
    }
    compactParts.push(`<ol class="senses">${parts.join("")}</ol>`);
  }

  const compact = `<span d:priority="1">\n${compactParts.join("\n")}\n</span>`;

  // Full view: merged sections
  const fullSections: string[] = [];

  // Translation section — use scored+deduped translations, add senses
  // Collect senses from all entries, dedup case-insensitively
  const allSenses = deduplicateCI(group.flatMap((e) => e.senses ?? []));

  // Group scored translations by POS (reuse from compact view)
  const fullByPos = new Map<string, string[]>();
  for (const item of scoredTranslations) {
    if (!fullByPos.has(item.pos)) fullByPos.set(item.pos, []);
    fullByPos.get(item.pos)!.push(item.text);
  }

  const fullPosEntries = [...fullByPos.entries()];
  if (fullPosEntries.length === 1) {
    const [, items] = fullPosEntries[0];
    const allItems = [...items, ...allSenses.filter((s) => !items.some((i) => i.toLowerCase() === s.toLowerCase()))];
    fullSections.push(
      `<div class="section">
<h3 class="section-header">Перевод</h3>
<ol class="senses">${allItems.map((s) => `<li>${escapeXml(s)}</li>`).join("")}</ol>
</div>`
    );
  } else {
    const parts: string[] = [];
    for (const [pos, items] of fullPosEntries) {
      const posLabel = POS_LABELS[pos] ?? pos;
      parts.push(`<p class="pos-label">${escapeXml(posLabel)}</p>
<ol class="senses">${items.map((s) => `<li>${escapeXml(s)}</li>`).join("")}</ol>`);
    }
    // Add extra senses not already covered
    const allTranslations = scoredTranslations.map((t) => t.text.toLowerCase());
    const extraSenses = allSenses.filter((s) => !allTranslations.includes(s.toLowerCase()));
    if (extraSenses.length > 0) {
      parts.push(`<ol class="senses">${extraSenses.map((s) => `<li>${escapeXml(s)}</li>`).join("")}</ol>`);
    }
    fullSections.push(
      `<div class="section">
<h3 class="section-header">Перевод</h3>
${parts.join("\n")}
</div>`
    );
  }

  // Examples — collect from all entries
  const allExamples = group.flatMap((e) => e.examples ?? []);
  if (allExamples.length > 0) {
    const exampleItems = allExamples
      .map((ex) => `<div class="example"><span class="ky">${escapeXml(ex.ky)}</span> — <span class="ru">${escapeXml(ex.ru)}</span></div>`)
      .join("\n");
    fullSections.push(
      `<div class="section">
<h3 class="section-header">Примеры</h3>
${exampleItems}
</div>`
    );
  }

  // Morphology — use primary entry's morphology
  if (primary.morphology?.forms) {
    const forms = primary.morphology.forms;
    const pluralForms = primary.morphology.pluralForms;
    const rows = CASE_ORDER.filter((c) => forms[c] || pluralForms?.[c]).map((c) => {
      const singular = forms[c] ? escapeXml(forms[c]) : "";
      const plural = pluralForms?.[c] ? escapeXml(pluralForms[c]) : "";
      return `<tr><td>${CASE_LABELS[c]}</td><td>${singular}</td><td>${plural}</td></tr>`;
    });
    let morphHtml = `<div class="section">
<h3 class="section-header">Морфология</h3>
<table class="morph-table">
<tr><th>Падеж</th><th>Ед. число</th><th>Мн. число</th></tr>
${rows.join("\n")}
</table>`;
    if (primary.morphology.rule) {
      morphHtml += `\n<p class="morph-rule">${escapeXml(primary.morphology.rule)}</p>`;
    }
    morphHtml += "\n</div>";
    fullSections.push(morphHtml);
  }

  // Etymology — first available
  const etymologyEntry = group.find((e) => e.etymology);
  if (etymologyEntry) {
    fullSections.push(
      `<div class="section">
<h3 class="section-header">Этимология</h3>
<p class="etymology">${escapeXml(etymologyEntry.etymology!)}</p>
</div>`
    );
  }

  // Wiktionary link
  if (primary.wiktionaryUrl) {
    fullSections.push(
      `<a class="wiktionary-link" href="${escapeXml(primary.wiktionaryUrl)}">Wiktionary ↗</a>`
    );
  }

  const full = `<div d:priority="2" class="full-entry">\n${fullSections.join("\n")}\n</div>`;

  return `<d:entry id="${escapeXml(primary.id)}" d:title="${escapeXml(headword)}">
${indices}
${compact}
${full}
</d:entry>`;
}

export function generateDictionary(entries: DictionaryEntry[], direction: DictDirection = "ru-ky"): string {
  const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<d:dictionary xmlns:d="http://www.apple.com/DTDs/DictionaryService-1.0.rng" xmlns="http://www.w3.org/1999/xhtml">`;

  const frontMatter = generateFrontMatter(direction);

  let entryXml: string;
  if (direction === "ky-ru") {
    // Group entries by Kyrgyz headword only (no POS) to enable
    // cross-POS stem dedup (e.g. уведомление noun + уведомить verb → one word)
    // Strip trailing dashes so "кара-" merges with "кара"
    const groups = new Map<string, DictionaryEntry[]>();
    for (const entry of entries) {
      const key = entry.ky.toLowerCase().replace(/-+$/, "");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(entry);
    }
    entryXml = [...groups.values()]
      .map((group) => generateMergedEntry(group, direction))
      .join("\n");
  } else {
    // ru-ky: group by Russian headword + POS
    const groups = new Map<string, DictionaryEntry[]>();
    for (const entry of entries) {
      const key = entry.ru.toLowerCase().replace(/-+$/, "") + "\0" + entry.pos;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(entry);
    }
    entryXml = [...groups.values()]
      .map((group) => generateMergedEntry(group, direction))
      .join("\n");
  }

  const footer = "</d:dictionary>";
  return `${xmlHeader}\n${frontMatter}\n${entryXml}\n${footer}\n`;
}

// --- English-Kyrgyz dictionary generation ---

function generateEnKyEntryXml(entry: EnKyEntry, index: number): string {
  const id = `en-ky-${index.toString().padStart(6, "0")}`;
  const posLabel = entry.pos ? (POS_LABELS_EN[entry.pos] ?? entry.pos) : "";

  const indexSet = new Set<string>([entry.en, entry.ky]);
  if (entry.pos === "noun") {
    const stem = classifyStem(entry.ky);
    indexSet.add(generatePlural(entry.ky, stem));
    for (const form of generatePossessiveCaseForms(entry.ky, stem)) {
      indexSet.add(form);
    }
    for (const form of generateAttributiveForms(entry.ky, stem)) {
      indexSet.add(form);
    }
    for (const form of generatePluralCaseForms(entry.ky, stem)) {
      indexSet.add(form);
    }
    for (const form of generatePluralPossessiveCaseForms(entry.ky, stem)) {
      indexSet.add(form);
    }
  }
  if (entry.pos === "verb") {
    for (const form of generateVerbForms(entry.ky)) {
      indexSet.add(form);
    }
  }
  const indices = Array.from(indexSet)
    .map((v) => `<d:index d:value="${escapeXml(v)}" d:title="${escapeXml(entry.en)}"/>`)
    .join("\n");

  // Compact view
  const compactParts: string[] = [];
  compactParts.push(`<h1 class="hw">${escapeXml(entry.en)}</h1>`);
  if (posLabel) compactParts.push(`<span class="pos">${escapeXml(posLabel)}</span>`);
  compactParts.push(`<ol class="senses"><li>${escapeXml(entry.ky)}</li></ol>`);

  const compact = `<span d:priority="1">\n${compactParts.join("\n")}\n</span>`;

  // Full view
  const sections: string[] = [];

  // Translation
  sections.push(
    `<div class="section">
<h3 class="section-header">Translation</h3>
<ol class="senses"><li>${escapeXml(entry.ky)}</li></ol>
</div>`
  );

  // Sense (from Wiktionary)
  if (entry.sense) {
    sections.push(`<p class="sense"><em>${escapeXml(entry.sense)}</em></p>`);
  }

  // Pronunciation
  if (entry.pronunciation) {
    sections.push(
      `<div class="section">
<h3 class="section-header">Pronunciation</h3>
<p class="pronunciation">${escapeXml(entry.pronunciation)}</p>
</div>`
    );
  }

  // Examples (ky-ru parallel sentences)
  if (entry.examples?.length) {
    const exItems = entry.examples
      .map(
        (ex) =>
          `<div class="example"><span class="ky">${escapeXml(ex.ky)}</span> — <span class="ru">${escapeXml(ex.ru)}</span></div>`
      )
      .join("\n");
    sections.push(
      `<div class="section">
<h3 class="section-header">Examples</h3>
${exItems}
</div>`
    );
  }

  // Frequency
  if (entry.frequency) {
    sections.push(
      `<p class="frequency">Corpus frequency: ${entry.frequency}</p>`
    );
  }

  // Etymology
  if (entry.etymology) {
    sections.push(
      `<div class="section">
<h3 class="section-header">Etymology</h3>
<p class="etymology">${escapeXml(entry.etymology)}</p>
</div>`
    );
  }

  // Wiktionary link
  if (entry.wiktionaryUrl) {
    sections.push(
      `<a class="wiktionary-link" href="${escapeXml(entry.wiktionaryUrl)}">Wiktionary ↗</a>`
    );
  }

  const full = `<div d:priority="2" class="full-entry">\n${sections.join("\n")}\n</div>`;

  return `<d:entry id="${escapeXml(id)}" d:title="${escapeXml(entry.en)}">
${indices}
${compact}
${full}
</d:entry>`;
}

function generateKyEnEntryXml(entry: EnKyEntry, index: number): string {
  const id = `ky-en-${index.toString().padStart(6, "0")}`;
  const posLabel = entry.pos ? (POS_LABELS_EN[entry.pos] ?? entry.pos) : "";

  const indexSet = new Set<string>([entry.ky, entry.en]);
  if (entry.pos === "noun") {
    const stem = classifyStem(entry.ky);
    indexSet.add(generatePlural(entry.ky, stem));
    for (const form of generatePossessiveCaseForms(entry.ky, stem)) {
      indexSet.add(form);
    }
    for (const form of generateAttributiveForms(entry.ky, stem)) {
      indexSet.add(form);
    }
    for (const form of generatePluralCaseForms(entry.ky, stem)) {
      indexSet.add(form);
    }
    for (const form of generatePluralPossessiveCaseForms(entry.ky, stem)) {
      indexSet.add(form);
    }
  }
  if (entry.pos === "verb") {
    for (const form of generateVerbForms(entry.ky)) {
      indexSet.add(form);
    }
  }
  const indices = Array.from(indexSet)
    .map((v) => `<d:index d:value="${escapeXml(v)}" d:title="${escapeXml(entry.ky)}"/>`)
    .join("\n");

  // Compact view — Kyrgyz headword, English translation
  const compactParts: string[] = [];
  compactParts.push(`<h1 class="hw">${escapeXml(entry.ky)}</h1>`);
  if (entry.pronunciation) {
    compactParts.push(`<span class="pronunciation">${escapeXml(entry.pronunciation)}</span>`);
  }
  if (posLabel) compactParts.push(`<span class="pos">${escapeXml(posLabel)}</span>`);
  compactParts.push(`<ol class="senses"><li>${escapeXml(entry.en)}</li></ol>`);

  const compact = `<span d:priority="1">\n${compactParts.join("\n")}\n</span>`;

  // Full view
  const sections: string[] = [];

  // Translation
  sections.push(
    `<div class="section">
<h3 class="section-header">Translation</h3>
<ol class="senses"><li>${escapeXml(entry.en)}</li></ol>
</div>`
  );

  // Sense
  if (entry.sense) {
    sections.push(`<p class="sense"><em>${escapeXml(entry.sense)}</em></p>`);
  }

  // Examples
  if (entry.examples?.length) {
    const exItems = entry.examples
      .map(
        (ex) =>
          `<div class="example"><span class="ky">${escapeXml(ex.ky)}</span> — <span class="ru">${escapeXml(ex.ru)}</span></div>`
      )
      .join("\n");
    sections.push(
      `<div class="section">
<h3 class="section-header">Examples</h3>
${exItems}
</div>`
    );
  }

  // Frequency
  if (entry.frequency) {
    sections.push(
      `<p class="frequency">Corpus frequency: ${entry.frequency}</p>`
    );
  }

  // Etymology
  if (entry.etymology) {
    sections.push(
      `<div class="section">
<h3 class="section-header">Etymology</h3>
<p class="etymology">${escapeXml(entry.etymology)}</p>
</div>`
    );
  }

  // Wiktionary link
  if (entry.wiktionaryUrl) {
    sections.push(
      `<a class="wiktionary-link" href="${escapeXml(entry.wiktionaryUrl)}">Wiktionary ↗</a>`
    );
  }

  const full = `<div d:priority="2" class="full-entry">\n${sections.join("\n")}\n</div>`;

  return `<d:entry id="${escapeXml(id)}" d:title="${escapeXml(entry.ky)}">
${indices}
${compact}
${full}
</d:entry>`;
}

/**
 * Generate a merged d:entry for a group of EnKyEntry sharing the same headword.
 * direction determines which field is the headword (en for en-ky, ky for ky-en).
 */
function generateMergedEnKyEntry(
  group: EnKyEntry[],
  direction: "en-ky" | "ky-en",
  startIndex: number,
): string {
  const primary = group[0];
  const id = direction === "en-ky"
    ? `en-ky-${startIndex.toString().padStart(6, "0")}`
    : `ky-en-${startIndex.toString().padStart(6, "0")}`;

  const headword = direction === "en-ky" ? primary.en : primary.ky;
  const titleField = headword;

  // Collect all indices from all entries
  const allIndexValues = new Set<string>();
  for (const entry of group) {
    allIndexValues.add(entry.en);
    allIndexValues.add(entry.ky);
    if (entry.pos === "noun") {
      const stem = classifyStem(entry.ky);
      allIndexValues.add(generatePlural(entry.ky, stem));
      for (const form of generatePossessiveCaseForms(entry.ky, stem)) allIndexValues.add(form);
      for (const form of generateAttributiveForms(entry.ky, stem)) allIndexValues.add(form);
      for (const form of generatePluralCaseForms(entry.ky, stem)) allIndexValues.add(form);
      for (const form of generatePluralPossessiveCaseForms(entry.ky, stem)) allIndexValues.add(form);
    }
    if (entry.pos === "verb") {
      for (const form of generateVerbForms(entry.ky)) allIndexValues.add(form);
    }
  }
  const indices = Array.from(allIndexValues)
    .map((v) => `<d:index d:value="${escapeXml(v)}" d:title="${escapeXml(titleField)}"/>`)
    .join("\n");

  // Collect unique POS labels
  const posLabels = [...new Set(group.map((e) => e.pos ? (POS_LABELS_EN[e.pos] ?? e.pos) : "").filter(Boolean))];

  // Compact view
  const compactParts: string[] = [];
  compactParts.push(`<h1 class="hw">${escapeXml(headword)}</h1>`);
  if (primary.pronunciation) {
    compactParts.push(`<span class="pronunciation">${escapeXml(primary.pronunciation)}</span>`);
  }
  if (posLabels.length > 0) {
    compactParts.push(`<span class="pos">${escapeXml(posLabels.join(", "))}</span>`);
  }

  // Merged translations
  const translations = direction === "en-ky"
    ? [...new Set(group.map((e) => e.ky))]
    : [...new Set(group.map((e) => e.en))];
  compactParts.push(`<ol class="senses">${translations.map((t) => `<li>${escapeXml(t)}</li>`).join("")}</ol>`);

  const compact = `<span d:priority="1">\n${compactParts.join("\n")}\n</span>`;

  // Full view
  const sections: string[] = [];

  // Translation section
  sections.push(
    `<div class="section">
<h3 class="section-header">Translation</h3>
<ol class="senses">${translations.map((t) => `<li>${escapeXml(t)}</li>`).join("")}</ol>
</div>`
  );

  // Senses from all entries
  const allSenses = [...new Set(group.map((e) => e.sense).filter(Boolean))];
  if (allSenses.length > 0) {
    sections.push(`<p class="sense"><em>${allSenses.map((s) => escapeXml(s)).join("; ")}</em></p>`);
  }

  // Pronunciation
  if (primary.pronunciation) {
    sections.push(
      `<div class="section">
<h3 class="section-header">Pronunciation</h3>
<p class="pronunciation">${escapeXml(primary.pronunciation)}</p>
</div>`
    );
  }

  // Examples from all entries
  const allExamples = group.flatMap((e) => e.examples ?? []);
  if (allExamples.length > 0) {
    const exItems = allExamples
      .map((ex) => `<div class="example"><span class="ky">${escapeXml(ex.ky)}</span> — <span class="ru">${escapeXml(ex.ru)}</span></div>`)
      .join("\n");
    sections.push(
      `<div class="section">
<h3 class="section-header">Examples</h3>
${exItems}
</div>`
    );
  }

  // Frequency — max from group
  const maxFreq = Math.max(...group.map((e) => e.frequency ?? 0));
  if (maxFreq > 0) {
    sections.push(`<p class="frequency">Corpus frequency: ${maxFreq}</p>`);
  }

  // Etymology — first available
  const etymEntry = group.find((e) => e.etymology);
  if (etymEntry) {
    sections.push(
      `<div class="section">
<h3 class="section-header">Etymology</h3>
<p class="etymology">${escapeXml(etymEntry.etymology!)}</p>
</div>`
    );
  }

  // Wiktionary link
  if (primary.wiktionaryUrl) {
    sections.push(`<a class="wiktionary-link" href="${escapeXml(primary.wiktionaryUrl)}">Wiktionary ↗</a>`);
  }

  const full = `<div d:priority="2" class="full-entry">\n${sections.join("\n")}\n</div>`;

  return `<d:entry id="${escapeXml(id)}" d:title="${escapeXml(titleField)}">
${indices}
${compact}
${full}
</d:entry>`;
}

export function generateKyEnDictionary(entries: EnKyEntry[]): string {
  const header = `<?xml version="1.0" encoding="UTF-8"?>
<d:dictionary xmlns:d="http://www.apple.com/DTDs/DictionaryService-1.0.rng" xmlns="http://www.w3.org/1999/xhtml">`;

  const frontMatter = generateFrontMatter("ky-en");

  // Group by Kyrgyz headword + POS (strip trailing dashes)
  const groups = new Map<string, EnKyEntry[]>();
  for (const entry of entries) {
    const key = entry.ky.toLowerCase().replace(/-+$/, "") + "\0" + (entry.pos ?? "");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(entry);
  }
  let idx = 0;
  const entryXml = [...groups.values()]
    .map((group) => {
      const xml = generateMergedEnKyEntry(group, "ky-en", idx);
      idx++;
      return xml;
    })
    .join("\n");

  const footer = "</d:dictionary>";
  return `${header}\n${frontMatter}\n${entryXml}\n${footer}\n`;
}

export function generateEnKyDictionary(entries: EnKyEntry[]): string {
  const header = `<?xml version="1.0" encoding="UTF-8"?>
<d:dictionary xmlns:d="http://www.apple.com/DTDs/DictionaryService-1.0.rng" xmlns="http://www.w3.org/1999/xhtml">`;

  const frontMatter = generateFrontMatter("en-ky");

  // Group by English headword + POS (strip trailing dashes)
  const groups = new Map<string, EnKyEntry[]>();
  for (const entry of entries) {
    const key = entry.en.toLowerCase().replace(/-+$/, "") + "\0" + (entry.pos ?? "");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(entry);
  }
  let idx = 0;
  const entryXml = [...groups.values()]
    .map((group) => {
      const xml = generateMergedEnKyEntry(group, "en-ky", idx);
      idx++;
      return xml;
    })
    .join("\n");

  const footer = "</d:dictionary>";
  return `${header}\n${frontMatter}\n${entryXml}\n${footer}\n`;
}
