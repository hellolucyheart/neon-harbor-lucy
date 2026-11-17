// Cars: mesh factory, arcade driving physics, and street traffic AI.
import * as THREE from 'three';
import { Dice, clamp, angleLerp, dist2d } from './rng.js';
import { streetCoord, roadCoord, CITY, PITCH } from './harbor.js';

export const CAR_COLORS = [0xd83a3a, 0x3a7bd8, 0xffd166, 0x37e0ff, 0x7dff9b, 0xf2f2f2, 0x2b2b33, 0xff8c42];

export function buildCarMesh(color, police = false) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.5 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x0e1626, roughness: 0.15, metalness: 0.8 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.75, 4.4), bodyMat);
  body.position.y = 0.65;
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.65, 2.2), glassMat);
  cabin.position.set(0, 1.3, -0.2);
  g.add(cabin);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
  g.userData.wheels = [];
  for (const [x, z] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12), wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.42, z);
    g.add(wheel);
    g.userData.wheels.push(wheel);
  }
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  for (const x of [-0.6, 0.6]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.1), headMat);
    lamp.position.set(x, 0.7, 2.22);
    g.add(lamp);
  }
  if (police) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.4), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    bar.position.set(0, 1.72, -0.2);
    g.add(bar);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.42), new THREE.MeshBasicMaterial({ color: 0xff2020 }));
    red.position.set(-0.32, 1.82, -0.2);
    g.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.42), new THREE.MeshBasicMaterial({ color: 0x2040ff }));
    blue.position.set(0.32, 1.82, -0.2);
    g.add(blue);
    g.userData.sirenRed = red;
    g.userData.sirenBlue = blue;
  }
  return g;
}

export class StreetCar {
  constructor(scene, x, z, heading, color, police = false) {
    this.scene = scene;
    this.mesh = buildCarMesh(color, police);
    this.mesh.position.set(x, 0, z);
    this.mesh.rotation.y = heading;
    this.heading = heading;
    this.speed = 0;
    this.police = police;
    this.health = 100;
    this.stolen = false;
    scene.add(this.mesh);
  }

  get pos() {
    return this.mesh.position;
  }

  forward() {
    return { x: Math.sin(this.heading), z: Math.cos(this.heading) };
  }

  destroy() {
    this.scene.remove(this.mesh);
  }
}

// Arcade driving for the car the player sits in.
export class Driver {
  constructor(harbor) {
    this.harbor = harbor;
    this.car = null;
    this.speed = 0;
    this.steer = 0;
  }

  take(car) {
    this.car = car;
    this.speed = 0;
    this.steer = 0;
  }

  leave() {
    const c = this.car;
    this.car = null;
    this.speed = 0;
    return c;
  }

  update(dt, keys) {
    const car = this.car;
    if (!car) return;
    const fwd = keys.held('KeyW') || keys.held('ArrowUp');
    const back = keys.held('KeyS') || keys.held('ArrowDown');
    const left = keys.held('KeyA') || keys.held('ArrowLeft');
    const right = keys.held('KeyD') || keys.held('ArrowRight');
    const brake = keys.held('Space');
    const top = 34;
    const reverseTop = 12;
    if (fwd) this.speed += 26 * dt;
    else if (back) this.speed -= this.speed > 0.5 ? 34 * dt : 14 * dt;
    else this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), 9 * dt);
    if (brake) this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), 40 * dt);
    this.speed = clamp(this.speed, -reverseTop, top);
    const steerTarget = (left ? 1 : 0) - (right ? 1 : 0);
    this.steer += (steerTarget - this.steer) * Math.min(1, dt * 8);
    const dir = this.speed >= 0 ? 1 : -1;
    car.heading += this.steer * 1.5 * dt * dir * clamp(Math.abs(this.speed) / 8, 0, 1);
    const f = car.forward();
    const next = car.pos.clone();
    next.x += f.x * this.speed * dt;
    next.z += f.z * this.speed * dt;
    // Keep inside the drivable area (past the marina pier, short of the sea).
    const lim = CITY / 2 + 80;
    next.x = clamp(next.x, -lim, lim);
    next.z = clamp(next.z, -lim, lim);
    const hit = this.harbor.resolveCircle(next, 2.1);
    if (hit) {
      if (Math.abs(this.speed) > 14) this.speed *= 0.4;
      else this.speed *= 0.5;
    }
    car.pos.copy(next);
    car.mesh.rotation.y = car.heading;
    for (const w of car.mesh.userData.wheels) w.rotation.x += (this.speed * dt) / 0.42;
  }
}

// Traffic cars cruising the grid, turning at intersections.
export class Traffic {
  constructor(scene, harbor, seed = 7) {
    this.scene = scene;
    this.harbor = harbor;
    this.dice = new Dice(seed);
    this.cars = [];
    this.spawnCount = 14;
    for (let i = 0; i < this.spawnCount; i++) this.spawnOne(true);
  }

  laneOffset(dir) {
    return dir;
  }

  spawnOne(anywhere = false) {
    const d = this.dice;
    const vertical = d.chance(0.5);
    const line = streetCoord(d.int(0, 9));
    const along = d.float(-CITY / 2, CITY / 2);
    const heading = vertical ? (d.chance(0.5) ? 0 : Math.PI) : (d.chance(0.5) ? Math.PI / 2 : -Math.PI / 2);
    const lane = 2.6;
    const x = vertical ? line + lane * Math.sin(heading) : along;
    const z = vertical ? along : line + lane * Math.cos(heading);
    const car = new StreetCar(this.scene, x, z, heading, d.pick(CAR_COLORS));
    car.speed = d.float(7, 12);
    car.cruise = car.speed;
    car.wait = 0;
    this.cars.push(car);
    return car;
  }

  nearest(x, z, maxDist, exclude = null) {
    let best = null;
    let bestD = maxDist;
    for (const c of this.cars) {
      if (c === exclude) continue;
      const d = dist2d(x, z, c.pos.x, c.pos.z);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  update(dt, playerPos, playerSpeed) {
    for (const car of this.cars) {
      if (car.wait > 0) {
        car.wait -= dt;
        continue;
      }
      // Slow down for the car ahead on the same street.
      const f = car.forward();
      let blocked = false;
      for (const other of this.cars) {
        if (other === car) continue;
        const dx = other.pos.x - car.pos.x;
        const dz = other.pos.z - car.pos.z;
        const ahead = dx * f.x + dz * f.z;
        const side = Math.abs(dx * f.z - dz * f.x);
        if (ahead > 0 && ahead < 9 && side < 2.4) { blocked = true; break; }
      }
      const target = blocked ? 0 : car.cruise;
      car.speed += (target - car.speed) * Math.min(1, dt * 2);
      car.pos.x += f.x * car.speed * dt;
      car.pos.z += f.z * car.speed * dt;
      // At an intersection, sometimes turn.
      const nearX = this.nearStreet(car.pos.x);
      const nearZ = this.nearStreet(car.pos.z);
      if (nearX !== null && nearZ !== null && this.dice.chance(dt * 0.5)) {
        const turn = this.dice.pick([-Math.PI / 2, Math.PI / 2]);
        car.heading += turn;
        car.pos.x = nearX;
        car.pos.z = nearZ;
      }
      // Wrap around the city edge.
      if (car.pos.x > CITY / 2 + 40 || car.pos.x < -CITY / 2 - 40 || car.pos.z > CITY / 2 + 40 || car.pos.z < -CITY / 2 - 40) {
        const fresh = this.spawnOne();
        const idx = this.cars.indexOf(car);
        car.destroy();
        this.cars.splice(idx, 1);
        void fresh;
      }
      car.mesh.rotation.y = car.heading;
      for (const w of car.mesh.userData.wheels) w.rotation.x += (car.speed * dt) / 0.42;
    }
  }

  nearStreet(v) {
    for (let i = 0; i <= 9; i++) {
      const c = streetCoord(i);
      if (Math.abs(v - c) < 3) return c;
    }
    return null;
  }

  remove(car) {
    const i = this.cars.indexOf(car);
    if (i >= 0) this.cars.splice(i, 1);
  }
}
