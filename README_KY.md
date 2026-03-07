# macOS учун кыргыз сөздүктөрү

[README in English](README.md) · [README на русском](README_RU.md)

<p align="center">
  <img src="docs/images/lookup-preview.jpeg" alt="Сөздүк көрүнүшү — сүйүү" width="600">
</p>

macOS Dictionary.app учун ачык маалыматтардан курулган төрт сөздүк:

| Сөздүк | Макалалар | Сүрөттөмө |
|---|---|---|
| Орусча-кыргызча | 24 300+ | Толук морфология таблицалары, үндүү гармониясы |
| Кыргызча-орусча | 24 300+ | Ошол эле маалыматтар боюнча тескери издөө |
| Англисче-кыргызча | 19 700+ | Айтылышы, этимологиясы, жыштыгы менен |
| Кыргызча-англисче | 19 700+ | Кыргызча баш сөздөр менен тескери издөө |

> **88 000ден ашуун сөздүк макалалары** бардык төрт багытта — күнүмдүк, илимий, юридикалык, медициналык жана техникалык лексиканы камтыйт.

Мүмкүнчүлүктөр:
- Каалаган сөз формасы боюнча издөө («китептин» жазсаңыз — «китеп» табасыз, «билдирет» — «билдирүү»)
- Зат атоочтордун жөндөмө таблицалары (6 жөндөмө x жекелик/көптүк)
- Этиш жөндөлүш формалары издөө үчүн индекстелген
- Акылдуу котормо топтоо: түр жуптарын, жыныс формаларын дедупликациялоо; булактар саны боюнча рейтинг
- Мүчө тандоо эрежелеринин түшүндүрмөсү
- Wiktionary'ден этимология жана айтылыш
- Manas-UdS корпусунан жыштык
- GoURMET параллель корпусунан мисалдар
- Караңгы тема

## Орнотуу

1. Керектүү сөздүктү [Releases](../../releases/latest) бөлүмүнөн жүктөп алыңыз
2. Архивди ачыңыз
3. `.dictionary` файлын `~/Library/Dictionaries/` папкасына көчүрүңүз
   > **Кеңеш:** Бул папканы Dictionary.app → File → Open Dictionaries Folder аркылуу ачсаңыз болот
4. Dictionary.app → Preferences → Сөздүктү иштетиңиз

## Документация

- [Building from source](docs/BUILDING.md)
- [Data pipeline](docs/PIPELINE.md)
- [Contributing](docs/CONTRIBUTING.md)

## Маалымат булактары

| Булак | Лицензия |
|-------|----------|
| [English Wiktionary](https://en.wiktionary.org/) via [kaikki.org](https://kaikki.org/) | CC BY-SA |
| [Russian Wiktionary](https://ru.wiktionary.org/) via [kaikki.org](https://kaikki.org/) | CC BY-SA |
| [Apertium-kir](https://github.com/apertium/apertium-kir) | GPL-3.0 (фактылар гана) |
| [GoURMET](https://opus.nlpl.eu/GoURMET.php) параллель корпус ky-ru | Open (OPUS) |
| [OpenRussian.org](https://github.com/Badestrand/russian-dictionary) | CC BY-SA 4.0 |
| [Manas-UdS Kyrgyz Corpus](https://fedora.clarin-d.uni-saarland.de/kyrgyz/) | CC BY-NC-SA 4.0 |

## Ыраазычылык

Маалыматтарды изилдөө, пайплайн архитектурасы жана код [Claude](https://claude.ai) (Anthropic) жардамы менен иштелип чыкты.

## Лицензия

CC BY-NC-SA 4.0 (Manas-UdS корпусу талап кылат). [LICENSE](LICENSE) караңыз.
