from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class Article:
    url: str
    club_name: str
    club_short_name: str
    league: str
    title: str
    content: str
    scraped_at: datetime = field(default_factory=datetime.utcnow)
    published_at: Optional[datetime] = None
    summary: Optional[str] = None
    # transfer | predlzenie_zmluvy | trenerska_zmena | zapas | zranenie |
    # tlacova_konferencia | mlad | trenink | ine
    category: Optional[str] = None
    sentiment: Optional[str] = None
    key_players: list = field(default_factory=list)
    tags: list = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "url": self.url,
            "club_name": self.club_name,
            "club_short_name": self.club_short_name,
            "league": self.league,
            "title": self.title,
            "content": self.content,
            "scraped_at": self.scraped_at.isoformat(),
            "published_at": self.published_at.isoformat() if self.published_at else None,
            "summary": self.summary,
            "category": self.category,
            "sentiment": self.sentiment,
            "key_players": self.key_players,
            "tags": self.tags,
        }
