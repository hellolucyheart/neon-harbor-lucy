// pedestrian.js — sidewalk walkers for Neon Harbor.
// Pedestrians stroll along the kerbs, turn at intersections, and run for
// cover when a speeding car (or a gunshot) comes too close.

import * as THREE from 'three';
import { STREETS } from './state.js';
import { buildPersonMesh } from './vehicles.js';

export function spawnPedestrians(G, count) {
  for (let i = 0; i < count; i++) {
    const street = STREETS[Math.floor(G.rng.next() * STREETS.length)];
    const along = G.rng.range(-150, 150);
    const side = G.rng.chance(0.5) ? 1 : -1;
    const horizontal = G.rng.chance(0.5);
    const x = horizontal ? along : street + side * 7.2;
    const z = horizontal ? street + side * 7.2 : along;
    const mesh = buildPersonMesh(G, 'ped');
    const ped = {
      mesh,
      x,
      z,
      heading: horizontal ? (G.rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2) : G.rng.chance(0.5) ? 0 : Math.PI,
      speed: G.rng.range(1.2, 2.4),
      kind: 'ped',
      state: 'walk',
      fleeT: 0,
      downT: 0,
      wanderT: G.rng.range(2, 8),
      phase: G.rng.range(0, 6),
    };
    mesh.position.set(x, 0.25, z);
    mesh.rotation.y = ped.heading;
    G.scene.add(mesh);
    G.peds.push(ped);
  }
}

function nearestThreat(G, ped) {
  // a fast player car, or the player on foot swinging/shooting nearby
  if (G.driving && G.playerCar) {
    const d = Math.hypot(G.playerCar.x - ped.x, G.playerCar.z - ped.z);
    if (d < 12 && Math.abs(G.playerCar.speed) > 6) return { x: G.playerCar.x, z: G.playerCar.z };
  }
  return null;
}

export function stepPedestrians(G, dt) {
  for (const ped of G.peds) {
    if (ped.state === 'down') {
      ped.downT -= dt;
      if (ped.downT <= 0) {
        ped.state = 'walk';
        ped.mesh.rotation.x = 0;
        ped.mesh.position.y = 0.25;
      }
      continue;
    }
    const threat = nearestThreat(G, ped);
    if (threat) {
      ped.state = 'flee';
      ped.fleeT = 2;
      ped.heading = Math.atan2(ped.x - threat.x, ped.z - threat.z);
    } else if (ped.state === 'flee') {
      ped.fleeT -= dt;
      if (ped.fleeT <= 0) ped.state = 'walk';
    }
    if (ped.state === 'walk') {
      ped.wanderT -= dt;
      if (ped.wanderT <= 0) {
        ped.wanderT = G.rng.range(3, 9);
        // turn at an intersection, or just flip around sometimes
        ped.heading += G.rng.chance(0.3) ? Math.PI : (G.rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2);
      }
    }
    const speed = ped.state === 'flee' ? 6.5 : ped.speed;
    ped.x += Math.sin(ped.heading) * speed * dt;
    ped.z += Math.cos(ped.heading) * speed * dt;
    // keep to the city, off the water
    if (ped.x < -164 || ped.x > 164 || ped.z < -164 || ped.z > 166) {
      ped.heading += Math.PI;
      ped.x = Math.max(-164, Math.min(164, ped.x));
      ped.z = Math.max(-164, Math.min(166, ped.z));
    }
    // walk cycle
    ped.phase += dt * speed * 2.4;
    const swing = Math.sin(ped.phase) * 0.5;
    const u = ped.mesh.userData;
    u.legL.rotation.x = swing;
    u.legR.rotation.x = -swing;
    u.armL.rotation.x = -swing * 0.7;
    u.armR.rotation.x = swing * 0.7;
    ped.mesh.position.set(ped.x, 0.25, ped.z);
    ped.mesh.rotation.y = ped.heading;
  }
}
