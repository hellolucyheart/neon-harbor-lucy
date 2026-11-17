// entry.js — boot and main loop for Neon Harbor.
// Builds the renderer, the city and every system, wires the menu buttons,
// runs the frame loop, and applies the ?shot= staging pose when one is
// requested. The whole game is static files: no network request, ever.

import * as THREE from 'three';
import { createGame, WORLD } from './state.js';
import { makeRng } from './seedling.js';
import { buildHarborCity } from './city.js';
import { spawnPlayer, stepWalker, handleEnterExit } from './walker.js';
import { stepDriver } from './driver.js';
import { spawnTraffic, spawnParked, stepTraffic } from './traffic.js';
import { spawnPedestrians, stepPedestrians } from './pedestrian.js';
import { spawnPatrol, stepPatrol } from './patrol.js';
import { stepWanted } from './wanted.js';
import { startMission, stepQuests } from './quests.js';
import { punch, shoot, stepFight } from './fight.js';
import { createSparks } from './spark.js';
import { stepCamera } from './chasecam.js';
import { buildHud, updateHud, showDialog } from './display.js';
import { drawRadar } from './radar.js';
import { initAudio, stepAudio } from './tunes.js';
import { saveGame, loadGame, hasSave, wipeSave } from './vault.js';
import { parseShot, applyShot } from './staging.js';
import { bindControls, clearEdges, pressed } from './controls.js';

const G = createGame();
window.__neonHarbor = G;

function resetRun(G) {
  G.cash = 250;
  G.hp = G.maxHp;
  G.wanted = 0;
  G.heat = 0;
  G.calmTimer = 0;
  G.driving = false;
  if (G.playerCar) {
    G.playerCar.driver = 'none';
    G.playerCar.speed = 0;
  }
  G.playerCar = null;
  G.player.x = G.spots.start.x;
  G.player.z = G.spots.start.z;
  G.player.heading = Math.PI;
  G.player.mesh.visible = true;
  G.player.mesh.position.set(G.player.x, 0.25, G.player.z);
  G.camYaw = Math.PI;
  G.camOverride = null;
  // clear rivals and their meshes
  for (const r of G.rivals) G.scene.remove(r.mesh);
  G.rivals.length = 0;
  if (G.mission.packageMesh) {
    G.scene.remove(G.mission.packageMesh);
    G.mission.packageMesh = null;
  }
  G.mission.allDone = false;
  startMission(G, 0);
}

function applySave(G, data) {
  G.cash = data.cash;
  G.hp = data.hp;
  G.minutes = data.minutes || G.minutes;
  G.player.x = data.x;
  G.player.z = data.z;
  G.player.mesh.position.set(G.player.x, 0.25, G.player.z);
  G.mission.allDone = !!data.allDone;
  if (data.allDone) {
    G.mission.title = 'Free roam — Neon Harbor is yours';
    G.mission.text = 'All jobs done. Explore, steal cars, outrun the law.';
    G.mission.beacon.visible = false;
  } else {
    startMission(G, Math.min(data.mission, 3));
  }
}

function init() {
  const canvas = document.getElementById('game');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(0, 26, 60);
  G.renderer = renderer;
  G.scene = scene;
  G.camera = camera;
  G.shot = parseShot();
  // city layout always uses the fixed seed, so every shot shares one city;
  // entity placement then uses the shot seed (or a time seed in normal play)
  G.rng = makeRng(WORLD.layoutSeed);
  buildHarborCity(G);
  G.rng = makeRng(G.shot ? G.shot.seed : (Date.now() % 2147483647));
  spawnPlayer(G);
  spawnTraffic(G, 14);
  spawnParked(G, 10);
  spawnPedestrians(G, 22);
  spawnPatrol(G, 2);
  G.sparks = createSparks(G);
  startMission(G, 0);
  bindControls(G);
  buildHud(G, {
    hasSave: G.shot ? false : hasSave(),
    onNew: () => {
      wipeSave();
      sessionStorage.setItem('nh-autostart', 'new');
      window.location.reload();
    },
    onContinue: () => {
      const data = loadGame();
      if (data) applySave(G, data);
      G.mode = 'play';
      showDialog(G, 'Welcome back, Lena. Riko is waiting.', 4);
    },
    onSave: () => {
      if (saveGame(G)) showDialog(G, 'Progress saved. The harbor remembers.', 3);
    },
    onResume: () => {
      G.mode = 'play';
    },
    onRestart: () => {
      wipeSave();
      sessionStorage.setItem('nh-autostart', 'new');
      window.location.reload();
    },
  });
  // first gesture unlocks audio
  const unlock = () => {
    initAudio(G);
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  // autostart after a menu-button reload
  if (sessionStorage.getItem('nh-autostart') === 'new') {
    sessionStorage.removeItem('nh-autostart');
    resetRun(G);
    G.mode = 'play';
    showDialog(G, 'New game. Riko is waiting at the pier — walk south.', 5);
  }
  if (G.shot) applyShot(G);
  // menu backdrop camera drifts slowly around the plaza
  let menuAngle = 0.6;
  const clock = new THREE.Clock();
  let shotTimer = 0;
  let firstFrame = true;
  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    G.elapsed += dt;
    G.minutes += dt * 0.5;
    if (G.minutes >= 1440) G.minutes -= 1440;
    // pause toggle
    if (pressed(G, 'Escape')) {
      if (G.mode === 'play') G.mode = 'paused';
      else if (G.mode === 'paused') G.mode = 'play';
    }
    if (G.mode === 'play') {
      if (G.driving) stepDriver(G, dt);
      else stepWalker(G, dt);
      handleEnterExit(G);
      if (pressed(G, 'KeyF') || pressed(G, 'Mouse0') || G.mouse.down) punch(G);
      if (pressed(G, 'Mouse2') || G.mouse.right) shoot(G);
      stepTraffic(G, dt);
      stepPedestrians(G, dt);
      stepPatrol(G, dt);
      stepWanted(G, dt);
      stepQuests(G, dt);
      stepFight(G, dt);
      if (G.waterMesh) G.waterMesh.position.y = 0.12 + Math.sin(G.elapsed * 0.8) * 0.05;
      stepAudio(G);
    } else if (G.mode === 'menu') {
      // living backdrop behind the start screen
      stepTraffic(G, dt);
      stepPedestrians(G, dt);
      if (!G.camOverride) {
        menuAngle += dt * 0.03;
        G.camera.position.set(Math.sin(menuAngle) * 90, 42, Math.cos(menuAngle) * 90);
        G.camera.lookAt(0, 8, 0);
      }
    } else if (G.mode === 'busted' || G.mode === 'wasted') {
      stepTraffic(G, dt);
      stepPedestrians(G, dt);
    }
    if (G.mode !== 'menu' || G.camOverride) stepCamera(G, dt);
    G.sparks.step(dt);
    updateHud(G, dt);
    drawRadar(G);
    renderer.render(scene, camera);
    if (firstFrame) {
      firstFrame = false;
      window.__neonReady = true;
      document.title = 'Neon Harbor — ready';
    }
    if (G.shot && !window.__shotReady) {
      shotTimer += dt;
      if (shotTimer > 1.0) {
        window.__shotReady = true;
        document.title = 'Neon Harbor — shot ready';
      }
    }
    clearEdges(G);
  }
  frame();
}

init();
