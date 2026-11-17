// Neon Harbor — the staged screenshot scenes behind ?shot=chase|drive|
// mission|start. Each one plays the real game forward from a fresh world
// for a fixed number of steps at a fixed timestep, steered by a simple
// autopilot, so the frame is what a short game really looks like and the
// same seed always gives the same frame.

import { makeRng } from './random.js';
import { Car } from './vehicles.js';
import { PoliceCar } from './police.js';
import { PALETTE } from './config.js';

const STEP = 1 / 60;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/** Steer a car toward the centreline of the street it is on. */
function streetSteer(game, car, alongAxis) {
  const target = alongAxis === 'x' ? car.pos.z : car.pos.x;
  const centre = game.city.streetCoord(target);
  const err = centre - target;
  const f = car.forward();
  const headingErr = Math.atan2(alongAxis === 'x' ? 1 : 0, alongAxis === 'x' ? 0 : 1) - car.heading;
  let diff = headingErr;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return clamp(diff * 1.6 + err * 0.06, -1, 1);
}

function setupPlay(game, missionIndex) {
  game.rng = makeRng(game.seed);
  game.mode = 'playing';
  game.hud.showScreen(null);
  game.missions.startMission(Math.min(missionIndex, 2));
  if (missionIndex === 1) game.spawnThugsNear(-176, -176, 3);
  if (missionIndex === 2) game.heat = 60;
}

function putPlayerInCar(game, x, z, heading) {
  const car = new Car(game.render.scene, game.rng.pick(PALETTE.carPaint), x, z, heading, { traffic: true });
  game.player.reset(x, z);
  game.player.enterCar(car);
  game.player.car = car;
  return car;
}

function stepGame(game, seconds, autopilot) {
  game.autopilot = autopilot;
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (autopilot && autopilot.steerFn) autopilot.steer = autopilot.steerFn(game);
    game.update(STEP);
  }
  game.autopilot = null;
}

function poseCameraBehind(game, target, heading) {
  game.render.camYaw = heading;
  game.render.camPitch = 0.3;
  game.render.snapTo(target);
  game.render.follow(target, 8, 0.5);
}

/** Front three-quarter view: the car drives toward the camera, so a pursuit behind it stays in frame. */
function poseCameraFront(game, target, heading) {
  game.render.camYaw = heading + Math.PI;
  game.render.camPitch = 0.26;
  game.render.snapTo(target);
  game.render.follow(target, 8, 0.5);
}

/** Stage `name` on the game and leave it frozen for the screenshot. */
export function stageShot(name, game) {
  const scene = name || 'start';

  if (scene === 'start') {
    game.mode = 'title';
    game.hud.showTitle(false);
    game.render.camera.position.set(120, 90, 170);
    game.render.camera.lookAt(0, 0, 0);
    game.render.smoothed.copy(game.render.camera.position);
    return;
  }

  if (scene === 'chase') {
    setupPlay(game, 0);
    game.money = 1250;
    game.addHeat(65);
    const car = putPlayerInCar(game, -24, -96, 0);
    // Three patrol cars already closing in from behind and alongside.
    const cop1 = new PoliceCar(game.render.scene, -30, -130, 0.2);
    const cop2 = new PoliceCar(game.render.scene, -18, -118, -0.15);
    const cop3 = new PoliceCar(game.render.scene, -24, -40, Math.PI);
    game.police.push(cop1, cop2, cop3);
    game.audio.setSiren(false);
    stepGame(game, 5, {
      throttle: 1,
      steer: 0,
      steerFn: (g) => streetSteer(g, g.player.car, 'z'),
    });
    poseCameraFront(game, car.pos, car.heading);
    return;
  }

  if (scene === 'drive') {
    setupPlay(game, 1);
    game.money = 420;
    const car = putPlayerInCar(game, -120, 24, Math.PI / 2);
    stepGame(game, 4, {
      throttle: 1,
      steer: 0,
      steerFn: (g) => streetSteer(g, g.player.car, 'x'),
    });
    poseCameraBehind(game, car.pos, car.heading);
    return;
  }

  // mission: on foot at the warehouse pickup, thugs closing in.
  setupPlay(game, 1);
  game.money = 300;
  game.player.reset(-158, -158);
  const dx = -176 - game.player.pos.x;
  const dz = -176 - game.player.pos.z;
  game.render.camYaw = Math.atan2(dx, dz);
  game.player.heading = game.render.camYaw;
  stepGame(game, 2.5, { throttle: 1, steer: 0 });
  poseCameraBehind(game, game.player.pos, game.player.heading);
}
