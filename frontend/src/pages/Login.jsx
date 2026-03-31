import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import { getSessionUser, setSessionUser } from "../auth/session";

export default function Login() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const existing = getSessionUser();
    if (existing?.id) navigate("/", { replace: true });
  }, [navigate]);

  useEffect(() => {
    const load = async () => {
      try {
        setBusy(true);
        const res = await API.get("/users");
        setUsers(res.data || []);
      } catch {
        setError("Failed to load users.");
      } finally {
        setBusy(false);
      }
    };
    load();
  }, []);

  const onLogin = () => {
    setError("");
    const user = users.find((u) => String(u.id) === String(selectedId));
    if (!user) { setError("Please select a name."); return; }
    setSessionUser({ id: user.id, name: user.name });
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-6 bg-bg-secondary">
      <div className="animate-fade-in-scale w-full max-w-[400px]">
        <div className="bg-white border border-border-default rounded-xl px-8 py-10 shadow-lg">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-md bg-accent-primary/10 mb-3 text-2xl">
              📄
            </div>
            <h1 className="text-2xl font-bold text-text-primary m-0">
              NeoMed Docs
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Select your profile to continue
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="user-select" className="block text-xs font-semibold text-text-secondary mb-1.5">
                User
              </label>
              <select
                id="user-select"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                disabled={busy}
                className={`w-full px-3.5 py-2.5 text-sm font-sans text-text-primary bg-white border border-border-default rounded-sm outline-none transition-opacity ${
                  busy ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                }`}
              >
                <option value="">Select a user…</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="animate-slide-down px-3.5 py-2.5 text-xs font-medium text-red-600 bg-red-50 border border-red-100 rounded-sm">
                {error}
              </div>
            )}

            <button
              onClick={onLogin}
              disabled={busy}
              className={`w-full py-2.5 text-sm font-semibold font-sans text-white bg-accent-primary rounded-sm transition-colors hover:bg-accent-hover ${
                busy ? "cursor-not-allowed opacity-60" : "cursor-pointer"
              }`}
            >
              {busy ? "Loading…" : "Continue"}
            </button>
          </div>
        </div>
        <p className="text-center text-xs text-text-muted mt-4">
          Demo login — no password required
        </p>
      </div>
    </div>
  );
}
