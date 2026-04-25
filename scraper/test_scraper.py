"""Quick scraper test — no Firebase, no DeepSeek needed."""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from config.clubs import NIKE_LIGA_CLUBS
from src.scrapers.generic_scraper import GenericScraper

def test_club(short_name: str):
    club = next((c for c in NIKE_LIGA_CLUBS if c["short_name"] == short_name), None)
    if not club:
        print(f"Club '{short_name}' not found")
        return

    print(f"\n=== {club['name']} ===")
    print(f"News URL: {club['news_url']}\n")

    scraper = GenericScraper(club)
    links = scraper.get_article_links()

    if not links:
        print("No links found!")
        return

    print(f"Found {len(links)} article links:")
    for i, link in enumerate(links[:5], 1):
        print(f"  {i}. {link}")

    print(f"\nExtracting content from first link...")
    title, content, date_str = scraper.extract_article_content(links[0])
    print(f"Title:   {title}")
    print(f"Date:    {date_str}")
    print(f"Content: {content[:300]}..." if content else "Content: (empty)")

if __name__ == "__main__":
    club = sys.argv[1] if len(sys.argv) > 1 else "slovan"
    test_club(club)
