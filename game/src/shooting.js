// On-foot combat: hitscan shooting, tracers, muzzle flash, and the warehouse thugs.
import * as THREE from 'three';
import { Dice, dist2d } from './rng.js';
import { buildWalkerMesh } from './crowd.js';

export class ThugSquad {
  constructor(scene, harbor, seed = 55) {
    this.scene = scene;
    this.harbor = harbor;
    this.dice = new Dice(seed);
    this.thugs = [];
  }

  spawnAt(x, z, count) {
    for (let i = 0; i < count; i++) {
      const mesh = buildWalkerMesh(0x8a1f2d);
      mesh.position.set(x + this.dice.float(-6, 6), 0, z + this.dice.float(-6, 6));
      // Dark jacket + cap so thugs read differently from pedestrians.
      const cap = new THREE.Mesh(
        new THREE.ConeGeometry(0.3, 0.35, 8),
        new THREE.MeshStandardMaterial({ color: 0x111111 })
      );
      cap.position.y = 2.25;
      mesh.add(cap);
      this.scene.add(mesh);
      this.thugs.push({ mesh, hp: 100, alive: true, shootCd: this.dice.float(0.5, 1.5), heading: 0 });
    }
  }

  clear() {
    for (const t of this.thugs) this.scene.remove(t.mesh);
    this.thugs = [];
  }

  aliveCount() {
    return this.thugs.filter((t) => t.alive).length;
  }

  // Thugs fire back at the player on foot.
  update(dt, playerPos, onPlayerHit, tracer) {
    for (const t of this.thugs) {
      if (!t.alive) continue;
      const p = t.mesh.position;
      const d = dist2d(p.x, p.z, playerPos.x, playerPos.z);
      t.heading = Math.atan2(playerPos.x - p.x, playerPos.z - p.z);
      t.mesh.rotation.y = t.heading;
      t.shootCd -= dt;
      if (d < 34 && t.shootCd <= 0) {
        t.shootCd = this.dice.float(1.1, 2.2);
        const hit = Math.random() < 0.4;
        tracer(new THREE.Vector3(p.x, 1.5, p.z), new THREE.Vector3(playerPos.x, 1.4, playerPos.z), 0xff5040);
        if (hit) onPlayerHit(this.dice.int(6, 12));
      }
    }
  }

  // Ray vs thug: a thug is a vertical capsule; test the ray against its axis segment.
  rayHit(origin, dir, maxDist) {
    let best = null;
    let bestT = maxDist;
    for (const t of this.thugs) {
      if (!t.alive) continue;
      const p = t.mesh.position;
      const ox = p.x - origin.x;
      const oz = p.z - origin.z;
      const along = ox * dir.x + oz * dir.z;
      if (along < 0 || along > bestT) continue;
      const px = origin.x + dir.x * along - p.x;
      const pz = origin.z + dir.z * along - p.z;
      const perp = Math.sqrt(px * px + pz * pz);
      if (perp < 1.1) {
        const yAt = origin.y + dir.y * along;
        if (yAt > 0 && yAt < 2.4) {
          best = t;
          bestT = along;
        }
      }
    }
    return best ? { thug: best, dist: bestT } : null;
  }
}

export class Gunplay {
  constructor(scene) {
    this.scene = scene;
    this.cooldown = 0;
    this.tracerMat = new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.9 });
    this.flash = new THREE.PointLight(0xffc860, 0, 14);
    this.scene.add(this.flash);
    this.activeTracers = [];
  }

  shoot(origin, dir, maxDist, onHit) {
    if (this.cooldown > 0) return null;
    this.cooldown = 0.22;
    const hit = onHit(origin, dir, maxDist);
    const endDist = hit ? hit.dist : maxDist;
    const end = origin.clone().addScaledVector(dir, endDist);
    this.spawnTracer(origin.clone(), end, 0xffe9a8);
    this.flash.position.copy(origin).addScaledVector(dir, 1.2);
    this.flash.intensity = 60;
    return hit;
  }

  spawnTracer(a, b, color) {
    const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);
    this.activeTracers.push({ line, life: 0.09 });
  }

  update(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.flash.intensity = Math.max(0, this.flash.intensity - dt * 500);
    for (const t of this.activeTracers) {
      t.life -= dt;
      t.line.material.opacity = Math.max(0, t.life / 0.09);
      if (t.life <= 0) {
        this.scene.remove(t.line);
        t.line.geometry.dispose();
        t.line.material.dispose();
      }
    }
    this.activeTracers = this.activeTracers.filter((t) => t.life > 0);
  }
}
