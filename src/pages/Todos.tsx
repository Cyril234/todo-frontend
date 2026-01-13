import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import type { ToDoDto } from "../types";
import { clearUserId, getUserId } from "../storage";

type Filter = "all" | "open" | "done";
type Sort = "newest" | "oldest" | "openFirst";

export default function Todos() {
  const navigate = useNavigate();
  const userId = useMemo(() => getUserId(), []);

  const [todos, setTodos] = useState<ToDoDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [addText, setAddText] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("newest");

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3000);
  }

  // Redirect wenn nicht eingeloggt
  useEffect(() => {
    if (userId == null) navigate("/login", { replace: true });
  }, [userId, navigate]);

  async function loadTodos() {
    if (userId == null) return;
    try {
      setLoading(true);
      setLoadError(null);
      const data = await api.getTodos(userId);
      setTodos(data);
    } catch (err: any) {
      setLoadError(err?.message ?? "Todos konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTodos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (userId == null) return;

    const text = addText.trim();
    if (!text) {
      showToast("Text darf nicht leer sein.");
      return;
    }

    // Optimistisch: temp Eintrag
    const tempId = -Date.now();
    const tempTodo: ToDoDto = { id: tempId, text, tickedOff: false };

    setAddLoading(true);
    setAddText("");
    setTodos((prev) => [tempTodo, ...prev]);

    try {
      const created = await api.createTodo(userId, text);
      setTodos((prev) => prev.map((t) => (t.id === tempId ? created : t)));
    } catch (err: any) {
      // Revert
      setTodos((prev) => prev.filter((t) => t.id !== tempId));
      showToast(err?.message ?? "Todo konnte nicht erstellt werden.");
      setAddText(text); // Text zurückgeben
    } finally {
      setAddLoading(false);
    }
  }

  async function toggle(todo: ToDoDto) {
    const next = !todo.tickedOff;

    // Optimistisch
    setTodos((prev) => prev.map((t) => (t.id === todo.id ? { ...t, tickedOff: next } : t)));

    try {
      const updated = await api.updateTodo(todo.id, next);
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? updated : t)));
    } catch (err: any) {
      // Revert
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? { ...t, tickedOff: todo.tickedOff } : t)));
      showToast(err?.message ?? "Update fehlgeschlagen.");
    }
  }

  async function remove(todo: ToDoDto) {
    // Optimistisch entfernen
    const snapshot = todos;
    setTodos((prev) => prev.filter((t) => t.id !== todo.id));

    try {
      await api.deleteTodo(todo.id);
    } catch (err: any) {
      // Revert
      setTodos(snapshot);
      showToast(err?.message ?? "Löschen fehlgeschlagen.");
    }
  }

  function logout() {
    clearUserId();
    navigate("/login", { replace: true });
  }

  const visibleTodos = useMemo(() => {
    let list = [...todos];

    // Filter
    if (filter === "open") list = list.filter((t) => !t.tickedOff);
    if (filter === "done") list = list.filter((t) => t.tickedOff);

    // Sort
    if (sort === "newest") list.sort((a, b) => b.id - a.id);
    if (sort === "oldest") list.sort((a, b) => a.id - b.id);
    if (sort === "openFirst") {
      list.sort((a, b) => {
        if (a.tickedOff === b.tickedOff) return b.id - a.id;
        return a.tickedOff ? 1 : -1;
      });
    }

    return list;
  }, [todos, filter, sort]);

  return (
    <div className="container">
      <div className="card">
        <div className="row between">
          <div>
            <h1>Todos</h1>
            <p className="muted">UserId: {userId ?? "-"}</p>
          </div>
          <button className="btn secondary" onClick={logout}>
            Logout
          </button>
        </div>

        <div className="toolbar">
          <div className="field">
            <span className="labelInline">Filter</span>
            <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
              <option value="all">Alle</option>
              <option value="open">Offen</option>
              <option value="done">Erledigt</option>
            </select>
          </div>

          <div className="field">
            <span className="labelInline">Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="newest">Neueste zuerst</option>
              <option value="oldest">Älteste zuerst</option>
              <option value="openFirst">Offen zuerst</option>
            </select>
          </div>

          <button className="btn secondary" onClick={loadTodos} disabled={loading}>
            Reload
          </button>
        </div>

        <form onSubmit={onAdd} className="addRow">
          <input
            value={addText}
            onChange={(e) => setAddText(e.target.value)}
            placeholder="Neues Todo…"
            disabled={addLoading}
          />
          <button className="btn" type="submit" disabled={addLoading}>
            {addLoading ? "Adding…" : "Add"}
          </button>
        </form>

        {toast && <div className="toast">{toast}</div>}

        {/* Loading / Error / Empty */}
        {loading && <div className="panel">Lade Todos…</div>}

        {!loading && loadError && (
          <div className="panel">
            <div className="alert">{loadError}</div>
            <button className="btn" onClick={loadTodos}>
              Retry
            </button>
          </div>
        )}

        {!loading && !loadError && visibleTodos.length === 0 && (
          <div className="panel muted">Keine Todos vorhanden.</div>
        )}

        {!loading && !loadError && visibleTodos.length > 0 && (
          <ul className="list">
            {visibleTodos.map((t) => (
              <li key={t.id} className={`item ${t.tickedOff ? "done" : ""}`}>
                <label className="itemMain">
                  <input
                    type="checkbox"
                    checked={t.tickedOff}
                    onChange={() => toggle(t)}
                    disabled={t.id < 0} // temp item
                  />
                  <span className="text">{t.text}</span>
                </label>

                <div className="itemActions">
                  <button className="btn danger" onClick={() => remove(t)} disabled={t.id < 0}>
                    Löschen
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}