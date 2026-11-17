// Wanted stars and the Harbor PD pursuit squad.
import * as THREE from 'three';
import { Dice, clamp, angleLerp, dist2d } from './rng.js';
import { StreetCar } from './cars.js';
import { CITY } from './harbor.js';

export class PoliceForce {
  constructor(scene, harbor, seed = 33) {
    this.scene = scene;
    this.harbor = harbor;
    this.dice = new Dice(seed);
    this.stars = 0;
    this.units = [];
    this.sirenTime = 0;
    this.bustProgress = 0;
  }

  setStars(n) {
    this.stars = clamp(Math.round(n), 0, 5);
    this.syncUnits();
  }

  addStar() {
    this.setStars(this.stars + 1);
  }

  clear() {
    this.setStars(0);
    this.bustProgress = 0;
  }

  syncUnits() {
    const want = this.stars === 0 ? 0 : this.stars + 1;
    while (this.units.length < want) {
      const angle = this.dice.float(0, Math.PI * 2);
      const r = CITY / 2 + 30;
      const car = new StreetCar(this.scene, Math.sin(angle) * r, Math.cos(angle) * r, angle, 0x1a1a22, true);
      car.speed = 0;
      this.units.push(car);
    }
    while (this.units.length > want) {
      const car = this.units.pop();
      car.destroy();
    }
  }

  update(dt, targetPos, targetSpeed, targetOnFoot, onBusted, onRam) {
    this.sirenTime += dt;
    const flash = Math.sin(this.sirenTime * 12) > 0;
    for (const unit of this.units) {
      if (unit.mesh.userData.sirenRed) {
        unit.mesh.userData.sirenRed.visible = flash;
        unit.mesh.userData.sirenBlue.visible = !flash;
      }
      const d = dist2d(unit.pos.x, unit.pos.z, targetPos.x, targetPos.z);
      const desired = Math.atan2(targetPos.x - unit.pos.x, targetPos.z - unit.pos.z);
      const chaseSpeed = 15 + this.stars * 3.2;
      // Ram: steer at the player, back off a touch when very close to avoid orbiting.
      const steer = angleLerp(unit.heading, desired, Math.min(1, dt * 2.2));
      unit.heading = steer;
      const accel = d > 6 ? chaseSpeed : chaseSpeed * 0.55;
      unit.speed += (accel - unit.speed) * Math.min(1, dt * 1.6);
      const f = unit.forward();
      const next = unit.pos.clone();
      next.x += f.x * unit.speed * dt;
      next.z += f.z * unit.speed * dt;
      this.harbor.resolveCircle(next, 2.1);
      unit.pos.copy(next);
      unit.mesh.rotation.y = unit.heading;
      for (const w of unit.mesh.userData.wheels) w.rotation.x += (unit.speed * dt) / 0.42;
      if (d < 3.4) {
        if (!targetOnFoot) onRam(dt, unit);
        else {
          // Cornered on foot: the bust meter fills while a unit stays close.
          this.bustProgress += dt;
          if (this.bustProgress > 1.6) {
            this.bustProgress = 0;
            onBusted();
          }
        }
      } else if (targetOnFoot) {
        this.bustProgress = Math.max(0, this.bustProgress - dt * 0.8);
      }
    }
    if (this.units.length === 0) this.bustProgress = 0;
  }

  nearestUnit() {
    return this.units[0] ?? null;
  }
}
