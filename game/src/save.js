// Neon Harbor — save and load through localStorage. Only plain numbers and
// strings go in: money, story progress, health and the player's position.

import { SAVE_KEY } from './config.js';

export function saveGame(state) {
  try {
    const data = {
      version: 1,
      money: Math.round(state.money),
      missionIndex: state.missions.missionIndex,
      storyDone: state.storyDone,
      health: Math.round(state.health),
      pos: [state.player.pos.x, state.player.pos.z],
      heading: state.player.heading,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) return null;
    return data;
  } catch {
    return null;
  }
}

export function hasSave() {
  return loadGame() !== null;
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Storage unavailable; nothing to clear.
  }
}
