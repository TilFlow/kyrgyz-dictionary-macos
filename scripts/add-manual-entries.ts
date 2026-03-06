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

  // === Batch 2: from multi-site audit (o.kg, mega24.kg, nbkr.kg, 24.kg) ===

  // Function words / particles (8)
  { id: "ru-для-manual-001", ru: "для", ky: "үчүн", pos: "post", source: "manual", senses: ["для", "ради", "за (послелог)"] },
  { id: "ru-к-manual-001", ru: "к, по случаю", ky: "карата", pos: "post", source: "manual", senses: ["к", "по отношению к", "по случаю"] },
  { id: "ru-по-manual-001", ru: "по, в области", ky: "боюнча", pos: "post", source: "manual", senses: ["по", "согласно", "в области"] },
  { id: "ru-через-manual-001", ru: "через", ky: "аркылуу", pos: "post", source: "manual", senses: ["через", "посредством", "с помощью"] },
  { id: "ru-именно-manual-001", ru: "именно", ky: "эле", pos: "conj", source: "manual", senses: ["именно", "только что", "ведь", "-же"] },
  { id: "ru-также-manual-001", ru: "также", ky: "ошондой", pos: "adv", source: "manual", senses: ["также", "так же", "такой же"] },
  { id: "ru-после-manual-001", ru: "после", ky: "кийин", pos: "post", source: "manual", senses: ["после", "потом", "затем"] },
  { id: "ru-поэтому-manual-001", ru: "поэтому", ky: "ошондуктан", pos: "conj", source: "manual", senses: ["поэтому", "вследствие этого", "по этой причине"] },

  // Content words (15)
  { id: "ru-личный-manual-001", ru: "личный", ky: "жеке", pos: "adj", source: "manual", senses: ["личный", "частный", "персональный", "индивидуальный"] },
  { id: "ru-тариф-manual-001", ru: "тариф", ky: "тариф", pos: "noun", source: "manual", senses: ["тариф", "расценка", "ставка"] },
  { id: "ru-связь-manual-001", ru: "связь", ky: "байланыш", pos: "noun", source: "manual", senses: ["связь", "контакт", "коммуникация", "отношение"] },
  { id: "ru-мобильный-manual-001", ru: "мобильный", ky: "мобилдик", pos: "adj", source: "manual", senses: ["мобильный", "подвижный"] },
  { id: "ru-Бишкек-manual-001", ru: "Бишкек", ky: "бишкек", pos: "noun", source: "manual", senses: ["Бишкек (столица Кыргызстана)"] },
  { id: "ru-оператор-manual-001", ru: "оператор", ky: "оператор", pos: "noun", source: "manual", senses: ["оператор", "оператор связи"] },
  { id: "ru-Кыргызстан-manual-001", ru: "Кыргызстан", ky: "кыргызстан", pos: "noun", source: "manual", senses: ["Кыргызстан", "Киргизия"] },
  { id: "ru-электронный-manual-001", ru: "электронный", ky: "электрондук", pos: "adj", source: "manual", senses: ["электронный", "цифровой"] },
  { id: "ru-высший-manual-001", ru: "высший", ky: "жогорку", pos: "adj", source: "manual", senses: ["высший", "верхний", "высокий"] },
  { id: "ru-обеспеченный-manual-001", ru: "обеспеченный", ky: "камсыз", pos: "adj", source: "manual", senses: ["обеспеченный", "камсыз кылуу = обеспечивать"] },
  { id: "ru-устойчивый-manual-001", ru: "устойчивый", ky: "туруктуу", pos: "adj", source: "manual", senses: ["устойчивый", "стабильный", "постоянный"] },
  { id: "ru-мера-manual-001", ru: "мера", ky: "чара", pos: "noun", source: "manual", senses: ["мера", "мероприятие", "средство"] },
  { id: "ru-пособие-manual-001", ru: "пособие", ky: "жөлөкпул", pos: "noun", source: "manual", senses: ["пособие", "стипендия", "дотация"] },
  { id: "ru-платёж-manual-001", ru: "платёж", ky: "төлөм", pos: "noun", source: "manual", senses: ["платёж", "оплата", "взнос"] },
  { id: "ru-постановление-manual-001", ru: "постановление", ky: "токтом", pos: "noun", source: "manual", senses: ["постановление", "решение", "указ"] },

  // Batch 3: NBKR / official-legal terminology (24)
  // Adjectives/derived
  { id: "ru-государственный-manual-001", ru: "государственный", ky: "мамлекеттик", pos: "adj", source: "manual", senses: ["государственный", "мамлекеттик тил = государственный язык"] },
  { id: "ru-соответствующий-manual-001", ru: "соответствующий", ky: "тиешелүү", pos: "adj", source: "manual", senses: ["соответствующий", "надлежащий", "относящийся"] },
  { id: "ru-единый-manual-001", ru: "единый", ky: "бирдиктүү", pos: "adj", source: "manual", senses: ["единый", "единообразный", "общий"] },
  { id: "ru-эффективный-manual-001", ru: "эффективный", ky: "натыйжалуу", pos: "adj", source: "manual", senses: ["эффективный", "результативный", "продуктивный"] },
  { id: "ru-главный-manual-001", ru: "главный", ky: "башкы", pos: "adj", source: "manual", senses: ["главный", "основной", "ведущий"] },
  { id: "ru-конституционный-manual-001", ru: "конституционный", ky: "конституциялык", pos: "adj", source: "manual", senses: ["конституционный"] },
  { id: "ru-кредитный-manual-001", ru: "кредитный", ky: "кредиттик", pos: "adj", source: "manual", senses: ["кредитный", "кредиттик саясат = кредитная политика"] },
  { id: "ru-бухгалтерский-manual-001", ru: "бухгалтерский", ky: "бухгалтердик", pos: "adj", source: "manual", senses: ["бухгалтерский", "бухгалтердик эсеп = бухгалтерский учёт"] },
  { id: "ru-нижеследующий-manual-001", ru: "нижеследующий", ky: "төмөндөгү", pos: "adj", source: "manual", senses: ["нижеследующий", "следующий (перечисление)"] },
  { id: "ru-независимый-manual-001", ru: "независимый", ky: "көз карандысыз", pos: "adj", source: "manual", senses: ["независимый", "самостоятельный"] },
  { id: "ru-самостоятельный-manual-001", ru: "самостоятельный", ky: "өз алдынча", pos: "adj", source: "manual", senses: ["самостоятельный", "самостоятельно", "независимый"] },
  // Nouns
  { id: "ru-полномочие-manual-001", ru: "полномочие", ky: "ыйгарым укук", pos: "noun", source: "manual", senses: ["полномочие", "компетенция", "ыйгарым укуктар = полномочия"] },
  { id: "ru-эмиссия-manual-001", ru: "эмиссия", ky: "эмиссия", pos: "noun", source: "manual", senses: ["эмиссия", "выпуск (денег, ценных бумаг)"] },
  { id: "ru-отчётность-manual-001", ru: "отчётность", ky: "отчеттуулук", pos: "noun", source: "manual", senses: ["отчётность", "отчёт"] },
  { id: "ru-предпосылка-manual-001", ru: "предпосылка", ky: "өбөлгө", pos: "noun", source: "manual", senses: ["предпосылка", "условие", "өбөлгө түзүү = создать условия"] },
  // Verbs
  { id: "ru-проведение-manual-001", ru: "проведение", ky: "жүргүзүү", pos: "verb", source: "manual", senses: ["проведение", "вести", "осуществлять (саясат жүргүзүү = проводить политику)"] },
  { id: "ru-достижение-manual-001", ru: "достижение", ky: "жетишүү", pos: "verb", source: "manual", senses: ["достижение", "достигать", "добиваться"] },
  { id: "ru-выполнение-manual-001", ru: "выполнение", ky: "аткаруу", pos: "verb", source: "manual", senses: ["выполнение", "исполнять", "осуществлять"] },
  { id: "ru-содействовать-manual-001", ru: "содействовать", ky: "көмөктөшүү", pos: "verb", source: "manual", senses: ["содействовать", "помогать", "способствовать"] },
  // Postpositions/idiomatic
  { id: "ru-посредством-manual-001", ru: "посредством, со стороны", ky: "тарабынан", pos: "post", source: "manual", senses: ["со стороны (кого-л.)", "посредством", "от имени"] },
  { id: "ru-осуществлять-manual-001", ru: "осуществлять", ky: "жүзөгө ашыруу", pos: "verb", source: "manual", senses: ["осуществлять", "реализовать", "жүзөгө ашыруу = претворять в жизнь"] },
  { id: "ru-регулировать-manual-001", ru: "регулировать", ky: "жөнгө салуу", pos: "verb", source: "manual", senses: ["регулировать", "упорядочивать", "жөнгө салуу = привести в порядок"] },
  { id: "ru-надзор-manual-001", ru: "надзор", ky: "көзөмөл", pos: "noun", source: "manual", senses: ["надзор", "контроль", "наблюдение", "көзөмөлдүк = контрольный орган"] },
  { id: "ru-цель-manual-002", ru: "ставить цель", ky: "алдына коюу", pos: "verb", source: "manual", senses: ["ставить цель", "ставить перед собой задачу"] },
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
