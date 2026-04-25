"""Test DeepSeek analysis on one real article — no Firebase needed."""
import sys
import os
import json
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from config.clubs import NIKE_LIGA_CLUBS
from src.scrapers.generic_scraper import GenericScraper
from src.utils.deepseek_client import analyze_article

def test(short_name: str = "slovan"):
    club = next(c for c in NIKE_LIGA_CLUBS if c["short_name"] == short_name)
    scraper = GenericScraper(club)

    print(f"Scrapujem {club['name']}...")
    links = scraper.get_article_links()
    print(f"Nájdených {len(links)} článkov, beriem najnovší...\n")

    # links sú v poradí zo stránky — prvý = najnovší
    latest_url = links[0]
    title, content, date_str = scraper.extract_article_content(latest_url)
    print(f"URL:     {latest_url}")
    print(f"Nadpis:  {title}")
    print(f"Dátum:   {date_str or '(nezistený)'}")
    print(f"Obsah:   {content[:200]}...\n")

    print("Posielam do DeepSeek...")
    result = analyze_article(title, content, club["name"])

    print("\n" + "="*50)
    print("  VÝSLEDOK DEEPSEEK ANALÝZY")
    print("="*50)
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    club = sys.argv[1] if len(sys.argv) > 1 else "slovan"
    test(club)
