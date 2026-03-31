export const SESSION_USER_KEY = "neomed.user";

export function getSessionUser() {
  try {
    const raw = sessionStorage.getItem(SESSION_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.id) return null;
    return { id: Number(parsed.id), name: String(parsed.name || "") };
  } catch {
    return null;
  }
}

export function setSessionUser(user) {
  sessionStorage.setItem(
    SESSION_USER_KEY,
    JSON.stringify({ id: Number(user.id), name: String(user.name || "") }),
  );
}

export function clearSessionUser() {
  sessionStorage.removeItem(SESSION_USER_KEY);
}

