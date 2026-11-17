// Pedestrians strolling the sidewalks who scatter when danger comes close.
import * as THREE from 'three';
import { Dice, dist2d } from './rng.js';
import { streetCoord, CITY } from './harbor.js';

const SHIRTS = [0xff8c42, 0x37e0ff, 0xffd166, 0xc77dff, 0x7dff9b, 0xf2f2f2];

export function buildWalkerMesh(shirt) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 1.0, 0.4),
    new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.8 })
  );
  body.position.y = 1.15;
  g.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xe8b98a, roughness: 0.7 })
  );
  head.position.y = 1.95;
  g.add(head);
  const legs = new THREE.MeshStandardMaterial({ color: 0x2b2f45, roughness: 0.9 });
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.8, 0.3), legs);
  legL.position.set(-0.18, 0.4, 0);
  g.add(legL);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.8, 0.3), legs);
  legR.position.set(0.18, 0.4, 0);
  g.add(legR);
  g.userData.legL = legL;
  g.userData.legR = legR;
  return g;
}

export class Crowd {
  constructor(scene, harbor, seed = 21) {
    this.scene = scene;
    this.harbor = harbor;
    this.dice = new Dice(seed);
    this.walkers = [];
    for (let i = 0; i < 22; i++) this.spawnOne();
  }

  spawnOne() {
    const d = this.dice;
    const vertical = d.chance(0.5);
    const line = streetCoord(d.int(0, 9)) + d.pick([-10.4, 10.4]);
    const along = d.float(-CITY / 2, CITY / 2);
    const mesh = buildWalkerMesh(d.pick(SHIRTS));
    mesh.position.set(vertical ? line : along, 0, vertical ? along : line);
    this.scene.add(mesh);
    this.walkers.push({
      mesh,
      heading: d.float(0, Math.PI * 2),
      speed: d.float(1.2, 2.2),
      panic: 0,
      walkPhase: d.float(0, Math.PI * 2),
    });
  }

  update(dt, danger) {
    for (const w of this.walkers) {
      const p = w.mesh.position;
      const d = danger ? dist2d(p.x, p.z, danger.x, danger.z) : 999;
      if (d < 12) w.panic = 2.5;
      if (w.panic > 0) {
        w.panic -= dt;
        // Run away from the danger.
        const away = Math.atan2(p.x - danger.x, p.z - danger.z);
        w.heading = away;
        w.speed = 5.5;
      } else {
        w.speed = 1.6;
        // Wander: at intersections, sometimes pick a new heading along a sidewalk.
        if (Math.random() < dt * 0.08) w.heading += (Math.random() - 0.5) * 1.2;
      }
      p.x += Math.sin(w.heading) * w.speed * dt;
      p.z += Math.cos(w.heading) * w.speed * dt;
      const lim = CITY / 2 + 20;
      if (p.x > lim || p.x < -lim || p.z > lim || p.z < -lim) {
        w.heading += Math.PI;
        p.x = Math.max(-lim, Math.min(lim, p.x));
        p.z = Math.max(-lim, Math.min(lim, p.z));
      }
      this.harbor.resolveCircle(p, 0.5);
      w.walkPhase += dt * w.speed * 3;
      const swing = Math.sin(w.walkPhase) * 0.5;
      w.mesh.userData.legL.rotation.x = swing;
      w.mesh.userData.legR.rotation.x = -swing;
      w.mesh.rotation.y = w.heading;
    }
  }
}
