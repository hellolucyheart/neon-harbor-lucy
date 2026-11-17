// Neon Harbor — missions and the short story: three jobs for Rook, each a
// list of steps (steal, go to, survive the heat) with a glowing beacon in
// the world, a timer where the job is timed, and a cash reward.

import * as THREE from 'three';
import { MISSIONS } from './config.js';

export function makeBeacon(color) {
  const group = new THREE.Group();
  const column = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 2.6, 30, 16, 1, true),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  column.position.y = 15;
  group.add(column);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.2, 3.0, 28),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.15;
  group.add(ring);
  const diamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.9),
    new THREE.MeshBasicMaterial({ color }),
  );
  diamond.position.y = 7;
  group.add(diamond);
  group.userData.diamond = diamond;
  group.userData.ring = ring;
  return group;
}

export class MissionManager {
  constructor(scene) {
    this.scene = scene;
    this.missionIndex = 0;
    this.stepIndex = 0;
    this.active = false;
    this.timeLeft = 0;
    this.beacon = null;
    this.beaconColor = 0xfacc15;
    this.completed = false;
    this.failed = false;
    this.hasPackage = false;
  }

  get current() {
    return MISSIONS[this.missionIndex] || null;
  }

  get currentStep() {
    const mission = this.current;
    if (!mission) return null;
    return mission.steps[this.stepIndex] || null;
  }

  get objectiveText() {
    if (!this.current) return 'Free roam — Neon Harbor is yours.';
    if (this.completed) return 'Story complete — free roam.';
    const step = this.currentStep;
    if (!step) return this.current.objective;
    return `${this.current.title}: ${step.text}`;
  }

  startMission(index) {
    this.missionIndex = index;
    this.stepIndex = 0;
    this.active = true;
    this.completed = false;
    this.failed = false;
    this.hasPackage = false;
    const mission = this.current;
    this.timeLeft = mission.timeLimit || 0;
    this.placeBeacon();
    return mission;
  }

  placeBeacon() {
    this.clearBeacon();
    const step = this.currentStep;
    if (!step || step.kind !== 'goto' || !step.pos) return;
    this.beacon = makeBeacon(this.beaconColor);
    this.beacon.position.set(step.pos[0], 0, step.pos[1]);
    this.scene.add(this.beacon);
  }

  clearBeacon() {
    if (this.beacon) {
      this.scene.remove(this.beacon);
      this.beacon = null;
    }
  }

  advanceStep() {
    this.stepIndex += 1;
    const mission = this.current;
    if (this.stepIndex >= mission.steps.length) {
      this.finishMission();
      return 'done';
    }
    this.placeBeacon();
    return 'step';
  }

  finishMission() {
    this.active = false;
    this.clearBeacon();
    this.completed = true;
  }

  failMission() {
    this.active = false;
    this.clearBeacon();
    this.failed = true;
  }

  resetToMission(index) {
    this.startMission(index);
  }

  /** Called every frame by the game; returns an event string or null. */
  update(dt, game) {
    if (!this.active || !this.current) return null;
    const step = this.currentStep;
    if (!step) return null;
    if (this.timeLeft > 0) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.failMission();
        return 'timeout';
      }
    }
    if (this.beacon) {
      this.beacon.userData.diamond.rotation.y += dt * 2.4;
      this.beacon.userData.diamond.position.y = 7 + Math.sin(game.time * 2.2) * 0.6;
      const pulse = 0.7 + Math.sin(game.time * 3) * 0.25;
      this.beacon.userData.ring.scale.setScalar(pulse);
    }
    const playerPos = game.player.pos;
    if (step.kind === 'steal') {
      if (!game.player.onFoot) {
        this.advanceStep();
        return 'step';
      }
    } else if (step.kind === 'goto') {
      const dx = playerPos.x - step.pos[0];
      const dz = playerPos.z - step.pos[1];
      if (Math.hypot(dx, dz) < 7) {
        if (this.missionIndex === 1 && this.stepIndex === 0) this.hasPackage = true;
        const result = this.advanceStep();
        if (result === 'done') return 'mission-done';
        return 'step';
      }
    } else if (step.kind === 'wanted') {
      if (game.wantedStars <= 0) {
        const result = this.advanceStep();
        if (result === 'done') return 'mission-done';
        return 'step';
      }
    }
    return null;
  }
}
