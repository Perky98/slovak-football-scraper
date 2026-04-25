import { component$, useSignal, useTask$ } from "@builder.io/qwik";
import { type DocumentHead, server$ } from "@builder.io/qwik-city";
import { collection, getDocs, orderBy, query, limit } from "firebase/firestore";
import { db } from "~/lib/firebase";
import type { Article } from "~/lib/types";
import { CATEGORY_LABELS, LEAGUE_LABELS } from "~/lib/types";
import { ArticleCard } from "~/components/ArticleCard";

const fetchArticles = server$(async () => {
  const snap = await getDocs(
    query(collection(db, "articles"), orderBy("scraped_at", "desc"), limit(200))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Article[];
});

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

export default component$(() => {
  const allArticles = useSignal<Article[]>([]);
  const league = useSignal("");
  const category = useSignal("");
  const loading = useSignal(true);

  useTask$(async () => {
    loading.value = true;
    allArticles.value = await fetchArticles();
    loading.value = false;
  });

  const cutoff = Date.now() - TWO_DAYS_MS;

  const filtered = allArticles.value.filter((a) => {
    const dateStr = a.published_at || a.scraped_at;
    if (dateStr && new Date(dateStr).getTime() < cutoff) return false;
    if (league.value && a.league !== league.value) return false;
    if (category.value && a.category !== category.value) return false;
    return true;
  });

  return (
    <div class="app">
      <header class="site-header">
        <div class="header-inner">
          <div class="header-logo">⚽</div>
          <div>
            <h1>Slovak Football AI</h1>
            <p>Správy slovenských futbalových klubov — analyzované umelou inteligenciou</p>
          </div>
        </div>
      </header>

      <div class="filters-bar">
        <div class="filters-inner">
          <select
            value={league.value}
            onChange$={(e) => (league.value = (e.target as HTMLSelectElement).value)}
          >
            <option value="">Všetky ligy</option>
            {Object.entries(LEAGUE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>

          <select
            value={category.value}
            onChange$={(e) => (category.value = (e.target as HTMLSelectElement).value)}
          >
            <option value="">Všetky kategórie</option>
            {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>

          <span class="article-count">
            {loading.value ? "..." : `${filtered.length} článkov`}
          </span>
        </div>
      </div>

      <main class="main-content">
        {loading.value ? (
          <div class="state-msg">Načítavam články...</div>
        ) : filtered.length === 0 ? (
          <div class="state-msg">Žiadne články za posledné 2 dni.</div>
        ) : (
          <div class="grid">
            {filtered.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Slovak Football AI",
  meta: [{ name: "description", content: "AI správy slovenského futbalu" }],
};
