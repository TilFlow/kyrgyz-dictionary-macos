# Kyrgyz Dictionaries for macOS

Four dictionaries for macOS Dictionary.app, built from open data:

| Dictionary | Entries | Description |
|---|---|---|
| Russian-Kyrgyz | 21,000+ | Full morphology tables, vowel harmony rules |
| Kyrgyz-Russian | 21,000+ | Reverse lookup from the same dataset |
| English-Kyrgyz | 8,800+ | With pronunciation, etymology, frequency |
| Kyrgyz-English | 8,800+ | Reverse lookup with Kyrgyz headwords |

Features:
- Search by any word form (type "китептин" to find "китеп")
- Noun declension tables (6 cases x singular/plural)
- Suffix selection rules explained
- Etymology and pronunciation from Wiktionary
- Corpus frequency from Manas-UdS
- Parallel sentence examples from GoURMET
- Dark mode support

## Installation

1. Download the dictionary you need from [Releases](../../releases/latest)
2. Unzip
3. Copy the `.dictionary` bundle to `~/Library/Dictionaries/`
4. Open Dictionary.app → Preferences → Enable the dictionary

## Documentation

- [Building from source](docs/BUILDING.md)
- [Data pipeline](docs/PIPELINE.md)
- [Contributing](docs/CONTRIBUTING.md)
- [README на русском](README_RU.md)
- [README кыргызча](README_KY.md)

## Data Sources

| Source | License |
|--------|---------|
| [English Wiktionary](https://en.wiktionary.org/) via [kaikki.org](https://kaikki.org/) | CC BY-SA |
| [Russian Wiktionary](https://ru.wiktionary.org/) via [kaikki.org](https://kaikki.org/) | CC BY-SA |
| [Apertium-kir](https://github.com/apertium/apertium-kir) | GPL-3.0 (facts only) |
| [GoURMET](https://opus.nlpl.eu/GoURMET.php) ky-ru parallel corpus | Open (OPUS) |
| [OpenRussian.org](https://github.com/Badestrand/russian-dictionary) | CC BY-SA 4.0 |
| [Manas-UdS Kyrgyz Corpus](https://fedora.clarin-d.uni-saarland.de/kyrgyz/) | CC BY-NC-SA 4.0 |

## License

CC BY-NC-SA 4.0 (required by Manas-UdS corpus). See [LICENSE](LICENSE).
