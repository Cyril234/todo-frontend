import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { getUserId, setUserId } from "../storage";

export default function Login() {
  const navigate = useNavigate();

  const alreadyLoggedIn = useMemo(() => getUserId() != null, []);

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wenn schon eingeloggt, direkt weiter
  if (alreadyLoggedIn) {
    navigate("/todos", { replace: true });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!password.trim()) {
      setError("Passwort darf nicht leer sein.");
      return;
    }

    try {
      setLoading(true);
      const user = await api.login(password.trim());
      setUserId(user.id);
      navigate("/todos", { replace: true });
    } catch (err: any) {
      setError(err?.message ?? "Login fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h1>Login</h1>
        <p className="muted">Gib ein Passwort ein. Wenn der User existiert, wird er verwendet, sonst wird ein neuer erstellt.</p>

        <form onSubmit={onSubmit} className="stack">
          <label className="label">
            Passwort
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="z. B. 1234"
              disabled={loading}
              autoFocus
            />
          </label>

          {error && <div className="alert">{error}</div>}

          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Logging in…" : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}