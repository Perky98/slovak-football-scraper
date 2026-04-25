from abc import ABC, abstractmethod
from typing import Optional
import logging
import requests
import trafilatura

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}


class BaseScraper(ABC):
    def __init__(self, club_config: dict):
        self.club_config = club_config
        self.session = requests.Session()
        self.session.headers.update(HEADERS)

    @abstractmethod
    def get_article_links(self) -> list[str]:
        pass

    def extract_article_content(self, url: str) -> tuple[str, str]:
        """Returns (title, content). Both empty string on failure."""
        try:
            downloaded = trafilatura.fetch_url(url)
            if not downloaded:
                return "", ""
            text = trafilatura.extract(
                downloaded,
                include_tables=False,
                favor_precision=True,
                no_fallback=False,
            )
            metadata = trafilatura.extract_metadata(downloaded)
            title = (metadata.title or "") if metadata else ""
            return title, text or ""
        except Exception as e:
            logger.error(f"Content extraction failed for {url}: {e}")
            return "", ""

    def fetch_page(self, url: str) -> Optional[str]:
        try:
            resp = self.session.get(url, timeout=15)
            resp.raise_for_status()
            resp.encoding = resp.apparent_encoding
            return resp.text
        except Exception as e:
            logger.error(f"Failed to fetch {url}: {e}")
            return None
