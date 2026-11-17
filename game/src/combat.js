// Neon Harbor — combat: the player's hitscan pistol with tracer and muzzle
// flash, and the dock thugs who guard the Harbor Drop pickup.

import * as THREE from 'three';
import { PALETTE } from './config.js';

export function makeThugMesh() {
  const group = new THREE.Group();
  const coat = new THREE.MeshLambertMaterial({ color: PALETTE.thug });
  const pants = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  const skin = new THREE.MeshLambertMaterial({ color: 0xc98d5a });

  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.72, 0.32), pants);
  legs.position.y = 0.36;
  group.add(legs);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.74, 0.4), coat);
  torso.position.y = 1.1;
  torso.castShadow = true;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 8), skin);
  head.position.y = 1.76;
  head.castShadow = true;
  group.add(head);
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.5), new THREE.MeshLambertMaterial({ color: 0x111111 }));
  gun.position.set(0.3, 1.15, 0.35);
  group.add(gun);

  // Health bar: a small billboard pair above the head.
  const barBg = new THREE.Mesh(
    new THREE.PlaneGeometry(1.0, 0.12),
    new THREE.MeshBasicMaterial({ color: 0x330000, transparent: true, opacity: 0.8, depthWrite: false }),
  );
  barBg.position.y = 2.25;
  group.add(barBg);
  const barFg = new THREE.Mesh(
    new THREE.PlaneGeometry(0.96, 0.08),
    new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.95, depthWrite: false }),
  );
  barFg.position.y = 2.25;
  barFg.position.z = 0.01;
  group.add(barFg);
  group.userData.barBg = barBg;
  group.userData.barFg = barFg;
  return group;
}

export class Thug {
  constructor(scene, x, z) {
    this.scene = scene;
    this.mesh = makeThugMesh();
    scene.add(this.mesh);
    this.pos = this.mesh.position;
    this.pos.set(x, 0, z);
    this.heading = 0;
    this.health = 50;
    this.maxHealth = 50;
    this.alive = true;
    this.shootTimer = 1 + Math.random();
    this.moveTimer = 0;
    this.strafeDir = 1;
  }

  update(dt, playerPos, city, onShoot) {
    if (!this.alive) return;
    const dx = playerPos.x - this.pos.x;
    const dz = playerPos.z - this.pos.z;
    const dist = Math.hypot(dx, dz) || 0.001;
    this.heading = Math.atan2(dx, dz);
    this.mesh.rotation.y = this.heading;
    this.moveTimer -= dt;
    if (dist > 26) {
      // Close the distance.
      this.pos.x += (dx / dist) * 4.5 * dt;
      this.pos.z += (dz / dist) * 4.5 * dt;
    } else if (dist < 9) {
      this.pos.x -= (dx / dist) * 2.5 * dt;
      this.pos.z -= (dz / dist) * 2.5 * dt;
    } else {
      if (this.moveTimer <= 0) {
        this.strafeDir *= -1;
        this.moveTimer = 1 + Math.random() * 1.5;
      }
      this.pos.x += Math.cos(this.heading) * this.strafeDir * 2 * dt;
      this.pos.z -= Math.sin(this.heading) * this.strafeDir * 2 * dt;
    }
    city.collideCircle(this.pos, 0.6);
    this.shootTimer -= dt;
    if (this.shootTimer <= 0 && dist < 34) {
      this.shootTimer = 1.1 + Math.random() * 0.9;
      if (onShoot) onShoot(this, dist);
    }
    const ratio = Math.max(0, this.health / this.maxHealth);
    this.mesh.userData.barFg.scale.x = ratio;
    this.mesh.userData.barFg.visible = ratio < 1;
    this.mesh.userData.barBg.visible = ratio < 1;
    this.mesh.userData.barFg.lookAt(playerPos.x, this.pos.y + 2.25, playerPos.z);
    this.mesh.userData.barBg.lookAt(playerPos.x, this.pos.y + 2.25, playerPos.z);
  }

  damage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.alive = false;
      this.scene.remove(this.mesh);
      return true;
    }
    return false;
  }
}

export class Combat {
  constructor(scene, particles) {
    this.scene = scene;
    this.particles = particles;
    this.fireCooldown = 0;
    this.tracer = null;
    this.tracerLife = 0;
    this.muzzle = null;
    this.muzzleLife = 0;
    const tracerGeo = new THREE.BufferGeometry();
    tracerGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    this.tracer = new THREE.Line(
      tracerGeo,
      new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.9 }),
    );
    this.tracer.frustumCulled = false;
    this.tracer.visible = false;
    scene.add(this.tracer);
    this.muzzle = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.95 }),
    );
    this.muzzle.visible = false;
    scene.add(this.muzzle);
  }

  update(dt) {
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    if (this.tracerLife > 0) {
      this.tracerLife -= dt;
      if (this.tracerLife <= 0) this.tracer.visible = false;
    }
    if (this.muzzleLife > 0) {
      this.muzzleLife -= dt;
      if (this.muzzleLife <= 0) this.muzzle.visible = false;
    }
  }

  /** Fire a hitscan shot from `from` along `dir`. Returns the first thug hit, if any. */
  fire(from, dir, thugs, range) {
    if (this.fireCooldown > 0) return null;
    this.fireCooldown = 0.16;
    const end = {
      x: from.x + dir.x * range,
      y: from.y + dir.y * range,
      z: from.z + dir.z * range,
    };
    let best = null;
    let bestT = range;
    for (const thug of thugs) {
      if (!thug.alive) continue;
      // Ray vs vertical cylinder around the thug.
      const ox = thug.pos.x - from.x;
      const oz = thug.pos.z - from.z;
      const t = ox * dir.x + oz * dir.z;
      if (t < 0 || t > bestT) continue;
      const px = from.x + dir.x * t - thug.pos.x;
      const pz = from.z + dir.z * t - thug.pos.z;
      const perp2 = px * px + pz * pz;
      if (perp2 < 0.9 * 0.9) {
        const yAt = from.y + dir.y * t;
        if (yAt > 0 && yAt < 2.3) {
          best = thug;
          bestT = t;
          end.x = from.x + dir.x * t;
          end.y = yAt;
          end.z = from.z + dir.z * t;
        }
      }
    }
    const positions = this.tracer.geometry.attributes.position;
    positions.setXYZ(0, from.x, from.y, from.z);
    positions.setXYZ(1, end.x, end.y, end.z);
    positions.needsUpdate = true;
    this.tracer.visible = true;
    this.tracerLife = 0.07;
    this.muzzle.position.set(from.x, from.y, from.z);
    this.muzzle.visible = true;
    this.muzzleLife = 0.05;
    if (best) {
      this.particles.burst(end.x, end.y, end.z, 0xff5544);
      return best;
    }
    return null;
  }
}
