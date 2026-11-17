// spark.js — impact particles and tracers for Neon Harbor.
// One THREE.Points cloud with a fixed budget; bursts reuse dead slots.
// Tracers are stretched, fading boxes fired from the player's pistol.

import * as THREE from 'three';

const MAX_POINTS = 420;

export function createSparks(G) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(MAX_POINTS * 3);
  const col = new Float32Array(MAX_POINTS * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.55,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  G.scene.add(points);
  const sys = {
    pos,
    col,
    vel: new Float32Array(MAX_POINTS * 3),
    life: new Float32Array(MAX_POINTS),
    cursor: 0,
    tracers: [],
    burst(x, y, z, colorHex, n, speed) {
      const c = new THREE.Color(colorHex);
      for (let i = 0; i < n; i++) {
        const k = sys.cursor;
        sys.cursor = (sys.cursor + 1) % MAX_POINTS;
        sys.pos[k * 3] = x;
        sys.pos[k * 3 + 1] = y;
        sys.pos[k * 3 + 2] = z;
        const a = Math.random() * Math.PI * 2;
        const b = Math.random() * Math.PI - Math.PI / 2;
        const s = speed * (0.4 + Math.random() * 0.8);
        sys.vel[k * 3] = Math.cos(a) * Math.cos(b) * s;
        sys.vel[k * 3 + 1] = Math.sin(b) * s + 2.5;
        sys.vel[k * 3 + 2] = Math.sin(a) * Math.cos(b) * s;
        sys.col[k * 3] = c.r;
        sys.col[k * 3 + 1] = c.g;
        sys.col[k * 3 + 2] = c.b;
        sys.life[k] = 0.5 + Math.random() * 0.4;
      }
    },
    tracer(x0, y0, z0, x1, y1, z1) {
      const len = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
      if (len < 0.5) return;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 0.07, len),
        new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.9 }),
      );
      mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      mesh.lookAt(x1, y1, z1);
      G.scene.add(mesh);
      sys.tracers.push({ mesh, life: 0.12 });
    },
    step(dt) {
      for (let k = 0; k < MAX_POINTS; k++) {
        if (sys.life[k] <= 0) {
          sys.pos[k * 3 + 1] = -100; // park dead points below the world
          continue;
        }
        sys.life[k] -= dt;
        sys.vel[k * 3 + 1] -= 14 * dt;
        sys.pos[k * 3] += sys.vel[k * 3] * dt;
        sys.pos[k * 3 + 1] += sys.vel[k * 3 + 1] * dt;
        sys.pos[k * 3 + 2] += sys.vel[k * 3 + 2] * dt;
        if (sys.pos[k * 3 + 1] < 0.1) {
          sys.pos[k * 3 + 1] = 0.1;
          sys.vel[k * 3 + 1] *= -0.35;
        }
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
      for (let i = sys.tracers.length - 1; i >= 0; i--) {
        const t = sys.tracers[i];
        t.life -= dt;
        t.mesh.material.opacity = Math.max(0, t.life / 0.12) * 0.9;
        if (t.life <= 0) {
          G.scene.remove(t.mesh);
          t.mesh.material.dispose();
          t.mesh.geometry.dispose();
          sys.tracers.splice(i, 1);
        }
      }
    },
  };
  return sys;
}
