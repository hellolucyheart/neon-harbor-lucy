// Save / load through localStorage: cash, mission, position, wanted level.
const KEY = 'neon-harbor-save-v1';

export function readSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    return data;
  } catch (err) {
    return null;
  }
}

export function writeSave(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    return false;
  }
}

export function wipeSave() {
  try {
    localStorage.removeItem(KEY);
  } catch (err) { /* storage unavailable */ }
}
