import { component$, useSignal, useTask$, useVisibleTask$ } from "@builder.io/qwik";
import { type DocumentHead, server$ } from "@builder.io/qwik-city";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "~/lib/firebase";
import type { Article } from "~/lib/types";
import { CATEGORY_LABELS } from "~/lib/types";

const STORAGE_KEY = "sfa_admin_pass";

const fetchAllArticles = server$(async () => {
  const snap = await getDocs(
    query(collection(db, "articles"), orderBy("scraped_at", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Article[];
});

export default component$(() => {
  const passwordInput = useSignal("");
  const storedPass = useSignal("");   // heslo uložené v pamäti + localStorage
  const authed = useSignal(false);
  const wrongPass = useSignal(false);
  const articles = useSignal<Article[]>([]);
  const loading = useSignal(false);
  const errorMsg = useSignal("");
  const tab = useSignal<"pending" | "all">("pending");

  // Obnov prihlásenie z localStorage pri načítaní stránky
  useVisibleTask$(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      storedPass.value = saved;
      authed.value = true;
    }
  });

  useTask$(({ track }) => {
    track(() => authed.value);
    if (!authed.value) return;
    loading.value = true;
    fetchAllArticles().then((data) => {
      articles.value = data;
      loading.value = false;
    });
  });

  const pendingCount = articles.value.filter((a) => !a.approved).length;
  const displayed = tab.value === "pending"
    ? articles.value.filter((a) => !a.approved)
    : articles.value;

  if (!authed.value) {
    return (
      <div class="admin-login">
        <div class="admin-login-box">
          <h2>Admin panel</h2>
          <input
            type="password"
            placeholder="Heslo"
            value={passwordInput.value}
            onInput$={(e) => {
              passwordInput.value = (e.target as HTMLInputElement).value;
              wrongPass.value = false;
            }}
            onKeyDown$={(e) => {
              if ((e as KeyboardEvent).key === "Enter") {
                if (passwordInput.value === import.meta.env.VITE_ADMIN_PASSWORD) {
                  storedPass.value = passwordInput.value;
                  localStorage.setItem(STORAGE_KEY, passwordInput.value);
                  authed.value = true;
                } else {
                  wrongPass.value = true;
                }
              }
            }}
            class={wrongPass.value ? "admin-input input-error" : "admin-input"}
          />
          <button
            class="btn-login"
            onClick$={() => {
              if (passwordInput.value === import.meta.env.VITE_ADMIN_PASSWORD) {
                storedPass.value = passwordInput.value;
                localStorage.setItem(STORAGE_KEY, passwordInput.value);
                authed.value = true;
              } else {
                wrongPass.value = true;
              }
            }}
          >
            Prihlásiť
          </button>
          {wrongPass.value && <p class="login-error">Nesprávne heslo</p>}
        </div>
      </div>
    );
  }

  return (
    <div class="admin-page">
      <div class="admin-topbar">
        <h1 class="admin-title">Admin panel</h1>
        <span class="admin-count">{articles.value.length} článkov celkom</span>
        <button
          class="btn-logout"
          onClick$={() => {
            localStorage.removeItem(STORAGE_KEY);
            storedPass.value = "";
            authed.value = false;
            articles.value = [];
            passwordInput.value = "";
          }}
        >
          Odhlásiť
        </button>
      </div>

      {errorMsg.value && (
        <div
          class="admin-error-banner"
          onClick$={() => (errorMsg.value = "")}
        >
          {errorMsg.value} — klikni pre zatvorenie
        </div>
      )}

      <div class="admin-tabs">
        <button
          class={`tab${tab.value === "pending" ? " active" : ""}`}
          onClick$={() => (tab.value = "pending")}
        >
          Na schválenie <span class="tab-badge">{pendingCount}</span>
        </button>
        <button
          class={`tab${tab.value === "all" ? " active" : ""}`}
          onClick$={() => (tab.value = "all")}
        >
          Všetky <span class="tab-badge">{articles.value.length}</span>
        </button>
      </div>

      <div class="admin-body">
        {loading.value ? (
          <div class="state-msg">Načítavam...</div>
        ) : displayed.length === 0 ? (
          <div class="state-msg">
            {tab.value === "pending" ? "Všetky články sú schválené." : "Žiadne články."}
          </div>
        ) : (
          <table class="admin-table">
            <thead>
              <tr>
                <th>Klub</th>
                <th>Nadpis</th>
                <th>Kategória</th>
                <th>Dátum</th>
                <th>Akcie</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((a) => (
                <tr key={a.id} class={a.approved ? "row-approved" : ""}>
                  <td class="col-club">{a.club_name}</td>
                  <td class="col-title">
                    <a href={a.url} target="_blank" rel="noopener noreferrer">
                      {a.title || "Bez názvu"}
                    </a>
                  </td>
                  <td class="col-cat">
                    {a.category ? (CATEGORY_LABELS[a.category] ?? a.category) : "—"}
                  </td>
                  <td class="col-date">
                    {a.published_at
                      ? new Date(a.published_at).toLocaleDateString("sk-SK")
                      : "—"}
                  </td>
                  <td class="col-actions">
                    {!a.approved && (
                      <button
                        class="btn-approve"
                        onClick$={async () => {
                          errorMsg.value = "";
                          try {
                            const res = await fetch("/api/admin", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                action: "approve",
                                articleId: a.id,
                                password: storedPass.value,
                              }),
                            });
                            const data = await res.json();
                            if (!res.ok) throw new Error(data.error);
                            articles.value = articles.value.map((x) =>
                              x.id === a.id ? { ...x, approved: true } : x
                            );
                          } catch (e: any) {
                            errorMsg.value = e?.message ?? "Chyba";
                          }
                        }}
                      >
                        Schváliť
                      </button>
                    )}
                    <button
                      class="btn-delete"
                      onClick$={async () => {
                        if (!confirm(`Naozaj zmazať: "${a.title}"?`)) return;
                        errorMsg.value = "";
                        try {
                          const res = await fetch("/api/admin", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              action: "delete",
                              articleId: a.id,
                              password: storedPass.value,
                            }),
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error);
                          articles.value = articles.value.filter((x) => x.id !== a.id);
                        } catch (e: any) {
                          errorMsg.value = e?.message ?? "Chyba";
                        }
                      }}
                    >
                      Odstrániť
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Admin — Slovak Football AI",
};
