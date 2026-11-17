// Neon Harbor — vehicles: a boxy low-poly car built from boxes and cylinders,
// arcade driving physics, and the traffic AI that cruises the street grid.

import * as THREE from 'three';
import { CAR, CITY } from './config.js';

export function makeCarMesh(paint, opts) {
  const options = opts || {};
  const group = new THREE.Group();
  const paintMat = new THREE.MeshLambertMaterial({ color: paint });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x0e1a24 });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x111318 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, 4.4), paintMat);
  body.position.y = 0.62;
  body.castShadow = true;
  group.add(body);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.58, 2.1), glassMat);
  cabin.position.set(0, 1.18, -0.25);
  cabin.castShadow = true;
  group.add(cabin);

  const bumperF = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.22, 0.3), darkMat);
  bumperF.position.set(0, 0.42, 2.28);
  group.add(bumperF);
  const bumperB = bumperF.clone();
  bumperB.position.z = -2.28;
  group.add(bumperB);

  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
  for (const sx of [-0.65, 0.65]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.06), headMat);
    lamp.position.set(sx, 0.72, 2.24);
    group.add(lamp);
  }
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  for (const sx of [-0.65, 0.65]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.06), tailMat);
    lamp.position.set(sx, 0.72, -2.24);
    group.add(lamp);
  }

  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheels = [];
  for (const [wx, wz] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const wheel = new THREE.Mesh(wheelGeo, darkMat);
    wheel.position.set(wx, 0.38, wz);
    wheel.castShadow = true;
    group.add(wheel);
    wheels.push(wheel);
  }

  if (options.police) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.18, 0.5), darkMat);
    bar.position.set(0, 1.56, -0.25);
    group.add(bar);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.44), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    red.position.set(-0.28, 1.68, -0.25);
    group.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.44), new THREE.MeshBasicMaterial({ color: 0x2244ff }));
    blue.position.set(0.28, 1.68, -0.25);
    group.add(blue);
    group.userData.lightRed = red;
    group.userData.lightBlue = blue;
    const decal = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 0.4),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    decal.position.set(0, 0.66, 1.02);
    decal.rotation.x = 0;
    group.add(decal);
  }

  group.userData.wheels = wheels;
  return group;
}

export class Car {
  constructor(scene, paint, x, z, heading, opts) {
    this.scene = scene;
    this.mesh = makeCarMesh(paint, opts);
    this.mesh.position.set(x, 0, z);
    this.mesh.rotation.y = heading;
    scene.add(this.mesh);
    this.pos = this.mesh.position;
    this.heading = heading;
    this.speed = 0;
    this.steer = 0;
    this.alive = true;
    this.isPolice = !!(opts && opts.police);
    this.isTraffic = !!(opts && opts.traffic);
    this.color = paint;
    this.wheelSpin = 0;
    // Traffic AI state.
    this.axis = 'x';
    this.dir = 1;
    this.targetSpeed = 0;
    this.waitTimer = 0;
  }

  forward() {
    return { x: Math.sin(this.heading), z: Math.cos(this.heading) };
  }

  /** Arcade drive: throttle -1..1, steer -1..1, dt seconds. */
  drive(throttle, steer, dt) {
    const f = this.forward();
    if (throttle > 0) this.speed += CAR.accel * throttle * dt;
    else if (throttle < 0) {
      if (this.speed > 0.5) this.speed -= CAR.brake * dt;
      else this.speed += CAR.reverseAccel * throttle * dt;
    }
    this.speed -= this.speed * CAR.drag * dt;
    if (this.speed > CAR.maxSpeed) this.speed = CAR.maxSpeed;
    if (this.speed < -CAR.maxReverse) this.speed = -CAR.maxReverse;
    if (Math.abs(this.speed) < 0.05 && throttle === 0) this.speed = 0;
    const steerAmount = steer * CAR.steerRate * dt * Math.min(1, Math.abs(this.speed) / 6) * Math.sign(this.speed || 1);
    this.heading += steerAmount;
    this.pos.x += f.x * this.speed * dt;
    this.pos.z += f.z * this.speed * dt;
    this.mesh.rotation.y = this.heading;
    this.wheelSpin += this.speed * dt * 2.4;
    for (const wheel of this.mesh.userData.wheels) wheel.rotation.x = this.wheelSpin;
    const front = this.mesh.userData.wheels;
    if (front.length >= 2) {
      front[0].rotation.y = steer * 0.32;
      front[1].rotation.y = steer * 0.32;
    }
  }

  /** Traffic: cruise along the street grid, turning at intersections. */
  updateTraffic(dt, city, rng) {
    if (this.waitTimer > 0) {
      this.waitTimer -= dt;
      return;
    }
    const f = this.forward();
    const target = this.targetSpeed || 9;
    this.speed += (target - this.speed) * Math.min(1, dt * 1.5);
    this.pos.x += f.x * this.speed * dt;
    this.pos.z += f.z * this.speed * dt;
    this.mesh.rotation.y = this.heading;
    this.wheelSpin += this.speed * dt * 2.4;
    for (const wheel of this.mesh.userData.wheels) wheel.rotation.x = this.wheelSpin;

    const half = CITY.half;
    if (Math.abs(this.pos.x) > half + 30 || Math.abs(this.pos.z) > half + 30) {
      this.respawn(city, rng);
      return;
    }
    // At an intersection, sometimes turn onto the crossing street.
    const nearX = city.streetCoord(this.pos.x);
    const nearZ = city.streetCoord(this.pos.z);
    const onIntersection = Math.abs(this.pos.x - nearX) < 1.6 && Math.abs(this.pos.z - nearZ) < 1.6;
    if (onIntersection && rng.next() < dt * 0.55) {
      const turnLeft = rng.next() < 0.5;
      if (this.axis === 'x') {
        this.axis = 'z';
        this.heading = turnLeft ? Math.PI / 2 : -Math.PI / 2;
        this.pos.z = nearZ;
      } else {
        this.axis = 'x';
        this.heading = turnLeft ? 0 : Math.PI;
        this.pos.x = nearX;
      }
    }
  }

  respawn(city, rng) {
    const p = city.randomRoadPoint();
    const horizontal = Math.abs(p.z - city.streetCoord(p.z)) < 0.1;
    this.axis = horizontal ? 'x' : 'z';
    this.dir = rng.next() < 0.5 ? 1 : -1;
    this.heading = horizontal ? (this.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (this.dir > 0 ? 0 : Math.PI);
    this.pos.set(p.x, 0, p.z);
    this.speed = rng.range(7, 12);
    this.targetSpeed = this.speed;
  }

  remove() {
    this.alive = false;
    this.scene.remove(this.mesh);
  }
}
