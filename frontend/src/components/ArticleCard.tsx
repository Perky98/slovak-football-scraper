import { component$ } from "@builder.io/qwik";
import type { Article } from "~/lib/types";
import { CATEGORY_LABELS, SENTIMENT_COLOR, LEAGUE_LABELS } from "~/lib/types";

interface Props {
  article: Article;
}

export const ArticleCard = component$<Props>(({ article }) => {
  const sentimentColor = article.sentiment ? SENTIMENT_COLOR[article.sentiment] : "#94a3b8";
  const categoryLabel = article.category ? (CATEGORY_LABELS[article.category] ?? article.category) : null;
  const leagueLabel = LEAGUE_LABELS[article.league] ?? article.league;
  const date = article.scraped_at
    ? new Date(article.scraped_at).toLocaleDateString("sk-SK")
    : "";

  return (
    <div class="card">
      <div class="card-meta">
        <span class="club">{article.club_name}</span>
        <span class="league">{leagueLabel}</span>
        <span class="date">{date}</span>
      </div>

      <h2 class="card-title">
        <a href={article.url} target="_blank" rel="noopener noreferrer">
          {article.title || "Bez názvu"}
        </a>
      </h2>

      {article.summary && <p class="summary">{article.summary}</p>}

      <div class="card-footer">
        {categoryLabel && <span class="badge category">{categoryLabel}</span>}

        {article.sentiment && (
          <span class="badge sentiment" style={{ backgroundColor: sentimentColor }}>
            {article.sentiment === "positive" ? "Pozitívny" :
             article.sentiment === "negative" ? "Negatívny" : "Neutrálny"}
          </span>
        )}

        {article.key_players.length > 0 && (
          <span class="players">👤 {article.key_players.join(", ")}</span>
        )}

        {article.tags.length > 0 && (
          <div class="tags">
            {article.tags.map((t) => <span key={t} class="tag">#{t}</span>)}
          </div>
        )}
      </div>
    </div>
  );
});
