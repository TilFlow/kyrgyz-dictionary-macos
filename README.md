# Kyrgyz Dictionaries for macOS

[README на русском](README_RU.md) · [README кыргызча](README_KY.md)

<p align="center">
  <img src="docs/images/lookup-preview.jpeg" alt="Dictionary lookup preview — сүйүү" width="600">
</p>

Four dictionaries for macOS Dictionary.app, built from open data:

| Dictionary | Entries | Description |
|---|---|---|
| Russian-Kyrgyz | 24,300+ | Full morphology tables, vowel harmony rules |
| Kyrgyz-Russian | 24,300+ | Reverse lookup from the same dataset |
| English-Kyrgyz | 30,900+ | With pronunciation, etymology, frequency |
| Kyrgyz-English | 30,900+ | Reverse lookup with Kyrgyz headwords |

> **100,000+ dictionary entries** across all four directions, covering everyday, academic, legal, medical, and technical vocabulary.

Features:
- Search by any word form (type "китептин" to find "китеп", "билдирет" to find "билдирүү")
- Noun declension tables (6 cases x singular/plural)
- Verb conjugation forms indexed for search
- Smart translation grouping: deduplicates verb aspect pairs, gendered forms; ranks by source attestation
- Suffix selection rules explained
- Etymology and pronunciation from Wiktionary
- Corpus frequency from Manas-UdS
- Parallel sentence examples from GoURMET
- Dark mode support

## Installation

1. Download the dictionary you need from [Releases](../../releases/latest)
2. Unzip
3. Copy the `.dictionary` bundle to `~/Library/Dictionaries/`
   > **Tip:** You can open this folder directly from Dictionary.app → File → Open Dictionaries Folder
4. Open Dictionary.app → Preferences → Enable the dictionary

## Documentation

- [Building from source](docs/BUILDING.md)
- [Data pipeline](docs/PIPELINE.md)
- [Contributing](docs/CONTRIBUTING.md)

## Data Sources

| Source | License |
|--------|---------|
| [English Wiktionary](https://en.wiktionary.org/) via [kaikki.org](https://kaikki.org/) | CC BY-SA |
| [Russian Wiktionary](https://ru.wiktionary.org/) via [kaikki.org](https://kaikki.org/) | CC BY-SA |
| [Apertium-kir](https://github.com/apertium/apertium-kir) | GPL-3.0 (facts only) |
| [GoURMET](https://opus.nlpl.eu/GoURMET.php) ky-ru parallel corpus | Open (OPUS) |
| [OpenRussian.org](https://github.com/Badestrand/russian-dictionary) | CC BY-SA 4.0 |
| [Manas-UdS Kyrgyz Corpus](https://fedora.clarin-d.uni-saarland.de/kyrgyz/) | CC BY-NC-SA 4.0 |

## Acknowledgements

Data research, pipeline architecture, and code were developed with the help of [Claude](https://claude.ai) (Anthropic).

## License

CC BY-NC-SA 4.0 (required by Manas-UdS corpus). See [LICENSE](LICENSE).
