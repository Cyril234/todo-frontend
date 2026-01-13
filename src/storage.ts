const KEY = "userId";


export function getUserId(): number | null {
const raw = localStorage.getItem(KEY);
if (!raw) return null;
const n = Number(raw);
return Number.isFinite(n) ? n : null;
}


export function setUserId(id: number) {
localStorage.setItem(KEY, String(id));
}


export function clearUserId() {
localStorage.removeItem(KEY);
}