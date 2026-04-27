# Dokumentácia projektu: Slovak Football AI Scraper

## 1. Popis projektu

**Slovak Football AI Scraper** je automatizovaný systém, ktorý sleduje oficiálne webstránky slovenských futbalových klubov, sťahuje texty najnovších článkov a analyzuje ich pomocou umelej inteligencie (DeepSeek LLM). Výsledky ukladá do cloudovej databázy Firebase Firestore, odkiaľ ich zobrazuje webový frontend postavený v Qwiku.

### Účel
- Agregácia futbalových správ z viacerých zdrojov na jednom mieste
- Automatická AI kategorizácia: **prestupy, predĺženia zmlúv, trénerské zmeny, výsledky zápasov, zranenia** a ďalšie
- AI súhrn každého článku v slovenčine (2–3 vety)
- Analýza sentimentu a extrakcia kľúčových hráčov
- Admin rozhranie pre schvaľovanie, mazanie a úpravu článkov pred zverejnením

### Sledované ligy
- **Niké liga** (1. slovenská futbalová liga) — 12 klubov

---

## 2. Architektúra systému

```
┌──────────────────────────┐
│  Webstránky klubov        │  skslovan.com, dac1904.sk, fckosice.sk ...
└────────────┬─────────────┘
             │ HTTP scraping (requests + BeautifulSoup + trafilatura)
             │ RSS / sitemap / HTML fallback
             ▼
┌──────────────────────────┐
│  Python Scraper          │  beží na Raspberry Pi, každých N hodín
│  (scraper/main.py)       │  filtruje duplikáty cez MD5(url)
└────────────┬─────────────┘
             │ text článku (prvých 4000 znakov)
             ▼
┌──────────────────────────┐
│  DeepSeek AI API         │  deepseek-chat, temperature=0.2
│  (deepseek_client.py)    │  → súhrn, kategória, sentiment, hráči, tagy
└────────────┬─────────────┘
             │ JSON výsledok
             ▼
┌──────────────────────────┐       FCM push
│  Firebase Firestore      │  ────────────────► Prehliadač používateľa
│  kolekcia "articles"     │       notifikácia   (firebase-messaging-sw.js)
│  kolekcia "fcm_tokens"   │
└────────────┬─────────────┘
             │ Firebase JS SDK (read + write)
             ├──────────────────────────────────────────────────┐
             ▼                                                  ▼
┌─────────────────────────────────────┐        ┌───────────────────────────┐
│  Qwik Frontend (verejný)            │        │  Admin panel (/admin/)    │
│  /          — grid, filtre, search  │        │  schvaľovanie, mazanie,   │
│  /[slug]/   — detail článku + AI    │        │  inline editácia, search, │
│  /stats/    — štatistiky a grafy    │        │  stránkovanie             │
│  PWA: sw.js, manifest.json,         │        └───────────────────────────┘
│        offline cache (localStorage) │
└─────────────────────────────────────┘
```

---

## 3. Použité technológie

| Vrstva | Technológia | Účel |
|--------|-------------|------|
| Scraping | Python 3.11+, requests, BeautifulSoup4 | Sťahovanie HTML stránok |
| Extrakcia textu | trafilatura | Čistá extrakcia textu + dátumu článku z HTML |
| RSS | feedparser | Fallback na RSS feed (Spartak, Michalovce, Komárno) |
| AI analýza | DeepSeek API (deepseek-chat) | Súhrn, kategória, sentiment, hráči, tagy |
| Databáza | Firebase Firestore | Cloudové ukladanie článkov a FCM tokenov |
| Push notifikácie | Firebase Admin SDK (messaging) | FCM notifikácie adminovi po každom scrape behu |
| Plánovanie | APScheduler | Automatické spúšťanie každých N hodín |
| Prostredie | python-dotenv | Správa API kľúčov cez .env súbor |
| Frontend | Qwik + TypeScript | Webový dashboard, detail stránky, štatistiky, admin panel |
| Routing | Qwik City (file-system router) | SSR routing vrátane dynamickej trasy `[slug]` |
| Auth (admin) | Firebase JS SDK (client-side) | Priame Firestore operácie v admin paneli |
| PWA | Service Worker + Web App Manifest | Offline režim, inštalácia na mobil, push notifikácie |
| Slugify | vlastná funkcia (`lib/utils.ts`) | NFD normalizácia slovenských diakritík pre URL |
| Nasadenie | Raspberry Pi | Scraper beží nepretržite |
| Verzovanie | Git + GitHub | História zmien, repozitár |

---

## 4. Štruktúra repozitára

```
slovak-football-scraper/
├── scraper/
│   ├── config/
│   │   └── clubs.py              # konfigurácia 12 klubov (URL, liga, skratka)
│   ├── src/
│   │   ├── models/
│   │   │   └── article.py        # dátový model článku (@dataclass)
│   │   ├── scrapers/
│   │   │   ├── base_scraper.py   # HTTP fetch + trafilatura extrakcia
│   │   │   └── generic_scraper.py # RSS → sitemap → HTML fallback reťazec
│   │   └── utils/
│   │       ├── deepseek_client.py # DeepSeek AI analýza
│   │       └── firebase_client.py # Firestore CRUD + deduplikácia + FCM notifikácie
│   ├── main.py                   # orchestrátor (jednorazový / plánovaný beh)
│   ├── test_scraper.py           # test scrapingu bez AI/Firebase
│   ├── test_analysis.py          # test kompletnej analýzy
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── public/
│   │   ├── favicon.svg
│   │   ├── manifest.json         # PWA manifest (názov, farby, ikony)
│   │   ├── sw.js                 # Service Worker — offline cache
│   │   └── firebase-messaging-sw.js # Service Worker — FCM push notifikácie
│   ├── src/
│   │   ├── components/
│   │   │   ├── ArticleCard.tsx   # karta článku s overlay odkazom na detail
│   │   │   └── SkeletonCard.tsx  # animovaný placeholder pre skeleton loading
│   │   ├── lib/
│   │   │   ├── firebase.ts       # inicializácia Firebase JS klienta
│   │   │   ├── types.ts          # TypeScript typy + prekladové mapy
│   │   │   └── utils.ts          # pomocné funkcie (slugify, relativeTime)
│   │   └── routes/
│   │       ├── index.tsx         # hlavná stránka — grid + filtre + vyhľadávanie
│   │       ├── [slug]/
│   │       │   └── index.tsx     # detail článku — /nadpis-clanku/
│   │       ├── stats/
│   │       │   └── index.tsx     # štatistiky — /stats/
│   │       └── admin/
│   │           └── index.tsx     # admin panel — /admin/
│   ├── src/global.css            # globálne štýly (dark mode, karty, modal, štatistiky)
│   └── .env.example
├── docs/
│   ├── DOKUMENTACIA.md           # tento súbor
│   └── screenshots/              # snímky obrazoviek
└── README.md
```

---

## 5. Dátový model článku

Každý článok je uložený ako dokument vo Firestore kolekcii `articles`. Doc ID = `MD5(url)`.

| Pole | Typ | Popis |
|------|-----|-------|
| `url` | string | Originálna URL článku |
| `club_name` | string | Plný názov klubu (napr. "ŠK Slovan Bratislava") |
| `club_short_name` | string | Skratka (napr. "slovan") |
| `league` | string | Liga (napr. "nike_liga") |
| `title` | string | Nadpis článku |
| `content` | string | Plný text článku (extrahovaný trafilaturou) |
| `published_at` | string \| null | Dátum publikovania (ISO 8601), ak ho trafilatura detegovala |
| `scraped_at` | string | Dátum a čas stiahnutia (ISO 8601, UTC) |
| `summary` | string \| null | AI súhrn (2–3 vety, slovenčina) |
| `category` | string \| null | AI kategória (jedna z 9 hodnôt) |
| `sentiment` | string \| null | AI sentiment: `positive`, `neutral`, `negative` |
| `key_players` | string[] | Mená kľúčových hráčov (max 5) |
| `tags` | string[] | Kľúčové slová (max 5) |
| `approved` | boolean | Schválenie adminom — iba schválené články sa zobrazujú na dashboarde |

---

## 6. Podporované kategórie

| Kód | Zobrazenie | Farba |
|-----|-----------|-------|
| `transfer` | Prestup | oranžová |
| `predlzenie_zmluvy` | Predĺženie zmluvy | zelená |
| `trenerska_zmena` | Trénerská zmena | fialová |
| `zapas` | Zápas | modrá |
| `zranenie` | Zranenie | červená |
| `tlacova_konferencia` | Tlačová konferencia | azúrová |
| `mlad` | Mládež | limetková |
| `trenink` | Tréning | šedá |
| `ine` | Iné | svetlošedá |

---

## 7. Frontend — verejný dashboard

Dostupný na hlavnej URL aplikácie.

### Stránky

| URL | Súbor | Popis |
|-----|-------|-------|
| `/` | `routes/index.tsx` | Hlavná stránka — grid článkov s filtrami |
| `/[slug]/` | `routes/[slug]/index.tsx` | Detail článku — napr. `/slovan-prestupil-hraca/` |
| `/stats/` | `routes/stats/index.tsx` | Štatistiky a grafy |
| `/admin/` | `routes/admin/index.tsx` | Admin panel (chránený heslom) |

### Funkcie hlavnej stránky
- **Fulltextové vyhľadávanie** — vyhľadáva súčasne v nadpise, AI súhrne, mene klubu, kľúčových hráčoch aj tagoch; real-time filtrovanie bez server requestu
- **Filter kategórie** — dropdown pre filtrovanie podľa AI kategórie (prestup, zápas atď.)
- **Filter klubu** — dropdown "Všetky kluby / Slovan / DAC / ..." — dynamicky generovaný z načítaných článkov
- **Zoradenie** — články zoradené podľa `published_at` zostupne (články z rôznych klubov sa prirodzene prelínajú podľa dátumu)
- **Len schválené články** — zobrazujú sa iba články s `approved: true`; neschválené sú viditeľné len v admin paneli
- **Tmavý režim** — prepínač 🌙/☀ v hlavičke; predvoľba sa ukladá do `localStorage`
- **Responzívny dizajn** — grid sa prispôsobuje od 3 stĺpcov na desktop až po 1 stĺpec na mobile
- **Offline režim** — po prvom načítaní sa články uložia do `localStorage`; pri výpadku siete sa zobrazí cached verzia s informačným bannerom
- **Push notifikácie** — tlačidlo 🔕/🔔 v hlavičke; po kliknutí prehliadač požiada o povolenie; po schválení zobrazí potvrdzovaciu notifikáciu
- **Skeleton loading** — počas načítavania článkov sa zobrazí mriežka 6 animovaných placeholder kariet (shimmer efekt) namiesto statického textu "Načítavam..."; skeletony kopírujú rozloženie reálnej karty (klub, dátum, nadpis, preview, badge)

### Karta článku (`ArticleCard`)
- Celá karta je klikateľná (overlay `<a>` odkaz na `z-index: 2`) — otvorí detail stránku na URL `/nadpis-clanku/`
- Tlačidlo ↗ (pravý horný roh) otvára originálny zdroj v novom tabe — má `z-index: 3`, teda je nad overlayom a funguje nezávisle
- Názov klubu (zelený) + liga
- **Relatívny čas** — dátum sa zobrazuje ako "pred 2 hod", "včera", "pred 3 dňami", "pred 2 mes." atď.; pri hover zobrazí tooltip s plným dátumom; pre staré články (>1 rok) sa zobrazí plný dátum v slovenčine
- Nadpis článku
- AI súhrn skrátený na 300 znakov (fallback na obsah ak súhrn chýba)
- Farebný badge kategórie
- Prví 3 kľúčoví hráči

### Detail článku (`/[slug]/`)

URL sa generuje automaticky zo slovenského nadpisu — diakritika sa odstráni, medzery nahradí `-`:

```
"Slovan prestúpil Štefana Žigárda"  →  /slovan-prestupil-stefana-zigarda/
```

Implementácia v `lib/utils.ts` funkciou `slugify()` (NFD normalizácia + regex).

Stránka zobrazuje:
- Farebný badge **kategórie** + badge **sentimentu** (😊 pozitívny / 😐 neutrálny / 😟 negatívny) s farbou
- **AI zhrnutie** — plný text (nie skrátený)
- **Všetci kľúčoví hráči** — interaktívne chipy (zelené)
- **Všetky tagy** — chipy s `#` prefixom (sivé)
- **Tlačidlo** na originálny článok
- **Tlačidlo "Zdieľať"** — na mobile otvorí natívny OS share sheet (Web Share API); na desktop skopíruje URL do schránky (Clipboard API) ako fallback
- **Súvisiace články** — max 3, filtrované podľa rovnakého klubu alebo kategórie
- `<title>` stránky = nadpis článku (SEO-friendly)

Data sa načítava cez `routeLoader$` — beží na serveri pri SSR, výsledok je serializovaný do HTML pred odoslaním do prehliadača.

### Štatistiky (`/stats/`)

Agreguje všetky schválené články a zobrazuje:
- **Súhrnné čísla** — celkový počet článkov, počet klubov, počet spomínaných hráčov
- **Sentiment** — tri farebné boxy s absolútnym počtom aj percentom (pozitívny / neutrálny / negatívny)
- **Graf: Články podľa klubu** — horizontálne CSS bary, zoradené zostupne
- **Graf: Rozdelenie podľa kategórie** — horizontálne CSS bary s farbou každej kategórie
- **Rebríček hráčov** — top 15 najčastejšie spomínaných hráčov s mini progress barom

Grafy sú implementované čisto v CSS (bez knižnice) — `<div>` s `width: X%` vypočítaným z pomeru k maximálnej hodnote.

### PWA (Progressive Web App)

Aplikácia spĺňa kritériá pre inštaláciu ako natívna aplikácia na mobilnom zariadení:

- **`public/manifest.json`** — názov `Slovak Football AI`, krátky názov `SFA`, `theme_color: #22c55e`, `display: standalone`
- **`public/sw.js`** — Service Worker pre offline funkcionalitu:
  - *Install*: cachuje statické assety (favicon, manifest)
  - *Activate*: vymaže staré cache verzie (cache versioning cez `sfa-v2`)
  - *Fetch*: pre navigačné requesty (HTML stránky) — network-first, fallback na cache; pre statické assety — cache-first
  - Vite HMR requesty (`/@`, `hot-update`) sú vylúčené z interceptovania
- **`public/firebase-messaging-sw.js`** — Service Worker pre FCM push notifikácie:
  - Prijíma `push` udalosti a zobrazuje systémové notifikácie
  - Pri kliknutí na notifikáciu otvorí aplikáciu alebo prenesie focus na existujúci tab

### Farebná paleta
- Header: `#0d1a0e` (tmavá lesná zelená) s `#22c55e` accent borderom
- Primárny accent: `#16a34a` (zelená) — odkazy, aktívne prvky, hover efekty
- Hover na kartách: zelený box-shadow + ľavý zelený prúžok

---

## 8. Admin panel

Dostupný na `/admin`. Chránený heslom z `VITE_ADMIN_PASSWORD`.

### Prihlásenie
- Heslo sa uloží do `localStorage` — prihlásenie pretrváva aj po obnovení stránky (Ctrl+R)
- Tab browsera zobrazuje počet neschválených článkov: `(12) Admin — Slovak Football AI`

### Záložky
- **Na schválenie** — iba články s `approved: false`
- **Všetky** — všetky články bez ohľadu na stav

### Funkcie tabuľky
- **Vyhľadávanie** — search bar filtruje tabuľku v reálnom čase podľa nadpisu alebo klubu
- **Hromadné schválenie** — tlačidlo "Schváliť všetky (N)" schváli všetky neschválené naraz cez `Promise.all`
- **Stránkovanie** — 25 článkov na stránku; info "1–25 z 138"; čísla stránok; klik zmení stránku a zatvorí rozbalený riadok
- **Rozbaľovací detail** — klik na riadok rozbalí editor:
  - Dropdown kategórie
  - Textarea AI súhrnu
  - Tlačidlo "Uložiť zmeny"
  - Kľúčoví hráči a tagy (read-only)
  - Originálny text článku (read-only, scrollovateľný)
- **Schválenie** — nastaví `approved: true`, článok sa okamžite zobrazí na dashboarde
- **Zmazanie** — s potvrdením vymaže dokument z Firestore
- **Chybový banner** — zobrazí chybovú správu, zatvára sa kliknutím

### Mobilná responzivita
- Tabuľka je zabalená v scrollovateľnom wraperi (`overflow-x: auto`)
- Toolbar (search + schváliť všetky) sa skladá do stĺpca
- Pod 480px sa stĺpec "Dátum" skryje
- Minimálna šírka tabuľky 520px zaručuje čitateľnosť pri horizontálnom scrolle

### Technická implementácia
Admin panel používa Firebase JS SDK (client-side) priamo v `onClick$` handleroch — `updateDoc` a `deleteDoc` z `firebase/firestore`. Nevyžaduje server-side API ani JWT tokeny.

---

## 9. Návod na spustenie

### Požiadavky
- Python 3.11+ (testované na 3.14)
- Node.js 18+
- Firebase projekt so Firestore databázou
- DeepSeek API kľúč (platform.deepseek.com)

### Inštalácia — scraper

```bash
cd scraper
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Linux / Raspberry Pi

pip install -r requirements.txt
```

> **Poznámka:** `lxml` nie je v závislostiach — Python 3.14 nemá precompilovaný wheel, používame vstavaný `html.parser`.

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

### Konfigurácia — frontend

```bash
cd frontend
npm install
cp .env.example .env
```

Vyplniť v `frontend/.env`:
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
VITE_ADMIN_PASSWORD=tvoje_heslo
FIREBASE_CREDENTIALS_PATH=../scraper/serviceAccountKey.json
```

### Firebase Firestore pravidlá

V Firebase Console → Firestore → Rules nastaviť:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /articles/{articleId} {
      allow read: if true;
      allow write: if true;
    }
  }
}
```

> Zápis je povolený pre všetkých — je chránený na úrovni aplikácie heslom v admin paneli.

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

### Spustenie frontendu

```bash
cd frontend
npm run dev     # vývojový server — http://localhost:5173
npm run build   # produkčný build do dist/
```

---

## 10. Priebeh vývoja

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
| Prešov | neexistujúca doména | `fctatran.sk` |
| Skalica | nesprávna cesta | `www.mfkskalica.sk/` |

Ďalšie opravy:
- Odstránená závislosť na `lxml` (Python 3.14 nemá wheel) → `html.parser`
- Vylúčené navigačné, paginačné, kontaktné a promo URL
- Zoradenie článkov podľa číselného ID v URL zostupne (najnovší = prvý)
- Oprava pre DAC — ID je v query parametri (`?id=slug-12273`), nie v path

### Fáza 3 — Riešenie špeciálnych prípadov

**FC Košice** — stránka načítava články cez JavaScript, HTML je bez odkazov:
- Pokus o sitemap.xml → zastaraný
- Analýza HTML odhalila URL vzor `-a19-{id}` priamo v zdrojovom kóde
- Riešenie: pridanie `-a19-` do `ARTICLE_PATH_KEYWORDS`
- Výsledok: 20 článkov správne nájdených

### Fáza 4 — Qwik frontend

- Scaffoldovaný Qwik projekt s TypeScriptom, Firebase JS SDK
- Vytvorený `ArticleCard` komponent — zobrazuje AI súhrn, dátum publikovania, kategóriu s farbou, kľúčových hráčov
- Frontend zobrazuje `published_at` s fallbackom na `scraped_at`
- Články zoradené podľa dátumu publikovania zostupne — rôzne kluby sa prirodzene prelínajú
- Filter podľa kategórie; filter podľa ligy odstránený (existuje len Niké liga)
- Firestore rules nastavené na `allow read: if true`
- Zobrazujú sa iba schválené články (`approved: true`)

### Fáza 5 — Admin panel

- Prihlásenie heslom s perzistenciou cez `localStorage`
- Tabuľkový prehľad článkov s dvoma záložkami: neschválené / všetky
- Schválenie a zmazanie článkov priamo z admin rozhrania
- Inline editácia AI kategórie a súhrnu
- Zobrazenie plného obsahu článku v rozbalenom detaile
- Operácie cez Firebase JS SDK (`updateDoc`, `deleteDoc`) — client-side, bez servera

### Fáza 6 — Rozšírenia

- **Filter klubu** na verejnom dashboarde (dropdown zo zoznamu načítaných klubov)
- **Hromadné schválenie** — jedno tlačidlo schváli všetky neschválené naraz (`Promise.all`)
- **Vyhľadávanie** v admin paneli — real-time filter podľa nadpisu alebo klubu
- **Stránkovanie** po 25 článkoch s navigáciou a info "X–Y z N"
- **Počítadlo v tab title** — `(N) Admin — Slovak Football AI`, aktualizuje sa po každej operácii
- **Tmavý režim** — prepínač s ukladaním do `localStorage`; CSS overrides cez `html.dark` triedu
- **Mobilná responzivita admin panelu** — horizontálny scroll tabuľky, skladanie toolbaru, skrývanie stĺpca dátumu na úzkych obrazovkách
- **Nová farebná paleta** — zelená namiesto generickej modrej; tmavý header evokuje nočné futbalové ihrisko

### Fáza 7 — PWA, štatistiky, vyhľadávanie, detail článku

#### Detail článku na vlastnej URL
Kliknutie na kartu článku otvorí dedikovanú stránku `/nadpis-clanku/` namiesto modalu. Slug sa generuje automaticky z nadpisu funkciou `slugify()` (NFD normalizácia pre slovenské diakritiky — š→s, č→c, ž→z, ľ→l atď.). Data sa načítava cez Qwik `routeLoader$` — server-side pri SSR, čo umožňuje správne SEO meta tagy (`<title>` = nadpis článku). Karta zostáva klikateľná cez neviditeľný CSS overlay `<a>` link (technika "card overlay") — tlačidlo ↗ na originál je nad overlayom (CSS `z-index`) a funguje nezávisle.

#### Štatistický dashboard (`/stats/`)
Nová stránka s prehľadom agregovaných dát. Kľúčové rozhodnutie: grafy sú implementované čistým CSS bez externej knižnice (recharts/chart.js by vyžadoval React závislosti, ktoré sú nekompatibilné s Qwikom). Výška/šírka barov sa vypočíta ako `(hodnota / maximum) * 100 %`.

#### Fulltextové vyhľadávanie
Search input v lište filtrov kombinuje filtrovanie naprieč piatimi poľami naraz (title, summary, club\_name, key\_players, tags) — všetky sú spojené do jedného reťazca a porovnané s `toLowerCase().includes(query)`. Nepotrebuje server — funguje nad dátami načítanými do pamäte.

#### PWA a offline režim
Service worker (`sw.js`) bol vyladený v dvoch iteráciách — prvá verzia kešovala redirect URL `/stats` (bez lomky, 301) čo spôsobilo redirect loop a Chrome zobrazil `ERR_FAILED`. Druhá verzia:
- cachuje len statické assety bez HTML stránok pri inštalácii (žiadne redirecty)
- navigačné requesty (HTML) sú network-first: cache sa uloží až po úspešnom fetchnutí z neta
- Vite HMR requesty sú explicitne vylúčené z interceptovania

Offline záloha článkov funguje cez `localStorage` — pri každom úspešnom načítaní sa JSON uloží; pri výpadku siete sa použije cached verzia.

#### FCM push notifikácie (scraper)
`firebase_client.py` rozšírený o dve funkcie:
- `get_fcm_tokens(db)` — načíta tokeny z kolekcie `fcm_tokens`
- `send_push_notification(title, body, tokens)` — odosiela FCM multicast správu cez `firebase_admin.messaging`

Po každom behu scrapera sa odošle notifikácia adminom ("N nových článkov čaká na schválenie") ak boli nájdené nové články. Frontend zaregistruje token po kliknutí na tlačidlo 🔔 a uloží ho do Firestore.

### Fáza 8 — Relatívny čas a skeleton loading

#### Relatívny čas
Funkcia `relativeTime()` pridaná do `lib/utils.ts`. Nahrádza statický formátovaný dátum v kartách dynamickým popisom relatívneho veku článku:

| Hranica | Výstup |
|---------|--------|
| < 1 min | "práve teraz" |
| < 60 min | "pred N min" |
| 1 hodina | "pred hodinou" |
| < 24 hod | "pred N hod" |
| 1 deň | "včera" |
| < 30 dní | "pred N dňami" |
| 1 mesiac | "pred mesiacom" |
| < 12 mes. | "pred N mes." |
| ≥ 1 rok | plný dátum (sk-SK) |

Pri hover sa zobrazí tooltip (`title` atribút) s plným dátumom, čo zachováva presnú informáciu pre prípad potreby.

#### Skeleton loading
Nový komponent `SkeletonCard.tsx` zobrazuje animovaný placeholder s rovnakou štruktúrou ako `ArticleCard` — obsahuje sivé bloky pre klub, dátum, nadpis (2 riadky), preview (3 riadky) a badge. Animácia `@keyframes shimmer` prechádza gradientom zľava doprava (800px background-size, 1.4s cyklus). Tmavý režim používa tmavšie farby gradientu. Počas načítavania sa renderuje 6 skeletonov v rovnakom CSS gride ako reálne karty — používateľ vidí okamžite tvar budúceho obsahu bez content layout shiftu.

#### Oprava klikateľnosti kariet
Overlay `<a>` odkaz bol na `z-index: 0` (pod obsahom karty) — klik na text teda nedosiahol overlay a navigácia nefungovala. Oprava: overlay presunutý na `z-index: 2` (nad všetkým obsahom), tlačidlo ↗ na `z-index: 3` (nad overlayom, zostáva nezávislé). Keďže overlay je transparentný, vizuálny vzhľad sa nezmenil.

---

## 11. Finálny stav klubov

**12/12 klubov Niké ligy funkčných**

| Klub | Metóda | Typický počet článkov |
|------|--------|----------------------|
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

## 12. Ukážka výstupu DeepSeek analýzy

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

---

## 13. Reflexia využitia LLM nástrojov

### Použité nástroje

| Nástroj | Kde použitý |
|---------|-------------|
| **Claude Code (claude-sonnet-4-6)** | Celý vývoj — generovanie kódu, debugovanie, architektúra, dokumentácia |
| **DeepSeek API (deepseek-chat)** | Runtime funkcionalita — analýza každého článku v produkcii |

### Využitie Claude Code pri vývoji

Claude Code bol použitý ako hlavný vývojový asistent počas celého projektu:

- **Návrh architektúry** — Claude navrhol celú štruktúru projektu vrátane dátového modelu, fallback reťazca (RSS → sitemap → HTML) a rozdelenia do modulov
- **Generovanie kódu** — všetky Python a TypeScript súbory vznikli s pomocou Claude Code; Claude súčasne spravoval aj build a lint kontroly
- **Webový výskum** — Claude vyhľadával správne URL pre klubové weby, identifikoval RSS feedy
- **Debugovanie** — diagnostika zlyhaní: lxml/Python 3.14, Košice JS rendering, DAC query-param ID, Firestore permissions, Qwik QRL serializácia
- **Návrhy funkcionalít** — Claude aktívne navrhoval vylepšenia (inline editácia, vyhľadávanie, hromadné schválenie, tmavý režim, stránkovanie)
- **Dokumentácia** — táto dokumentácia bola generovaná a priebežne aktualizovaná Claudom

### Prínosy LLM nástrojov

- **Rýchlosť** — celý základ projektu (scraper + frontend + admin panel so všetkými rozšíreniami) vznikol v priebehu niekoľkých hodín
- **Diagnostika** — každá chyba bola identifikovaná a opravená bez manuálneho googlowania; Claude vysvetlil príčinu a navrhol riešenie
- **Iterácia** — admin panel prešiel viacerými iteráciami (server$, API route, JWT/REST, nakoniec client-side SDK) kým bolo nájdené funkčné riešenie; Claude si udržiaval kontext naprieč iteráciami
- **Konzistentnosť** — Claude udržiaval konzistentný kódový štýl, TypeScript typy a CSS konvencie naprieč celým projektom

### Limity a úskalia

- **Hallucinácie URL** — Claude navrhol nesprávne `news_url` pre 7 z 12 klubov; bolo nutné každý overiť reálnym testom
- **JS-rendered weby** — FC Košice načítava články cez JavaScript; bolo potrebných viacero iterácií kým sme našli vzor `-a19-`
- **Qwik QRL serializácia** — Qwik optimalizátor spracúva `onClick$` inak ako React; Firebase objekty v handleroch vyžadujú client-side prístup (nie server$); toto spôsobilo dlhú sériu neúspešných pokusov so server-side riešeniami
- **Python 3.14** — najnovšia verzia Pythonu nie je ešte plne podporovaná všetkými knižnicami (`lxml`)
- **Firebase Firestore rules** — Firestore security rules blokujú zápis z klienta; treba vedome nastaviť `allow write: if true`
- **Kontext medzi sessionmi** — Claude Code uchováva kontext len v rámci jednej session; dlhé projekty vyžadujú zhrnutia na začiatku každej novej session

### Čo som sa naučil

- LLM asistent dramaticky zrýchľuje vývoj, ale výstupy treba vždy overiť v reálnom prostredí — najmä URL a konfiguráciu
- Claude Code zvládol celý development workflow vrátane build kontroly, git commitov a dokumentácie
- DeepSeek ako runtime AI komponent presne kategorizuje slovenské futbalové texty
- Kombinácia LLM pri vývoji + LLM v produkte je efektívna architektúra pre informačné agregátory
- Rôzne weby majú radikálne odlišné štruktúry — generický scraper musí mať robustný fallback mechanizmus
- Client-side Firebase SDK je jednoduchšie a spoľahlivejšie riešenie pre admin operácie ako server-side prístup s JWT tokenmi
- Úprimná reflexia neúspechov (séria nefunkčných admin riešení) je cennejšia ako popis len úspešných krokov
