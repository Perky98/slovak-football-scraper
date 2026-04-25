from urllib.parse import urljoin, urlparse
import logging
import re
import feedparser
from bs4 import BeautifulSoup
from .base_scraper import BaseScraper

logger = logging.getLogger(__name__)

ARTICLE_PATH_KEYWORDS = [
    "/aktuality/", "/novinky/", "/clanok", "/clanek",
    "/article/", "/post/", "/tlacove-spravy/", "/aktualita-",
]

SKIP_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".pdf", ".mp4", ".zip"}

# Patterns that indicate a navigation/pagination URL, not an article
SKIP_URL_PATTERNS = re.compile(
    r"(index\.php|index\.asp|\bpage=\d|\bpage/\d|/tag/|/category/|/kategoria/"
    r"|/archiv/?$|/aktuality/?$|/novinky/?$|/spravy/?$|/news/?$|\?kde="
    r"|press-zona|zona\.php|contact|kontakt|partneri|historia|stadion|soupiska|zapasy\.asp"
    r"|vstupenk|permanentk|zabezpec-si|predaj-vstupeniek|kup-listok|tickets?[=-])",
    re.IGNORECASE,
)

COMMON_RSS_PATHS = ["/feed", "/rss", "/feed.xml", "/rss.xml", "/atom.xml"]


class GenericScraper(BaseScraper):

    def get_article_links(self) -> list[str]:
        links = self._try_rss()
        if links:
            logger.info(f"[{self.club_config['short_name']}] {len(links)} links via RSS")
            return links

        if self.club_config.get("sitemap_url"):
            links = self._try_sitemap(self.club_config["sitemap_url"])
            if links:
                logger.info(f"[{self.club_config['short_name']}] {len(links)} links via sitemap")
                return links

        links = self._scrape_news_page()
        logger.info(f"[{self.club_config['short_name']}] {len(links)} links via HTML")
        return links

    # ------------------------------------------------------------------
    def _try_rss(self) -> list[str]:
        base = self.club_config["base_url"].rstrip("/")
        for path in COMMON_RSS_PATHS:
            try:
                feed = feedparser.parse(base + path)
                if feed.entries:
                    return [e.link for e in feed.entries[:25] if hasattr(e, "link")]
            except Exception:
                continue
        return []

    def _try_sitemap(self, sitemap_url: str) -> list[str]:
        xml = self.fetch_page(sitemap_url)
        if not xml:
            return []
        urls = re.findall(r"<loc>\s*(https?://[^\s<]+)\s*</loc>", xml)
        articles = [u for u in urls if self._looks_like_article(u) and not SKIP_URL_PATTERNS.search(u)]
        return self._sort_by_id(articles)[:30]

    def _scrape_news_page(self) -> list[str]:
        html = self.fetch_page(self.club_config["news_url"])
        if not html:
            return []

        soup = BeautifulSoup(html, "html.parser")
        base_url = self.club_config["base_url"]
        domain = urlparse(base_url).netloc

        # Use list + seen set to preserve page order (newest first)
        seen: set[str] = set()
        found: list[str] = []

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
            if SKIP_URL_PATTERNS.search(abs_url):
                continue
            if abs_url in seen:
                continue
            if self._looks_like_article(abs_url):
                seen.add(abs_url)
                found.append(abs_url)

        return self._sort_by_id(found)[:30]

    @staticmethod
    def _sort_by_id(links: list[str]) -> list[str]:
        """Sort article links newest-first by the largest 4+ digit number in the full URL."""
        def url_id(url: str) -> int:
            # Search full URL (path + query) to catch IDs like clanek.asp?id=slug-12273
            nums = re.findall(r"\d{4,}", url)
            return max((int(n) for n in nums), default=0)

        has_id = [u for u in links if url_id(u) > 0]
        no_id  = [u for u in links if url_id(u) == 0]

        if len(has_id) >= len(links) // 2:
            return sorted(has_id, key=url_id, reverse=True) + no_id
        return links

    @staticmethod
    def _looks_like_article(url: str) -> bool:
        lower = url.lower()
        if any(kw in lower for kw in ARTICLE_PATH_KEYWORDS):
            return True
        # URL contains a year segment (e.g. /2025/ or /2024/)
        if re.search(r"/20[2-9]\d/", lower):
            return True
        # URL ends with a pure numeric ID (e.g. /news/12345)
        path = urlparse(url).path
        segments = [s for s in path.split("/") if s]
        if segments and segments[-1].isdigit():
            return True
        return False
