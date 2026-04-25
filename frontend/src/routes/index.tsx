import { component$, useSignal, useTask$ } from "@builder.io/qwik";
import { type DocumentHead, server$ } from "@builder.io/qwik-city";
import { collection, getDocs, orderBy, query, limit } from "firebase/firestore";
import { db } from "~/lib/firebase";
import type { Article } from "~/lib/types";
import { CATEGORY_LABELS } from "~/lib/types";
import { ArticleCard } from "~/components/ArticleCard";

const fetchArticles = server$(async () => {
  const snap = await getDocs(
    query(collection(db, "articles"), orderBy("scraped_at", "desc"), limit(200))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Article[];
});

export default component$(() => {
  const allArticles = useSignal<Article[]>([]);
  const category = useSignal("");
  const loading = useSignal(true);

  useTask$(async () => {
    loading.value = true;
    allArticles.value = await fetchArticles();
    loading.value = false;
  });

  const filtered = allArticles.value
    .filter((a) => {
      if (category.value && a.category !== category.value) return false;
      return true;
    })
    .sort((a, b) => {
      const da = new Date(a.published_at ?? a.scraped_at).getTime();
      const db2 = new Date(b.published_at ?? b.scraped_at).getTime();
      return db2 - da;
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
          <div class="state-msg">Žiadne články.</div>
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
