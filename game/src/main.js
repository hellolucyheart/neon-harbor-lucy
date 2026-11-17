// Neon Harbor — the game itself: a sun-soaked open-world crime game.
// Wires the city, traffic, pedestrians, police, missions, combat, HUD,
// minimap, save and sound into one loop, plus the ?shot= staging hook
// the screenshots are taken from.

import * as THREE from 'three';
import { Render } from './render.js';
import { City } from './city.js';
import { Car } from './vehicles.js';
import { Pedestrian } from './pedestrians.js';
import { PoliceCar, policeSpawnPoint } from './police.js';
import { Player } from './player.js';
import { Combat, Thug } from './combat.js';
import { MissionManager } from './missions.js';
import { Particles } from './particles.js';
import { Hud } from './hud.js';
import { Minimap } from './minimap.js';
import { AudioEngine } from './audio.js';
import { Input } from './input.js';
import { makeRng } from './random.js';
import { saveGame, loadGame, hasSave, clearSave } from './save.js';
import {
  CITY, WANTED, MISSIONS, STORY, PALETTE, starsFromHeat, formatMoney,
} from './config.js';

const TRAFFIC_COUNT = 14;
const PED_COUNT = 22;
const PARKED_COUNT = 8;
const PICKUP_COUNT = 10;
const AUTOSAVE_SECONDS = 20;

export class Game {
  constructor() {
    const params = new URLSearchParams(window.location.search);
    this.seed = Number(params.get('seed') || 1) || 1;
    this.shotName = params.get('shot') || null;
    this.rng = makeRng(this.seed);
    this.time = 0;
    this.mode = 'title';
    this.money = 0;
    this.heat = 0;
    this.wantedStars = 0;
    this.lastCrimeAt = -100;
    this.savedAt = 0;
    this.autosaveTimer = AUTOSAVE_SECONDS;
    this.autopilot = null;
    this.cameraShake = 0;
    this.storyDone = false;
    this.flashRed = 0;

    this.render = new Render(document.getElementById('game'));
    this.city = new City(this.render.scene, this.rng);
    this.particles = new Particles(this.render.scene);
    this.combat = new Combat(this.render.scene, this.particles);
    this.player = new Player(this.render.scene, 0, -24);
    this.missions = new MissionManager(this.render.scene);
    this.hud = new Hud();
    this.minimap = new Minimap(document.getElementById('minimap'));
    this.audio = new AudioEngine();
    this.input = new Input();
    this.input.attach(this.render.canvas);

    this.traffic = [];
    this.parkedCars = [];
    this.peds = [];
    this.police = [];
    this.thugs = [];
    this.pickups = [];

    this.spawnTraffic();
    this.spawnParkedCars();
    this.spawnPedestrians();
    this.spawnPickups();

    this.hud.bind({
      start: () => this.startFresh(),
      continue: () => this.startFromSave(),
      resume: () => this.togglePause(),
      restart: () => this.startFresh(),
      saveQuit: () => this.saveAndQuit(),
      nextMission: () => this.nextMission(),
      retry: () => this.retryAfterFail(),
      closeStory: () => this.closeStory(),
    });
    this.input.onKeyDown = (code) => this.handleKeyDown(code);
    this.input.onMouseDown = (button) => {
      if (button === 0 && this.mode === 'playing' && this.player.onFoot) this.shoot();
    };
    this.hud.showTitle(hasSave());
    this.hud.update(this.hudState());
  }

  hudState() {
    return {
      health: this.player.health,
      money: this.money,
      wantedStars: this.wantedStars,
      speed: this.player.car ? this.player.car.speed : 0,
      onFoot: this.player.onFoot,
      objective: this.missions.objectiveText,
      timeLeft: this.missions.active ? this.missions.timeLeft : 0,
      savedAt: this.savedAt,
    };
  }

  // ---- Spawning -------------------------------------------------------

  spawnTraffic() {
    for (let i = 0; i < TRAFFIC_COUNT; i += 1) {
      const car = new Car(this.render.scene, this.rng.pick(PALETTE.carPaint), 0, 0, 0, { traffic: true });
      car.respawn(this.city, this.rng);
      this.traffic.push(car);
    }
  }

  spawnParkedCars() {
    for (let i = 0; i < PARKED_COUNT; i += 1) {
      const p = this.city.randomRoadPoint();
      const horizontal = Math.abs(p.z - this.city.streetCoord(p.z)) < 0.1;
      const heading = horizontal ? (this.rng.next() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (this.rng.next() < 0.5 ? 0 : Math.PI);
      const offset = 4.5;
      const x = horizontal ? p.x : p.x + (this.rng.next() < 0.5 ? offset : -offset);
      const z = horizontal ? p.z + (this.rng.next() < 0.5 ? offset : -offset) : p.z;
      const car = new Car(this.render.scene, this.rng.pick(PALETTE.carPaint), x, z, heading, { traffic: true });
      car.parked = true;
      car.speed = 0;
      car.targetSpeed = 0;
      this.parkedCars.push(car);
    }
  }

  spawnPedestrians() {
    for (let i = 0; i < PED_COUNT; i += 1) {
      this.peds.push(new Pedestrian(this.render.scene, this.rng, this.city));
    }
  }

  spawnPickups() {
    const geo = new THREE.BoxGeometry(0.9, 0.55, 0.7);
    const mat = new THREE.MeshLambertMaterial({ color: 0x22c55e, emissive: 0x14532d });
    for (let i = 0; i < PICKUP_COUNT; i += 1) {
      const mesh = new THREE.Mesh(geo, mat);
      const p = this.city.randomRoadPoint();
      mesh.position.set(p.x + this.rng.range(-4, 4), 0.6, p.z + this.rng.range(-4, 4));
      mesh.rotation.y = this.rng.range(0, Math.PI);
      this.render.scene.add(mesh);
      this.pickups.push({ mesh, taken: false, respawn: 0, spin: this.rng.range(0, 6) });
    }
  }

  spawnThugsNear(x, z, count) {
    for (let i = 0; i < count; i += 1) {
      const thug = new Thug(this.render.scene, x + this.rng.range(-8, 8), z + this.rng.range(-8, 8));
      this.thugs.push(thug);
    }
  }

  clearThugs() {
    for (const thug of this.thugs) {
      if (thug.alive) this.render.scene.remove(thug.mesh);
    }
    this.thugs = [];
  }

  clearPolice() {
    for (const cop of this.police) cop.remove();
    this.police = [];
  }

  // ---- Flow -----------------------------------------------------------

  startFresh() {
    clearSave();
    this.money = 0;
    this.heat = 0;
    this.wantedStars = 0;
    this.storyDone = false;
    this.player.reset(0, -24);
    this.clearPolice();
    this.clearThugs();
    this.audio.init();
    this.audio.click();
    this.beginPlay(0);
  }

  startFromSave() {
    const data = loadGame();
    if (!data) {
      this.startFresh();
      return;
    }
    this.money = data.money || 0;
    this.storyDone = !!data.storyDone;
    this.heat = 0;
    this.wantedStars = 0;
    this.player.reset(data.pos ? data.pos[0] : 0, data.pos ? data.pos[1] : -24);
    this.player.health = data.health || 100;
    this.clearPolice();
    this.clearThugs();
    this.audio.init();
    this.audio.click();
    this.beginPlay(data.missionIndex || 0);
  }

  beginPlay(missionIndex) {
    this.mode = 'playing';
    this.hud.showScreen(null);
    this.missions.startMission(Math.min(missionIndex, MISSIONS.length - 1));
    if (this.missions.missionIndex === 1) this.spawnThugsNear(-176, -176, 3);
    if (this.missions.missionIndex === 2) this.heat = 60;
    this.render.camYaw = this.player.heading + Math.PI;
    this.render.snapTo(this.player.pos);
    this.hud.feed('Welcome to Neon Harbor. ' + this.missions.current.title + ' — ' + this.missions.current.story);
    this.saveProgress();
  }

  saveAndQuit() {
    this.saveProgress();
    this.mode = 'title';
    this.hud.showTitle(hasSave());
    this.hud.update(this.hudState());
  }

  saveProgress() {
    const ok = saveGame(this);
    if (ok) this.savedAt = Date.now();
    return ok;
  }

  nextMission() {
    if (this.lastMissionResult === 'failed') {
      // A failed job is retried, not skipped.
      this.clearThugs();
      this.mode = 'playing';
      this.hud.showScreen(null);
      this.missions.startMission(this.missions.missionIndex);
      if (this.missions.missionIndex === 1) this.spawnThugsNear(-176, -176, 3);
      if (this.missions.missionIndex === 2) this.heat = 60;
      this.hud.feed('The job is still open. ' + this.missions.current.story);
      return;
    }
    const next = this.missions.missionIndex + 1;
    if (next >= MISSIONS.length) {
      this.storyDone = true;
      this.hud.showStory(STORY.outro);
      this.mode = 'story';
      this.saveProgress();
      return;
    }
    this.mode = 'playing';
    this.hud.showScreen(null);
    this.missions.startMission(next);
    if (next === 1) this.spawnThugsNear(-176, -176, 3);
    if (next === 2) this.heat = 60;
    this.hud.feed(this.missions.current.title + ' — ' + this.missions.current.story);
    this.saveProgress();
  }

  closeStory() {
    this.mode = 'playing';
    this.hud.showScreen(null);
  }

  retryAfterFail() {
    this.money = Math.max(0, this.money - 100);
    this.player.reset(0, -24);
    this.player.health = 100;
    this.heat = 0;
    this.wantedStars = 0;
    this.clearPolice();
    this.mode = 'playing';
    this.hud.showScreen(null);
    this.missions.startMission(this.missions.missionIndex);
    if (this.missions.missionIndex === 1) this.spawnThugsNear(-176, -176, 3);
    if (this.missions.missionIndex === 2) this.heat = 60;
    this.render.snapTo(this.player.pos);
    this.hud.feed('Back on the streets. The job is still open.');
    this.saveProgress();
  }

  togglePause() {
    if (this.mode === 'playing') {
      this.mode = 'paused';
      this.hud.showScreen('screen-pause');
      this.saveProgress();
    } else if (this.mode === 'paused') {
      this.mode = 'playing';
      this.hud.showScreen(null);
    }
  }

  handleKeyDown(code) {
    if (code === 'Escape') {
      if (this.mode === 'playing' || this.mode === 'paused') this.togglePause();
      return;
    }
    if (code === 'KeyM') {
      const muted = this.audio.toggleMute();
      this.hud.feed(muted ? 'Sound muted.' : 'Sound on.');
      return;
    }
    if (this.mode !== 'playing') return;
    if (code === 'KeyE') this.tryEnterExitCar();
    if (code === 'KeyF') this.shoot();
  }

  // ---- Crime, cars and combat ------------------------------------------

  addHeat(amount) {
    this.heat = Math.min(100, this.heat + amount);
    this.lastCrimeAt = this.time;
  }

  nearestCar(maxDist) {
    let best = null;
    let bestD = maxDist;
    const check = (car) => {
      const d = Math.hypot(car.pos.x - this.player.pos.x, car.pos.z - this.player.pos.z);
      if (d < bestD) {
        bestD = d;
        best = car;
      }
    };
    for (const car of this.parkedCars) check(car);
    for (const car of this.traffic) check(car);
    return best;
  }

  tryEnterExitCar() {
    if (!this.player.onFoot) {
      this.player.exitCar();
      this.audio.click();
      this.hud.feed('You step out onto the street.');
      return;
    }
    const car = this.nearestCar(3.6);
    if (!car) {
      this.hud.feed('No car close enough — walk up to one and press E.');
      return;
    }
    this.parkedCars = this.parkedCars.filter((c) => c !== car);
    this.traffic = this.traffic.filter((c) => c !== car);
    this.player.enterCar(car);
    this.addHeat(WANTED.stealCar);
    this.audio.click();
    this.hud.feed('You took the car. The patrol will notice that.');
  }

  shoot() {
    if (!this.player.onFoot || this.mode !== 'playing') return;
    const dir = new THREE.Vector3();
    this.render.camera.getWorldDirection(dir);
    const from = new THREE.Vector3(this.player.pos.x, this.player.pos.y + 1.5, this.player.pos.z);
    const hit = this.combat.fire(from, dir, this.thugs, 60);
    this.audio.shot();
    if (hit) {
      this.hud.hitmarker();
      const died = hit.damage(34);
      if (died) {
        this.money += 50;
        this.hud.feed('Thug down. +' + formatMoney(50) + ' lifted from his pockets.');
        this.audio.pickup();
      } else {
        this.audio.hit();
      }
    }
  }

  thugShoot(thug, dist) {
    this.audio.enemyShot();
    const muzzle = new THREE.Vector3(thug.pos.x, thug.pos.y + 1.2, thug.pos.z);
    const target = new THREE.Vector3(this.player.pos.x, this.player.pos.y + 1.2, this.player.pos.z);
    const dir = target.clone().sub(muzzle).normalize();
    const positions = this.combat.tracer.geometry.attributes.position;
    positions.setXYZ(0, muzzle.x, muzzle.y, muzzle.z);
    positions.setXYZ(1, target.x, target.y, target.z);
    positions.needsUpdate = true;
    this.combat.tracer.visible = true;
    this.combat.tracerLife = 0.07;
    const hitChance = 0.34 * (1 - dist / 45);
    if (Math.random() < hitChance) {
      const damage = 6 + Math.random() * 6;
      const dead = this.player.takeDamage(damage);
      this.flashRed = 0.5;
      this.audio.hurt();
      this.particles.burst(this.player.pos.x, this.player.pos.y + 1.2, this.player.pos.z, 0xff4444);
      if (dead) this.gameOver();
    }
  }

  gameOver() {
    this.mode = 'over';
    this.audio.busted();
    this.hud.showGameOver();
    this.hud.feed('Rook went down. The harbor keeps moving without you.');
  }

  busted() {
    this.mode = 'busted';
    this.audio.busted();
    this.clearPolice();
    this.hud.showBusted();
    this.hud.feed('Busted. The patrol impounded the car and took ' + formatMoney(100) + '.');
  }

  // ---- Per-frame update -------------------------------------------------

  update(dt) {
    this.time += dt;
    const input = this.input;

    // Camera orbit from the mouse.
    const mouse = input.consumeMouse();
    if (mouse.dx !== 0 || mouse.dy !== 0) {
      this.render.orbit(mouse.dx, mouse.dy, !this.player.onFoot, this.player.car ? this.player.car.heading : this.player.heading);
    }
    if (input.down('ArrowLeft')) this.render.camYaw += dt * 2.2;
    if (input.down('ArrowRight')) this.render.camYaw -= dt * 2.2;

    const auto = this.autopilot;
    const forward = auto ? auto.throttle : input.axis('KeyS', 'KeyW');
    const strafe = auto ? 0 : input.axis('KeyA', 'KeyD');
    const run = input.down('ShiftLeft') || input.down('ShiftRight');

    if (this.player.onFoot) {
      this.player.walk({ forward, strafe, run }, this.render.camYaw, dt, this.city);
    } else if (this.player.car) {
      const steer = auto ? auto.steer : input.axis('KeyA', 'KeyD');
      const brake = input.down('Space') ? -1 : 0;
      this.player.car.drive(brake !== 0 ? brake : forward, steer, dt);
      this.player.pos.set(this.player.car.pos.x, 0, this.player.car.pos.z);
      this.city.collideCircle(this.player.car.pos, 2.1);
    }

    // Traffic.
    for (const car of this.traffic) {
      if (car.parked) continue;
      car.updateTraffic(dt, this.city, this.rng);
    }

    // Player car vs traffic: bump and slow.
    if (this.player.car) {
      for (const car of this.traffic) {
        const dx = car.pos.x - this.player.car.pos.x;
        const dz = car.pos.z - this.player.car.pos.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.01 && d < 3.4) {
          const push = (3.4 - d) / 2;
          const nx = dx / d;
          const nz = dz / d;
          car.pos.x += nx * push;
          car.pos.z += nz * push;
          this.player.car.pos.x -= nx * push * 0.6;
          this.player.car.pos.z -= nz * push * 0.6;
          if (Math.abs(this.player.car.speed) > 12) {
            this.player.car.speed *= 0.55;
            this.audio.crash();
            this.cameraShake = 0.5;
            this.particles.burst(this.player.car.pos.x, 1, this.player.car.pos.z, 0xffcc66);
          }
        }
      }
    }

    // Pedestrians: flee the player's fast car, get hit by it.
    const danger = this.player.car && Math.abs(this.player.car.speed) > 3
      ? { x: this.player.car.pos.x, z: this.player.car.pos.z }
      : null;
    for (const ped of this.peds) {
      const nearCar = danger && Math.hypot(ped.pos.x - danger.x, ped.pos.z - danger.z) < 14;
      ped.update(dt, nearCar ? danger : null);
      if (danger && ped.alive) {
        const d = Math.hypot(ped.pos.x - danger.x, ped.pos.z - danger.z);
        if (d < 2.2 && Math.abs(this.player.car.speed) > 5) {
          ped.remove();
          this.particles.burst(ped.pos.x, 1, ped.pos.z, 0xff6666);
          this.addHeat(WANTED.hitPedestrian);
          this.hud.feed('Pedestrian hit! The patrol is on its way.');
          this.audio.crash();
          setTimeout(() => {
            const fresh = new Pedestrian(this.render.scene, this.rng, this.city);
            this.peds.push(fresh);
          }, 4000);
        }
      }
    }
    this.peds = this.peds.filter((p) => p.alive);

    // Cash pickups.
    for (const pickup of this.pickups) {
      if (pickup.taken) {
        pickup.respawn -= dt;
        if (pickup.respawn <= 0) {
          pickup.taken = false;
          pickup.mesh.visible = true;
        }
        continue;
      }
      pickup.spin += dt * 2;
      pickup.mesh.rotation.y = pickup.spin;
      pickup.mesh.position.y = 0.6 + Math.sin(this.time * 2 + pickup.spin) * 0.15;
      const d = Math.hypot(pickup.mesh.position.x - this.player.pos.x, pickup.mesh.position.z - this.player.pos.z);
      if (d < 2.2) {
        pickup.taken = true;
        pickup.respawn = 25;
        pickup.mesh.visible = false;
        this.money += 25;
        this.audio.pickup();
        this.hud.feed('Found street cash: +' + formatMoney(25) + '.');
        this.particles.burst(pickup.mesh.position.x, 1, pickup.mesh.position.z, 0x22c55e);
      }
    }

    // Wanted level: heat decays, stars follow, police match the stars.
    if (this.time - this.lastCrimeAt > WANTED.crimeMemory) {
      this.heat = Math.max(0, this.heat - WANTED.decayPerSecond * dt);
    }
    const stars = starsFromHeat(this.heat);
    if (stars !== this.wantedStars) {
      this.wantedStars = stars;
      if (stars > 0) this.hud.feed('Wanted level ' + stars + ' — Harbor Patrol is responding.');
      else if (this.mode === 'playing') this.hud.feed('You lost them. The heat is off.');
    }
    while (this.police.length < this.wantedStars) {
      const p = policeSpawnPoint(this.player.pos.x, this.player.pos.z, this.rng);
      this.police.push(new PoliceCar(this.render.scene, p.x, p.z, p.heading));
    }
    if (this.wantedStars === 0 && this.police.length > 0) {
      for (const cop of this.police) {
        const d = Math.hypot(cop.pos.x - this.player.pos.x, cop.pos.z - this.player.pos.z);
        if (d > 90) cop.remove();
      }
      this.police = this.police.filter((c) => c.alive);
      if (this.police.length === 0) this.audio.setSiren(false);
    }

    // Police pursuit and bust.
    let busted = false;
    for (const cop of this.police) {
      const dist = cop.pursue(this.player.pos.x, this.player.pos.z, dt, this.city);
      const playerSpeed = this.player.car ? Math.abs(this.player.car.speed) : this.player.speed;
      if (cop.checkBust(dist, playerSpeed, dt)) busted = true;
      // Ram: shove the player's car and shake the camera.
      if (this.player.car && dist < 3.6 && cop.ramCooldown <= 0) {
        cop.ramCooldown = 0.8;
        this.player.car.speed *= 0.82;
        this.cameraShake = 0.6;
        this.audio.crash();
        this.particles.burst(this.player.car.pos.x, 1, this.player.car.pos.z, 0xffcc66);
        if (Math.abs(this.player.car.speed) < 4) this.addHeat(4);
      }
    }
    if (busted) {
      this.busted();
      return;
    }
    this.audio.setSiren(this.police.length > 0);

    // Thugs.
    for (const thug of this.thugs) {
      thug.update(dt, this.player.pos, this.city, (t, d) => this.thugShoot(t, d));
    }
    this.thugs = this.thugs.filter((t) => t.alive);

    // Shooting while the mouse is held.
    if (input.mouseDown && this.player.onFoot && this.mode === 'playing') this.shoot();

    // Missions.
    const event = this.missions.update(dt, this);
    if (event === 'step') {
      this.audio.pickup();
      this.hud.feed('Objective updated: ' + this.missions.objectiveText);
    } else if (event === 'mission-done') {
      const mission = this.missions.current;
      this.money += mission.reward;
      this.lastMissionResult = 'done';
      this.audio.missionComplete();
      this.hud.feed(mission.title + ' complete! +' + formatMoney(mission.reward) + '.');
      this.mode = 'mission';
      this.hud.showMissionComplete(mission);
      this.saveProgress();
    } else if (event === 'timeout') {
      this.lastMissionResult = 'failed';
      this.hud.feed('Too slow — the job fell through. Try it again.');
      this.mode = 'mission';
      this.missions.failed = false;
      this.hud.showMissionComplete({ title: this.missions.current.title + ' failed', reward: 0 });
    }

    // Engine hum follows the car.
    const driving = !this.player.onFoot && !!this.player.car;
    this.audio.setEngine(driving ? Math.abs(this.player.car.speed) / 34 : 0, driving);

    // Autosave.
    this.autosaveTimer -= dt;
    if (this.autosaveTimer <= 0) {
      this.autosaveTimer = AUTOSAVE_SECONDS;
      this.saveProgress();
    }

    this.combat.update(dt);
    this.particles.update(dt);
    this.flashRed = Math.max(0, this.flashRed - dt);
    this.cameraShake = Math.max(0, this.cameraShake - dt * 1.4);

    // Camera.
    const target = this.player.onFoot ? this.player.pos : this.player.car.pos;
    const speed = this.player.onFoot ? this.player.speed : Math.abs(this.player.car.speed);
    this.render.follow(target, speed, dt);
    if (this.cameraShake > 0) {
      this.render.camera.position.x += (Math.random() - 0.5) * this.cameraShake * 0.5;
      this.render.camera.position.y += (Math.random() - 0.5) * this.cameraShake * 0.4;
    }
    const red = document.getElementById('damage-flash');
    if (red) red.style.opacity = String(this.flashRed);
  }

  // ---- Frame loop -------------------------------------------------------

  frame(now) {
    requestAnimationFrame((t) => this.frame(t));
    const dt = Math.min(0.05, (now - (this.lastNow || now)) / 1000 || 0.016);
    this.lastNow = now;
    if (this.mode === 'playing') this.update(dt);
    else if (this.mode === 'title') {
      // Slow orbit over the city behind the title screen.
      this.time += dt;
      const a = this.time * 0.05;
      this.render.camera.position.set(Math.sin(a) * 150, 70, Math.cos(a) * 150);
      this.render.camera.lookAt(0, 0, 0);
    }
    this.minimap.draw(this);
    this.hud.update(this.hudState());
    this.render.render();
    this.input.endFrame();
  }

  start() {
    if (this.shotName) {
      import('./shots.js').then((mod) => {
        mod.stageShot(this.shotName, this);
        this.mode = 'shot';
        window.NEON_HARBOR_READY = true;
        requestAnimationFrame((t) => this.frame(t));
      });
      return;
    }
    requestAnimationFrame((t) => this.frame(t));
  }
}

const game = new Game();
window.NEON_HARBOR = game;
game.start();
