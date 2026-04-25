# Dokumentácia projektu: Slovak Football AI Scraper

## 1. Popis projektu

**Slovak Football AI Scraper** je automatizovaný systém, ktorý sleduje oficiálne webstránky slovenských futbalových klubov, sťahuje texty najnovších článkov a analyzuje ich pomocou umelej inteligencie (DeepSeek LLM). Výsledky ukladá do cloudovej databázy Firebase Firestore, odkiaľ ich zobrazuje webový frontend postavený v Qwiku.

### Účel
- Agregácia futbalových správ z viacerých zdrojov na jednom mieste
- Automatická AI kategorizácia: **prestupy, predĺženia zmlúv, trénerské zmeny, výsledky zápasov, zranenia**
- Analýza sentimentu a extrakcia kľúčových hráčov

### Sledované ligy
- **Niké liga** (1. slovenská futbalová liga) — 12 klubov
- **MONACObet liga** (2. slovenská futbalová liga) — priebežne dopĺňané

---

## 2. Architektúra systému

```
┌──────────────────────────┐
│  Webstránky klubov        │  skslovan.com, dac1904.sk, fckosice.sk ...
└────────────┬─────────────┘
             │ HTTP scraping (requests + BeautifulSoup + trafilatura)
             ▼
┌──────────────────────────┐
│  Python Scraper          │  beží na Raspberry Pi, každých N hodín
│  (scraper/main.py)       │
└────────────┬─────────────┘
             │ text článku
             ▼
┌──────────────────────────┐
│  DeepSeek AI API         │  deepseek-chat model
│  (deepseek_client.py)    │  → súhrn, kategória, sentiment, hráči, tagy
└────────────┬─────────────┘
             │ JSON výsledok
             ▼
┌──────────────────────────┐
│  Firebase Firestore      │  kolekcia "articles"
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│  Qwik Web Frontend       │  dashboard so zoznamom článkov + AI súhrny
└──────────────────────────┘
```

---

## 3. Použité technológie

| Vrstva | Technológia | Účel |
|--------|-------------|------|
| Scraping | Python 3.14, requests, BeautifulSoup4 | Sťahovanie HTML stránok |
| Extrakcia textu | trafilatura | Čistá extrakcia textu článku z HTML |
| RSS | feedparser | Fallback na RSS feed ak existuje |
| AI analýza | DeepSeek API (deepseek-chat) | Súhrn, kategória, sentiment, hráči |
| Databáza | Firebase Firestore | Cloudové ukladanie článkov |
| Plánovanie | APScheduler | Automatické spúšťanie každých N hodín |
| Prostredie | python-dotenv | Správa API kľúčov cez .env súbor |
| Frontend | Qwik | Webový dashboard |
| Nasadenie | Raspberry Pi | Scraper beží nepretržite |
| Verzovanie | Git + GitHub | História zmien, repozitár |

---

## 4. Štruktúra repozitára

```
slovak-football-scraper/
├── scraper/
│   ├── config/
│   │   └── clubs.py          # konfigurácia 12+ klubov (URL, liga, skratka)
│   ├── src/
│   │   ├── models/
│   │   │   └── article.py    # dátový model článku
│   │   ├── scrapers/
│   │   │   ├── base_scraper.py     # HTTP fetch + trafilatura extrakcia
│   │   │   └── generic_scraper.py  # RSS fallback + HTML scraping + zoradenie
│   │   └── utils/
│   │       ├── deepseek_client.py  # DeepSeek AI analýza
│   │       └── firebase_client.py  # Firestore operácie
│   ├── main.py               # hlavný orchestrátor (jednorazový / plánovaný beh)
│   ├── test_scraper.py       # test scrapingu bez AI/Firebase
│   ├── test_analysis.py      # test kompletnej analýzy (scraping + DeepSeek)
│   ├── requirements.txt
│   └── .env.example
├── frontend/                 # Qwik web dashboard (TODO)
├── docs/
│   ├── DOKUMENTACIA.md       # tento súbor
│   └── screenshots/
└── README.md
```

---

## 5. Návod na spustenie

### Požiadavky
- Python 3.11+ (testované na 3.14.4)
- Firebase projekt so Firestore databázou
- DeepSeek API kľúč (https://platform.deepseek.com)

### Inštalácia

```bash
cd scraper
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Linux / Raspberry Pi

pip install -r requirements.txt
```

### Konfigurácia

```bash
cp .env.example .env
```

Vyplniť v `.env`:
```
DEEPSEEK_API_KEY=sk-...
FIREBASE_CREDENTIALS_PATH=serviceAccountKey.json
SCRAPE_INTERVAL_HOURS=6
```

`serviceAccountKey.json` stiahnuť z Firebase Console → Project Settings → Service Accounts → Generate new private key, a uložiť do `scraper/`.

### Spustenie

```bash
# Test scrapera (bez AI a Firebase)
python test_scraper.py slovan

# Test AI analýzy jedného článku
python test_analysis.py slovan

# Ostré spustenie — všetky kluby, jednorazovo
python main.py

# Plánované spúšťanie každých 6 hodín (pre Raspberry Pi)
python main.py --scheduled
```

### Dostupné skratky klubov
`slovan`, `dac`, `zilina`, `spartak`, `podbrezova`, `michalovce`, `ruzomberok`, `trencin`, `kosice`, `komarno`, `presov`, `skalica`

---

## 6. Priebeh vývoja

### Fáza 1 — Základná štruktúra
- Navrhnutá architektúra: scraper → DeepSeek → Firebase → Qwik
- Vytvorená štruktúra adresárov a konfigurácia klubov
- Implementovaný `GenericScraper` s RSS fallback a HTML scrapingom
- Implementovaný `DeepSeekClient` pre AI analýzu článkov
- Implementovaný `FirebaseClient` pre ukladanie do Firestore

### Fáza 2 — Ladenie URL a filtrovanie
- Odhalené a opravené nesprávne `news_url` pre 7 z 12 klubov:
  - Žilina: `/archiv.asp?id_category_1=101` (nie `/sk/aktuality.asp`)
  - Ružomberok: `/archiv.asp` (nie `/novinky.asp` — vracia 500)
  - Trenčín: `/novinky.asp` (nie `/aktuality`)
  - Prešov: doména `fctatran.sk` (nie `fktatranpresov.sk` — neexistuje)
  - Skalica: subdoména `novinky.mfkskalica.sk`
  - DAC: `/sk/archiv.asp`
  - Slovan: `www.skslovan.com/spravy/`
- Odstránená závislosť na `lxml` (Python 3.14 nemá precompilovaný wheel)
- Opravené filtrovanie — vylúčené navigačné, paginačné a kontaktné URL
- Pridané zoradenie článkov podľa číselného ID v URL (najnovší = prvý)

### Výsledok
**12/12 klubov Niké ligy funkčných** — každý vracia 4–30 článkov

| Klub | Počet článkov |
|------|--------------|
| ŠK Slovan Bratislava | 17–30 |
| FC Košice | 29 |
| MFK Ružomberok | 25 |
| AS Trenčín | 23 |
| FC DAC 1904 | 18 |
| MŠK Žilina | 11 |
| MFK Zemplín Michalovce | 10 |
| KFC Komárno | 10 |
| FC Spartak Trnava | 10 |
| FK Tatran Prešov | 8 |
| FK Železiarne Podbrezová | 7 |
| MFK Skalica | 4 |

---

## 7. Ukážka výstupu DeepSeek analýzy

**Vstup** — článok zo skslovan.com:
> "Víkendový program našich tímov — Prehľad víkendových zápasov našich mládežníckych a ženských výberov..."

**Výstup DeepSeek:**
```json
{
  "summary": "Článok prináša prehľad víkendových zápasov mládežníckych a ženských tímov ŠK Slovan Bratislava. Rezervný tím hrá doma so Žilinou, dorastenci a žiaci majú derby so Spartakom Trnava, ženy hrajú v Myjave.",
  "category": "zapas",
  "sentiment": "neutral",
  "key_players": [],
  "tags": ["Slovan Bratislava", "mládež", "ženy", "víkendové zápasy", "prehľad"]
}
```

### Podporované kategórie
| Kategória | Popis |
|-----------|-------|
| `transfer` | Prestup hráča |
| `predlzenie_zmluvy` | Predĺženie alebo podpis zmluvy |
| `trenerska_zmena` | Zmena trénera |
| `zapas` | Správa o zápase, hodnotenie, zostrihy |
| `zranenie` | Zranenie hráča |
| `tlacova_konferencia` | Tlačová konferencia |
| `mlad` | Mládežnícke správy |
| `trenink` | Tréning |
| `ine` | Ostatné |

---

## 8. Reflexia využitia LLM nástrojov

### Použité nástroje
| Nástroj | Kde použitý |
|---------|-------------|
| **Claude Code (claude-sonnet-4-6)** | Celý vývoj — generovanie kódu, debugovanie, architektúra |
| **DeepSeek API (deepseek-chat)** | Runtime funkcionalita — analýza každého článku |

### Využitie Claude Code pri vývoji

Claude Code bol použitý ako hlavný vývojový asistent počas celého projektu:

- **Návrh architektúry** — Claude navrhol celú štruktúru projektu (scraper → AI → Firebase → frontend) vrátane dátového modelu a rozdelenia do modulov
- **Generovanie kódu** — všetky Python súbory boli generované alebo výrazne asistované Claude Code
- **Debugovanie** — pri zlyhaní lxml na Python 3.14 Claude okamžite identifikoval príčinu (chýbajúci wheel) a navrhol riešenie (html.parser)
- **Webový výskum** — Claude vyhľadal správne URL pre klubové webstránky priamo počas vývoja
- **Git workflow** — Claude automaticky vytváral committy s popisnými správami
- **Dokumentácia** — táto dokumentácia bola generovaná Claudom

### Prínosy LLM nástrojov
- **Rýchlosť** — celý základ projektu (12 súborov) vznikol v priebehu jednej relácie
- **Diagnostika** — chyby ako nesprávne URL (7/12 klubov), Python 3.14 inkompatibilita boli okamžite identifikované a opravené
- **Iterácia** — filtrovanie článkov bolo postupne vylepšované na základe skutočných výsledkov (3 iterácie)

### Limity a úskalia
- **Hallucinácie URL** — Claude navrhol nesprávne `news_url` pre väčšinu klubov, bolo nutné ich overiť a opraviť na základe reálnych odpovedí scraperov
- **Kódovanie v termináli** — Windows PowerShell zobrazuje slovenské znaky zle (cp1250 vs UTF-8), čo komplikovalo čítanie výstupov — v databáze sú znaky správne
- **Python 3.14** — najnovšia verzia Pythonu nie je ešte plne podporovaná všetkými knižnicami (lxml)
- **Webové štruktúry** — každý klubový web má inú štruktúru, generický scraper potreboval niekoľko iterácií ladenia

### Čo som sa naučil
- Práca s LLM asistentom je efektívna, ale vyžaduje overovanie výstupov v reálnom prostredí
- Claude Code zvládol celý development workflow od architektúry po git commity
- DeepSeek ako runtime AI súčasť je výkonný — presne kategorizuje slovenské futbalové texty
- Kombinácia LLM pri vývoji + LLM v produkte (DeepSeek) je silná architektúra pre informačné systémy
