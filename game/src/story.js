// The three story missions: steal a ride, settle the warehouse debt, lose the heat.
import * as THREE from 'three';
import { dist2d } from './rng.js';
import { CITY } from './harbor.js';

export const MISSIONS = [
  {
    id: 0,
    name: 'Borrow a Ride',
    brief: 'Steal any car, then drive to the marina pier.',
    reward: 300,
    beacon: { x: CITY / 2 + 78, z: 40 },
    radius: 10,
  },
  {
    id: 1,
    name: 'Warehouse Debt',
    brief: 'Reach the old cannery warehouse and drop all 3 Marlin thugs.',
    reward: 500,
    beacon: { x: -CITY / 2 + 46, z: -CITY / 2 + 46 },
    radius: 12,
  },
  {
    id: 2,
    name: 'Lose the Heat',
    brief: 'The heat is on — reach the hideout garage on the west edge and lay low.',
    reward: 800,
    beacon: { x: -CITY / 2 - 30, z: 60 },
    radius: 10,
  },
];

export class Story {
  constructor(scene) {
    this.scene = scene;
    this.index = 0;
    this.stage = 'go'; // go | done
    this.beacon = null;
    this.beaconLight = null;
    this.setMission(0);
  }

  current() {
    return MISSIONS[Math.min(this.index, MISSIONS.length - 1)];
  }

  finished() {
    return this.index >= MISSIONS.length;
  }

  setMission(i) {
    this.index = i;
    this.stage = 'go';
    this.clearBeacon();
    if (this.finished()) return;
    const m = this.current();
    const geo = new THREE.CylinderGeometry(1.6, 1.6, 60, 16, 1, true);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false });
    this.beacon = new THREE.Mesh(geo, mat);
    this.beacon.position.set(m.beacon.x, 30, m.beacon.z);
    this.scene.add(this.beacon);
    const marker = new THREE.Mesh(
      new THREE.ConeGeometry(2.2, 4, 4),
      new THREE.MeshBasicMaterial({ color: 0xffd166 })
    );
    marker.rotation.x = Math.PI;
    marker.position.set(m.beacon.x, 14, m.beacon.z);
    this.scene.add(marker);
    this.beaconMarker = marker;
    this.beaconLight = new THREE.PointLight(0xffd166, 40, 40);
    this.beaconLight.position.set(m.beacon.x, 6, m.beacon.z);
    this.scene.add(this.beaconLight);
  }

  clearBeacon() {
    for (const o of [this.beacon, this.beaconMarker, this.beaconLight]) {
      if (o) this.scene.remove(o);
    }
    this.beacon = null;
    this.beaconMarker = null;
    this.beaconLight = null;
  }

  // Returns 'complete' when the mission's goal is met this frame, else null.
  update(dt, playerPos, inCar, thugsAlive) {
    if (this.finished() || this.stage !== 'go') return null;
    const m = this.current();
    if (this.beaconMarker) {
      this.beaconMarker.rotation.y += dt * 2;
      this.beaconMarker.position.y = 14 + Math.sin(performance.now() * 0.003) * 1.2;
    }
    const d = dist2d(playerPos.x, playerPos.z, m.beacon.x, m.beacon.z);
    if (m.id === 0) {
      if (inCar && d < m.radius) return 'complete';
    } else if (m.id === 1) {
      if (d < m.radius && thugsAlive === 0) return 'complete';
    } else if (m.id === 2) {
      if (d < m.radius) return 'complete';
    }
    return null;
  }

  advance() {
    this.index++;
    this.setMission(this.index);
  }
}
