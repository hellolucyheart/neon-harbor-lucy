// Neon Harbor — boot: renderer, game state, loop, screens, save, debug hooks.
import * as THREE from 'three';
import { Harbor, CITY, streetCoord } from './harbor.js';
import { Traffic, Driver, StreetCar, CAR_COLORS } from './cars.js';
import { Crowd } from './crowd.js';
import { PoliceForce } from './cops.js';
import { Story, MISSIONS } from './story.js';
import { ThugSquad, Gunplay } from './shooting.js';
import { Hero } from './hero.js';
import { Sparks } from './fx.js';
import { Interface } from './interface.js';
import { MapView } from './mapview.js';
import { SoundBank } from './sound.js';
import { Keys } from './keys.js';
import { readSave, writeSave, wipeSave } from './persist.js';
import { shotParams, stageShot } from './poses.js';
import { Dice, clamp, dist2d } from './rng.js';

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x3d2c63, 120, 620);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 2000);

const hemi = new THREE.HemisphereLight(0x9a8bd8, 0x2a1e3a, 1.4);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffb36b, 2.4);
sun.position.set(-180, 140, -120);
scene.add(sun);

const harbor = new Harbor(scene, 1);
const traffic = new Traffic(scene, harbor, 7);
const crowd = new Crowd(scene, harbor, 21);
const police = new PoliceForce(scene, harbor, 33);
const story = new Story(scene);
const thugs = new ThugSquad(scene, harbor, 55);
const gunplay = new Gunplay(scene);
const sparks = new Sparks(scene, 77);
const hero = new Hero(scene, harbor);
const driver = new Driver(harbor);
const ui = new Interface();
const mapView = new MapView(document.getElementById('minimap'));
const sound = new SoundBank();
const keys = new Keys(canvas);

const dice = new Dice(99);

// Parked cars the player can steal without chasing traffic.
const parked = [];
function parkCar(x, z, heading) {
  const car = new StreetCar(scene, x, z, heading, dice.pick(CAR_COLORS));
  parked.push(car);
  return car;
}
parkCar(streetCoord(4) + 8, streetCoord(2) + 2.6, Math.PI / 2);
parkCar(streetCoord(2) - 8, streetCoord(5) - 2.6, 0);
parkCar(streetCoord(6) + 8, streetCoord(7) + 2.6, -Math.PI / 2);
parkCar(streetCoord(1) + 2.6, streetCoord(3) - 8, Math.PI);

const game = {
  state: 'title', // title | playing | paused | busted | over | complete
  money: 0,
  carHealth: 100,
  inCar: false,
  currentCar: null,
  hurtFlash: 0,
  lastCrimeAt: 0,
  saveTimer: 0,
  missionThugsSpawned: false,
  camPos: new THREE.Vector3(60, 50, 120),
};

function missionObjectiveHtml() {
  if (story.finished()) return '<b>FREE ROAM</b> — the harbor is yours. Enjoy the sunset.';
  const m = story.current();
  let extra = '';
  if (m.id === 1) extra = ` — thugs left: <b>${thugs.aliveCount()}</b>`;
  if (m.id === 2) extra = ` — wanted: <b>${police.stars}★</b>`;
  return `<b>MISSION ${m.id + 1}/3 — ${m.name}</b><br>${m.brief}${extra}`;
}

function hintText() {
  if (game.inCar) return 'WASD drive · Space handbrake · E exit car · reach the gold beacon';
  const near = nearestStealable();
  if (near) return 'Press E to steal this car (the cops will notice!)';
  return 'WASD move · Shift run · drag mouse to look · click to shoot · E near a car to steal it';
}

function nearestStealable() {
  let best = null;
  let bestD = 5;
  const pool = [...traffic.cars, ...parked];
  for (const c of pool) {
    const d = dist2d(hero.pos.x, hero.pos.z, c.pos.x, c.pos.z);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

function stealCar(car) {
  traffic.remove(car);
  const pi = parked.indexOf(car);
  if (pi >= 0) parked.splice(pi, 1);
  driver.take(car);
  game.inCar = true;
  game.currentCar = car;
  game.carHealth = 100;
  hero.mesh.visible = false;
  police.addStar();
  game.lastCrimeAt = performance.now() / 1000;
  sound.pickup();
  ui.toast('Car stolen! Wanted level up ★');
  saveGame();
}

function exitCar() {
  const car = driver.leave();
  game.inCar = false;
  game.currentCar = null;
  hero.mesh.visible = true;
  const f = car.forward();
  hero.pos.set(car.pos.x - f.z * 3, 0, car.pos.z + f.x * 3);
  hero.camYaw = car.heading;
  saveGame();
}

function saveGame() {
  writeSave({
    money: game.money,
    mission: story.index,
    x: hero.pos.x,
    z: hero.pos.z,
    stars: police.stars,
    health: hero.health,
  });
}

function loadSave() {
  const s = readSave();
  if (!s) return false;
  game.money = typeof s.money === 'number' ? s.money : 0;
  hero.health = typeof s.health === 'number' ? s.health : 100;
  story.setMission(Math.min(typeof s.mission === 'number' ? s.mission : 0, MISSIONS.length));
  if (typeof s.x === 'number' && typeof s.z === 'number') hero.pos.set(s.x, 0, s.z);
  police.setStars(typeof s.stars === 'number' ? s.stars : 0);
  if (story.index === 1) spawnThugs();
  return true;
}

function spawnThugs() {
  if (game.missionThugsSpawned) return;
  game.missionThugsSpawned = true;
  const b = MISSIONS[1].beacon;
  thugs.spawnAt(b.x, b.z, 3);
}

function completeMission() {
  const m = story.current();
  game.money += m.reward;
  sound.pickup();
  sparks.burst(hero.pos.clone().add(new THREE.Vector3(0, 2, 0)), 0xffd166, 24, 8);
  ui.toast(`MISSION COMPLETE — +$${m.reward}`, 4);
  if (m.id === 2) police.clear();
  story.advance();
  game.missionThugsSpawned = false;
  if (story.index === 1) spawnThugs();
  if (story.index === 2) police.setStars(3);
  saveGame();
  if (story.finished()) {
    setTimeout(() => {
      if (game.state === 'playing') {
        game.state = 'complete';
        ui.showScreen('complete');
        ui.showHud(false);
      }
    }, 1500);
  }
}

function bustPlayer() {
  if (game.state !== 'playing') return;
  game.state = 'busted';
  sound.bustedSting();
  sound.stopSiren();
  game.money = Math.floor(game.money * 0.8);
  police.clear();
  if (game.inCar) {
    const car = driver.leave();
    game.inCar = false;
    game.currentCar = null;
    void car;
  }
  hero.mesh.visible = true;
  hero.pos.set(0, 0, 24);
  hero.health = 100;
  game.carHealth = 100;
  ui.showScreen('busted');
  ui.showHud(false);
  saveGame();
}

function gameOver() {
  if (game.state !== 'playing') return;
  game.state = 'over';
  sound.bustedSting();
  sound.stopSiren();
  ui.showScreen('over');
  ui.showHud(false);
}

function beginPlay() {
  sound.unlock();
  sound.startEngine();
  sound.startBassline();
  game.state = 'playing';
  ui.showScreen(null);
  ui.showHud(true);
}

function restartStory(fresh) {
  if (fresh) {
    wipeSave();
    game.money = 0;
    hero.health = 100;
    story.setMission(0);
    thugs.clear();
    game.missionThugsSpawned = false;
    police.clear();
    hero.pos.set(0, 0, 24);
  }
  hero.mesh.visible = true;
  hero.health = 100;
  game.inCar = false;
  game.currentCar = null;
  game.carHealth = 100;
  beginPlay();
}

document.getElementById('startBtn').addEventListener('click', () => restartStory(false));
document.getElementById('continueBtn').addEventListener('click', () => {
  loadSave();
  beginPlay();
});
document.getElementById('resumeBtn').addEventListener('click', () => beginPlay());
document.getElementById('restartBtn').addEventListener('click', () => restartStory(true));
document.getElementById('bustedBtn').addEventListener('click', () => beginPlay());
document.getElementById('overBtn').addEventListener('click', () => restartStory(false));
document.getElementById('completeBtn').addEventListener('click', () => beginPlay());

if (readSave()) ui.el.continueBtn.classList.remove('hidden');

// Click (not drag) fires the gun on foot.
let downAt = null;
canvas.addEventListener('mousedown', (e) => { downAt = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('mouseup', (e) => {
  if (!downAt || game.state !== 'playing' || game.inCar) { downAt = null; return; }
  const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
  downAt = null;
  if (moved > 6) return;
  sound.unlock();
  // Aim from the hero's shoulder along the camera's horizontal facing:
  // a ray from the high chase camera would dive under distant thugs.
  const origin = hero.pos.clone();
  origin.y = 1.5;
  const dir = hero.aimDirection(camera);
  dir.y = 0;
  dir.normalize();
  const hit = gunplay.shoot(origin, dir, 90, (o, d, max) => thugs.rayHit(o, d, max));
  sound.shoot();
  if (hit) {
    hit.thug.hp -= 34;
    const p = hit.thug.mesh.position.clone();
    p.y = 1.5;
    sparks.burst(p, 0xff5040, 12, 5);
    if (hit.thug.hp <= 0) {
      hit.thug.alive = false;
      hit.thug.mesh.visible = false;
      ui.toast('Thug down!', 1.5);
      if (thugs.aliveCount() === 0 && story.index === 1) {
        ui.toast('All thugs down — get to the beacon!', 2.5);
      }
    }
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---- Shot-staging API used by poses.js ---------------------------------
game.showTitleOverCity = () => {
  game.state = 'title';
  ui.showScreen('title');
  ui.showHud(false);
};
game.beginPlay = beginPlay;
game.placeHero = (x, z) => {
  if (game.inCar) exitCar();
  hero.pos.set(x, 0, z);
};
game.giveCarAt = (x, z, heading) => {
  const car = new StreetCar(scene, x, z, heading, 0xffd166);
  driver.take(car);
  game.inCar = true;
  game.currentCar = car;
  game.carHealth = 100;
  hero.mesh.visible = false;
};
game.driveForward = () => {
  keys.fake('KeyW');
};
game.setWanted = (n) => police.setStars(n);
game.stagePursuit = () => {
  const target = game.currentCar ? game.currentCar.pos : hero.pos;
  police.units.forEach((u, i) => {
    const back = 6 + i * 3;
    const side = (i % 2 === 0 ? -1 : 1) * 4.5;
    u.pos.set(target.x - Math.sin(game.currentCar ? game.currentCar.heading : 0) * back + side, 0, target.z - Math.cos(game.currentCar ? game.currentCar.heading : 0) * back);
    u.heading = game.currentCar ? game.currentCar.heading : 0;
    u.speed = 20;
  });
};
game.setMission = (i) => {
  story.setMission(i);
  if (i === 1) spawnThugs();
  if (i === 2) police.setStars(3);
};
game.spawnMissionThugs = spawnThugs;
game.faceBeacon = () => {
  const b = story.current().beacon;
  hero.camYaw = Math.atan2(b.x - hero.pos.x, b.z - hero.pos.z);
};
game.arrangeMissionShot = () => {
  if (game.inCar) exitCar();
  hero.pos.set(-161, 0, -155);
  const spots = [[-161, -172], [-155, -170], [-167, -170]];
  thugs.thugs.forEach((t, i) => {
    const s = spots[i % spots.length];
    t.mesh.position.set(s[0], 0, s[1]);
  });
  hero.camYaw = Math.atan2(-169 - hero.pos.x, -169 - hero.pos.z);
};

// ---- Main loop ----------------------------------------------------------
const clock = new THREE.Clock();
let titleOrbit = 0;

function updateCamera(dt) {
  let anchor;
  if (game.state === 'title') {
    titleOrbit += dt * 0.05;
    anchor = {
      x: Math.sin(titleOrbit) * 190,
      y: 70,
      z: Math.cos(titleOrbit) * 190,
      lookX: 0, lookY: 12, lookZ: 0,
    };
  } else if (game.inCar && game.currentCar) {
    const car = game.currentCar;
    const f = car.forward();
    anchor = {
      x: car.pos.x - f.x * 11.5,
      y: 5,
      z: car.pos.z - f.z * 11.5,
      lookX: car.pos.x + f.x * 8,
      lookY: 1.6,
      lookZ: car.pos.z + f.z * 8,
    };
  } else {
    anchor = hero.cameraAnchor();
  }
  const k = game.state === 'title' ? 1 : Math.min(1, dt * 6);
  game.camPos.x += (anchor.x - game.camPos.x) * k;
  game.camPos.y += (anchor.y - game.camPos.y) * k;
  game.camPos.z += (anchor.z - game.camPos.z) * k;
  camera.position.copy(game.camPos);
  camera.lookAt(anchor.lookX, anchor.lookY, anchor.lookZ);
}

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  const now = performance.now() / 1000;

  if (game.state === 'playing') {
    if (keys.tapped('Escape')) {
      game.state = 'paused';
      ui.showScreen('pause');
      ui.showHud(false);
    }
    if (keys.tapped('KeyE')) {
      if (game.inCar) exitCar();
      else {
        const car = nearestStealable();
        if (car) stealCar(car);
      }
    }
    if (game.inCar) {
      driver.update(dt, keys);
      sound.setEngine(Math.abs(driver.speed) / 34, true);
    } else {
      hero.update(dt, keys);
      sound.setEngine(0, false);
    }
    // Wanted decay: lay low and the heat cools off.
    if (police.stars > 0 && now - game.lastCrimeAt > 30 && story.index !== 2) {
      police.setStars(police.stars - 1);
      game.lastCrimeAt = now;
      ui.toast('The heat is cooling off…', 2);
    }
    if (police.stars > 0) sound.startSiren();
    else sound.stopSiren();

    const danger = game.inCar && game.currentCar ? game.currentCar.pos : hero.pos;
    traffic.update(dt, danger, game.inCar ? driver.speed : 0);
    crowd.update(dt, danger);
    police.update(
      dt,
      game.inCar && game.currentCar ? game.currentCar.pos : hero.pos,
      game.inCar ? driver.speed : 0,
      !game.inCar,
      bustPlayer,
      (rdt) => {
        game.carHealth -= rdt * 14;
        game.hurtFlash = 1;
        if (Math.random() < rdt * 2) sound.crash();
        if (game.carHealth <= 0) {
          game.carHealth = 0;
          hero.health -= rdt * 30;
          if (hero.health <= 0) gameOver();
        }
      }
    );
    thugs.update(dt, hero.pos, (dmg) => {
      if (game.inCar) return;
      hero.health -= dmg;
      game.hurtFlash = 1;
      sound.thugShot();
      if (hero.health <= 0) gameOver();
    }, (a, b, color) => gunplay.spawnTracer(a, b, color));
    gunplay.update(dt);
    sparks.update(dt);

    const result = story.update(dt, game.inCar && game.currentCar ? game.currentCar.pos : hero.pos, game.inCar, thugs.aliveCount());
    if (result === 'complete') completeMission();

    game.hurtFlash = Math.max(0, game.hurtFlash - dt * 2.2);
    game.saveTimer += dt;
    if (game.saveTimer > 10) {
      game.saveTimer = 0;
      saveGame();
    }
    ui.render({
      stars: police.stars,
      money: game.money,
      objectiveHtml: missionObjectiveHtml(),
      health: hero.health,
      carHealth: game.carHealth,
      inCar: game.inCar,
      speedKmh: (game.inCar ? driver.speed : 0) * 3.6,
      hint: hintText(),
      hurtFlash: game.hurtFlash,
    });
    mapView.draw({
      beacon: story.finished() ? null : story.current().beacon,
      traffic: traffic.cars,
      police: police.units,
      walkers: crowd.walkers,
      player: game.inCar && game.currentCar ? game.currentCar.pos : hero.pos,
      heading: game.inCar && game.currentCar ? game.currentCar.heading : hero.heading,
    });
    ui.tick(dt);
  }

  updateCamera(dt);
  renderer.render(scene, camera);
  keys.endFrame();
}

// Stage a ?shot= pose before the first frame.
const params = shotParams();
if (params.shot) {
  stageShot(game, params.shot);
  updateCamera(1); // snap the camera to the staged framing at once
}
tick();

// Debug hooks for scripted play-testing.
window.__game = {
  get state() { return game.state; },
  get money() { return game.money; },
  get mission() { return story.index; },
  get stars() { return police.stars; },
  get health() { return hero.health; },
  get inCar() { return game.inCar; },
  get carHealth() { return game.carHealth; },
  get thugsAlive() { return thugs.aliveCount(); },
  get heroPos() { return { x: hero.pos.x, z: hero.pos.z }; },
  get thugPositions() { return thugs.thugs.filter((t) => t.alive).map((t) => ({ x: t.mesh.position.x, z: t.mesh.position.z })); },
  get carPos() { return game.currentCar ? { x: game.currentCar.pos.x, z: game.currentCar.pos.z } : null; },
  get carHeading() { return game.currentCar ? game.currentCar.heading : null; },
  setCarPos: (x, z) => { if (game.currentCar) game.currentCar.pos.set(x, 0, z); },
  aimAt: (x, z) => { hero.camYaw = Math.atan2(x - hero.pos.x, z - hero.pos.z); },
  get saveExists() { return !!readSave(); },
  start: () => beginPlay(),
  stealNearest: () => { const c = nearestStealable(); if (c) stealCar(c); return !!c; },
  exitCar,
  completeNow: () => { if (story.index === 1) { thugs.thugs.forEach((t) => { t.alive = false; t.mesh.visible = false; }); } },
  setMission: (i) => game.setMission(i),
  teleport: (x, z) => game.placeHero(x, z),
  keys,
  story,
  police,
  hero,
};
