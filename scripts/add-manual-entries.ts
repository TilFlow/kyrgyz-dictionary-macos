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

  // === Batch 4: o.kg tariff + NBKR legal status + AML sector report + Binance/MEGA announcement ===

  // Postpositions / function words
  { id: "ru-внутри-manual-001", ru: "внутри, в течение", ky: "ичинде", pos: "post", source: "manual", senses: ["внутри", "в течение", "среди", "в пределах"] },
  { id: "ru-рамка-manual-001", ru: "рамка, рамки", ky: "алкак", pos: "noun", source: "manual", senses: ["рамка", "рамки", "алкагында = в рамках"] },
  { id: "ru-врамках-manual-001", ru: "в рамках", ky: "алкагында", pos: "post", source: "manual", senses: ["в рамках", "в пределах", "в контексте"] },
  { id: "ru-дальше-manual-001", ru: "дальше, туда", ky: "ары", pos: "adv", source: "manual", senses: ["дальше", "туда", "впредь", "ары жак = та сторона"] },

  // Finance / economics
  { id: "ru-финансовый-manual-001", ru: "финансовый", ky: "финансылык", pos: "adj", source: "manual", senses: ["финансовый", "финансылык сектор = финансовый сектор"] },
  { id: "ru-финансы-manual-001", ru: "финансы", ky: "финансы", pos: "noun", source: "manual", senses: ["финансы", "денежные средства"] },
  { id: "ru-сектор-manual-001", ru: "сектор", ky: "сектор", pos: "noun", source: "manual", senses: ["сектор", "отрасль", "область"] },
  { id: "ru-секторальный-manual-001", ru: "секторальный", ky: "сектордук", pos: "adj", source: "manual", senses: ["секторальный", "отраслевой"] },
  { id: "ru-легализация-manual-001", ru: "легализация", ky: "легализациялоо", pos: "verb", source: "manual", senses: ["легализовать", "узаконить", "отмывание (денег)"] },
  { id: "ru-легализация-manual-002", ru: "отмывание (денег)", ky: "легалдаштыруу", pos: "verb", source: "manual", senses: ["легализовать", "отмывать (деньги)", "адалдоо = отмывание"] },

  // Legal / regulatory
  { id: "ru-нормативный-manual-001", ru: "нормативный", ky: "ченемдик", pos: "adj", source: "manual", senses: ["нормативный", "ченемдик укуктук акт = нормативный правовой акт"] },
  { id: "ru-срок-manual-001", ru: "срок", ky: "мөөнөт", pos: "noun", source: "manual", senses: ["срок", "период", "мөөнөтү = срок (притяж.)"] },
  { id: "ru-принадлежащий-manual-001", ru: "принадлежащий", ky: "таандык", pos: "adj", source: "manual", senses: ["принадлежащий", "относящийся", "таандык болуу = принадлежать"] },
  { id: "ru-бенефициар-manual-001", ru: "бенефициар", ky: "бенефициар", pos: "noun", source: "manual", senses: ["бенефициар", "бенефициарный владелец", "выгодоприобретатель"] },
  { id: "ru-идентификация-manual-001", ru: "идентификация", ky: "идентификациялоо", pos: "verb", source: "manual", senses: ["идентифицировать", "установить личность"] },
  { id: "ru-верификация-manual-001", ru: "верификация", ky: "верификациялоо", pos: "verb", source: "manual", senses: ["верифицировать", "проверять подлинность"] },

  // Security / AML
  { id: "ru-уязвимость-manual-001", ru: "уязвимость", ky: "чабалдык", pos: "noun", source: "manual", senses: ["уязвимость", "слабость", "слабое место"] },
  { id: "ru-безопасный-manual-001", ru: "безопасный", ky: "коопсуз", pos: "adj", source: "manual", senses: ["безопасный", "коопсуздук = безопасность"] },

  // Telecom / tech
  { id: "ru-линия-manual-001", ru: "линия", ky: "линия", pos: "noun", source: "manual", senses: ["линия", "направление", "линия связи"] },
  { id: "ru-трафик-manual-001", ru: "трафик", ky: "трафик", pos: "noun", source: "manual", senses: ["трафик", "интернет-трафик", "объём данных"] },
  { id: "ru-экосистема-manual-001", ru: "экосистема", ky: "экосистема", pos: "noun", source: "manual", senses: ["экосистема", "экосистема (финансовая, цифровая)"] },
  { id: "ru-инструмент-manual-001", ru: "инструмент", ky: "инструмент", pos: "noun", source: "manual", senses: ["инструмент", "средство", "финансылык инструмент = финансовый инструмент"] },

  // Adjectives
  { id: "ru-доступный-manual-001", ru: "доступный", ky: "жеткиликтүү", pos: "adj", source: "manual", senses: ["доступный", "достижимый", "имеющийся в наличии"] },
  { id: "ru-бесперебойный-manual-001", ru: "бесперебойный", ky: "үзгүлтүксүз", pos: "adj", source: "manual", senses: ["бесперебойный", "непрерывный", "постоянный"] },
  { id: "ru-справедливый-manual-001", ru: "справедливый", ky: "адилеттүү", pos: "adj", source: "manual", senses: ["справедливый", "честный", "правильный"] },
  { id: "ru-крупный-manual-001", ru: "крупный", ky: "ири", pos: "adj", source: "manual", senses: ["крупный", "большой", "значительный"] },

  // Verbs
  { id: "ru-расходовать-manual-001", ru: "расходовать", ky: "сарптоо", pos: "verb", source: "manual", senses: ["расходовать", "тратить", "использовать"] },
  { id: "ru-развивать-manual-001", ru: "развивать", ky: "өнүктүрүү", pos: "verb", source: "manual", senses: ["развивать", "совершенствовать", "продвигать"] },
  { id: "ru-увеличивать-manual-001", ru: "увеличивать", ky: "көбөйтүү", pos: "verb", source: "manual", senses: ["увеличивать", "умножать", "наращивать"] },

  // Nouns
  { id: "ru-ноль-manual-001", ru: "ноль", ky: "нөл", pos: "noun", source: "manual", senses: ["ноль", "нуль"] },
  { id: "ru-партнёр-manual-001", ru: "партнёр", ky: "өнөктөш", pos: "noun", source: "manual", senses: ["партнёр", "компаньон", "өнөктөштүк = партнёрство"] },
  { id: "ru-терминал-manual-001", ru: "терминал", ky: "терминал", pos: "noun", source: "manual", senses: ["терминал", "платёжный терминал"] },

  // === Batch 5: compound terms, domain words, remaining coverage gaps ===

  // Common Kyrgyz base words (freq >= 2 in text)
  { id: "ru-гаснуть-manual-001", ru: "гаснуть, выключаться", ky: "өчүү", pos: "verb", source: "manual", senses: ["гаснуть", "выключаться", "погаснуть", "өчүрүү = выключить (каузатив)"] },
  { id: "ru-активировать-manual-001", ru: "активировать", ky: "активдештирүү", pos: "verb", source: "manual", senses: ["активировать", "активизировать"] },
  { id: "ru-отражать-manual-001", ru: "отражать", ky: "чагылдыруу", pos: "verb", source: "manual", senses: ["отражать", "отображать", "чагылдырылат = отражается"] },
  { id: "ru-потом-manual-001", ru: "потом, после", ky: "соң", pos: "post", source: "manual", senses: ["потом", "после", "андан соң = после этого"] },
  { id: "ru-мегабайт-manual-001", ru: "мегабайт", ky: "мегабайт", pos: "noun", source: "manual", senses: ["мегабайт"] },
  { id: "ru-кабинет-manual-001", ru: "кабинет", ky: "кабинет", pos: "noun", source: "manual", senses: ["кабинет", "жеке кабинет = личный кабинет", "Министрлер Кабинети = Кабинет Министров"] },
  { id: "ru-называемый-manual-001", ru: "называемый, так называемый", ky: "деген", pos: "adj", source: "manual", senses: ["называемый", "так называемый", "которое говорит", "X деген = то, что называется X"] },
  { id: "ru-контроль-manual-002", ru: "контроль (заимств.)", ky: "контрол", pos: "noun", source: "manual", senses: ["контроль", "ички контрол = внутренний контроль"] },
  { id: "ru-расчёт-manual-001", ru: "расчёт, взаиморасчёт", ky: "эсептешүү", pos: "noun", source: "manual", senses: ["расчёт", "взаиморасчёт", "эсептешүү мезгили = расчётный период"] },
  { id: "ru-доля-manual-001", ru: "доля, часть", ky: "үлүш", pos: "noun", source: "manual", senses: ["доля", "часть", "пай", "вклад"] },
  { id: "ru-повышать-manual-001", ru: "повышать", ky: "жогорулатуу", pos: "verb", source: "manual", senses: ["повышать", "увеличивать", "поднимать"] },
  { id: "ru-актив-manual-001", ru: "актив, активы", ky: "актив", pos: "noun", source: "manual", senses: ["актив", "активы", "виртуалдык актив = виртуальный актив"] },

  // Common Kyrgyz words (freq=1, but useful)
  { id: "ru-бонус-manual-001", ru: "бонус", ky: "бонус", pos: "noun", source: "manual", senses: ["бонус", "премия", "вознаграждение"] },
  { id: "ru-онлайн-manual-001", ru: "онлайн", ky: "онлайн", pos: "adj", source: "manual", senses: ["онлайн", "в режиме реального времени"] },
  { id: "ru-контент-manual-001", ru: "контент", ky: "контент", pos: "noun", source: "manual", senses: ["контент", "содержание", "информация"] },
  { id: "ru-лимит-manual-001", ru: "лимит", ky: "лимит", pos: "noun", source: "manual", senses: ["лимит", "ограничение", "предел"] },
  { id: "ru-транзакция-manual-001", ru: "транзакция", ky: "транзакция", pos: "noun", source: "manual", senses: ["транзакция", "сделка", "операция (финансовая)"] },
  { id: "ru-экспертиза-manual-001", ru: "экспертиза", ky: "экспертиза", pos: "noun", source: "manual", senses: ["экспертиза", "экспертное заключение"] },
  { id: "ru-меморандум-manual-001", ru: "меморандум", ky: "меморандум", pos: "noun", source: "manual", senses: ["меморандум", "өз ара түшүнүшүү жөнүндө меморандум = меморандум о взаимопонимании"] },
  { id: "ru-модуль-manual-001", ru: "модуль", ky: "модуль", pos: "noun", source: "manual", senses: ["модуль", "блок", "компонент"] },
  { id: "ru-эквайринг-manual-001", ru: "эквайринг", ky: "эквайринг", pos: "noun", source: "manual", senses: ["эквайринг", "приём платежей по картам", "интернет-эквайринг"] },
  { id: "ru-интеграция-manual-001", ru: "интеграция", ky: "интеграциялоо", pos: "verb", source: "manual", senses: ["интегрировать", "объединять", "встраивать"] },

  // Kyrgyz adjectives
  { id: "ru-любимый-manual-001", ru: "любимый", ky: "сүйүктүү", pos: "adj", source: "manual", senses: ["любимый", "излюбленный", "сүйүктүү адам = любимый человек"] },
  { id: "ru-долгий-manual-001", ru: "долгий, далёкий", ky: "узак", pos: "adj", source: "manual", senses: ["долгий", "далёкий", "продолжительный", "узак мөөнөттүү = долгосрочный"] },
  { id: "ru-конкретный-manual-001", ru: "конкретный", ky: "конкреттүү", pos: "adj", source: "manual", senses: ["конкретный", "определённый", "точный"] },
  { id: "ru-удобный-manual-001", ru: "удобный", ky: "ыңгайлуу", pos: "adj", source: "manual", senses: ["удобный", "комфортный", "подходящий"] },
  { id: "ru-неприятный-manual-001", ru: "неприятный", ky: "жагымсыз", pos: "adj", source: "manual", senses: ["неприятный", "нежелательный", "отрицательный"] },
  { id: "ru-комплексный-manual-001", ru: "комплексный", ky: "комплекстүү", pos: "adj", source: "manual", senses: ["комплексный", "сложный", "всесторонний"] },
  { id: "ru-потенциальный-manual-001", ru: "потенциальный", ky: "потенциалдуу", pos: "adj", source: "manual", senses: ["потенциальный", "возможный"] },
  { id: "ru-административный-manual-001", ru: "административный", ky: "административдик", pos: "adj", source: "manual", senses: ["административный", "управленческий"] },

  // Kyrgyz nouns / concepts
  { id: "ru-вывод-manual-001", ru: "вывод, заключение", ky: "тыянак", pos: "noun", source: "manual", senses: ["вывод", "заключение", "итог", "тыянак чыгаруу = сделать вывод"] },
  { id: "ru-инициатива-manual-001", ru: "инициатива", ky: "демилге", pos: "noun", source: "manual", senses: ["инициатива", "почин", "начинание"] },
  { id: "ru-шаг-manual-001", ru: "шаг", ky: "кадам", pos: "noun", source: "manual", senses: ["шаг", "ступень", "этап", "алгачкы кадам = первый шаг"] },
  { id: "ru-гарантия-manual-001", ru: "гарантия", ky: "кепилдик", pos: "noun", source: "manual", senses: ["гарантия", "обеспечение", "кепилдик берүү = гарантировать"] },
  { id: "ru-оффшор-manual-001", ru: "оффшор", ky: "оффшор", pos: "noun", source: "manual", senses: ["оффшор", "оффшордук = оффшорный", "оффшордук аймак = оффшорная зона"] },
  { id: "ru-телеканал-manual-001", ru: "телеканал", ky: "телеканал", pos: "noun", source: "manual", senses: ["телеканал", "телевизионный канал"] },

  // Verbs
  { id: "ru-совмещать-manual-001", ru: "совмещать, сочетать", ky: "айкалыштыруу", pos: "verb", source: "manual", senses: ["совмещать", "сочетать", "объединять", "комбинировать"] },

  // === Batch 6: remaining coverage gaps ===

  // Core Kyrgyz words
  { id: "ru-обратный-manual-001", ru: "обратный, противоположный", ky: "тескери", pos: "adj", source: "manual", senses: ["обратный", "противоположный", "тескери баланс = отрицательный баланс"] },
  { id: "ru-распоряжаться-manual-001", ru: "распоряжаться", ky: "тескөө", pos: "verb", source: "manual", senses: ["распоряжаться", "управлять", "ээлик кылуу, пайдалануу жана тескөө = владеть, пользоваться и распоряжаться"] },
  { id: "ru-норма-manual-001", ru: "норма, стандарт", ky: "ченем", pos: "noun", source: "manual", senses: ["норма", "стандарт", "критерий", "ченемдик = нормативный"] },
  { id: "ru-должен-manual-001", ru: "должен, обязан", ky: "тийиш", pos: "adj", source: "manual", senses: ["должен", "обязан", "тийиштүү = надлежащий/соответствующий"] },
  { id: "ru-готовый-manual-001", ru: "готовый", ky: "даяр", pos: "adj", source: "manual", senses: ["готовый", "подготовленный", "даяр болуу = быть готовым"] },
  { id: "ru-даже-manual-001", ru: "даже", ky: "тургай", pos: "conj", source: "manual", senses: ["даже", "ал тургай = даже, к тому же"] },
  { id: "ru-втечение-manual-001", ru: "в течение, на протяжении", ky: "бою", pos: "post", source: "manual", senses: ["в течение", "на протяжении", "бир жыл бою = в течение года"] },
  { id: "ru-минимальный-manual-001", ru: "минимальный", ky: "минималдуу", pos: "adj", source: "manual", senses: ["минимальный", "наименьший"] },
  { id: "ru-надлежащий-manual-001", ru: "надлежащий, соответствующий", ky: "тийиштүү", pos: "adj", source: "manual", senses: ["надлежащий", "соответствующий", "должный", "тийиштүү текшерүү = надлежащая проверка"] },
  { id: "ru-адекватный-manual-001", ru: "адекватный", ky: "адекваттуу", pos: "adj", source: "manual", senses: ["адекватный", "достаточный", "соразмерный"] },
  { id: "ru-интуитивный-manual-001", ru: "интуитивный", ky: "интуитивдик", pos: "adj", source: "manual", senses: ["интуитивный", "интуитивдик интерфейс = интуитивный интерфейс"] },

  // Verbs
  { id: "ru-укреплять-manual-001", ru: "укреплять", ky: "чыңдоо", pos: "verb", source: "manual", senses: ["укреплять", "усиливать", "упрочнять"] },
  { id: "ru-совершенствовать-manual-001", ru: "совершенствовать", ky: "өркүндөтүү", pos: "verb", source: "manual", senses: ["совершенствовать", "улучшать", "модернизировать"] },
  { id: "ru-координировать-manual-001", ru: "координировать", ky: "координациялоо", pos: "verb", source: "manual", senses: ["координировать", "согласовывать"] },

  // Domain-specific nouns
  { id: "ru-детализация-manual-001", ru: "детализация", ky: "детализация", pos: "noun", source: "manual", senses: ["детализация", "подробная выписка (по счёту)"] },
  { id: "ru-премиум-manual-001", ru: "премиум", ky: "премиум", pos: "noun", source: "manual", senses: ["премиум", "премиальный", "Премиум топтому = пакет Премиум"] },
  { id: "ru-субъект-manual-001", ru: "субъект", ky: "субъект", pos: "noun", source: "manual", senses: ["субъект", "лицо", "көзөмөлдөнүүчү субъект = поднадзорный субъект"] },
  { id: "ru-сервис-manual-001", ru: "сервис, услуга", ky: "сервис", pos: "noun", source: "manual", senses: ["сервис", "услуга", "обслуживание"] },
  { id: "ru-компетенция-manual-001", ru: "компетенция", ky: "компетенция", pos: "noun", source: "manual", senses: ["компетенция", "полномочие", "ченем жаратуучу компетенция = нормотворческая компетенция"] },
  { id: "ru-аудит-manual-001", ru: "аудит", ky: "аудит", pos: "noun", source: "manual", senses: ["аудит", "проверка", "тышкы аудит = внешний аудит"] },
  { id: "ru-масштаб-manual-001", ru: "масштаб", ky: "масштаб", pos: "noun", source: "manual", senses: ["масштаб", "размах", "масштаб жана спектр = масштаб и спектр"] },
  { id: "ru-гигабайт-manual-001", ru: "гигабайт", ky: "гигабайт", pos: "noun", source: "manual", senses: ["гигабайт"] },
  { id: "ru-инкубация-manual-001", ru: "инкубация", ky: "инкубация", pos: "noun", source: "manual", senses: ["инкубация", "инкубатор (стартапов)"] },

  // === Batch 7: final coverage gaps ===
  { id: "ru-заканчиваться-manual-001", ru: "заканчиваться, иссякать", ky: "түгөнүү", pos: "verb", source: "manual", senses: ["заканчиваться", "иссякать", "истощаться", "интернет-топтом түгөнгөн = пакет интернета закончился"] },
  { id: "ru-неудобный-manual-001", ru: "неудобный, неподходящий", ky: "ыңгайсыз", pos: "adj", source: "manual", senses: ["неудобный", "неподходящий", "ыңгайсыздык = неудобство"] },
  { id: "ru-вариант-manual-001", ru: "вариант", ky: "вариант", pos: "noun", source: "manual", senses: ["вариант", "версия", "разновидность"] },
  { id: "ru-соответственный-manual-001", ru: "соответствующий, совместимый", ky: "шайкеш", pos: "adj", source: "manual", senses: ["соответствующий", "совместимый", "шайкеш келүү = соответствовать"] },
  { id: "ru-деактивация-manual-001", ru: "деактивация", ky: "деактивация", pos: "noun", source: "manual", senses: ["деактивация", "отключение", "деактивацияланат = деактивируется"] },

  // === Batch 8: economy/employment articles (24.kg, kaktus.media) ===

  // Economy / finance
  { id: "ru-экономист-manual-001", ru: "экономист", ky: "экономист", pos: "noun", source: "manual", senses: ["экономист"] },
  { id: "ru-эксперт-manual-001", ru: "эксперт", ky: "эксперт", pos: "noun", source: "manual", senses: ["эксперт", "специалист"] },
  { id: "ru-инфляция-manual-001", ru: "инфляция", ky: "инфляция", pos: "noun", source: "manual", senses: ["инфляция", "инфляциялык = инфляционный"] },
  { id: "ru-котировка-manual-001", ru: "котировка", ky: "котировка", pos: "noun", source: "manual", senses: ["котировка", "курс (ценных бумаг)"] },
  { id: "ru-реэкспорт-manual-001", ru: "реэкспорт", ky: "реэкспорт", pos: "noun", source: "manual", senses: ["реэкспорт", "реэкспорттук = реэкспортный"] },
  { id: "ru-выигрыш-manual-001", ru: "выигрыш, победа", ky: "утуш", pos: "noun", source: "manual", senses: ["выигрыш", "победа", "утушу мүмкүн = может выиграть"] },
  { id: "ru-шок-manual-001", ru: "шок", ky: "шок", pos: "noun", source: "manual", senses: ["шок", "потрясение", "энергетикалык шок = энергетический шок"] },
  { id: "ru-фон-manual-001", ru: "фон, на фоне", ky: "фон", pos: "noun", source: "manual", senses: ["фон", "фонунда = на фоне"] },

  // Employment / labor market
  { id: "ru-зарплата-manual-001", ru: "зарплата", ky: "маяна", pos: "noun", source: "manual", senses: ["зарплата", "жалованье", "орточо маяна = средняя зарплата"] },
  { id: "ru-стажировка-manual-001", ru: "стажировка", ky: "стажировка", pos: "noun", source: "manual", senses: ["стажировка", "практика", "стажировкадан өтүү = пройти стажировку"] },
  { id: "ru-стажёр-manual-001", ru: "стажёр", ky: "стажер", pos: "noun", source: "manual", senses: ["стажёр", "практикант"] },
  { id: "ru-стаж-manual-001", ru: "стаж", ky: "стаж", pos: "noun", source: "manual", senses: ["стаж", "опыт работы", "иш стажы = стаж работы"] },
  { id: "ru-вакансия-manual-001", ru: "вакансия", ky: "вакансия", pos: "noun", source: "manual", senses: ["вакансия", "свободное место", "бош вакансия = вакантная должность"] },
  { id: "ru-позиция-manual-001", ru: "позиция", ky: "позиция", pos: "noun", source: "manual", senses: ["позиция", "должность", "место"] },
  { id: "ru-кадры-manual-001", ru: "кадры", ky: "кадр", pos: "noun", source: "manual", senses: ["кадры", "персонал", "кадрлардын жетишсиздиги = нехватка кадров"] },
  { id: "ru-навык-manual-001", ru: "навык, умение", ky: "көндүм", pos: "noun", source: "manual", senses: ["навык", "умение", "практикалык көндүм = практический навык"] },
  { id: "ru-устроиться-manual-001", ru: "устроиться (на работу)", ky: "орношуу", pos: "verb", source: "manual", senses: ["устроиться", "обосноваться", "жумушка орношуу = устроиться на работу"] },
  { id: "ru-наставник-manual-001", ru: "наставник", ky: "насаатчы", pos: "noun", source: "manual", senses: ["наставник", "ментор", "насаатчылык = наставничество"] },
  { id: "ru-нуждающийся-manual-001", ru: "нуждающийся", ky: "муктаж", pos: "adj", source: "manual", senses: ["нуждающийся", "муктаж болуу = нуждаться"] },
  { id: "ru-аренда-manual-001", ru: "аренда", ky: "ижара", pos: "noun", source: "manual", senses: ["аренда", "найм", "ижара акысы = арендная плата"] },
  { id: "ru-миграция-manual-001", ru: "миграция", ky: "миграция", pos: "noun", source: "manual", senses: ["миграция", "эмгек миграциясы = трудовая миграция"] },
  { id: "ru-мигрант-manual-001", ru: "мигрант", ky: "мигрант", pos: "noun", source: "manual", senses: ["мигрант", "переселенец"] },
  { id: "ru-прикладной-manual-001", ru: "прикладной", ky: "прикладдык", pos: "adj", source: "manual", senses: ["прикладной", "практический", "прикладдык көндүм = прикладной навык"] },
  { id: "ru-адаптация-manual-001", ru: "адаптация", ky: "адаптация", pos: "noun", source: "manual", senses: ["адаптация", "приспособление"] },
  { id: "ru-декрет-manual-001", ru: "декрет", ky: "декрет", pos: "noun", source: "manual", senses: ["декрет", "декретный отпуск", "декреттик өргүү = декретный отпуск"] },

  // Common Kyrgyz words
  { id: "ru-говорит-manual-001", ru: "говорит (он/она)", ky: "дейт", pos: "verb", source: "manual", senses: ["говорит", "сообщает", "X дейт = X говорит (от дөө)"] },
  { id: "ru-предсказывать-manual-001", ru: "предсказывать", ky: "божомолдоо", pos: "verb", source: "manual", senses: ["предсказывать", "прогнозировать", "предполагать"] },
  { id: "ru-значительно-manual-001", ru: "значительно", ky: "кыйла", pos: "adv", source: "manual", senses: ["значительно", "гораздо", "намного"] },
  { id: "ru-впрошломгоду-manual-001", ru: "в прошлом году", ky: "былтыр", pos: "adv", source: "manual", senses: ["в прошлом году", "прошлогодний"] },
  { id: "ru-ещё-manual-001", ru: "ещё (больше)", ky: "ого", pos: "adv", source: "manual", senses: ["ещё", "ого бетер = тем более, ещё больше"] },
  { id: "ru-тупиковый-manual-001", ru: "тупиковый, замкнутый", ky: "туюк", pos: "adj", source: "manual", senses: ["тупиковый", "замкнутый", "глухой", "туюк айлампа = замкнутый круг"] },
  { id: "ru-бесстыдный-manual-001", ru: "бесстыдный, нескромный", ky: "адепсиз", pos: "adj", source: "manual", senses: ["бесстыдный", "нескромный", "канчалык адепсиз угулбасын = как бы нескромно ни звучало"] },
  { id: "ru-случайно-manual-001", ru: "случайно", ky: "кокусунан", pos: "adv", source: "manual", senses: ["случайно", "нечаянно", "кокусунан угуп калуу = случайно услышать"] },
  { id: "ru-сначала-manual-001", ru: "сначала, прежде всего", ky: "адегенде", pos: "adv", source: "manual", senses: ["сначала", "прежде всего", "в первую очередь"] },
  { id: "ru-сметный-manual-001", ru: "сметный", ky: "сметалык", pos: "adj", source: "manual", senses: ["сметный", "сметалык документ = сметная документация"] },
  { id: "ru-ведомство-manual-001", ru: "ведомство", ky: "ведомство", pos: "noun", source: "manual", senses: ["ведомство", "учреждение"] },
  { id: "ru-заполнять-manual-001", ru: "заполнять, возмещать", ky: "толтуруу", pos: "verb", source: "manual", senses: ["заполнять", "возмещать", "ордун толтуруу = восполнить, заменить"] },

  // Batch 9: tax/legal/media text coverage (16 entries)
  { id: "ru-грант-manual-001", ru: "грант", ky: "грант", pos: "noun", source: "manual", senses: ["грант", "безвозмездная субсидия", "гранттар = гранты"] },
  { id: "ru-продлевать-manual-001", ru: "продлевать", ky: "узартуу", pos: "verb", source: "manual", senses: ["продлевать", "продлить", "мөөнөтүн узартуу = продлить срок"] },
  { id: "ru-бланк-manual-001", ru: "бланк", ky: "бланк", pos: "noun", source: "manual", senses: ["бланк", "форма (документа)"] },
  { id: "ru-гуманитарный-manual-001", ru: "гуманитарный", ky: "гуманитардык", pos: "adj", source: "manual", senses: ["гуманитарный", "гуманитардык жардам = гуманитарная помощь"] },
  { id: "ru-маркировка-manual-001", ru: "маркировка", ky: "маркировка", pos: "noun", source: "manual", senses: ["маркировка", "этикетирование", "товарларды маркировкалоо = маркировка товаров"] },
  { id: "ru-маркировать-manual-001", ru: "маркировать", ky: "маркировкалоо", pos: "verb", source: "manual", senses: ["маркировать", "маркировка коддорун генерациялоо = генерация кодов маркировки"] },
  { id: "ru-продукция-manual-001", ru: "продукция", ky: "продукция", pos: "noun", source: "manual", senses: ["продукция", "продукты производства", "айыл чарба продукциясы = сельхозпродукция"] },
  { id: "ru-обряд-manual-001", ru: "обряд", ky: "жөрөлгө", pos: "noun", source: "manual", senses: ["обряд", "ритуал", "церемония", "диний жөрөлгө = религиозный обряд"] },
  { id: "ru-авиарейс-manual-001", ru: "авиарейс", ky: "авиакаттам", pos: "noun", source: "manual", senses: ["авиарейс", "авиамаршрут", "эл аралык авиакаттам = международный авиарейс"] },
  { id: "ru-лом-manual-001", ru: "лом", ky: "лом", pos: "noun", source: "manual", senses: ["лом", "металлолом", "скрап"] },
  { id: "ru-мультфильм-manual-001", ru: "мультфильм", ky: "мультфильм", pos: "noun", source: "manual", senses: ["мультфильм", "мультик", "анимационный фильм"] },
  { id: "ru-миссия-manual-001", ru: "миссия", ky: "миссия", pos: "noun", source: "manual", senses: ["миссия", "задание", "жашыруун миссия = тайная миссия"] },
  { id: "ru-редакция-manual-001", ru: "редакция", ky: "редакция", pos: "noun", source: "manual", senses: ["редакция", "редакторский состав", "редакторская правка"] },
  { id: "ru-кинематограф-manual-001", ru: "кинематограф", ky: "кинематограф", pos: "noun", source: "manual", senses: ["кинематограф", "кинематография", "улуттук кинематограф = национальный кинематограф"] },
  { id: "ru-сноха-manual-001", ru: "сноха", ky: "абысын", pos: "noun", source: "manual", senses: ["сноха (жена брата мужа)", "невестка (по отношению к другим жёнам братьев)"] },
  { id: "ru-некоторые-manual-001", ru: "некоторые", ky: "кээ", pos: "pron", source: "manual", senses: ["некоторые", "кое-какие", "кээ бир = некоторые", "кээси = некоторые из них"] },
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
