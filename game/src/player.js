// Neon Harbor — the player on foot: a low-poly walker with a walk cycle,
// camera-relative movement, and getting in and out of cars.

import * as THREE from 'three';
import { PLAYER } from './config.js';

export function makePlayerMesh() {
  const group = new THREE.Group();
  const jacket = new THREE.MeshLambertMaterial({ color: 0xff2e88 });
  const pants = new THREE.MeshLambertMaterial({ color: 0x1c2733 });
  const skin = new THREE.MeshLambertMaterial({ color: 0xe0ac69 });

  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.75, 0.24), pants);
  legL.position.set(-0.14, 0.38, 0);
  group.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.14;
  group.add(legR);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.72, 0.38), jacket);
  torso.position.y = 1.12;
  torso.castShadow = true;
  group.add(torso);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.62, 0.2), jacket);
  armL.position.set(-0.44, 1.1, 0);
  group.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.44;
  group.add(armR);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 10), skin);
  head.position.y = 1.78;
  head.castShadow = true;
  group.add(head);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.1, 12), new THREE.MeshLambertMaterial({ color: 0x111318 }));
  cap.position.y = 1.98;
  group.add(cap);
  group.userData.legL = legL;
  group.userData.legR = legR;
  group.userData.armL = armL;
  group.userData.armR = armR;
  return group;
}

export class Player {
  constructor(scene, x, z) {
    this.scene = scene;
    this.mesh = makePlayerMesh();
    scene.add(this.mesh);
    this.pos = this.mesh.position;
    this.pos.set(x, 0, z);
    this.heading = 0;
    this.speed = 0;
    this.onFoot = true;
    this.car = null;
    this.walkPhase = 0;
    this.health = PLAYER.health;
  }

  /** Move on foot, camera-relative. input: {forward, strafe} in -1..1. */
  walk(input, cameraYaw, dt, city) {
    const sin = Math.sin(cameraYaw);
    const cos = Math.cos(cameraYaw);
    let mx = sin * input.forward + cos * input.strafe;
    let mz = cos * input.forward - sin * input.strafe;
    const len = Math.hypot(mx, mz);
    const running = input.run;
    if (len > 0.01) {
      mx /= len;
      mz /= len;
      const speed = running ? PLAYER.runSpeed : PLAYER.walkSpeed;
      this.speed = speed;
      this.pos.x += mx * speed * dt;
      this.pos.z += mz * speed * dt;
      const targetHeading = Math.atan2(mx, mz);
      let diff = targetHeading - this.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.heading += diff * Math.min(1, dt * 12);
      this.walkPhase += dt * speed * 1.6;
    } else {
      this.speed = 0;
      this.walkPhase *= 0.9;
    }
    city.collideCircle(this.pos, PLAYER.radius);
    this.pos.x = Math.max(-235, Math.min(235, this.pos.x));
    this.pos.z = Math.max(-235, Math.min(235, this.pos.z));
    this.mesh.rotation.y = this.heading;
    const swing = Math.sin(this.walkPhase) * 0.55 * Math.min(1, this.speed / PLAYER.walkSpeed);
    this.mesh.userData.legL.rotation.x = swing;
    this.mesh.userData.legR.rotation.x = -swing;
    this.mesh.userData.armL.rotation.x = -swing * 0.8;
    this.mesh.userData.armR.rotation.x = swing * 0.8;
    this.mesh.position.y = Math.abs(Math.sin(this.walkPhase)) * 0.05 * Math.min(1, this.speed / PLAYER.walkSpeed);
  }

  enterCar(car) {
    this.car = car;
    this.onFoot = false;
    this.mesh.visible = false;
    this.pos.set(car.pos.x, 0, car.pos.z);
  }

  exitCar() {
    if (!this.car) return;
    const f = this.car.forward();
    const side = { x: -f.z, z: f.x };
    this.pos.set(this.car.pos.x + side.x * 2.2, 0, this.car.pos.z + side.z * 2.2);
    this.heading = this.car.heading;
    this.mesh.visible = true;
    this.onFoot = true;
    this.car = null;
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    return this.health <= 0;
  }

  heal(amount) {
    this.health = Math.min(PLAYER.health, this.health + amount);
  }

  reset(x, z) {
    if (this.car) this.exitCar();
    this.pos.set(x, 0, z);
    this.heading = 0;
    this.health = PLAYER.health;
    this.mesh.visible = true;
    this.onFoot = true;
  }
}
