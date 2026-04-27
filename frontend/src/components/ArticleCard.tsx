import { component$ } from "@builder.io/qwik";
import type { Article } from "~/lib/types";
import { CATEGORY_LABELS, CATEGORY_COLOR, LEAGUE_LABELS } from "~/lib/types";
import { slugify, relativeTime } from "~/lib/utils";

interface Props {
  article: Article;
}

function formatFullDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("sk-SK", { day: "numeric", month: "long", year: "numeric" });
}

function truncate(text: string, max: number): string {
  if (!text) return "";
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max).replace(/\s\S*$/, "") + "…";
}

export const ArticleCard = component$<Props>(({ article }) => {
  const categoryLabel = article.category ? (CATEGORY_LABELS[article.category] ?? article.category) : null;
  const categoryColor = article.category ? (CATEGORY_COLOR[article.category] ?? "#3b82f6") : "#3b82f6";
  const leagueLabel = LEAGUE_LABELS[article.league] ?? article.league;
  const rawDate = article.published_at ?? article.scraped_at;
  const pubDate = relativeTime(rawDate);
  const pubDateFull = formatFullDate(rawDate);
  const preview = truncate(article.summary ?? article.content, 300);
  const href = `/${slugify(article.title)}/`;

  return (
    <article class="card">
      {/* Invisible overlay that makes the whole card clickable */}
      <a href={href} class="card-overlay" aria-label={article.title} />

      <div class="card-top">
        <div class="card-club-row">
          <span class="card-club">{article.club_name}</span>
          <span class="card-league">{leagueLabel}</span>
        </div>
        <div class="card-top-right">
          {pubDate && <time class="card-date" title={pubDateFull}>{pubDate}</time>}
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            class="card-share"
            title="Otvoriť originálny článok"
          >
            ↗
          </a>
        </div>
      </div>

      <h2 class="card-title">{article.title || "Bez názvu"}</h2>

      {preview && <p class="card-preview">{preview}</p>}

      <div class="card-bottom">
        {categoryLabel && (
          <span
            class="card-category"
            style={{ background: categoryColor + "18", color: categoryColor, borderColor: categoryColor + "40" }}
          >
            {categoryLabel}
          </span>
        )}
        {article.key_players.length > 0 && (
          <span class="card-players">{article.key_players.slice(0, 3).join(" · ")}</span>
        )}
      </div>
    </article>
  );
});
