// city.js — builds Neon Harbor: streets, blocks, towers, the pier and the water.
// Everything is procedural (canvas textures for windows and neon signs),
// so the game loads no external asset. Layout is seeded, so the city is
// identical in every screenshot pose.

import * as THREE from 'three';
import { STREETS, BLOCKS, WORLD } from './state.js';

const NEON_WORDS = [
  ['NEON HARBOR', '#ff2d95'],
  ['PIER 9', '#00e5ff'],
  ['TACOS', '#ffb020'],
  ['HOTEL LUMEN', '#c084fc'],
  ['GARAGE 24H', '#7CFC00'],
  ['BAR NOVA', '#ff5e5e'],
  ['CASINO', '#ffd60a'],
  ['DANCE', '#00e5ff'],
  ['RAMEN', '#ff9f1c'],
  ['MOTEL', '#ff2d95'],
];

function windowTexture(rng, litRatio) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#20222e';
  g.fillRect(0, 0, 64, 128);
  const tones = ['#ffd166', '#7dd3fc', '#f472b6', '#fde68a', '#a5b4fc'];
  for (let y = 6; y < 122; y += 12) {
    for (let x = 6; x < 58; x += 10) {
      if (rng.next() < litRatio) {
        g.fillStyle = tones[Math.floor(rng.next() * tones.length)];
        g.globalAlpha = 0.55 + rng.next() * 0.45;
      } else {
        g.fillStyle = '#14161f';
        g.globalAlpha = 1;
      }
      g.fillRect(x, y, 7, 8);
    }
  }
  g.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function neonTexture(word, color) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 512, 128);
  g.font = 'bold 64px Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = color;
  g.shadowBlur = 26;
  g.fillStyle = color;
  g.fillText(word, 256, 64);
  g.shadowBlur = 8;
  g.fillStyle = '#ffffff';
  g.fillText(word, 256, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function roadTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#262633';
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#2e2e3d';
  for (let i = 0; i < 260; i++) {
    g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  }
  g.fillStyle = '#d8d8e6';
  g.fillRect(60, 8, 8, 44);
  g.fillRect(60, 76, 8, 44);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Push a circle out of every building footprint it overlaps.
export function resolveCircleVsBlocks(colliders, x, z, r) {
  let nx = x;
  let nz = z;
  for (const b of colliders) {
    const cx = Math.max(b.x0, Math.min(nx, b.x1));
    const cz = Math.max(b.z0, Math.min(nz, b.z1));
    const dx = nx - cx;
    const dz = nz - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 < 1e-6) {
        // centre inside the block: push out along the smallest penetration axis
        const pl = nx - b.x0;
        const pr = b.x1 - nx;
        const pt = nz - b.z0;
        const pb = b.z1 - nz;
        const m = Math.min(pl, pr, pt, pb);
        if (m === pl) nx = b.x0 - r;
        else if (m === pr) nx = b.x1 + r;
        else if (m === pt) nz = b.z0 - r;
        else nz = b.z1 + r;
      } else {
        const d = Math.sqrt(d2);
        nx = cx + (dx / d) * r;
        nz = cz + (dz / d) * r;
      }
    }
  }
  return { x: nx, z: nz };
}

export function buildHarborCity(G) {
  const rng = G.rng;
  const scene = G.scene;
  const H = WORLD.half;

  // --- sky dome: dusk gradient -------------------------------------------
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 4;
  skyCanvas.height = 256;
  const sg = skyCanvas.getContext('2d');
  const grad = sg.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#1b1740');
  grad.addColorStop(0.45, '#4b2a63');
  grad.addColorStop(0.72, '#c65b7c');
  grad.addColorStop(0.88, '#ff8c5a');
  grad.addColorStop(1, '#2a1e33');
  sg.fillStyle = grad;
  sg.fillRect(0, 0, 4, 256);
  const skyTex = new THREE.CanvasTexture(skyCanvas);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(900, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false }),
  );
  scene.add(sky);
  scene.fog = new THREE.Fog(0x3a2547, 120, 620);

  // --- lights --------------------------------------------------------------
  scene.add(new THREE.HemisphereLight(0x8f7bd8, 0x1c1420, 0.85));
  const sun = new THREE.DirectionalLight(0xffb37a, 1.5);
  sun.position.set(-140, 180, 60);
  scene.add(sun);
  const accentLights = [
    [0, 0, 0xff2d95, 60],
    [0, 190, 0x00e5ff, 55],
    [126, -126, 0xffb020, 45],
    [-126, 126, 0xff5e5e, 45],
  ];
  for (const [x, z, color, dist] of accentLights) {
    const p = new THREE.PointLight(color, 220, dist, 1.6);
    p.position.set(x, 14, z);
    scene.add(p);
  }

  // --- ground, water, pier ---------------------------------------------------
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(H * 2 + 60, H * 2 + 110),
    new THREE.MeshLambertMaterial({ color: 0x1e1e28 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 25);
  scene.add(ground);

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(H * 2 + 60, 90),
    new THREE.MeshLambertMaterial({ color: 0x0d3a5c, transparent: true, opacity: 0.94 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.12, WORLD.waterZ + 45);
  water.name = 'harborWater';
  scene.add(water);
  G.waterMesh = water;

  // pier deck + posts
  const pierMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2f });
  const pier = new THREE.Mesh(new THREE.BoxGeometry(WORLD.pierHalfWidth * 2, 1.2, 36), pierMat);
  pier.position.set(0, 0.6, WORLD.waterZ + 18);
  scene.add(pier);
  for (let x = -20; x <= 20; x += 10) {
    for (let z = WORLD.waterZ + 4; z <= WORLD.waterZ + 32; z += 14) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 3, 8), pierMat);
      post.position.set(x, 0.4, z);
      scene.add(post);
    }
  }

  // --- roads -----------------------------------------------------------------
  const roadTex = roadTexture();
  const roadMat = new THREE.MeshLambertMaterial({ map: roadTex });
  for (const s of STREETS) {
    const ns = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.streetWidth, H * 2 + 8), roadMat.clone());
    ns.material.map = roadTex.clone();
    ns.material.map.needsUpdate = true;
    ns.material.map.repeat.set(1, 26);
    ns.rotation.x = -Math.PI / 2;
    ns.position.set(s, 0.02, 0);
    scene.add(ns);
    const ew = new THREE.Mesh(new THREE.PlaneGeometry(H * 2 + 8, WORLD.streetWidth), roadMat.clone());
    ew.material.map = roadTex.clone();
    ew.material.map.needsUpdate = true;
    ew.material.map.repeat.set(26, 1);
    ew.rotation.x = -Math.PI / 2;
    ew.position.set(0, 0.02, s);
    scene.add(ew);
  }

  // --- blocks: sidewalks, buildings, signs -----------------------------------
  const winTexes = [windowTexture(rng, 0.55), windowTexture(rng, 0.4), windowTexture(rng, 0.7)];
  const concrete = [0x8a8fa3, 0x9c8f7a, 0x7a7f92, 0xa39a8b, 0x6f7488];
  const special = {
    '0,0': 'plaza',
    '126,-126': 'garage',
    '-126,126': 'turf',
    '126,126': 'park',
    '0,126': 'piergate',
  };
  let signIdx = 0;
  for (const bx of BLOCKS) {
    for (const bz of BLOCKS) {
      const key = `${bx},${bz}`;
      const kind = special[key] || 'block';
      const bs = WORLD.blockSize;
      // sidewalk slab
      const walk = new THREE.Mesh(
        new THREE.BoxGeometry(bs, 0.25, bs),
        new THREE.MeshLambertMaterial({ color: kind === 'park' ? 0x2e5d33 : 0x3b3b4a }),
      );
      walk.position.set(bx, 0.12, bz);
      scene.add(walk);
      if (kind === 'plaza') {
        // central fountain + benches
        const basin = new THREE.Mesh(
          new THREE.CylinderGeometry(7, 7.5, 1.1, 20),
          new THREE.MeshLambertMaterial({ color: 0x4a6a8a }),
        );
        basin.position.set(bx, 0.8, bz);
        scene.add(basin);
        const jet = new THREE.Mesh(
          new THREE.CylinderGeometry(0.5, 1.2, 4.5, 10),
          new THREE.MeshLambertMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.75 }),
        );
        jet.position.set(bx, 3.4, bz);
        scene.add(jet);
        continue;
      }
      if (kind === 'park') {
        for (let i = 0; i < 7; i++) {
          const tx = bx + rng.range(-11, 11);
          const tz = bz + rng.range(-11, 11);
          const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.35, 0.5, 3, 7),
            new THREE.MeshLambertMaterial({ color: 0x5a3d24 }),
          );
          trunk.position.set(tx, 1.7, tz);
          scene.add(trunk);
          const top = new THREE.Mesh(
            new THREE.ConeGeometry(2.6, 5, 8),
            new THREE.MeshLambertMaterial({ color: 0x2f7a3d }),
          );
          top.position.set(tx, 5.4, tz);
          scene.add(top);
        }
        continue;
      }
      if (kind === 'garage') {
        const hall = new THREE.Mesh(
          new THREE.BoxGeometry(24, 7, 20),
          new THREE.MeshLambertMaterial({
            color: 0x9c8f76,
            map: winTexes[1],
            emissive: 0xffffff,
            emissiveMap: winTexes[1],
            emissiveIntensity: 0.3,
          }),
        );
        hall.position.set(bx, 3.5, bz);
        scene.add(hall);
        G.colliders.push({ x0: bx - 12, x1: bx + 12, z0: bz - 10, z1: bz + 10 });
        const sign = new THREE.Mesh(
          new THREE.PlaneGeometry(20, 5),
          new THREE.MeshBasicMaterial({ map: neonTexture('GARAGE 24H', '#7CFC00'), transparent: true }),
        );
        sign.position.set(bx, 8.5, bz - 10.2);
        scene.add(sign);
        continue;
      }
      if (kind === 'turf') {
        const den = new THREE.Mesh(
          new THREE.BoxGeometry(22, 9, 18),
          new THREE.MeshLambertMaterial({
            color: 0x9c5a5a,
            map: winTexes[0],
            emissive: 0xffffff,
            emissiveMap: winTexes[0],
            emissiveIntensity: 0.32,
          }),
        );
        den.position.set(bx, 4.5, bz);
        scene.add(den);
        G.colliders.push({ x0: bx - 11, x1: bx + 11, z0: bz - 9, z1: bz + 9 });
        const sign = new THREE.Mesh(
          new THREE.PlaneGeometry(18, 4.5),
          new THREE.MeshBasicMaterial({ map: neonTexture('REDLINE CREW', '#ff5e5e'), transparent: true }),
        );
        sign.position.set(bx, 10.5, bz - 9.2);
        sign.rotation.y = Math.PI; // face north, toward the plaza approach
        scene.add(sign);
        continue;
      }
      // ordinary block: 1-3 towers
      const count = rng.int(1, 3);
      const spots = [
        [-7, -7],
        [7, -7],
        [-7, 7],
        [7, 7],
        [0, 0],
      ];
      for (let i = 0; i < count; i++) {
        const [ox, oz] = spots[i];
        const w = rng.range(9, 13);
        const d = rng.range(9, 13);
        const distC = Math.abs(bx) + Math.abs(bz);
        const h = rng.range(9, distC < 50 ? 42 : 24);
        const tex = winTexes[Math.floor(rng.next() * winTexes.length)];
        const mat = new THREE.MeshLambertMaterial({
          color: concrete[Math.floor(rng.next() * concrete.length)],
          map: tex,
          emissive: 0xffffff,
          emissiveMap: tex,
          emissiveIntensity: 0.35,
        });
        const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        tower.position.set(bx + ox, h / 2 + 0.25, bz + oz);
        scene.add(tower);
        G.colliders.push({
          x0: bx + ox - w / 2,
          x1: bx + ox + w / 2,
          z0: bz + oz - d / 2,
          z1: bz + oz + d / 2,
        });
        // rooftop neon on some towers
        if (rng.chance(0.45)) {
          const [word, color] = NEON_WORDS[signIdx % NEON_WORDS.length];
          signIdx += 1;
          const sign = new THREE.Mesh(
            new THREE.PlaneGeometry(11, 2.8),
            new THREE.MeshBasicMaterial({ map: neonTexture(word, color), transparent: true }),
          );
          sign.position.set(bx + ox, h + 1.8, bz + oz - d / 2 - 0.15);
          scene.add(sign);
        }
      }
    }
  }

  // --- street lamps at intersections ------------------------------------------
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x2c2c38 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  for (const sx of STREETS) {
    for (const sz of STREETS) {
      if ((sx + sz) % 84 !== 0) continue;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 7, 6), poleMat);
      pole.position.set(sx + 7.5, 3.5, sz + 7.5);
      scene.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), bulbMat);
      bulb.position.set(sx + 7.5, 7.1, sz + 7.5);
      scene.add(bulb);
    }
  }

  // --- landmark spots ------------------------------------------------------------
  G.spots = {
    plaza: { x: 0, z: 0 },
    pierContact: { x: 0, z: 196 },
    garage: { x: 126, z: -126 },
    turf: { x: -126, z: 126 },
    park: { x: 126, z: 126 },
    pierGate: { x: 0, z: 140 },
    start: { x: 0, z: 14 },
  };
}
