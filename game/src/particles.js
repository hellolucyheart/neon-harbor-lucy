// Neon Harbor — a tiny pooled particle system for sparks, smoke, muzzle
// flashes and pickup glints. One THREE.Points draw call, positions recycled.

import * as THREE from 'three';

const MAX = 420;

export class Particles {
  constructor(scene) {
    this.scene = scene;
    this.positions = new Float32Array(MAX * 3);
    this.colors = new Float32Array(MAX * 3);
    this.vel = new Float32Array(MAX * 3);
    this.life = new Float32Array(MAX);
    this.maxLife = new Float32Array(MAX);
    this.gravity = new Float32Array(MAX);
    this.cursor = 0;
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.material = new THREE.PointsMaterial({
      size: 0.55,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);
    for (let i = 0; i < MAX; i += 1) {
      this.positions[i * 3 + 1] = -100;
      this.life[i] = 0;
    }
  }

  spawn(x, y, z, options) {
    const count = options.count || 10;
    const color = options.color || 0xffcc66;
    const speed = options.speed || 6;
    const up = options.up || 3;
    const life = options.life || 0.7;
    const gravity = options.gravity === undefined ? -9 : options.gravity;
    const c = new THREE.Color(color);
    for (let n = 0; n < count; n += 1) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % MAX;
      this.positions[i * 3] = x;
      this.positions[i * 3 + 1] = y;
      this.positions[i * 3 + 2] = z;
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * speed;
      this.vel[i * 3] = Math.cos(a) * r;
      this.vel[i * 3 + 1] = Math.random() * up;
      this.vel[i * 3 + 2] = Math.sin(a) * r;
      this.colors[i * 3] = c.r;
      this.colors[i * 3 + 1] = c.g;
      this.colors[i * 3 + 2] = c.b;
      this.life[i] = life * (0.6 + Math.random() * 0.7);
      this.maxLife[i] = this.life[i];
      this.gravity[i] = gravity;
    }
  }

  burst(x, y, z, color) {
    this.spawn(x, y, z, { count: 22, color, speed: 9, up: 5, life: 0.6 });
  }

  smoke(x, y, z) {
    this.spawn(x, y, z, { count: 8, color: 0x888888, speed: 1.5, up: 2.5, life: 1.4, gravity: 1.5 });
  }

  update(dt) {
    for (let i = 0; i < MAX; i += 1) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.positions[i * 3 + 1] = -100;
        continue;
      }
      this.vel[i * 3 + 1] += this.gravity[i] * dt;
      this.positions[i * 3] += this.vel[i * 3] * dt;
      this.positions[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.positions[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }
}
