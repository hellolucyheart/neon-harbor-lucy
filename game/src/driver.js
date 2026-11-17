// driver.js — arcade driving for Neon Harbor.
// W/S throttle and brake/reverse, A/D steering that bites harder at speed,
// building and car collisions, pedestrians getting knocked down, and a
// speedometer value the HUD reads. No real physics engine: circles and
// angles are enough for a game that has to feel right in screenshots.

import * as THREE from 'three';
import { moveAxes } from './controls.js';
import { resolveCircleVsBlocks } from './city.js';
import { raiseWanted } from './wanted.js';

const MAX_SPEED = 42;
const MAX_REVERSE = 12;
const ACCEL = 16;
const BRAKE = 30;
const TURN_RATE = 1.9;

export function stepDriver(G, dt) {
  const car = G.playerCar;
  if (!car) return;
  const { f, s } = moveAxes(G);
  if (f > 0) {
    car.speed += ACCEL * dt;
    if (car.speed > MAX_SPEED) car.speed = MAX_SPEED;
  } else if (f < 0) {
    if (car.speed > 0.5) car.speed -= BRAKE * dt;
    else {
      car.speed -= ACCEL * 0.55 * dt;
      if (car.speed < -MAX_REVERSE) car.speed = -MAX_REVERSE;
    }
  } else {
    // coast down
    car.speed -= Math.sign(car.speed) * 7 * dt;
    if (Math.abs(car.speed) < 0.4) car.speed = 0;
  }
  const steer = s * TURN_RATE * Math.min(1, Math.abs(car.speed) / 9);
  car.heading += steer * dt * Math.sign(car.speed || 1);
  let nx = car.x + Math.sin(car.heading) * car.speed * dt;
  let nz = car.z + Math.cos(car.heading) * car.speed * dt;
  nx = Math.max(-166, Math.min(166, nx));
  nz = Math.max(-166, Math.min(204, nz));
  if (nz > 168 && Math.abs(nx) > 24) {
    nz = 168;
    car.speed *= 0.4;
  }
  const before = { x: nx, z: nz };
  const fixed = resolveCircleVsBlocks(G.colliders, nx, nz, 2.1);
  if (Math.abs(fixed.x - before.x) > 0.01 || Math.abs(fixed.z - before.z) > 0.01) {
    car.speed *= 0.45; // scrub speed on a building hit
    G.shake = Math.max(G.shake, 0.25);
  }
  car.x = fixed.x;
  car.z = fixed.z;
  // shove other cars aside
  for (const other of G.cars) {
    if (other === car) continue;
    const dx = other.x - car.x;
    const dz = other.z - car.z;
    const d = Math.hypot(dx, dz);
    if (d < 4.4 && d > 0.01) {
      const push = (4.4 - d) * 0.5;
      other.x += (dx / d) * push;
      other.z += (dz / d) * push;
      if (Math.abs(car.speed) > 8) {
        other.speed = Math.max(other.speed || 0, 4);
        G.shake = Math.max(G.shake, 0.2);
      }
    }
  }
  // knock pedestrians down
  for (const ped of G.peds) {
    if (ped.state === 'down') continue;
    const d = Math.hypot(ped.x - car.x, ped.z - car.z);
    if (d < 2.4 && Math.abs(car.speed) > 3) {
      ped.state = 'down';
      ped.downT = 3;
      ped.mesh.rotation.x = -Math.PI / 2;
      ped.mesh.position.y = 0.5;
      raiseWanted(G, 1, 'hit a pedestrian');
      G.shake = Math.max(G.shake, 0.3);
    }
  }
  // player follows the car
  G.player.x = car.x;
  G.player.z = car.z;
  G.player.heading = car.heading;
  car.mesh.position.set(car.x, 0.1, car.z);
  car.mesh.rotation.y = car.heading;
  // spin the wheels
  const spin = car.speed * dt * 1.4;
  for (const w of car.mesh.userData.wheels) w.rotation.x += spin;
  // engine note follows speed
  if (G.audio.engine) {
    const t = G.audio.ctx.currentTime;
    G.audio.engine.frequency.setTargetAtTime(52 + Math.abs(car.speed) * 3.2, t, 0.08);
  }
}

export function carSpeedKmh(car) {
  return Math.round(Math.abs(car.speed || 0) * 3.6);
}
