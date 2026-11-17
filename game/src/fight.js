// fight.js — combat for Neon Harbor.
// Fists up close, a pistol on right click. Rivals chase and swing back;
// their health bars float over their heads. Shooting in public draws the
// law, and a downed rival stays down.

import * as THREE from 'three';
import { buildPersonMesh } from './vehicles.js';
import { damagePlayer } from './patrol.js';
import { raiseWanted } from './wanted.js';
import { showDialog } from './display.js';

export function spawnRivals(G, x, z, count) {
  for (let i = 0; i < count; i++) {
    const mesh = buildPersonMesh(G, 'rival');
    const rx = x + (i - 1) * 4;
    const rz = z + (i % 2 === 0 ? 3 : -3);
    mesh.position.set(rx, 0.25, rz);
    // health bar: a small green box that shrinks
    const barBg = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.05), new THREE.MeshBasicMaterial({ color: 0x111111 }));
    barBg.position.set(0, 2.35, 0);
    const barFg = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 0.06), new THREE.MeshBasicMaterial({ color: 0x3ddc5a }));
    barFg.position.set(0, 2.35, 0.01);
    mesh.add(barBg, barFg);
    const rival = {
      mesh,
      x: rx,
      z: rz,
      heading: 0,
      hp: 100,
      maxHp: 100,
      state: 'idle', // idle | chase | attack | down
      atkCd: 0,
      barFg,
      phase: Math.random() * 6,
    };
    G.scene.add(mesh);
    G.rivals.push(rival);
  }
}

function burstAt(G, x, y, z, color, n) {
  if (G.sparks) G.sparks.burst(x, y, z, color, n, 6);
}

export function punch(G) {
  const p = G.player;
  if (p.punchCd > 0 || G.driving) return;
  p.punchCd = 0.45;
  p.swing = 1;
  if (G.audio.enabled) G.audio.thud?.();
  // nearest rival or pedestrian in front, within reach
  const fx = Math.sin(p.heading);
  const fz = Math.cos(p.heading);
  let best = null;
  let bestD = 2.6;
  for (const r of G.rivals) {
    if (r.state === 'down') continue;
    const dx = r.x - p.x;
    const dz = r.z - p.z;
    const d = Math.hypot(dx, dz);
    const along = dx * fx + dz * fz;
    if (d < bestD && along > 0) {
      bestD = d;
      best = r;
    }
  }
  if (best) {
    hurtRival(G, best, 34, p.heading);
    return;
  }
  // shove a pedestrian instead
  for (const ped of G.peds) {
    if (ped.state === 'down') continue;
    const dx = ped.x - p.x;
    const dz = ped.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d < 2.4) {
      ped.state = 'down';
      ped.downT = 2.5;
      ped.mesh.rotation.x = -Math.PI / 2;
      ped.mesh.position.y = 0.5;
      raiseWanted(G, 1, 'assault');
      burstAt(G, ped.x, 1.2, ped.z, 0xffe9a8, 10);
      return;
    }
  }
}

export function shoot(G) {
  const p = G.player;
  if (p.shootCd > 0 || G.driving) return;
  p.shootCd = 0.32;
  G.stats.shots += 1;
  if (G.audio.enabled) G.audio.shot?.();
  // hitscan along the camera forward, from the player
  const dir = new THREE.Vector3();
  G.camera.getWorldDirection(dir);
  dir.y = 0;
  dir.normalize();
  const ox = p.x;
  const oz = p.z;
  let hitRival = null;
  let hitD = 60;
  for (const r of G.rivals) {
    if (r.state === 'down') continue;
    const dx = r.x - ox;
    const dz = r.z - oz;
    const along = dx * dir.x + dz * dir.z;
    if (along < 1 || along > hitD) continue;
    const side = Math.abs(dx * dir.z - dz * dir.x);
    if (side < 1.4) {
      hitD = along;
      hitRival = r;
    }
  }
  const hx = ox + dir.x * hitD;
  const hz = oz + dir.z * hitD;
  burstAt(G, hx, 1.3, hz, 0xffc46b, hitRival ? 16 : 6);
  if (hitRival) hurtRival(G, hitRival, 45, Math.atan2(dir.x, dir.z));
  raiseWanted(G, 1, 'gunfire');
  // tracer line, fades in the spark system
  if (G.sparks) G.sparks.tracer(ox, 1.5, oz, hx, 1.3, hz);
}

export function hurtRival(G, rival, dmg, fromHeading) {
  rival.hp -= dmg;
  rival.barFg.scale.x = Math.max(0.01, rival.hp / rival.maxHp);
  rival.barFg.position.x = -(1 - rival.hp / rival.maxHp) * 0.5;
  burstAt(G, rival.x, 1.4, rival.z, 0xff5e5e, 12);
  // knockback
  rival.x += Math.sin(fromHeading) * 0.9;
  rival.z += Math.cos(fromHeading) * 0.9;
  if (rival.hp <= 0) {
    rival.state = 'down';
    rival.mesh.rotation.x = -Math.PI / 2;
    rival.mesh.position.y = 0.5;
    G.stats.kos += 1;
    G.cash += 25;
    showDialog(G, 'Rival down — $25 lifted from his pocket.', 2.5);
  } else {
    rival.state = 'chase';
  }
}

export function stepFight(G, dt) {
  const p = G.player;
  p.punchCd = Math.max(0, p.punchCd - dt);
  p.shootCd = Math.max(0, p.shootCd - dt);
  p.hurtCd = Math.max(0, p.hurtCd - dt);
  for (const r of G.rivals) {
    if (r.state === 'down') continue;
    const d = Math.hypot(p.x - r.x, p.z - r.z);
    if (d < 26 && !G.driving) r.state = r.state === 'idle' ? 'chase' : r.state;
    if (r.state === 'chase') {
      const want = Math.atan2(p.x - r.x, p.z - r.z);
      let diff = want - r.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      r.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
      if (d > 1.9) {
        r.x += Math.sin(r.heading) * 4.6 * dt;
        r.z += Math.cos(r.heading) * 4.6 * dt;
      }
      r.atkCd = Math.max(0, r.atkCd - dt);
      if (d < 2.1 && r.atkCd <= 0) {
        r.atkCd = 1.1;
        damagePlayer(G, 8);
        burstAt(G, p.x, 1.4, p.z, 0xffe9a8, 8);
        if (G.audio.enabled) G.audio.thud?.();
      }
      r.phase += dt * 5;
      const swing = Math.sin(r.phase) * 0.5;
      r.mesh.userData.legL.rotation.x = swing;
      r.mesh.userData.legR.rotation.x = -swing;
    }
    r.mesh.position.set(r.x, 0.25, r.z);
    r.mesh.rotation.y = r.heading;
  }
}
