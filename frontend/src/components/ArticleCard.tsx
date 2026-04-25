import { component$ } from "@builder.io/qwik";
import type { Article } from "~/lib/types";
import { CATEGORY_LABELS, CATEGORY_COLOR, LEAGUE_LABELS } from "~/lib/types";

interface Props {
  article: Article;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("sk-SK", { day: "numeric", month: "long", year: "numeric" });
}

export const ArticleCard = component$<Props>(({ article }) => {
  const categoryLabel = article.category ? (CATEGORY_LABELS[article.category] ?? article.category) : null;
  const categoryColor = article.category ? (CATEGORY_COLOR[article.category] ?? "#3b82f6") : "#3b82f6";
  const leagueLabel = LEAGUE_LABELS[article.league] ?? article.league;
  const displayDate = formatDate(article.published_at || article.scraped_at);

  return (
    <article class="card">
      <div class="card-top">
        <div class="card-club-row">
          <span class="card-club">{article.club_name}</span>
          <span class="card-league">{leagueLabel}</span>
        </div>
        {displayDate && <time class="card-date">{displayDate}</time>}
      </div>

      <a href={article.url} target="_blank" rel="noopener noreferrer" class="card-title-link">
        <h2 class="card-title">{article.title || "Bez názvu"}</h2>
      </a>

      {article.summary && (
        <p class="card-summary">{article.summary}</p>
      )}

      <div class="card-bottom">
        {categoryLabel && (
          <span class="card-category" style={{ background: categoryColor + "22", color: categoryColor, borderColor: categoryColor + "44" }}>
            {categoryLabel}
          </span>
        )}

        {article.key_players.length > 0 && (
          <span class="card-players">
            {article.key_players.slice(0, 3).join(" · ")}
          </span>
        )}

        <a href={article.url} target="_blank" rel="noopener noreferrer" class="card-link-btn">
          Čítať →
        </a>
      </div>
    </article>
  );
});
