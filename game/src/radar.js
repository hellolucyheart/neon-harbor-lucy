// radar.js — the minimap for Neon Harbor.
// A north-up canvas: streets, water, the pier, the player arrow, traffic,
// cruisers, rivals and the pulsing mission marker. Drawn every frame from
// live state, so it never goes stale.

import { STREETS } from './state.js';

const SIZE = 180;
const SCALE = SIZE / 380; // world -190..190 maps onto the canvas
const CX = SIZE / 2;
const CY = SIZE / 2;

function toMap(x, z) {
  return [CX + x * SCALE, CY + z * SCALE];
}

export function drawRadar(G) {
  const canvas = G.ui.minimap;
  if (!canvas) return;
  const g = canvas.getContext('2d');
  if (!g) return;
  g.clearRect(0, 0, SIZE, SIZE);
  // background + water strip at the south edge
  g.fillStyle = '#101019';
  g.fillRect(0, 0, SIZE, SIZE);
  const [, wy] = toMap(0, 168);
  g.fillStyle = '#0d3a5c';
  g.fillRect(0, wy, SIZE, SIZE - wy);
  // pier
  const [px0, pz0] = toMap(-24, 168);
  const [px1, pz1] = toMap(24, 204);
  g.fillStyle = '#6b4a2f';
  g.fillRect(px0, pz0, px1 - px0, pz1 - pz0);
  // streets
  g.strokeStyle = '#3d3d52';
  g.lineWidth = 5;
  for (const s of STREETS) {
    const [ax] = toMap(s, 0);
    g.beginPath();
    g.moveTo(ax, 0);
    g.lineTo(ax, SIZE);
    g.stroke();
    const [, az] = toMap(0, s);
    g.beginPath();
    g.moveTo(0, az);
    g.lineTo(SIZE, az);
    g.stroke();
  }
  // mission marker: pulsing diamond
  if (!G.mission.allDone && G.mission.beacon && G.mission.beacon.visible) {
    const [mx, my] = toMap(G.mission.target.x, G.mission.target.z);
    const r = 5 + Math.sin(G.elapsed * 4) * 1.6;
    g.fillStyle = '#ffd60a';
    g.beginPath();
    g.moveTo(mx, my - r);
    g.lineTo(mx + r, my);
    g.lineTo(mx, my + r);
    g.lineTo(mx - r, my);
    g.closePath();
    g.fill();
  }
  // rivals
  g.fillStyle = '#ff4040';
  for (const r of G.rivals) {
    if (r.state === 'down') continue;
    const [rx, ry] = toMap(r.x, r.z);
    g.beginPath();
    g.arc(rx, ry, 2.5, 0, Math.PI * 2);
    g.fill();
  }
  // traffic dots
  g.fillStyle = '#c8c8d8';
  for (const car of G.cars) {
    if (car.kind === 'cop') continue;
    const [cx, cy] = toMap(car.x, car.z);
    g.fillRect(cx - 1.5, cy - 1.5, 3, 3);
  }
  // cruisers blink blue/red
  const flash = Math.floor(G.elapsed * 3) % 2 === 0;
  g.fillStyle = flash ? '#3f7fd9' : '#ff4040';
  for (const cop of G.cops) {
    const [cx, cy] = toMap(cop.x, cop.z);
    g.beginPath();
    g.arc(cx, cy, 3, 0, Math.PI * 2);
    g.fill();
  }
  // player arrow, rotated by heading
  const [ux, uy] = toMap(G.player.x, G.player.z);
  g.save();
  g.translate(ux, uy);
  g.rotate(Math.atan2(Math.sin(G.player.heading), Math.cos(G.player.heading)));
  g.fillStyle = '#ffffff';
  g.strokeStyle = '#111111';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(0, -6);
  g.lineTo(4.5, 5);
  g.lineTo(0, 2.5);
  g.lineTo(-4.5, 5);
  g.closePath();
  g.fill();
  g.stroke();
  g.restore();
}
