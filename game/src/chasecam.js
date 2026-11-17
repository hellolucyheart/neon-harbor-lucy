// chasecam.js — the follow camera for Neon Harbor.
// Third-person behind the player on foot, a longer chase cam in a car,
// mouse drag orbits with a slow drift back, and fixed poses for the
// screenshot staging. Camera shake decays on its own.

import * as THREE from 'three';

const _look = new THREE.Vector3();
const _eye = new THREE.Vector3();

export function stepCamera(G, dt) {
  const cam = G.camera;
  // mouse-drag orbit offset, easing back toward zero
  G.camOffset += G.mouse.dx * 0.0035;
  G.mouse.dx = 0;
  G.camOffset *= Math.max(0, 1 - dt * 0.7);
  // desired yaw: player heading + orbit offset
  const targetYaw = G.player.heading + G.camOffset + Math.PI;
  let diff = targetYaw - G.camYaw;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const rate = G.driving ? 2.6 : 3.4;
  G.camYaw += diff * Math.min(1, rate * dt);
  // keep the camera yaw in step with the player while driving fast
  if (G.driving && G.playerCar && Math.abs(G.playerCar.speed) > 14) {
    G.camYaw = targetYaw;
  }
  const dist = G.driving ? 11.5 : 8;
  const height = G.driving ? 4.4 : 3.4;
  const px = G.player.x;
  const pz = G.player.z;
  const cx = px + Math.sin(G.camYaw) * dist;
  const cz = pz + Math.cos(G.camYaw) * dist;
  const ahead = G.driving ? 6 : 3.5;
  _look.set(px - Math.sin(G.camYaw) * ahead * 0.4, 1.6, pz - Math.cos(G.camYaw) * ahead * 0.4);
  _eye.set(cx, height, cz);
  // shake
  if (G.shake > 0.001) {
    _eye.x += (Math.random() - 0.5) * G.shake;
    _eye.y += (Math.random() - 0.5) * G.shake;
    _eye.z += (Math.random() - 0.5) * G.shake;
    G.shake = Math.max(0, G.shake - dt * 1.6);
  }
  // fixed staging pose wins over the follow cam
  if (G.camOverride) {
    cam.position.set(G.camOverride.eye.x, G.camOverride.eye.y, G.camOverride.eye.z);
    cam.lookAt(G.camOverride.at.x, G.camOverride.at.y, G.camOverride.at.z);
    return;
  }
  cam.position.lerp(_eye, Math.min(1, dt * 7));
  cam.lookAt(_look);
}
