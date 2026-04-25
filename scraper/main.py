import logging
import os
import time
from datetime import datetime

from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO"),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

from config.clubs import ALL_CLUBS
from src.models.article import Article
from src.scrapers.generic_scraper import GenericScraper
from src.utils.deepseek_client import analyze_article
from src.utils.firebase_client import get_db, article_exists, save_article


def process_club(db, club: dict) -> int:
    name = club["name"]
    logger.info(f"── {name}")

    scraper = GenericScraper(club)
    links = scraper.get_article_links()
    if not links:
        logger.warning(f"  No links found for {name}")
        return 0

    saved = 0
    for url in links:
        if article_exists(db, url):
            continue

        title, content = scraper.extract_article_content(url)
        if len(content) < 80:
            continue

        analysis = analyze_article(title, content, name)

        article = Article(
            url=url,
            club_name=name,
            club_short_name=club["short_name"],
            league=club["league"],
            title=title,
            content=content,
            scraped_at=datetime.utcnow(),
            summary=analysis.get("summary"),
            category=analysis.get("category"),
            sentiment=analysis.get("sentiment"),
            key_players=analysis.get("key_players", []),
            tags=analysis.get("tags", []),
        )

        doc_id = save_article(db, article)
        saved += 1
        logger.info(f"  + [{article.category}] {title[:70]}")
        time.sleep(1)

    return saved


def run_once():
    db = get_db()
    active = [c for c in ALL_CLUBS if c.get("active", True)]
    logger.info(f"Starting scrape run — {len(active)} clubs")
    total = 0
    for club in active:
        try:
            total += process_club(db, club)
        except Exception as e:
            logger.error(f"Club failed ({club['name']}): {e}")
        time.sleep(2)
    logger.info(f"Done. {total} new articles saved.")


def run_scheduled():
    from apscheduler.schedulers.blocking import BlockingScheduler

    interval_hours = int(os.environ.get("SCRAPE_INTERVAL_HOURS", 6))
    scheduler = BlockingScheduler()
    scheduler.add_job(run_once, "interval", hours=interval_hours)
    logger.info(f"Scheduler started — running every {interval_hours}h")
    run_once()
    scheduler.start()


if __name__ == "__main__":
    import sys
    if "--scheduled" in sys.argv:
        run_scheduled()
    else:
        run_once()
