# Slovak Football AI Scraper

Automatický scraper správ slovenských futbalových klubov (Niké liga + MONACObet liga) s AI analýzou cez DeepSeek a ukladaním do Firebase Firestore.

## Architektúra

```
┌─────────────────────┐     ┌──────────────┐     ┌──────────────────┐
│  Python Scraper     │────▶│  DeepSeek AI │────▶│ Firebase         │
│  (Raspberry Pi)     │     │  (analýza)   │     │ Firestore        │
└─────────────────────┘     └──────────────┘     └────────┬─────────┘
                                                           │
                                                  ┌────────▼─────────┐
                                                  │  Qwik Frontend   │
                                                  │  (web dashboard) │
                                                  └──────────────────┘
```

## Čo scraper extrahuje

Pre každý článok DeepSeek AI automaticky určí:
- **Zhrnutie** (2–3 vety po slovensky)
- **Kategóriu**: prestup, predĺženie zmluvy, trénerská zmena, zápas, zranenie, TK, mládež, tréning
- **Sentiment**: pozitívny / neutrálny / negatívny
- **Hráčov**: menovaní hráči v článku
- **Tagy**: kľúčové slová

## Štruktúra repozitára

```
/scraper     — Python scraper (BeautifulSoup + trafilatura + DeepSeek + Firebase)
/frontend    — Qwik web dashboard
/docs        — dokumentácia a screenshoty
README.md
```

## Spustenie scrapera

### Požiadavky
- Python 3.11+
- Firebase projekt so Firestore databázou
- DeepSeek API kľúč

### Inštalácia

```bash
cd scraper
python -m venv .venv
source .venv/bin/activate        # Linux/Mac/Raspberry Pi
# .venv\Scripts\activate         # Windows

pip install -r requirements.txt
```

### Konfigurácia

```bash
cp .env.example .env
# Vyplň DEEPSEEK_API_KEY a FIREBASE_CREDENTIALS_PATH
```

Do adresára `scraper/` skopíruj `serviceAccountKey.json` zo svojho Firebase projektu.

### Spustenie

```bash
# Jednorazový beh
python main.py

# Plánovaný beh (každých N hodín, nastaviteľné cez SCRAPE_INTERVAL_HOURS)
python main.py --scheduled
```

## Použité technológie

| Vrstva | Technológia |
|--------|-------------|
| Scraping | Python, requests, BeautifulSoup4, trafilatura, feedparser |
| AI analýza | DeepSeek API (deepseek-chat) |
| Databáza | Firebase Firestore |
| Plánovanie | APScheduler |
| Frontend | Qwik |
| Deploy | Raspberry Pi (scraper), Firebase Hosting (frontend) |

## Kluby

Aktuálne sledované ligy:
- **Niké liga** (1. slovenská futbalová liga) — 12 klubov
- **MONACObet liga** (2. slovenská futbalová liga) — priebežne dopĺňané

Konfigurácia klubov: `scraper/config/clubs.py`

---

*Projekt vytvorený s intenzívnym využitím LLM nástrojov (Claude Code, DeepSeek).*
