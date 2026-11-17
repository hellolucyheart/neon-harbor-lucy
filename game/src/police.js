// Neon Harbor — Harbor Patrol: police cars that spawn at the city's edge,
// chase the player, ram the player's car and bust the player when they
// corner them slow. Siren lights flash while they hunt.

import { Car, makeCarMesh } from './vehicles.js';
import { POLICE, CITY } from './config.js';

const POLICE_PAINT = 0x1c2733;

export class PoliceCar extends Car {
  constructor(scene, x, z, heading) {
    super(scene, POLICE_PAINT, x, z, heading, { police: true });
    this.bustTimer = 0;
    this.flashPhase = Math.random() * Math.PI * 2;
    this.ramCooldown = 0;
  }

  /** Steer toward the target point with arcade pursuit physics. */
  pursue(targetX, targetZ, dt, city) {
    const dx = targetX - this.pos.x;
    const dz = targetZ - this.pos.z;
    const dist = Math.hypot(dx, dz) || 0.001;
    const wantHeading = Math.atan2(dx, dz);
    let diff = wantHeading - this.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const steer = Math.max(-1, Math.min(1, diff * 1.8));
    // Ease off when right on top of the target so the ram lands, not orbits.
    const throttle = dist > 6 ? 1 : 0.7;
    this.speed += POLICE.accel * throttle * dt;
    this.speed -= this.speed * 0.45 * dt;
    if (this.speed > POLICE.maxSpeed) this.speed = POLICE.maxSpeed;
    this.heading += steer * 2.6 * dt * Math.min(1, Math.abs(this.speed) / 8);
    const f = this.forward();
    this.pos.x += f.x * this.speed * dt;
    this.pos.z += f.z * this.speed * dt;
    this.mesh.rotation.y = this.heading;
    this.wheelSpin += this.speed * dt * 2.4;
    for (const wheel of this.mesh.userData.wheels) wheel.rotation.x = this.wheelSpin;
    city.collideCircle(this.pos, 2.2);
    this.flashPhase += dt * 9;
    const redOn = Math.sin(this.flashPhase) > 0;
    if (this.mesh.userData.lightRed) {
      this.mesh.userData.lightRed.material.color.setHex(redOn ? 0xff2222 : 0x550000);
      this.mesh.userData.lightBlue.material.color.setHex(redOn ? 0x000055 : 0x2244ff);
    }
    if (this.ramCooldown > 0) this.ramCooldown -= dt;
    return dist;
  }

  /** True when the player is cornered slow long enough to be busted. */
  checkBust(dist, playerSpeed, dt) {
    if (dist < POLICE.bustDistance && playerSpeed < 2.2) {
      this.bustTimer += dt;
      if (this.bustTimer >= POLICE.bustTime) return true;
    } else {
      this.bustTimer = Math.max(0, this.bustTimer - dt * 2);
    }
    return false;
  }
}

/** Spawn points on the ring just outside the player's view. */
export function policeSpawnPoint(playerX, playerZ, rng) {
  const angle = rng.range(0, Math.PI * 2);
  const d = POLICE.spawnDistance;
  let x = playerX + Math.cos(angle) * d;
  let z = playerZ + Math.sin(angle) * d;
  x = Math.max(-CITY.half - 10, Math.min(CITY.half + 10, x));
  z = Math.max(-CITY.half - 10, Math.min(CITY.half + 10, z));
  return { x, z, heading: Math.atan2(playerX - x, playerZ - z) };
}
