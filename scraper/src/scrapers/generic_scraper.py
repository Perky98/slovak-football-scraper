from urllib.parse import urljoin, urlparse
from typing import Optional
import logging
import feedparser
from bs4 import BeautifulSoup
from .base_scraper import BaseScraper

logger = logging.getLogger(__name__)

ARTICLE_PATH_KEYWORDS = [
    "/aktuality", "/novinky", "/spravy", "/news", "/clanok",
    "/clanek", "/article", "/post", "/tlacove", "/press",
]

SKIP_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".pdf", ".mp4", ".zip"}

COMMON_RSS_PATHS = ["/feed", "/rss", "/feed.xml", "/rss.xml", "/atom.xml"]


class GenericScraper(BaseScraper):

    def get_article_links(self) -> list[str]:
        links = self._try_rss()
        if links:
            logger.info(f"[{self.club_config['short_name']}] Found {len(links)} links via RSS")
            return links

        links = self._scrape_news_page()
        logger.info(f"[{self.club_config['short_name']}] Found {len(links)} links via HTML scrape")
        return links

    # ------------------------------------------------------------------
    def _try_rss(self) -> list[str]:
        base = self.club_config["base_url"].rstrip("/")
        for path in COMMON_RSS_PATHS:
            url = base + path
            try:
                feed = feedparser.parse(url)
                if feed.entries:
                    return [e.link for e in feed.entries[:25] if hasattr(e, "link")]
            except Exception:
                continue
        return []

    def _scrape_news_page(self) -> list[str]:
        html = self.fetch_page(self.club_config["news_url"])
        if not html:
            return []

        soup = BeautifulSoup(html, "lxml")
        base_url = self.club_config["base_url"]
        domain = urlparse(base_url).netloc

        found: set[str] = set()
        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            if not href or href.startswith("#") or href.startswith("mailto:"):
                continue

            abs_url = urljoin(base_url, href)
            parsed = urlparse(abs_url)

            if parsed.netloc != domain:
                continue
            if any(abs_url.lower().endswith(ext) for ext in SKIP_EXTENSIONS):
                continue
            if self._looks_like_article(abs_url):
                found.add(abs_url)

        return list(found)[:30]

    @staticmethod
    def _looks_like_article(url: str) -> bool:
        lower = url.lower()
        if any(kw in lower for kw in ARTICLE_PATH_KEYWORDS):
            return True
        # URL contains a year-like segment (2020–2029)
        import re
        if re.search(r"/20[2-9]\d/", lower):
            return True
        # URL ends with a long slug or numeric ID
        path = urlparse(url).path
        segments = [s for s in path.split("/") if s]
        if segments and (len(segments[-1]) > 20 or segments[-1].isdigit()):
            return True
        return False
