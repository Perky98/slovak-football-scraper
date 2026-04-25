# Dokumentácia projektu: Slovak Football AI Scraper

## 1. Popis projektu

**Slovak Football AI Scraper** je automatizovaný systém, ktorý sleduje oficiálne webstránky slovenských futbalových klubov, sťahuje texty najnovších článkov a analyzuje ich pomocou umelej inteligencie (DeepSeek LLM). Výsledky ukladá do cloudovej databázy Firebase Firestore, odkiaľ ich zobrazuje webový frontend postavený v Qwiku.

### Účel
- Agregácia futbalových správ z viacerých zdrojov na jednom mieste
- Automatická AI kategorizácia: **prestupy, predĺženia zmlúv, trénerské zmeny, výsledky zápasov, zranenia**
- Analýza sentimentu a extrakcia kľúčových hráčov
- Zobrazenie len aktuálnych správ — články staršie ako 2 dni sú automaticky preskočené

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
             │ RSS / sitemap fallback
             ▼
┌──────────────────────────┐
│  Python Scraper          │  beží na Raspberry Pi, každých N hodín
│  (scraper/main.py)       │  filtruje články staršie ako 2 dni
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
│  Firebase Firestore      │  kolekcia "articles", deduplikácia cez MD5(url)
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│  Qwik Web Frontend       │  dashboard — filter podľa ligy a kategórie
└──────────────────────────┘
```

---

## 3. Použité technológie

| Vrstva | Technológia | Účel |
|--------|-------------|------|
| Scraping | Python 3.14, requests, BeautifulSoup4 | Sťahovanie HTML stránok |
| Extrakcia textu | trafilatura | Čistá extrakcia textu + dátumu článku z HTML |
| RSS | feedparser | Fallback na RSS feed ak existuje (Spartak, Michalovce, Komárno) |
| AI analýza | DeepSeek API (deepseek-chat) | Súhrn, kategória, sentiment, hráči, tagy |
| Databáza | Firebase Firestore | Cloudové ukladanie článkov |
| Plánovanie | APScheduler | Automatické spúšťanie každých N hodín |
| Prostredie | python-dotenv | Správa API kľúčov cez .env súbor |
| Frontend | Qwik + TypeScript | Webový dashboard |
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
│   │   │   ├── base_scraper.py     # HTTP fetch + trafilatura extrakcia (text + dátum)
│   │   │   └── generic_scraper.py  # RSS → sitemap → HTML fallback reťazec
│   │   └── utils/
│   │       ├── deepseek_client.py  # DeepSeek AI analýza
│   │       └── firebase_client.py  # Firestore operácie + deduplikácia
│   ├── main.py               # hlavný orchestrátor (jednorazový / plánovaný beh)
│   ├── test_scraper.py       # test scrapingu bez AI/Firebase
│   ├── test_analysis.py      # test kompletnej analýzy (scraping + DeepSeek)
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── ArticleCard.tsx   # karta článku (klub, súhrn, kategória, sentiment)
│   │   ├── lib/
│   │   │   ├── firebase.ts       # inicializácia Firebase klienta
│   │   │   └── types.ts          # TypeScript typy + prekladové mapy
│   │   └── routes/
│   │       └── index.tsx         # hlavná stránka s filtrom a gridom
│   └── .env.example
├── docs/
│   ├── DOKUMENTACIA.md       # tento súbor
│   └── screenshots/
└── README.md
```

---

## 5. Návod na spustenie

### Požiadavky
- Python 3.11+ (testované na 3.14.4)
- Node.js 18+ (testované na 24.9.0)
- Firebase projekt so Firestore databázou
- DeepSeek API kľúč (https://platform.deepseek.com)

### Inštalácia — scraper

```bash
cd scraper
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Linux / Raspberry Pi

pip install -r requirements.txt
```

> **Poznámka:** `lxml` nie je v závislotiach — Python 3.14 nemá precompilovaný wheel, používame vstavaný `html.parser`.

### Konfigurácia — scraper

```bash
cp .env.example .env
```

Vyplniť v `scraper/.env`:
```
DEEPSEEK_API_KEY=sk-...
FIREBASE_CREDENTIALS_PATH=serviceAccountKey.json
SCRAPE_INTERVAL_HOURS=6
```

`serviceAccountKey.json` stiahnuť z Firebase Console → Project Settings → Service Accounts → Generate new private key, uložiť do `scraper/`.

### Firebase Firestore pravidlá

V Firebase Console → Firestore → Rules nastaviť:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

### Spustenie scrapera

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

### Inštalácia a spustenie — frontend

```bash
cd frontend
npm install
cp .env.example .env
```

Vyplniť v `frontend/.env` hodnoty z Firebase Console → Project Settings → Your apps:
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```

```bash
npm run dev     # vývojový server na http://localhost:5173
npm run build   # produkčný build
```

---

## 6. Priebeh vývoja

### Fáza 1 — Základná štruktúra
- Navrhnutá architektúra: scraper → DeepSeek → Firebase → Qwik
- Vytvorená štruktúra adresárov a konfigurácia všetkých 12 klubov
- Implementovaný `GenericScraper` s RSS fallback a HTML scrapingom
- Implementovaný `DeepSeekClient` pre AI analýzu článkov
- Implementovaný `FirebaseClient` s deduplikáciou cez MD5(url)

### Fáza 2 — Ladenie URL a filtrovanie

Všetky `news_url` boli pôvodne odhadnuté — pri testovaní zlyhalo 7 z 12:

| Klub | Problém | Riešenie |
|------|---------|----------|
| Slovan | nesprávna cesta | `www.skslovan.com/spravy/` |
| DAC | nesprávna cesta | `/sk/archiv.asp` |
| Žilina | 404 | `/archiv.asp?id_category_1=101` |
| Ružomberok | 500 error | `/archiv.asp` |
| Trenčín | 404 | `/novinky.asp` |
| Prešov | neexistujúca doména | doména `fctatran.sk` |
| Skalica | nesprávna cesta | `www.mfkskalica.sk/` |

Ďalšie opravy:
- Odstránená závislosť na `lxml` (Python 3.14 nemá wheel) → `html.parser`
- Vylúčené navigačné, paginačné, kontaktné a promo URL (vstupenky, permanentky)
- Zoradenie článkov podľa číselného ID v URL zostupne (najnovší = prvý)
- Oprava pre DAC — ID je v query parametri (`?id=slug-12273`), nie v path

### Fáza 3 — Riešenie špeciálnych prípadov

**FC Košice** — stránka načítava články cez JavaScript, HTML je bez odkazov:
- Pokus o sitemap.xml → zastaraný (IDs ~1544, reálne ~2681)
- Analýza HTML odhalila URL vzor `-a19-{id}` priamo v zdrojovom kóde
- Riešenie: pridanie `-a19-` do `ARTICLE_PATH_KEYWORDS`
- Výsledok: 20 článkov správne nájdených

### Fáza 4 — Qwik frontend
- Scaffoldovaný Qwik projekt s TypeScriptom
- Nainštalovaný Firebase JS SDK
- Vytvorený `ArticleCard` komponent s tmavým dizajnom
- Filter podľa ligy a kategórie
- Riešenie Firestore permissions — nastavené `allow read: if true` pravidlá

### Fáza 5 — Filtrovanie starých článkov
- `trafilatura` extrahuje dátum publikovania z metadát článku
- Články staršie ako 2 dni sú automaticky preskočené (pred DeepSeek volaním)
- Ak dátum nie je detegovateľný, článok sa spracuje (aby nič neuniklo)

### Finálny stav
**12/12 klubov Niké ligy funkčných**

| Klub | Metóda | Články |
|------|--------|--------|
| ŠK Slovan Bratislava | HTML | ~17 |
| FC DAC 1904 | HTML | ~17 |
| MŠK Žilina | HTML | ~10 |
| FC Spartak Trnava | **RSS** | ~10 |
| FK Železiarne Podbrezová | HTML | ~3 |
| MFK Zemplín Michalovce | **RSS** | ~10 |
| MFK Ružomberok | HTML | ~25 |
| AS Trenčín | HTML | ~10 |
| FC Košice | HTML (`-a19-` vzor) | ~20 |
| KFC Komárno | **RSS** | ~10 |
| FC Tatran Prešov | HTML | ~8 |
| MFK Skalica | HTML | ~7 |

---

## 7. Ukážka výstupu DeepSeek analýzy

**Vstup** — článok z dac1904.sk:
> "Pred zápasom DAC 1904 - Žilina: Ďalšie finále — V predposlednom domácom vystúpení v rámci nadstavby nás čaká priamy súboj o medailové pozície..."

**Výstup DeepSeek:**
```json
{
  "summary": "DAC Dunajská Streda hostí v sobotu večer MŠK Žilinu v dôležitom zápase nadstavby o medailové pozície. Tréner Branislav Fodrek označil stretnutie za finále, pričom DAC chce prvýkrát v sezóne poraziť Žilinu. Chýbať bude Máté Tuboly pre päť žltých kariet.",
  "category": "zapas",
  "sentiment": "neutral",
  "key_players": ["Branislav Fodrek", "Máté Tuboly", "Michal Fašku", "Andreas Gruber"],
  "tags": ["DAC", "Žilina", "nadstavba", "Niké liga", "MOL Aréna"]
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
| **Claude Code (claude-sonnet-4-6)** | Celý vývoj — generovanie kódu, debugovanie, architektúra, dokumentácia |
| **DeepSeek API (deepseek-chat)** | Runtime funkcionalita — analýza každého článku v produkcii |

### Využitie Claude Code pri vývoji

Claude Code bol použitý ako hlavný vývojový asistent počas celého projektu:

- **Návrh architektúry** — Claude navrhol celú štruktúru projektu vrátane dátového modelu, fallback reťazca (RSS → sitemap → HTML) a rozdelenia do modulov
- **Generovanie kódu** — všetky Python a TypeScript súbory vznikli s pomocou Claude Code
- **Webový výskum** — Claude vyhľadával správne URL pre klubové weby, identifikoval RSS feedy a API endpointy
- **Debugovanie** — diagnostika zlyhaní (lxml/Python 3.14, Košice JS rendering, DAC query-param ID, Firestore permissions)
- **Git workflow** — Claude automaticky vytváral committy s popisnými správami po každej zmene
- **Dokumentácia** — táto dokumentácia bola generovaná a priebežne aktualizovaná Claudom

### Prínosy LLM nástrojov
- **Rýchlosť** — celý základ projektu (18 súborov, scraper + frontend) vznikol v priebehu niekoľkých hodín
- **Diagnostika** — každá chyba (nesprávne URL, 404, 500, JS rendering, permissions) bola identifikovaná a opravená bez manuálneho googlowania
- **Iterácia** — filtrovanie článkov prešlo 5 iteráciami zlepšovania na základe reálnych výsledkov
- **Multimodálna práca** — Claude súčasne písал kód, vyhľadával na webe, commitoval do gitu a aktualizoval dokumentáciu

### Limity a úskalia
- **Hallucinácie URL** — Claude navrhol nesprávne `news_url` pre 7 z 12 klubov; bolo nutné každý overiť reálnym testom
- **JS-rendered weby** — FC Košice načítava články cez JavaScript; bolo potrebných viacero iterácií (sitemap → priama HTML analýza) kým sme našli správny prístup
- **Kódovanie v termináli** — Windows PowerShell zobrazuje slovenské znaky zle (cp1250 vs UTF-8); v databáze aj na webe sú znaky správne
- **Python 3.14** — najnovšia verzia Pythonu nie je ešte plne podporovaná všetkými knižnicami (`lxml`)
- **Firebase permissions** — Firestore security rules blokovali čítanie z frontendu; treba manuálne nastaviť `allow read: if true`

### Čo som sa naučil
- LLM asistent dramaticky zrýchľuje vývoj, ale výstupy treba vždy overiť v reálnom prostredí
- Claude Code zvládol celý development workflow — od návrhu po git commity a dokumentáciu
- DeepSeek ako runtime AI komponent presne kategorizuje slovenské futbalové texty vrátane prestupov, trénerských zmien a predĺžení zmlúv
- Kombinácia LLM pri vývoji + LLM v produkte je efektívna architektúra pre informačné agregátory
- Rôzne weby majú radikálne odlišné štruktúry — generický scraper musí mať robustný fallback mechanizmus
