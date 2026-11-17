// vault.js — saving and loading for Neon Harbor.
// One localStorage key holds cash, mission progress, player position and
// the clock. Saving is explicit (the HUD Save button and auto-save after
// each mission), never silent on every frame.

import { SAVE_KEY } from './state.js';

export function hasSave() {
  try {
    return !!window.localStorage.getItem(SAVE_KEY);
  } catch {
    return false;
  }
}

export function saveGame(G) {
  try {
    const data = {
      cash: G.cash,
      hp: G.hp,
      mission: G.mission.idx,
      allDone: G.mission.allDone,
      x: G.player.x,
      z: G.player.z,
      minutes: G.minutes,
      savedAt: new Date().toISOString(),
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
    if (typeof data.cash !== 'number' || typeof data.mission !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

export function wipeSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // storage unavailable: nothing to wipe
  }
}
