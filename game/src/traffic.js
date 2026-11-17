// traffic.js — NPC traffic for Neon Harbor.
// Cars loop the rectangles formed by neighbouring streets, slowing for the
// car ahead, and parked cars line the kerbs for the player to steal.

import * as THREE from 'three';
import { STREETS } from './state.js';
import { buildCarMesh, randomCarColor } from './vehicles.js';
import { resolveCircleVsBlocks } from './city.js';

function makeLoop(rng) {
  const xi = Math.floor(rng.next() * (STREETS.length - 1));
  const zi = Math.floor(rng.next() * (STREETS.length - 1));
  const x0 = STREETS[xi];
  const x1 = STREETS[xi + 1];
  const z0 = STREETS[zi];
  const z1 = STREETS[zi + 1];
  const corners = [
    { x: x0, z: z0 },
    { x: x1, z: z0 },
    { x: x1, z: z1 },
    { x: x0, z: z1 },
  ];
  if (rng.chance(0.5)) corners.reverse();
  return corners;
}

export function spawnTraffic(G, count) {
  for (let i = 0; i < count; i++) {
    const loop = makeLoop(G.rng);
    const start = loop[Math.floor(G.rng.next() * 4)];
    const mesh = buildCarMesh(G, randomCarColor(G.rng), 'traffic');
    const car = {
      mesh,
      kind: 'traffic',
      x: start.x,
      z: start.z,
      heading: G.rng.range(0, Math.PI * 2),
      speed: G.rng.range(8, 13),
      cruise: 0,
      loop,
      corner: 1,
      driver: 'npc',
      wheels: mesh.userData.wheels,
    };
    car.cruise = car.speed;
    mesh.position.set(car.x, 0.1, car.z);
    mesh.rotation.y = car.heading;
    G.scene.add(mesh);
    G.cars.push(car);
  }
}

export function spawnParked(G, count) {
  for (let i = 0; i < count; i++) {
    const street = STREETS[Math.floor(G.rng.next() * STREETS.length)];
    const along = G.rng.range(-150, 150);
    const side = G.rng.chance(0.5) ? 1 : -1;
    const horizontal = G.rng.chance(0.5);
    const x = horizontal ? along : street + side * 5.2;
    const z = horizontal ? street + side * 5.2 : along;
    const mesh = buildCarMesh(G, randomCarColor(G.rng), 'parked');
    const car = {
      mesh,
      kind: 'parked',
      x,
      z,
      heading: horizontal ? (side > 0 ? Math.PI / 2 : -Math.PI / 2) : side > 0 ? 0 : Math.PI,
      speed: 0,
      driver: 'none',
      wheels: mesh.userData.wheels,
    };
    mesh.position.set(x, 0.1, z);
    mesh.rotation.y = car.heading;
    G.scene.add(mesh);
    G.cars.push(car);
  }
}

function carAhead(G, car, dist) {
  const fx = Math.sin(car.heading);
  const fz = Math.cos(car.heading);
  for (const other of G.cars) {
    if (other === car) continue;
    const dx = other.x - car.x;
    const dz = other.z - car.z;
    const along = dx * fx + dz * fz;
    const side = Math.abs(dx * fz - dz * fx);
    if (along > 0 && along < dist && side < 2.6) return true;
  }
  return false;
}

export function stepTraffic(G, dt) {
  for (const car of G.cars) {
    if (car.kind !== 'traffic') continue;
    const target = car.loop[car.corner];
    const dx = target.x - car.x;
    const dz = target.z - car.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 3) {
      car.corner = (car.corner + 1) % car.loop.length;
      continue;
    }
    const wantHeading = Math.atan2(dx, dz);
    let diff = wantHeading - car.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.heading += Math.max(-1.6 * dt, Math.min(1.6 * dt, diff));
    const blocked = carAhead(G, car, 9);
    const wantSpeed = blocked ? 0 : car.cruise;
    car.speed += Math.max(-14 * dt, Math.min(8 * dt, wantSpeed - car.speed));
    car.x += Math.sin(car.heading) * car.speed * dt;
    car.z += Math.cos(car.heading) * car.speed * dt;
    const fixed = resolveCircleVsBlocks(G.colliders, car.x, car.z, 2.1);
    car.x = fixed.x;
    car.z = fixed.z;
    car.mesh.position.set(car.x, 0.1, car.z);
    car.mesh.rotation.y = car.heading;
    const spin = car.speed * dt * 1.4;
    for (const w of car.wheels) w.rotation.x += spin;
  }
}
