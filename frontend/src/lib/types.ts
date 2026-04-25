export interface Article {
  id: string;
  url: string;
  club_name: string;
  club_short_name: string;
  league: string;
  title: string;
  content: string;
  scraped_at: string;
  published_at: string | null;
  summary: string | null;
  category: string | null;
  sentiment: "positive" | "neutral" | "negative" | null;
  key_players: string[];
  tags: string[];
}

export const CATEGORY_LABELS: Record<string, string> = {
  transfer: "Prestup",
  predlzenie_zmluvy: "Predĺženie zmluvy",
  trenerska_zmena: "Trénerská zmena",
  zapas: "Zápas",
  zranenie: "Zranenie",
  tlacova_konferencia: "Tlačová konferencia",
  mlad: "Mládež",
  trenink: "Tréning",
  ine: "Iné",
};

export const SENTIMENT_COLOR: Record<string, string> = {
  positive: "#22c55e",
  neutral: "#94a3b8",
  negative: "#ef4444",
};

export const LEAGUE_LABELS: Record<string, string> = {
  nike_liga: "Niké liga",
  monacobet_liga: "MONACObet liga",
};
