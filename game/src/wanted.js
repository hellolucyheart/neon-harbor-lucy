// wanted.js — the wanted system for Neon Harbor.
// Stars 0-5. Crimes raise the level and the heat; staying out of sight of
// every cruiser lets the heat bleed off, one star at a time.

import { spawnPatrol } from './patrol.js';

export function raiseWanted(G, level, _reason) {
  if (level <= G.wanted) {
    G.heat = 1;
    G.calmTimer = 0;
    return;
  }
  G.wanted = Math.min(5, level);
  G.heat = 1;
  G.calmTimer = 0;
  // more stars, more cruisers on the street
  const wantCops = Math.min(2 + G.wanted, 6);
  while (G.cops.length < wantCops) spawnPatrol(G, 1);
}

export function stepWanted(G, dt) {
  if (G.wanted === 0) {
    G.heat = 0;
    return;
  }
  // nearest cruiser distance decides whether the player is "seen"
  let nearest = Infinity;
  for (const cop of G.cops) {
    const d = Math.hypot(cop.x - G.player.x, cop.z - G.player.z);
    if (d < nearest) nearest = d;
  }
  if (nearest > 55) {
    G.calmTimer += dt;
    if (G.calmTimer > 9) {
      G.wanted -= 1;
      G.calmTimer = 0;
      G.heat = Math.max(0, G.wanted / 5);
      if (G.wanted === 0) G.heat = 0;
    }
  } else {
    G.calmTimer = 0;
    G.heat = Math.min(1, G.heat + dt * 0.05);
  }
}
