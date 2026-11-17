// Small burst particles for impacts, pickups and exhaust puffs.
import * as THREE from 'three';
import { Dice } from './rng.js';

export class Sparks {
  constructor(scene, seed = 77) {
    this.scene = scene;
    this.dice = new Dice(seed);
    this.points = [];
  }

  burst(pos, color, count = 14, speed = 6) {
    const geo = new THREE.BufferGeometry();
    const arr = new Float32Array(count * 3);
    const vels = [];
    for (let i = 0; i < count; i++) {
      arr[i * 3] = pos.x;
      arr[i * 3 + 1] = pos.y;
      arr[i * 3 + 2] = pos.z;
      const a = this.dice.float(0, Math.PI * 2);
      const b = this.dice.float(-0.6, 0.9);
      vels.push(new THREE.Vector3(Math.cos(a) * speed, Math.sin(b) * speed + 2, Math.sin(a) * speed));
    }
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const mat = new THREE.PointsMaterial({ color, size: 0.35, transparent: true, opacity: 1 });
    const pts = new THREE.Points(geo, mat);
    this.scene.add(pts);
    this.points.push({ pts, vels, life: 0.7 });
  }

  update(dt) {
    for (const p of this.points) {
      p.life -= dt;
      const attr = p.pts.geometry.getAttribute('position');
      for (let i = 0; i < p.vels.length; i++) {
        attr.array[i * 3] += p.vels[i].x * dt;
        attr.array[i * 3 + 1] += p.vels[i].y * dt;
        attr.array[i * 3 + 2] += p.vels[i].z * dt;
        p.vels[i].y -= 12 * dt;
      }
      attr.needsUpdate = true;
      p.pts.material.opacity = Math.max(0, p.life / 0.7);
      if (p.life <= 0) {
        this.scene.remove(p.pts);
        p.pts.geometry.dispose();
        p.pts.material.dispose();
      }
    }
    this.points = this.points.filter((p) => p.life > 0);
  }
}
