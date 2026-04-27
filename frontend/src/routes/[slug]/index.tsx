import { component$, useVisibleTask$ } from "@builder.io/qwik";
import { type DocumentHead, routeLoader$, useLocation } from "@builder.io/qwik-city";
import { collection, getDocs, orderBy, query, limit } from "firebase/firestore";
import { db } from "~/lib/firebase";
import type { Article } from "~/lib/types";
import { CATEGORY_LABELS, CATEGORY_COLOR, LEAGUE_LABELS } from "~/lib/types";
import { slugify } from "~/lib/utils";

const DARK_KEY = "sfa_dark_mode";

const SENTIMENT_ICON: Record<string, string> = {
  positive: "😊",
  neutral: "😐",
  negative: "😟",
};
const SENTIMENT_LABEL: Record<string, string> = {
  positive: "Pozitívny",
  neutral: "Neutrálny",
  negative: "Negatívny",
};
const SENTIMENT_COLOR: Record<string, string> = {
  positive: "#10b981",
  neutral: "#64748b",
  negative: "#ef4444",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("sk-SK", { day: "numeric", month: "long", year: "numeric" });
}

export const useArticleData = routeLoader$(async ({ params }) => {
  const snap = await getDocs(
    query(collection(db, "articles"), orderBy("scraped_at", "desc"), limit(200))
  );
  const all = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Article)
    .filter((a) => a.approved);

  const article = all.find((a) => slugify(a.title) === params.slug) ?? null;

  const related = article
    ? all
        .filter(
          (a) =>
            a.id !== article.id &&
            (a.club_name === article.club_name || a.category === article.category)
        )
        .slice(0, 3)
    : [];

  return { article, related };
});

export default component$(() => {
  const data = useArticleData();
  const { article: a, related } = data.value;

  const darkMode = { value: false };

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    if (localStorage.getItem(DARK_KEY) === "1") {
      document.documentElement.classList.add("dark");
    }
  });

  if (!a) {
    return (
      <div class="app">
        <header class="site-header">
          <div class="header-inner">
            <div class="header-logo">⚽</div>
            <div><h1>Slovak Football AI</h1></div>
            <nav class="header-nav">
              <a href="/" class="nav-link">← Späť na správy</a>
            </nav>
          </div>
        </header>
        <main class="main-content">
          <div class="state-msg">
            Článok sa nenašiel.{" "}
            <a href="/" style={{ color: "#16a34a" }}>← Späť na správy</a>
          </div>
        </main>
      </div>
    );
  }

  const catLabel = a.category ? (CATEGORY_LABELS[a.category] ?? a.category) : null;
  const catColor = a.category ? (CATEGORY_COLOR[a.category] ?? "#3b82f6") : "#3b82f6";
  const leagueLabel = LEAGUE_LABELS[a.league] ?? a.league;
  const pubDate = formatDate(a.published_at ?? a.scraped_at);
  const sent = a.sentiment ?? "neutral";
  const sentColor = SENTIMENT_COLOR[sent] ?? "#64748b";

  return (
    <div class="app">
      <header class="site-header">
        <div class="header-inner">
          <div class="header-logo">⚽</div>
          <div>
            <h1>Slovak Football AI</h1>
            <p>Detail článku</p>
          </div>
          <nav class="header-nav">
            <a href="/" class="nav-link">← Správy</a>
            <a href="/stats" class="nav-link">📊 Štatistiky</a>
          </nav>
          <button
            class="dark-toggle"
            onClick$={() => {
              const html = document.documentElement;
              if (html.classList.contains("dark")) {
                html.classList.remove("dark");
                localStorage.setItem(DARK_KEY, "0");
              } else {
                html.classList.add("dark");
                localStorage.setItem(DARK_KEY, "1");
              }
            }}
          >
            🌙
          </button>
        </div>
      </header>

      <main class="main-content">
        <article class="article-detail">
          <div class="article-detail-top">
            <div class="modal-club-row">
              <span class="modal-club">{a.club_name}</span>
              <span class="modal-league">{leagueLabel}</span>
            </div>
            {pubDate && <time class="modal-date">{pubDate}</time>}
          </div>

          <h1 class="article-detail-title">{a.title}</h1>

          <div class="modal-meta">
            {catLabel && (
              <span
                class="modal-badge"
                style={{ background: catColor + "18", color: catColor, borderColor: catColor + "40" }}
              >
                {catLabel}
              </span>
            )}
            <span
              class="modal-badge"
              style={{ color: sentColor, background: sentColor + "18", borderColor: sentColor + "40" }}
            >
              {SENTIMENT_ICON[sent] ?? "😐"} {SENTIMENT_LABEL[sent] ?? sent}
            </span>
          </div>

          {a.summary && (
            <div class="modal-section">
              <p class="modal-label">AI Zhrnutie</p>
              <p class="article-detail-summary">{a.summary}</p>
            </div>
          )}

          {a.key_players.length > 0 && (
            <div class="modal-section">
              <p class="modal-label">Kľúčoví hráči</p>
              <div class="modal-chip-row">
                {a.key_players.map((p) => (
                  <span key={p} class="modal-chip modal-chip-player">{p}</span>
                ))}
              </div>
            </div>
          )}

          {a.tags.length > 0 && (
            <div class="modal-section">
              <p class="modal-label">Tagy</p>
              <div class="modal-chip-row">
                {a.tags.map((t) => (
                  <span key={t} class="modal-chip modal-chip-tag">#{t}</span>
                ))}
              </div>
            </div>
          )}

          <div class="article-actions">
            <a
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              class="modal-source-btn"
            >
              Otvoriť originálny článok ↗
            </a>
            <button
              class="share-btn"
              onClick$={async () => {
                if (typeof navigator !== "undefined" && navigator.share) {
                  await navigator.share({
                    title: a.title,
                    text: a.summary ?? a.title,
                    url: window.location.href,
                  });
                } else {
                  await navigator.clipboard.writeText(window.location.href);
                  alert("Odkaz skopírovaný do schránky!");
                }
              }}
            >
              Zdieľať
            </button>
          </div>

          {related.length > 0 && (
            <div class="modal-related">
              <p class="modal-label">Súvisiace články</p>
              <div class="modal-related-list">
                {related.map((r) => (
                  <a key={r.id} href={`/${slugify(r.title)}/`} class="modal-related-item">
                    <span class="modal-related-club">{r.club_name}</span>
                    <span class="modal-related-title">{r.title}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </article>
      </main>
    </div>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(useArticleData);
  const title = data.article?.title ?? "Článok";
  const desc = data.article?.summary ?? "AI rozbor slovenského futbalového článku";
  return {
    title: `${title} | Slovak Football AI`,
    meta: [{ name: "description", content: desc.slice(0, 160) }],
  };
};
