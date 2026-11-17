// Rico Vane on foot: third-person movement, camera orbit, entering cars.
import * as THREE from 'three';
import { clamp, angleLerp } from './rng.js';

export function buildHeroMesh() {
  const g = new THREE.Group();
  const jacket = new THREE.MeshStandardMaterial({ color: 0xff2e88, roughness: 0.7 });
  const jeans = new THREE.MeshStandardMaterial({ color: 0x2b3a67, roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xe8b98a, roughness: 0.7 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.78, 1.0, 0.45), jacket);
  torso.position.y = 1.2;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.33, 12, 12), skin);
  head.position.y = 2.0;
  g.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 12, 0, Math.PI * 2, 0, 1.2), new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
  hair.position.y = 2.06;
  g.add(hair);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.85, 0.32), jeans);
  legL.position.set(-0.2, 0.42, 0);
  g.add(legL);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.85, 0.32), jeans);
  legR.position.set(0.2, 0.42, 0);
  g.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.8, 0.26), jacket);
  armL.position.set(-0.52, 1.2, 0);
  g.add(armL);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.8, 0.26), jacket);
  armR.position.set(0.52, 1.2, 0);
  g.add(armR);
  g.userData = { legL, legR, armL, armR };
  return g;
}

export class Hero {
  constructor(scene, harbor) {
    this.scene = scene;
    this.harbor = harbor;
    this.mesh = buildHeroMesh();
    this.mesh.position.set(0, 0, 24);
    this.scene.add(this.mesh);
    this.heading = 0;
    this.camYaw = 0;
    this.camPitch = 0.32;
    this.walkPhase = 0;
    this.health = 100;
  }

  get pos() {
    return this.mesh.position;
  }

  update(dt, keys) {
    const drag = keys.consumeDrag();
    this.camYaw += drag.yaw;
    this.camPitch = clamp(this.camPitch + drag.pitch, -0.15, 1.1);
    const fwd = keys.held('KeyW') || keys.held('ArrowUp');
    const back = keys.held('KeyS') || keys.held('ArrowDown');
    const left = keys.held('KeyA') || keys.held('ArrowLeft');
    const right = keys.held('KeyD') || keys.held('ArrowRight');
    const run = keys.held('ShiftLeft') || keys.held('ShiftRight');
    let mx = (right ? 1 : 0) - (left ? 1 : 0);
    let mz = (fwd ? 1 : 0) - (back ? 1 : 0);
    const len = Math.hypot(mx, mz);
    const speed = run ? 9.5 : 5.5;
    if (len > 0) {
      mx /= len;
      mz /= len;
      // Movement is relative to the camera yaw.
      const sin = Math.sin(this.camYaw);
      const cos = Math.cos(this.camYaw);
      const wx = mx * cos - mz * sin;
      const wz = mx * sin + mz * cos;
      const targetHeading = Math.atan2(wx, wz);
      this.heading = angleLerp(this.heading, targetHeading, Math.min(1, dt * 12));
      const next = this.mesh.position.clone();
      next.x += wx * speed * dt;
      next.z += wz * speed * dt;
      const lim = 300;
      next.x = clamp(next.x, -lim, lim);
      next.z = clamp(next.z, -lim, lim);
      this.harbor.resolveCircle(next, 0.6);
      this.mesh.position.copy(next);
      this.walkPhase += dt * speed * 1.6;
    }
    const swing = len > 0 ? Math.sin(this.walkPhase) * 0.6 : 0;
    const u = this.mesh.userData;
    u.legL.rotation.x = swing;
    u.legR.rotation.x = -swing;
    u.armL.rotation.x = -swing * 0.7;
    u.armR.rotation.x = swing * 0.7;
    this.mesh.rotation.y = this.heading;
  }

  // Camera position for third-person follow.
  cameraAnchor() {
    const dist = 9;
    const h = 4.2 + this.camPitch * 6;
    return {
      x: this.pos.x - Math.sin(this.camYaw) * dist * Math.cos(this.camPitch),
      y: h,
      z: this.pos.z - Math.cos(this.camYaw) * dist * Math.cos(this.camPitch),
      lookX: this.pos.x,
      lookY: 1.8,
      lookZ: this.pos.z,
    };
  }

  aimDirection(camera) {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    return dir;
  }
}
