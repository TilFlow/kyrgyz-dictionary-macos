import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import type { DictionaryEntry } from "../src/schema";

const ENTRIES_DIR = join(import.meta.dir, "..", "entries");

const manualEntries: DictionaryEntry[] = [
  // Function words (18)
  { id: "ru-с-manual-001", ru: "с, вместе с", ky: "менен", pos: "post", source: "manual", senses: ["с (кем-л.)", "вместе с", "посредством"] },
  { id: "ru-говоря-manual-001", ru: "говоря, что", ky: "деп", pos: "conj", source: "manual", senses: ["говоря, что (частица)", "цитирование"] },
  { id: "ru-согласно-manual-001", ru: "согласно", ky: "ылайык", pos: "post", source: "manual", senses: ["согласно", "в соответствии с"] },
  { id: "ru-о-manual-001", ru: "о, насчёт", ky: "тууралуу", pos: "post", source: "manual", senses: ["о", "насчёт", "относительно"] },
  { id: "ru-до-manual-001", ru: "до", ky: "чейин", pos: "post", source: "manual", senses: ["до (предел)", "вплоть до"] },
  { id: "ru-только-manual-001", ru: "только", ky: "гана", pos: "conj", source: "manual", senses: ["только", "лишь", "всего лишь"] },
  { id: "ru-теперь-manual-001", ru: "теперь", ky: "эми", pos: "adv", source: "manual", senses: ["теперь", "сейчас", "а теперь"] },
  { id: "ru-свой-manual-001", ru: "свой", ky: "өз", pos: "pron", source: "manual", senses: ["свой", "сам", "собственный"] },
  { id: "ru-нужно-manual-001", ru: "нужно", ky: "керек", pos: "adj", source: "manual", senses: ["нужно", "необходимо", "надо"] },
  { id: "ru-менее-manual-001", ru: "менее", ky: "кем", pos: "adj", source: "manual", senses: ["менее", "меньше", "не менее (кем эмес)"] },
  { id: "ru-всегда-manual-001", ru: "всегда", ky: "дайым", pos: "adv", source: "manual", senses: ["всегда", "постоянно", "неизменно"] },
  { id: "ru-кстати-manual-001", ru: "кстати", ky: "баса", pos: "adv", source: "manual", senses: ["кстати", "к тому же", "между прочим"] },
  { id: "ru-простой-manual-001", ru: "простой", ky: "жөн", pos: "adj", source: "manual", senses: ["простой", "обычный", "напрасно (жөн эле)"] },
  { id: "ru-принятый-manual-001", ru: "принятый", ky: "кабыл", pos: "adj", source: "manual", senses: ["принятый", "принимать (кабыл алуу)"] },
  { id: "ru-стоящий-manual-001", ru: "стоящий", ky: "турган", pos: "adj", source: "manual", senses: ["стоящий", "находящийся (причастие)"] },
  { id: "ru-вследствие-manual-001", ru: "вследствие", ky: "улам", pos: "post", source: "manual", senses: ["вследствие", "из-за", "по причине"] },
  { id: "ru-момент-manual-001", ru: "момент", ky: "учур", pos: "noun", source: "manual", senses: ["момент", "время", "пора"] },
  { id: "ru-приходя-manual-001", ru: "приходя", ky: "келе", pos: "verb", source: "manual", senses: ["приходя (деепричастие)", "келе жатат = приближается"] },

  // Content words (14)
  { id: "ru-чистить-manual-001", ru: "чистить", ky: "тазалоо", pos: "verb", source: "manual", senses: ["чистить", "очищать", "убирать"] },
  { id: "ru-один-manual-001", ru: "один из", ky: "бири", pos: "pron", source: "manual", senses: ["один из", "некоторый", "кто-то"] },
  { id: "ru-равный-manual-001", ru: "равный", ky: "тете", pos: "adj", source: "manual", senses: ["равный", "эквивалентный", "одинаковый"] },
  { id: "ru-теснота-manual-001", ru: "теснота", ky: "тардык", pos: "noun", source: "manual", senses: ["теснота", "стеснённость", "затруднение"] },
  { id: "ru-нетерпение-manual-001", ru: "нетерпение", ky: "чыдамсыздык", pos: "noun", source: "manual", senses: ["нетерпение", "нетерпеливость"] },
  { id: "ru-полный-manual-001", ru: "полный", ky: "толук", pos: "adj", source: "manual", senses: ["полный", "целый", "полностью"] },
  { id: "ru-маленький-manual-001", ru: "маленький", ky: "чакан", pos: "adj", source: "manual", senses: ["маленький", "небольшой", "компактный"] },
  { id: "ru-поддержка-manual-001", ru: "поддержка", ky: "колдоо", pos: "noun", source: "manual", senses: ["поддержка", "помощь", "содействие"] },
  { id: "ru-встреча-manual-001", ru: "встреча", ky: "жолугушуу", pos: "verb", source: "manual", senses: ["встречаться", "встреча"] },
  { id: "ru-делание-manual-001", ru: "делание", ky: "кылуу", pos: "verb", source: "manual", senses: ["делать", "совершать", "кылып = делая"] },
  { id: "ru-обслуживать-manual-001", ru: "обслуживать", ky: "тейлөө", pos: "verb", source: "manual", senses: ["обслуживать", "ухаживать"] },
  { id: "ru-именуемый-manual-001", ru: "именуемый", ky: "аттуу", pos: "adj", source: "manual", senses: ["именуемый", "по имени", "имеющий имя"] },
  { id: "ru-Коран-manual-001", ru: "Коран", ky: "куран", pos: "noun", source: "manual", senses: ["Коран"] },
  { id: "ru-поклонение-manual-001", ru: "поклонение", ky: "ибадат", pos: "noun", source: "manual", senses: ["поклонение", "молитва", "богослужение"] },
];

function getLetterKey(ru: string): string {
  return ru[0].toLowerCase();
}

// Group entries by first letter
const grouped = new Map<string, DictionaryEntry[]>();
for (const entry of manualEntries) {
  const letter = getLetterKey(entry.ru);
  if (!grouped.has(letter)) grouped.set(letter, []);
  grouped.get(letter)!.push(entry);
}

let totalAdded = 0;
let totalSkipped = 0;

for (const [letter, newEntries] of grouped) {
  const filePath = join(ENTRIES_DIR, `${letter}.json`);

  let existing: DictionaryEntry[] = [];
  if (existsSync(filePath)) {
    existing = JSON.parse(readFileSync(filePath, "utf-8"));
  }

  const existingIds = new Set(existing.map((e) => e.id));

  let added = 0;
  for (const entry of newEntries) {
    if (existingIds.has(entry.id)) {
      console.log(`  SKIP (duplicate): ${entry.id}`);
      totalSkipped++;
    } else {
      existing.push(entry);
      added++;
      totalAdded++;
      console.log(`  ADD: ${entry.id} (${entry.ru} → ${entry.ky})`);
    }
  }

  if (added > 0) {
    writeFileSync(filePath, JSON.stringify(existing, null, 2) + "\n");
    console.log(`  Wrote ${filePath} (${existing.length} entries total)\n`);
  }
}

console.log(`\nDone. Added: ${totalAdded}, Skipped: ${totalSkipped}`);
