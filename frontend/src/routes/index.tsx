import { component$, useSignal, useTask$ } from "@builder.io/qwik";
import { type DocumentHead, server$ } from "@builder.io/qwik-city";
import { collection, getDocs, orderBy, query, where, limit } from "firebase/firestore";
import { db } from "~/lib/firebase";
import type { Article } from "~/lib/types";
import { CATEGORY_LABELS, LEAGUE_LABELS } from "~/lib/types";
import { ArticleCard } from "~/components/ArticleCard";

const fetchArticles = server$(async (league: string, category: string) => {
  const constraints: any[] = [orderBy("scraped_at", "desc"), limit(50)];
  if (league) constraints.push(where("league", "==", league));
  if (category) constraints.push(where("category", "==", category));

  const snap = await getDocs(query(collection(db, "articles"), ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Article[];
});

export default component$(() => {
  const articles = useSignal<Article[]>([]);
  const league = useSignal("");
  const category = useSignal("");
  const loading = useSignal(true);

  useTask$(async ({ track }) => {
    track(() => league.value);
    track(() => category.value);
    loading.value = true;
    articles.value = await fetchArticles(league.value, category.value);
    loading.value = false;
  });

  return (
    <div class="app">
      <header>
        <h1>⚽ Slovak Football AI</h1>
        <p>Správy zo slovenských futbalových klubov analyzované umelou inteligenciou</p>
      </header>

      <div class="filters">
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
      </div>

      {loading.value ? (
        <div class="loading">Načítavam...</div>
      ) : articles.value.length === 0 ? (
        <div class="empty">Žiadne články nenájdené.</div>
      ) : (
        <div class="grid">
          {articles.value.map((a) => (
            <ArticleCard key={a.id} article={a} />
          ))}
        </div>
      )}
    </div>
  );
});

export const head: DocumentHead = {
  title: "Slovak Football AI",
  meta: [{ name: "description", content: "AI správy slovenského futbalu" }],
};
