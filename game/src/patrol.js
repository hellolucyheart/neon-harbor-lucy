// patrol.js — Harbor PD for Neon Harbor.
// Police cruisers cruise the streets when the player is clean, chase and
// ram when there is a wanted level, and bust the player on foot when they
// stay close for too long.

import * as THREE from 'three';
import { STREETS } from './state.js';
import { buildCarMesh } from './vehicles.js';
import { resolveCircleVsBlocks } from './city.js';
import { showDialog, flashDamage } from './display.js';

export function spawnPatrol(G, count) {
  for (let i = 0; i < count; i++) {
    const street = STREETS[Math.floor(G.rng.next() * STREETS.length)];
    const along = G.rng.range(-140, 140);
    const horizontal = G.rng.chance(0.5);
    const x = horizontal ? along : street;
    const z = horizontal ? street : along;
    const mesh = buildCarMesh(G, 0x1c2733, 'cop');
    // white doors + roof for the black-and-white look
    const door = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.3, 1.6), new THREE.MeshLambertMaterial({ color: 0xe8e8ee }));
    door.position.set(0, 0.72, 0.2);
    mesh.add(door);
    const cop = {
      mesh,
      kind: 'cop',
      x,
      z,
      heading: horizontal ? Math.PI / 2 : 0,
      speed: 0,
      cruise: G.rng.range(9, 12),
      driver: 'cop',
      bustT: 0,
      ramCd: 0,
      wheels: mesh.userData.wheels,
      lightL: mesh.userData.lightL,
      lightR: mesh.userData.lightR,
    };
    mesh.position.set(x, 0.1, z);
    mesh.rotation.y = cop.heading;
    G.scene.add(mesh);
    G.cops.push(cop);
    G.cars.push(cop);
  }
}

function steerToward(car, tx, tz, dt, rate) {
  const want = Math.atan2(tx - car.x, tz - car.z);
  let diff = want - car.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  car.heading += Math.max(-rate * dt, Math.min(rate * dt, diff));
}

export function stepPatrol(G, dt) {
  const px = G.player.x;
  const pz = G.player.z;
  const wanted = G.wanted;
  const flash = Math.floor(G.elapsed * 6) % 2 === 0;
  for (const cop of G.cops) {
    // light bar flashes only while wanted
    if (cop.lightL && cop.lightR) {
      cop.lightL.material.color.setHex(wanted > 0 && flash ? 0xff2020 : 0x550000);
      cop.lightR.material.color.setHex(wanted > 0 && !flash ? 0x2060ff : 0x000055);
    }
    if (wanted > 0) {
      // chase: aim at the player, faster with more stars
      const top = 24 + wanted * 4.5;
      steerToward(cop, px, pz, dt, 2.4);
      cop.speed += Math.max(-16 * dt, Math.min(12 * dt, top - cop.speed));
      cop.x += Math.sin(cop.heading) * cop.speed * dt;
      cop.z += Math.cos(cop.heading) * cop.speed * dt;
      if (cop.z > 168 && Math.abs(cop.x) > 24) {
        cop.z = 168;
        cop.speed *= 0.4;
      }
      cop.x = Math.max(-166, Math.min(166, cop.x));
      cop.z = Math.max(-166, Math.min(204, cop.z));
      const fixed = resolveCircleVsBlocks(G.colliders, cop.x, cop.z, 2.1);
      if (fixed.x !== cop.x || fixed.z !== cop.z) cop.speed *= 0.5;
      cop.x = fixed.x;
      cop.z = fixed.z;
      // ram the player's car
      const d = Math.hypot(px - cop.x, pz - cop.z);
      cop.ramCd = Math.max(0, cop.ramCd - dt);
      if (d < 4.6 && cop.ramCd <= 0) {
        cop.ramCd = 1.1;
        G.shake = Math.max(G.shake, 0.45);
        if (G.driving && G.playerCar) {
          G.playerCar.speed *= 0.55;
          damagePlayer(G, 6);
        } else {
          damagePlayer(G, 4);
        }
        if (G.audio.enabled) G.audio.thud?.();
      }
      // busted on foot
      if (!G.driving && d < 4.2) {
        cop.bustT += dt;
        if (cop.bustT > 2.2) {
          bustPlayer(G);
          return;
        }
      } else {
        cop.bustT = Math.max(0, cop.bustT - dt * 2);
      }
    } else {
      // clean cruise: wander between random intersections
      if (!cop.cruiseTarget) cop.cruiseTarget = { x: cop.x, z: cop.z };
      const td = Math.hypot(cop.cruiseTarget.x - cop.x, cop.cruiseTarget.z - cop.z);
      if (td < 6) {
        cop.cruiseTarget = {
          x: STREETS[Math.floor(Math.random() * STREETS.length)],
          z: STREETS[Math.floor(Math.random() * STREETS.length)],
        };
      }
      steerToward(cop, cop.cruiseTarget.x, cop.cruiseTarget.z, dt, 1.4);
      cop.speed += Math.max(-8 * dt, Math.min(6 * dt, cop.cruise - cop.speed));
      cop.x += Math.sin(cop.heading) * cop.speed * dt;
      cop.z += Math.cos(cop.heading) * cop.speed * dt;
      if (cop.z > 168 && Math.abs(cop.x) > 24) {
        cop.z = 168;
        cop.speed *= 0.4;
      }
      cop.x = Math.max(-166, Math.min(166, cop.x));
      cop.z = Math.max(-166, Math.min(204, cop.z));
      const fixed = resolveCircleVsBlocks(G.colliders, cop.x, cop.z, 2.1);
      cop.x = fixed.x;
      cop.z = fixed.z;
    }
    cop.mesh.position.set(cop.x, 0.1, cop.z);
    cop.mesh.rotation.y = cop.heading;
    const spin = cop.speed * dt * 1.4;
    for (const w of cop.wheels) w.rotation.x += spin;
  }
}

export function damagePlayer(G, amount) {
  if (G.player.hurtCd > 0) return;
  G.player.hurtCd = 0.6;
  G.hp = Math.max(0, G.hp - amount);
  flashDamage(G);
  if (G.hp <= 0) wastePlayer(G);
}

export function bustPlayer(G) {
  if (G.mode !== 'play') return;
  G.mode = 'busted';
  const fine = Math.min(G.cash, 150);
  G.cash -= fine;
  G.wanted = 0;
  G.heat = 0;
  if (G.driving) {
    G.playerCar.driver = 'none';
    G.playerCar.speed = 0;
    G.driving = false;
    G.playerCar = null;
    G.player.mesh.visible = true;
  }
  G.player.x = G.spots.plaza.x;
  G.player.z = G.spots.plaza.z;
  G.player.mesh.position.set(G.player.x, 0.25, G.player.z);
  G.hp = Math.max(G.hp, 60);
  showDialog(G, `BUSTED! Harbor PD took $${fine} off you. You wake up at the plaza, free — for now.`, 6);
  if (G.audio.enabled) G.audio.busted?.();
  setTimeout(() => {
    if (G.mode === 'busted') G.mode = 'play';
  }, 2600);
}

export function wastePlayer(G) {
  if (G.mode !== 'play') return;
  G.mode = 'wasted';
  const lost = Math.floor(G.cash * 0.1);
  G.cash -= lost;
  G.wanted = 0;
  G.heat = 0;
  if (G.driving) {
    G.playerCar.driver = 'none';
    G.playerCar.speed = 0;
    G.driving = false;
    G.playerCar = null;
    G.player.mesh.visible = true;
  }
  G.player.x = G.spots.plaza.x;
  G.player.z = G.spots.plaza.z;
  G.player.mesh.position.set(G.player.x, 0.25, G.player.z);
  G.hp = 100;
  showDialog(G, `WASTED! You lost $${lost}. A stranger drags you to the plaza — Neon Harbor is not done with you yet.`, 6);
  if (G.audio.enabled) G.audio.busted?.();
  setTimeout(() => {
    if (G.mode === 'wasted') G.mode = 'play';
  }, 2600);
}
