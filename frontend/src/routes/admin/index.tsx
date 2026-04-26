import { component$, useSignal, useTask$, useVisibleTask$ } from "@builder.io/qwik";
import { type DocumentHead, server$ } from "@builder.io/qwik-city";
import {
  collection, getDocs, orderBy, query,
  doc, deleteDoc, updateDoc,
} from "firebase/firestore";
import { db } from "~/lib/firebase";
import type { Article } from "~/lib/types";
import { CATEGORY_LABELS, CATEGORY_COLOR } from "~/lib/types";

const STORAGE_KEY = "sfa_admin_pass";
const PAGE_SIZE = 25;

const fetchAllArticles = server$(async () => {
  const snap = await getDocs(
    query(collection(db, "articles"), orderBy("scraped_at", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Article[];
});

export default component$(() => {
  const passwordInput = useSignal("");
  const storedPass = useSignal("");
  const authed = useSignal(false);
  const wrongPass = useSignal(false);
  const articles = useSignal<Article[]>([]);
  const loading = useSignal(false);
  const errorMsg = useSignal("");
  const tab = useSignal<"pending" | "all">("pending");
  const search = useSignal("");
  const currentPage = useSignal(1);
  const expandedId = useSignal<string | null>(null);
  const editSummary = useSignal("");
  const editCategory = useSignal("");
  const saving = useSignal(false);
  const saveSuccess = useSignal(false);
  const approving = useSignal(false);

  // eslint-disable-next-line qwik/no-use-visible-task
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

  useTask$(({ track }) => {
    const id = track(() => expandedId.value);
    saveSuccess.value = false;
    if (!id) return;
    const a = articles.value.find((x) => x.id === id);
    if (a) {
      editSummary.value = a.summary ?? "";
      editCategory.value = a.category ?? "";
    }
  });

  useTask$(({ track }) => {
    track(() => tab.value);
    track(() => search.value);
    currentPage.value = 1;
    expandedId.value = null;
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    const arts = track(() => articles.value);
    const pending = arts.filter((a) => !a.approved).length;
    document.title = pending > 0
      ? `(${pending}) Admin — Slovak Football AI`
      : "Admin — Slovak Football AI";
  });

  const pendingCount = articles.value.filter((a) => !a.approved).length;

  const baseList = tab.value === "pending"
    ? articles.value.filter((a) => !a.approved)
    : articles.value;

  const searchQ = search.value.trim().toLowerCase();
  const filteredList = searchQ
    ? baseList.filter((a) =>
        (a.title ?? "").toLowerCase().includes(searchQ) ||
        a.club_name.toLowerCase().includes(searchQ)
      )
    : baseList;

  const totalPages = Math.ceil(filteredList.length / PAGE_SIZE);
  const paginated = filteredList.slice(
    (currentPage.value - 1) * PAGE_SIZE,
    currentPage.value * PAGE_SIZE
  );

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
        <div class="admin-error-banner" onClick$={() => (errorMsg.value = "")}>
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
        <div class="admin-toolbar">
          <input
            type="search"
            class="admin-search"
            placeholder="Hľadaj podľa nadpisu alebo klubu..."
            value={search.value}
            onInput$={(e) => (search.value = (e.target as HTMLInputElement).value)}
          />
          {searchQ && (
            <span class="search-results-info">{filteredList.length} výsledkov</span>
          )}
          {tab.value === "pending" && pendingCount > 0 && (
            <button
              class="btn-approve-all"
              disabled={approving.value}
              onClick$={async () => {
                const pending = articles.value.filter((a) => !a.approved);
                if (!confirm(`Schváliť všetkých ${pending.length} článkov?`)) return;
                approving.value = true;
                errorMsg.value = "";
                try {
                  await Promise.all(
                    pending.map((a) => updateDoc(doc(db, "articles", a.id), { approved: true }))
                  );
                  articles.value = articles.value.map((x) => ({ ...x, approved: true }));
                } catch (e: any) {
                  errorMsg.value = `Hromadné schválenie zlyhalo: ${e?.message ?? e}`;
                } finally {
                  approving.value = false;
                }
              }}
            >
              {approving.value ? "Schvaľujem..." : `Schváliť všetky (${pendingCount})`}
            </button>
          )}
        </div>

        {loading.value ? (
          <div class="state-msg">Načítavam...</div>
        ) : filteredList.length === 0 ? (
          <div class="state-msg">
            {searchQ
              ? "Žiadne výsledky."
              : tab.value === "pending"
              ? "Všetky články sú schválené."
              : "Žiadne články."}
          </div>
        ) : (
          <>
            <div class="table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Klub</th>
                  <th>Nadpis</th>
                  <th>Kategória</th>
                  <th class="col-date-h">Dátum</th>
                  <th>Akcie</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((a) => {
                  const isExpanded = expandedId.value === a.id;
                  const catColor = a.category ? (CATEGORY_COLOR[a.category] ?? "#94a3b8") : "#94a3b8";
                  return (
                    <>
                      <tr
                        key={a.id}
                        class={`article-row${a.approved ? " row-approved" : ""}${isExpanded ? " row-expanded" : ""}`}
                        onClick$={() => { expandedId.value = isExpanded ? null : a.id; }}
                      >
                        <td class="col-club">{a.club_name}</td>
                        <td class="col-title">
                          <span class="row-toggle">{isExpanded ? "▾" : "▸"}</span>
                          {a.title || "Bez názvu"}
                        </td>
                        <td class="col-cat">
                          {a.category && (
                            <span
                              class="admin-cat-badge"
                              style={{ background: catColor + "18", color: catColor, borderColor: catColor + "40" }}
                            >
                              {CATEGORY_LABELS[a.category] ?? a.category}
                            </span>
                          )}
                        </td>
                        <td class="col-date">
                          {a.published_at ? new Date(a.published_at).toLocaleDateString("sk-SK") : "—"}
                        </td>
                        <td class="col-actions" onClick$={(e) => e.stopPropagation()}>
                          {!a.approved && (
                            <button
                              class="btn-approve"
                              onClick$={async () => {
                                errorMsg.value = "";
                                try {
                                  await updateDoc(doc(db, "articles", a.id), { approved: true });
                                  articles.value = articles.value.map((x) =>
                                    x.id === a.id ? { ...x, approved: true } : x
                                  );
                                } catch (e: any) {
                                  errorMsg.value = `Schválenie zlyhalo: ${e?.message ?? e}`;
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
                                await deleteDoc(doc(db, "articles", a.id));
                                articles.value = articles.value.filter((x) => x.id !== a.id);
                                if (expandedId.value === a.id) expandedId.value = null;
                              } catch (e: any) {
                                errorMsg.value = `Zmazanie zlyhalo: ${e?.message ?? e}`;
                              }
                            }}
                          >
                            Odstrániť
                          </button>
                          <a href={a.url} target="_blank" rel="noopener noreferrer" class="btn-link" title="Otvoriť článok">↗</a>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr key={`${a.id}-detail`} class="detail-row">
                          <td colSpan={5}>
                            <div class="detail-body">

                              <div class="detail-section">
                                <span class="detail-label">Kategória</span>
                                <select
                                  class="edit-select"
                                  value={editCategory.value}
                                  onChange$={(e) => {
                                    editCategory.value = (e.target as HTMLSelectElement).value;
                                    saveSuccess.value = false;
                                  }}
                                >
                                  <option value="">— neurčená —</option>
                                  {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                                    <option key={val} value={val}>{label}</option>
                                  ))}
                                </select>
                              </div>

                              <div class="detail-section">
                                <span class="detail-label">AI súhrn</span>
                                <textarea
                                  class="edit-textarea"
                                  value={editSummary.value}
                                  rows={4}
                                  onInput$={(e) => {
                                    editSummary.value = (e.target as HTMLTextAreaElement).value;
                                    saveSuccess.value = false;
                                  }}
                                />
                              </div>

                              <div class="detail-save-row">
                                <button
                                  class="btn-save"
                                  disabled={saving.value}
                                  onClick$={async () => {
                                    saving.value = true;
                                    errorMsg.value = "";
                                    saveSuccess.value = false;
                                    try {
                                      await updateDoc(doc(db, "articles", a.id), {
                                        summary: editSummary.value,
                                        category: editCategory.value || null,
                                      });
                                      articles.value = articles.value.map((x) =>
                                        x.id === a.id
                                          ? { ...x, summary: editSummary.value, category: editCategory.value || null }
                                          : x
                                      );
                                      saveSuccess.value = true;
                                    } catch (e: any) {
                                      errorMsg.value = `Uloženie zlyhalo: ${e?.message ?? e}`;
                                    } finally {
                                      saving.value = false;
                                    }
                                  }}
                                >
                                  {saving.value ? "Ukladám..." : "Uložiť zmeny"}
                                </button>
                                {saveSuccess.value && <span class="save-ok">✓ Uložené</span>}
                              </div>

                              {a.key_players.length > 0 && (
                                <div class="detail-section">
                                  <span class="detail-label">Kľúčoví hráči</span>
                                  <p class="detail-text">{a.key_players.join(", ")}</p>
                                </div>
                              )}
                              {a.tags.length > 0 && (
                                <div class="detail-section">
                                  <span class="detail-label">Tagy</span>
                                  <p class="detail-text">{a.tags.join(", ")}</p>
                                </div>
                              )}
                              {a.content && (
                                <div class="detail-section">
                                  <span class="detail-label">Originálny text</span>
                                  <p class="detail-text detail-content">{a.content}</p>
                                </div>
                              )}

                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
            </div>

            {totalPages > 1 && (
              <div class="pagination">
                <span class="pagination-info">
                  {(currentPage.value - 1) * PAGE_SIZE + 1}–{Math.min(currentPage.value * PAGE_SIZE, filteredList.length)} z {filteredList.length}
                </span>
                <button
                  class="btn-page"
                  disabled={currentPage.value === 1}
                  onClick$={() => { currentPage.value--; expandedId.value = null; }}
                >‹</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    class={`btn-page${currentPage.value === p ? " active" : ""}`}
                    onClick$={() => { currentPage.value = p; expandedId.value = null; }}
                  >{p}</button>
                ))}
                <button
                  class="btn-page"
                  disabled={currentPage.value >= totalPages}
                  onClick$={() => { currentPage.value++; expandedId.value = null; }}
                >›</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Admin — Slovak Football AI",
};
