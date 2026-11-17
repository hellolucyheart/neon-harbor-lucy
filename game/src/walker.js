// walker.js — on-foot movement for Neon Harbor.
// WASD moves relative to the camera, Shift runs, the figure collides with
// building footprints, and E steps in or out of the nearest car.

import * as THREE from 'three';
import { moveAxes, running, pressed } from './controls.js';
import { resolveCircleVsBlocks } from './city.js';
import { buildPersonMesh } from './vehicles.js';
import { raiseWanted } from './wanted.js';

const WALK_SPEED = 6;
const RUN_SPEED = 10.5;

export function spawnPlayer(G) {
  const mesh = buildPersonMesh(G, 'player');
  mesh.position.set(G.player.x, 0.25, G.player.z);
  G.scene.add(mesh);
  G.player.mesh = mesh;
}

export function stepWalker(G, dt) {
  const p = G.player;
  const { f, s } = moveAxes(G);
  const speed = running(G) ? RUN_SPEED : WALK_SPEED;
  const yaw = G.camYaw;
  // forward = camera yaw direction, strafe = perpendicular
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  const sx = Math.cos(yaw);
  const sz = -Math.sin(yaw);
  let mx = fx * f + sx * s;
  let mz = fz * f + sz * s;
  const len = Math.hypot(mx, mz);
  if (len > 0.01) {
    mx /= len;
    mz /= len;
    p.speed = speed;
    p.heading = Math.atan2(mx, mz);
  } else {
    p.speed = 0;
  }
  let nx = p.x + mx * p.speed * dt;
  let nz = p.z + mz * p.speed * dt;
  // keep inside the city + pier, out of the water
  nx = Math.max(-166, Math.min(166, nx));
  nz = Math.max(-166, Math.min(204, nz));
  if (nz > 168 && Math.abs(nx) > 24) nz = 168; // water edge, except on the pier
  const fixed = resolveCircleVsBlocks(G.colliders, nx, nz, 0.55);
  p.x = fixed.x;
  p.z = fixed.z;
  // animate: legs swing, arms swing, lean into motion
  p.walkPhase += dt * p.speed * 1.6;
  const swing = Math.sin(p.walkPhase) * (p.speed > 0.1 ? 0.55 : 0);
  const u = p.mesh.userData;
  u.legL.rotation.x = swing;
  u.legR.rotation.x = -swing;
  u.armL.rotation.x = -swing * 0.8 + p.swing * 1.2;
  u.armR.rotation.x = swing * 0.8 - p.swing * 1.2;
  p.swing = Math.max(0, p.swing - dt * 4);
  p.mesh.position.set(p.x, 0.25, p.z);
  p.mesh.rotation.y = p.heading;
}

export function nearestCar(G, x, z, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of G.cars) {
    if (car.kind === 'cop') continue;
    if (car.driver === 'player') continue;
    const d = Math.hypot(car.x - x, car.z - z);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

export function tryEnterCar(G) {
  const car = nearestCar(G, G.player.x, G.player.z, 3.4);
  if (!car) return false;
  if (car.driver === 'npc') {
    // jack it: the driver bails out as a pedestrian and the heat rises
    ejectDriver(G, car);
    raiseWanted(G, 1, 'stole a car');
    G.stats.stolen += 1;
  }
  G.driving = true;
  G.playerCar = car;
  car.driver = 'player';
  car.speed = 0;
  G.player.mesh.visible = false;
  return true;
}

export function ejectDriver(G, car) {
  const ped = {
    mesh: buildPersonMesh(G, 'ped'),
    x: car.x + 2.4,
    z: car.z + 1.2,
    heading: car.heading,
    speed: 0,
    kind: 'ped',
    state: 'flee',
    fleeT: 2.5,
    downT: 0,
    wanderT: 0,
  };
  ped.mesh.position.set(ped.x, 0.25, ped.z);
  G.scene.add(ped.mesh);
  G.peds.push(ped);
}

export function exitCar(G) {
  const car = G.playerCar;
  if (!car) return;
  const side = Math.cos(car.heading) > 0 ? 1 : -1;
  G.player.x = car.x + side * 2.6;
  G.player.z = car.z + 1.6;
  const fixed = resolveCircleVsBlocks(G.colliders, G.player.x, G.player.z, 0.55);
  G.player.x = fixed.x;
  G.player.z = fixed.z;
  G.player.heading = car.heading;
  G.player.mesh.visible = true;
  G.player.mesh.position.set(G.player.x, 0.25, G.player.z);
  G.driving = false;
  G.playerCar = null;
  car.driver = 'none';
  car.speed = 0;
}

// E toggles between walking and driving; called from the main loop.
export function handleEnterExit(G) {
  if (!pressed(G, 'KeyE')) return;
  if (G.driving) exitCar(G);
  else tryEnterCar(G);
}
