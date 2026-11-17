// Builds the city of Marisol Bay: street grid, lit towers, neon signs, palms, sea.
// Static geometry is merged into a few meshes per material so the scene stays
// light on draw calls even on software renderers.
import * as THREE from 'three';
import { Dice } from './rng.js';

export const BLOCK = 30;      // building block side
export const ROAD = 16;       // road width
export const GRID = 9;        // blocks per side
export const PITCH = BLOCK + ROAD;
export const CITY = GRID * PITCH + ROAD; // total span, centered at 0

export function streetCoord(i) {
  return -CITY / 2 + ROAD / 2 + i * PITCH;
}

export function roadCoord(i) {
  return -CITY / 2 + ROAD + BLOCK / 2 + i * PITCH;
}

function windowTexture(dice) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#2c3557';
  g.fillRect(0, 0, 64, 128);
  for (let y = 6; y < 122; y += 12) {
    for (let x = 5; x < 58; x += 11) {
      if (dice.chance(0.55)) {
        g.fillStyle = dice.pick(['#ffd166', '#7df0ff', '#ff9ecf', '#fff3c4']);
        g.globalAlpha = dice.float(0.5, 1);
      } else {
        g.fillStyle = '#0d1122';
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
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#0a0a18';
  g.fillRect(0, 0, 256, 64);
  g.font = 'bold 34px Arial';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = color;
  g.shadowBlur = 18;
  g.fillStyle = color;
  g.fillText(word, 128, 34);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Merge indexed geometries (position/normal/uv) into one BufferGeometry.
function mergeGeometries(geoms) {
  let vCount = 0;
  let iCount = 0;
  for (const g of geoms) {
    vCount += g.getAttribute('position').count;
    iCount += g.getIndex().count;
  }
  const pos = new Float32Array(vCount * 3);
  const nor = new Float32Array(vCount * 3);
  const uv = new Float32Array(vCount * 2);
  const idx = new Uint32Array(iCount);
  let vOff = 0;
  let iOff = 0;
  for (const g of geoms) {
    const p = g.getAttribute('position');
    const n = g.getAttribute('normal');
    const u = g.getAttribute('uv');
    const ix = g.getIndex();
    pos.set(p.array, vOff * 3);
    nor.set(n.array, vOff * 3);
    if (u) uv.set(u.array, vOff * 2);
    for (let i = 0; i < ix.count; i++) idx[iOff + i] = ix.getX(i) + vOff;
    vOff += p.count;
    iOff += ix.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}

// Collects transformed geometries per material, then emits one mesh each.
class Batcher {
  constructor(scene) {
    this.scene = scene;
    this.buckets = new Map(); // material -> geometry[]
  }

  add(material, geometry, x, y, z, ry = 0, rx = 0, rz = 0) {
    const g = geometry.clone();
    const m = new THREE.Matrix4();
    const e = new THREE.Euler(rx, ry, rz);
    m.makeRotationFromEuler(e);
    m.setPosition(x, y, z);
    g.applyMatrix4(m);
    let bucket = this.buckets.get(material);
    if (!bucket) {
      bucket = [];
      this.buckets.set(material, bucket);
    }
    bucket.push(g);
  }

  flush() {
    for (const [material, geoms] of this.buckets) {
      const mesh = new THREE.Mesh(mergeGeometries(geoms), material);
      this.scene.add(mesh);
    }
    this.buckets.clear();
  }
}

export class Harbor {
  constructor(scene, seed = 1) {
    this.scene = scene;
    this.dice = new Dice(seed);
    this.colliders = []; // {minX,maxX,minZ,maxZ}
    this.signs = ['MARLIN', 'PALMS', 'NEON', 'HARBOUR', 'TIDE', 'CORAL', 'PIER 9', 'SUNSET', 'LAGOON', 'VELVET'];
    this.batch = new Batcher(scene);
    this.buildGround();
    this.buildBlocks();
    this.buildSea();
    this.buildSky();
    this.batch.flush();
  }

  addCollider(x, z, halfW, halfD) {
    this.colliders.push({ minX: x - halfW, maxX: x + halfW, minZ: z - halfD, maxZ: z + halfD });
  }

  // Push a circle (player/car) out of every building box it overlaps.
  resolveCircle(pos, radius) {
    for (const b of this.colliders) {
      const cx = Math.max(b.minX, Math.min(pos.x, b.maxX));
      const cz = Math.max(b.minZ, Math.min(pos.z, b.maxZ));
      const dx = pos.x - cx;
      const dz = pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < radius * radius) {
        if (d2 > 0.0001) {
          const d = Math.sqrt(d2);
          pos.x = cx + (dx / d) * radius;
          pos.z = cz + (dz / d) * radius;
        } else {
          pos.x = b.maxX + radius;
        }
        return true;
      }
    }
    return false;
  }

  buildGround() {
    const b = this.batch;
    const half = CITY / 2 + 60;
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x2f3550, roughness: 0.95 });
    const groundGeo = new THREE.PlaneGeometry(half * 2, half * 2);
    b.add(groundMat, groundGeo, 0, -0.05, 0, 0, -Math.PI / 2, 0);

    const roadMat = new THREE.MeshStandardMaterial({ color: 0x232838, roughness: 0.9 });
    const roadV = new THREE.PlaneGeometry(ROAD, CITY + ROAD);
    const roadH = new THREE.PlaneGeometry(CITY + ROAD, ROAD);
    for (let i = 0; i <= GRID; i++) {
      const c = streetCoord(i);
      b.add(roadMat, roadV, c, 0, 0, 0, -Math.PI / 2, 0);
      b.add(roadMat, roadH, 0, 0.01, c, 0, -Math.PI / 2, 0);
    }
    const walkMat = new THREE.MeshStandardMaterial({ color: 0x4a5068, roughness: 1 });
    const walkV = new THREE.PlaneGeometry(3.2, CITY + ROAD);
    const walkH = new THREE.PlaneGeometry(CITY + ROAD, 3.2);
    for (let i = 0; i <= GRID; i++) {
      const c = streetCoord(i);
      for (const off of [-ROAD / 2 - 1.6, ROAD / 2 + 1.6]) {
        b.add(walkMat, walkV, c + off, 0.02, 0, 0, -Math.PI / 2, 0);
        b.add(walkMat, walkH, 0, 0.03, c + off, 0, -Math.PI / 2, 0);
      }
    }
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xd8c95a });
    const dashGeo = new THREE.PlaneGeometry(0.5, 3);
    for (let i = 0; i <= GRID; i++) {
      const c = streetCoord(i);
      for (let t = -CITY / 2; t < CITY / 2; t += 8) {
        b.add(dashMat, dashGeo, c, 0.04, t, 0, -Math.PI / 2, 0);
      }
    }
  }

  buildBlocks() {
    const dice = this.dice;
    const b = this.batch;
    const towerMats = [0, 1, 2].map(() => new THREE.MeshStandardMaterial({ map: windowTexture(dice), roughness: 0.85 }));
    const lampMat = new THREE.MeshStandardMaterial({ color: 0x2c2f3a, roughness: 0.6, metalness: 0.6 });
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 1 });
    const palmMat = new THREE.MeshStandardMaterial({ color: 0x2f9e5f, roughness: 0.9 });
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff4040 });
    const neonColors = ['#ff2e88', '#37e0ff', '#ffd166', '#7dff9b', '#c77dff'];
    const neonMats = new Map();
    const neonMatFor = (word, color) => {
      const key = word + color;
      let m = neonMats.get(key);
      if (!m) {
        m = new THREE.MeshBasicMaterial({ map: neonTexture(word, color), transparent: true });
        neonMats.set(key, m);
      }
      return m;
    };

    const boxGeo = (w, h, d) => new THREE.BoxGeometry(w, h, d);
    const beaconGeo = new THREE.SphereGeometry(0.5, 8, 8);
    const signGeo = new THREE.PlaneGeometry(12, 3);
    const trunkGeo = new THREE.CylinderGeometry(0.25, 0.4, 5, 6);
    const crownGeo = new THREE.ConeGeometry(2.2, 2.4, 7);
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 6.5, 6);
    const bulbGeo = new THREE.SphereGeometry(0.35, 8, 8);

    for (let bx = 0; bx < GRID; bx++) {
      for (let bz = 0; bz < GRID; bz++) {
        const cx = roadCoord(bx);
        const cz = roadCoord(bz);
        const towers = dice.int(1, 4);
        for (let k = 0; k < towers; k++) {
          const w = dice.float(9, 15);
          const d = dice.float(9, 15);
          const h = dice.float(12, 52);
          const ox = dice.float(-BLOCK / 2 + w / 2 + 2, BLOCK / 2 - w / 2 - 2);
          const oz = dice.float(-BLOCK / 2 + d / 2 + 2, BLOCK / 2 - d / 2 - 2);
          const mat = towerMats[dice.int(0, 2)];
          b.add(mat, boxGeo(w, h, d), cx + ox, h / 2, cz + oz);
          this.addCollider(cx + ox, cz + oz, w / 2, d / 2);
          if (h > 34) {
            b.add(beaconMat, beaconGeo, cx + ox, h + 0.6, cz + oz);
          }
          if (dice.chance(0.5)) {
            const word = this.signs[(bx * GRID + bz + k) % this.signs.length];
            const color = neonColors[(bx + bz + k) % neonColors.length];
            b.add(neonMatFor(word, color), signGeo, cx + ox, Math.min(h - 2, 20), cz + oz + d / 2 + 0.15);
          }
        }
        for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          if (!dice.chance(0.6)) continue;
          const x = cx + px * (BLOCK / 2 - 2);
          const z = cz + pz * (BLOCK / 2 - 2);
          b.add(trunkMat, trunkGeo, x, 2.5, z);
          b.add(palmMat, crownGeo, x, 6, z);
        }
      }
    }
    for (let i = 0; i <= GRID; i++) {
      const c = streetCoord(i);
      for (let t = -CITY / 2 + 10; t < CITY / 2; t += 46) {
        for (const [x, z] of [[c - ROAD / 2 - 0.6, t], [c + ROAD / 2 + 0.6, t + 23]]) {
          b.add(lampMat, poleGeo, x, 3.25, z);
          b.add(bulbMat, bulbGeo, x, 6.6, z);
        }
      }
    }
  }

  buildSea() {
    const b = this.batch;
    const seaMat = new THREE.MeshStandardMaterial({ color: 0x0e4a6e, roughness: 0.25, metalness: 0.35 });
    b.add(seaMat, new THREE.PlaneGeometry(260, CITY + 320), CITY / 2 + 60 + 130, -0.4, 0, 0, -Math.PI / 2, 0);
    const sandMat = new THREE.MeshStandardMaterial({ color: 0xc9a86a, roughness: 1 });
    b.add(sandMat, new THREE.PlaneGeometry(24, CITY + 320), CITY / 2 + 60, -0.2, 0, 0, -Math.PI / 2, 0);
    const pierMat = new THREE.MeshStandardMaterial({ color: 0x7a5a38, roughness: 1 });
    b.add(pierMat, new THREE.BoxGeometry(8, 1, 60), CITY / 2 + 78, 0.4, 40);
    const hullMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.5 });
    for (let i = 0; i < 4; i++) {
      b.add(hullMat, new THREE.BoxGeometry(3, 1.4, 9), CITY / 2 + 88 + (i % 2) * 6, 0.3, 22 + i * 13);
    }
  }

  buildSky() {
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(900, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0x4a3670, side: THREE.BackSide, fog: false })
    );
    this.scene.add(sky);
    const sun = new THREE.Mesh(
      new THREE.CircleGeometry(34, 24),
      new THREE.MeshBasicMaterial({ color: 0xff9a3d, fog: false })
    );
    sun.position.set(-620, 90, -420);
    sun.lookAt(0, 60, 0);
    this.scene.add(sun);
  }
}
