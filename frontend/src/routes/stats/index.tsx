import { component$, useSignal, useTask$, useVisibleTask$ } from "@builder.io/qwik";
import { type DocumentHead, server$ } from "@builder.io/qwik-city";
import { collection, getDocs, orderBy, query, limit } from "firebase/firestore";
import { db } from "~/lib/firebase";
import type { Article } from "~/lib/types";
import { CATEGORY_LABELS, CATEGORY_COLOR } from "~/lib/types";

const DARK_KEY = "sfa_dark_mode";

const fetchApproved = server$(async () => {
  const snap = await getDocs(
    query(collection(db, "articles"), orderBy("scraped_at", "desc"), limit(500))
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Article)
    .filter((a) => a.approved);
});

export default component$(() => {
  const articles = useSignal<Article[]>([]);
  const loading = useSignal(true);
  const darkMode = useSignal(false);

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    if (localStorage.getItem(DARK_KEY) === "1") {
      darkMode.value = true;
      document.documentElement.classList.add("dark");
    }
  });

  useTask$(async () => {
    loading.value = true;
    articles.value = await fetchApproved();
    loading.value = false;
  });

  const byClub: Record<string, number> = {};
  const byCat: Record<string, number> = {};
  const sentCounts = { positive: 0, neutral: 0, negative: 0 };
  const playerMap: Record<string, number> = {};

  for (const a of articles.value) {
    byClub[a.club_name] = (byClub[a.club_name] ?? 0) + 1;
    if (a.category) byCat[a.category] = (byCat[a.category] ?? 0) + 1;
    if (a.sentiment && a.sentiment in sentCounts) {
      sentCounts[a.sentiment as keyof typeof sentCounts]++;
    }
    for (const p of a.key_players) {
      playerMap[p] = (playerMap[p] ?? 0) + 1;
    }
  }

  const clubsSorted = Object.entries(byClub).sort((a, b) => b[1] - a[1]);
  const catsSorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const topPlayers = Object.entries(playerMap).sort((a, b) => b[1] - a[1]).slice(0, 15);
  const maxClub = clubsSorted[0]?.[1] ?? 1;
  const maxCat = catsSorted[0]?.[1] ?? 1;
  const total = articles.value.length;

  return (
    <div class="app">
      <header class="site-header">
        <div class="header-inner">
          <div class="header-logo">📊</div>
          <div>
            <h1>Slovak Football AI</h1>
            <p>Štatistiky a prehľady</p>
          </div>
          <nav class="header-nav">
            <a href="/" class="nav-link">← Správy</a>
          </nav>
          <button
            class="dark-toggle"
            onClick$={() => {
              darkMode.value = !darkMode.value;
              if (darkMode.value) {
                document.documentElement.classList.add("dark");
                localStorage.setItem(DARK_KEY, "1");
              } else {
                document.documentElement.classList.remove("dark");
                localStorage.setItem(DARK_KEY, "0");
              }
            }}
          >
            {darkMode.value ? "☀" : "🌙"}
          </button>
        </div>
      </header>

      <main class="main-content">
        {loading.value ? (
          <div class="state-msg">Načítavam štatistiky...</div>
        ) : total === 0 ? (
          <div class="state-msg">Žiadne dáta.</div>
        ) : (
          <div class="stats-wrap">
            {/* Summary cards */}
            <div class="stats-summary-row">
              <div class="stat-card-simple">
                <span class="stat-num">{total}</span>
                <span class="stat-lbl">Článkov celkom</span>
              </div>
              <div class="stat-card-simple">
                <span class="stat-num">{clubsSorted.length}</span>
                <span class="stat-lbl">Klubov</span>
              </div>
              <div class="stat-card-simple">
                <span class="stat-num">{topPlayers.length}</span>
                <span class="stat-lbl">Spomínaných hráčov</span>
              </div>
            </div>

            {/* Sentiment */}
            <section class="stats-section">
              <h2 class="stats-section-title">Sentiment správ</h2>
              <div class="sentiment-row">
                <div class="sentiment-box" style={{ borderColor: "#10b981", background: "#10b98112" }}>
                  <span class="sentiment-icon">😊</span>
                  <span class="sentiment-num" style={{ color: "#10b981" }}>{sentCounts.positive}</span>
                  <span class="sentiment-lbl">Pozitívne</span>
                  <span class="sentiment-pct">
                    {total > 0 ? Math.round((sentCounts.positive / total) * 100) : 0}%
                  </span>
                </div>
                <div class="sentiment-box" style={{ borderColor: "#64748b", background: "#64748b12" }}>
                  <span class="sentiment-icon">😐</span>
                  <span class="sentiment-num" style={{ color: "#64748b" }}>{sentCounts.neutral}</span>
                  <span class="sentiment-lbl">Neutrálne</span>
                  <span class="sentiment-pct">
                    {total > 0 ? Math.round((sentCounts.neutral / total) * 100) : 0}%
                  </span>
                </div>
                <div class="sentiment-box" style={{ borderColor: "#ef4444", background: "#ef444412" }}>
                  <span class="sentiment-icon">😟</span>
                  <span class="sentiment-num" style={{ color: "#ef4444" }}>{sentCounts.negative}</span>
                  <span class="sentiment-lbl">Negatívne</span>
                  <span class="sentiment-pct">
                    {total > 0 ? Math.round((sentCounts.negative / total) * 100) : 0}%
                  </span>
                </div>
              </div>
            </section>

            {/* Club bar chart */}
            <section class="stats-section">
              <h2 class="stats-section-title">Článkov podľa klubu</h2>
              <div class="bar-chart">
                {clubsSorted.map(([club, count]) => (
                  <div key={club} class="bar-row">
                    <span class="bar-label">{club}</span>
                    <div class="bar-track">
                      <div class="bar-fill" style={{ width: `${(count / maxClub) * 100}%` }} />
                    </div>
                    <span class="bar-count">{count}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Category bar chart */}
            <section class="stats-section">
              <h2 class="stats-section-title">Rozdelenie podľa kategórie</h2>
              <div class="bar-chart">
                {catsSorted.map(([cat, count]) => {
                  const color = CATEGORY_COLOR[cat] ?? "#3b82f6";
                  return (
                    <div key={cat} class="bar-row">
                      <span class="bar-label">{CATEGORY_LABELS[cat] ?? cat}</span>
                      <div class="bar-track">
                        <div class="bar-fill" style={{ width: `${(count / maxCat) * 100}%`, background: color }} />
                      </div>
                      <span class="bar-count">{count}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Top players */}
            {topPlayers.length > 0 && (
              <section class="stats-section">
                <h2 class="stats-section-title">Najčastejšie spomínaní hráči</h2>
                <ol class="players-list">
                  {topPlayers.map(([player, count], i) => (
                    <li key={player} class="player-item">
                      <span class="player-rank">#{i + 1}</span>
                      <span class="player-name">{player}</span>
                      <div class="player-bar-wrap">
                        <div
                          class="player-bar"
                          style={{ width: `${(count / (topPlayers[0]?.[1] ?? 1)) * 100}%` }}
                        />
                      </div>
                      <span class="player-count">{count}×</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Štatistiky | Slovak Football AI",
  meta: [{ name: "description", content: "Štatistiky slovenského futbalového spravodajstva" }],
};
