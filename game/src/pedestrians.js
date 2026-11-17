// Neon Harbor — pedestrians: simple walkers who stroll the sidewalks, cross
// streets on the crosswalks and scatter when a car comes at them.

import * as THREE from 'three';
import { CITY } from './config.js';

const SHIRTS = [0xe74c3c, 0x3498db, 0xf1c40f, 0x9b59b6, 0x1abc9c, 0xe67e22, 0xecf0f1, 0x2ecc71];
const PANTS = [0x2c3e50, 0x34495e, 0x5d4037, 0x1a1a1a];

export function makePedMesh(shirt, pants) {
  const group = new THREE.Group();
  const shirtMat = new THREE.MeshLambertMaterial({ color: shirt });
  const pantsMat = new THREE.MeshLambertMaterial({ color: pants });
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xe0ac69 });

  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.32), pantsMat);
  legs.position.y = 0.35;
  group.add(legs);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.7, 0.36), shirtMat);
  torso.position.y = 1.05;
  torso.castShadow = true;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), skinMat);
  head.position.y = 1.66;
  head.castShadow = true;
  group.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x2b1d12 }));
  hair.position.y = 1.7;
  group.add(hair);
  group.userData.torso = torso;
  group.userData.head = head;
  return group;
}

export class Pedestrian {
  constructor(scene, rng, city) {
    this.scene = scene;
    this.rng = rng;
    this.city = city;
    this.mesh = makePedMesh(rng.pick(SHIRTS), rng.pick(PANTS));
    scene.add(this.mesh);
    this.pos = this.mesh.position;
    this.heading = rng.range(0, Math.PI * 2);
    this.speed = rng.range(1.1, 2.2);
    this.walkPhase = rng.range(0, Math.PI * 2);
    this.state = 'walk';
    this.stateTimer = rng.range(2, 8);
    this.alive = true;
    this.fleeing = false;
    this.respawn();
  }

  respawn() {
    const p = this.city.randomRoadPoint();
    // Stand on the sidewalk edge next to the street.
    const side = this.rng.next() < 0.5 ? 1 : -1;
    const horizontal = Math.abs(p.z - this.city.streetCoord(p.z)) < 0.1;
    if (horizontal) {
      this.pos.set(p.x, 0, p.z + side * (CITY.roadWidth / 2 + 2.5));
      this.heading = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      this.pos.set(p.x + side * (CITY.roadWidth / 2 + 2.5), 0, p.z);
      this.heading = side > 0 ? 0 : Math.PI;
    }
    this.state = 'walk';
    this.stateTimer = this.rng.range(3, 9);
  }

  update(dt, danger) {
    if (!this.alive) return;
    this.walkPhase += dt * this.speed * 4;
    this.stateTimer -= dt;
    if (danger) {
      this.fleeing = true;
      this.state = 'flee';
      this.stateTimer = 1.2;
    }
    if (this.state === 'flee') {
      if (!danger) {
        // The threat is gone: stop running.
        this.fleeing = false;
        this.state = 'walk';
        this.stateTimer = this.rng.range(2, 6);
      } else {
        // Run away from the danger point.
        const dx = this.pos.x - danger.x;
        const dz = this.pos.z - danger.z;
        const d = Math.hypot(dx, dz) || 1;
        this.heading = Math.atan2(dx / d, dz / d);
        const speed = 5.2;
        this.pos.x += Math.sin(this.heading) * speed * dt;
        this.pos.z += Math.cos(this.heading) * speed * dt;
        if (this.stateTimer <= 0) {
          this.fleeing = false;
          this.state = 'walk';
          this.stateTimer = this.rng.range(2, 6);
        }
      }
    } else if (this.state === 'walk') {
      if (this.stateTimer <= 0) {
        if (this.rng.next() < 0.4) {
          this.state = 'idle';
          this.stateTimer = this.rng.range(1, 4);
        } else {
          this.heading += this.rng.range(-1.2, 1.2);
          this.stateTimer = this.rng.range(3, 9);
        }
      }
      this.pos.x += Math.sin(this.heading) * this.speed * dt;
      this.pos.z += Math.cos(this.heading) * this.speed * dt;
      // Keep inside the city and out of buildings.
      if (Math.abs(this.pos.x) > CITY.half - 4 || Math.abs(this.pos.z) > CITY.half - 4) {
        this.heading += Math.PI;
        this.pos.x = Math.max(-CITY.half + 4, Math.min(CITY.half - 4, this.pos.x));
        this.pos.z = Math.max(-CITY.half + 4, Math.min(CITY.half - 4, this.pos.z));
      }
      this.city.collideCircle(this.pos, 0.6);
    }
    this.mesh.rotation.y = this.heading;
    const bob = this.state === 'walk' ? Math.abs(Math.sin(this.walkPhase)) * 0.06 : 0;
    this.mesh.position.y = bob;
    this.mesh.userData.torso.rotation.x = this.state === 'walk' ? Math.sin(this.walkPhase) * 0.08 : 0;
  }

  remove() {
    this.alive = false;
    this.scene.remove(this.mesh);
  }
}
