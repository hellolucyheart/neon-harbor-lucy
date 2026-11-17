// staging.js — screenshot poses for Neon Harbor.
// Reads ?shot=chase|drive|mission|start&seed=N from the URL and stages a
// deterministic scene for each: the same seed always builds the same shot.
// Shot mode auto-starts the game (except "start", which keeps the menu).

import { startMission } from './quests.js';
import { raiseWanted } from './wanted.js';
import { spawnPatrol } from './patrol.js';

export function parseShot() {
  const params = new URLSearchParams(window.location.search);
  const name = params.get('shot');
  if (!name) return null;
  const seed = Number(params.get('seed') || '7');
  return { name, seed: Number.isFinite(seed) ? seed : 7 };
}

function putPlayerInCar(G, car, x, z, heading, speed) {
  car.x = x;
  car.z = z;
  car.heading = heading;
  car.speed = speed;
  car.driver = 'player';
  car.mesh.position.set(x, 0.1, z);
  car.mesh.rotation.y = heading;
  G.driving = true;
  G.playerCar = car;
  G.player.x = x;
  G.player.z = z;
  G.player.heading = heading;
  G.player.mesh.visible = false;
  G.camYaw = heading + Math.PI;
}

function nearestParked(G, x, z) {
  let best = null;
  let bestD = Infinity;
  for (const car of G.cars) {
    if (car.kind !== 'parked' || car.driver === 'player') continue;
    const d = Math.hypot(car.x - x, car.z - z);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

export function applyShot(G) {
  const shot = G.shot;
  if (!shot) return;
  // every staged shot runs the live game (except the menu shot)
  if (shot.name === 'start') {
    G.mode = 'menu';
    G.camOverride = {
      eye: { x: 6, y: 26, z: 226 },
      at: { x: 0, y: 16, z: 30 },
    };
    return;
  }
  G.mode = 'play';
  G.camOverride = null;
  if (shot.name === 'drive') {
    const car = nearestParked(G, -21, -60);
    if (car) putPlayerInCar(G, car, -21, -60, Math.PI, 22);
    G.mission.title = 'Free roam — Neon Harbor is yours';
    G.mission.text = 'Cruise the avenues. The city never sleeps.';
    G.mission.beacon.visible = false;
    G.dialogText = '';
    G.dialogUntil = 0;
  } else if (shot.name === 'chase') {
    const car = nearestParked(G, -63, 40);
    if (car) putPlayerInCar(G, car, -63, 40, Math.PI, 30);
    raiseWanted(G, 3, 'staged chase');
    while (G.cops.length < 2) spawnPatrol(G, 1);
    // line two cruisers up behind the player, offset to the sides so the
    // player's car stays the centre of the frame
    G.cops[0].x = -67;
    G.cops[0].z = 58;
    G.cops[0].heading = Math.PI;
    G.cops[0].speed = 32;
    G.cops[1].x = -59;
    G.cops[1].z = 64;
    G.cops[1].heading = Math.PI;
    G.cops[1].speed = 30;
    G.mission.title = 'Lose the heat';
    G.mission.text = 'Harbor PD is on you. Break line of sight until the stars clear.';
    G.mission.beacon.visible = false;
    G.dialogText = 'Harbor PD is on your tail — lose them!';
    G.dialogUntil = G.elapsed + 6;
  } else if (shot.name === 'mission') {
    startMission(G, 3);
    // approach the Redline den from the north so its neon sign faces the camera
    G.player.x = -126;
    G.player.z = 102;
    G.player.heading = 0;
    G.player.mesh.position.set(G.player.x, 0.25, G.player.z);
    G.player.mesh.rotation.y = G.player.heading;
    G.camYaw = G.player.heading + Math.PI;
    // bring the crew out in front of the den, facing the player
    G.rivals.forEach((r, i) => {
      r.x = -130 + i * 4;
      r.z = 111 + (i % 2) * 2;
      r.heading = Math.atan2(G.player.x - r.x, G.player.z - r.z);
      r.mesh.position.set(r.x, 0.25, r.z);
      r.mesh.rotation.y = r.heading;
    });
  }
}
