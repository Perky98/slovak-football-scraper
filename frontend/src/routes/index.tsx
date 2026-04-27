import { component$, useSignal, useTask$, useVisibleTask$ } from "@builder.io/qwik";
import { type DocumentHead, server$ } from "@builder.io/qwik-city";
import { collection, getDocs, orderBy, query, limit } from "firebase/firestore";
import { db } from "~/lib/firebase";
import type { Article } from "~/lib/types";
import { CATEGORY_LABELS } from "~/lib/types";
import { ArticleCard } from "~/components/ArticleCard";
import { SkeletonCard } from "~/components/SkeletonCard";

const DARK_KEY = "sfa_dark_mode";
const ARTICLES_CACHE_KEY = "sfa_articles_cache";

const fetchArticles = server$(async () => {
  const snap = await getDocs(
    query(collection(db, "articles"), orderBy("scraped_at", "desc"), limit(200))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Article[];
});

export default component$(() => {
  const allArticles = useSignal<Article[]>([]);
  const category = useSignal("");
  const club = useSignal("");
  const searchQuery = useSignal("");
  const loading = useSignal(true);
  const darkMode = useSignal(false);
  const notifPermission = useSignal("");
  const isOffline = useSignal(false);

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    if (localStorage.getItem(DARK_KEY) === "1") {
      darkMode.value = true;
      document.documentElement.classList.add("dark");
    }
    if (typeof Notification !== "undefined") {
      notifPermission.value = Notification.permission;
    }
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((_e) => { /* ignore */ });
    }
  });

  useTask$(async () => {
    loading.value = true;
    try {
      allArticles.value = await fetchArticles();
    } catch (_e) {
      isOffline.value = true;
    }
    loading.value = false;
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    const articles = track(() => allArticles.value);
    const offline = track(() => isOffline.value);
    if (articles.length > 0) {
      try { localStorage.setItem(ARTICLES_CACHE_KEY, JSON.stringify(articles)); } catch (_e) { /* ignore */ }
    } else if (offline) {
      try {
        const cached = localStorage.getItem(ARTICLES_CACHE_KEY);
        if (cached) allArticles.value = JSON.parse(cached);
      } catch (_e) { /* ignore */ }
    }
  });

  const clubs = [...new Set(allArticles.value.map((a) => a.club_name))].sort();

  const filtered = allArticles.value
    .filter((a) => {
      if (!a.approved) return false;
      if (category.value && a.category !== category.value) return false;
      if (club.value && a.club_name !== club.value) return false;
      if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase();
        const haystack = [a.title, a.summary, a.club_name, ...a.key_players, ...a.tags]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
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
          <nav class="header-nav">
            <a href="/stats" class="nav-link">📊 Štatistiky</a>
          </nav>
          {notifPermission.value !== "denied" && (
            <button
              class={notifPermission.value === "granted" ? "notif-toggle notif-on" : "notif-toggle"}
              title={notifPermission.value === "granted" ? "Notifikácie zapnuté" : "Zapnúť notifikácie"}
              onClick$={async () => {
                if (typeof Notification === "undefined") return;
                if (Notification.permission !== "granted") {
                  const perm = await Notification.requestPermission();
                  notifPermission.value = perm;
                }
                if (Notification.permission === "granted") {
                  notifPermission.value = "granted";
                  new Notification("Slovak Football AI", {
                    body: "Notifikácie sú aktivované!",
                    icon: "/favicon.svg",
                  });
                }
              }}
            >
              {notifPermission.value === "granted" ? "🔔" : "🔕"}
            </button>
          )}
          <button
            class="dark-toggle"
            title={darkMode.value ? "Svetlý režim" : "Tmavý režim"}
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

      {isOffline.value && (
        <div class="offline-banner">
          Offline režim — zobrazujú sa naposledy uložené správy
        </div>
      )}

      <div class="filters-bar">
        <div class="filters-inner">
          <input
            class="search-input"
            type="search"
            placeholder="Hľadaj hráča, klub, kľúčové slovo..."
            value={searchQuery.value}
            onInput$={(e) => (searchQuery.value = (e.target as HTMLInputElement).value)}
          />

          <select
            value={category.value}
            onChange$={(e) => (category.value = (e.target as HTMLSelectElement).value)}
          >
            <option value="">Všetky kategórie</option>
            {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>

          <select
            value={club.value}
            onChange$={(e) => (club.value = (e.target as HTMLSelectElement).value)}
          >
            <option value="">Všetky kluby</option>
            {clubs.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <span class="article-count">
            {loading.value ? "..." : `${filtered.length} článkov`}
          </span>
        </div>
      </div>

      <main class="main-content">
        {loading.value ? (
          <div class="grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
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
