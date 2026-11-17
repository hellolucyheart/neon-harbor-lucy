// Neon Harbor — the city itself: a sun-soaked grid of streets, blocks of
// buildings with lit windows, neon signs, lamps, palms and harbour props.
// All geometry is procedural boxes; window textures are drawn on a canvas
// at load time, so the game ships no image files.

import * as THREE from 'three';
import { CITY, PALETTE } from './config.js';

function makeWindowTexture(rng, baseColor, litRatio) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 64, 128);
  const cols = 4;
  const rows = 8;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const lit = rng.next() < litRatio;
      ctx.fillStyle = lit ? (rng.next() < 0.5 ? '#ffd166' : '#9be7ff') : '#1a2233';
      ctx.fillRect(4 + c * 15, 6 + r * 15, 10, 9);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeRoadTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#23262e';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = '#d8c95a';
  ctx.fillRect(62, 0, 4, 40);
  ctx.fillRect(62, 88, 4, 40);
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.fillRect(0, 0, 128, 3);
  ctx.fillRect(0, 125, 128, 3);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class City {
  constructor(scene, rng) {
    this.scene = scene;
    this.rng = rng;
    this.colliders = [];
    this.buildings = [];
    this.streetLines = [];
    const half = CITY.half;
    for (let c = -half; c <= half; c += CITY.pitch) this.streetLines.push(c);
    this.build();
  }

  streetCoord(v) {
    let best = this.streetLines[0];
    let bestD = Infinity;
    for (const line of this.streetLines) {
      const d = Math.abs(line - v);
      if (d < bestD) {
        bestD = d;
        best = line;
      }
    }
    return best;
  }

  isOnRoad(x, z) {
    for (const line of this.streetLines) {
      if (Math.abs(x - line) < CITY.roadWidth / 2) return true;
      if (Math.abs(z - line) < CITY.roadWidth / 2) return true;
    }
    return false;
  }

  randomRoadPoint() {
    const horizontal = this.rng.next() < 0.5;
    const line = this.rng.pick(this.streetLines);
    const along = this.rng.range(-CITY.half + 8, CITY.half - 8);
    return horizontal ? { x: along, z: line } : { x: line, z: along };
  }

  /** Push a circle out of every building box it overlaps. Returns true on hit. */
  collideCircle(pos, radius) {
    let hit = false;
    for (const b of this.colliders) {
      const dx = pos.x - Math.max(b.minX, Math.min(pos.x, b.maxX));
      const dz = pos.z - Math.max(b.minZ, Math.min(pos.z, b.maxZ));
      const d2 = dx * dx + dz * dz;
      if (d2 < radius * radius) {
        hit = true;
        const d = Math.sqrt(d2) || 0.001;
        const push = radius - d;
        pos.x += (dx / d) * push;
        pos.z += (dz / d) * push;
      }
    }
    return hit;
  }

  build() {
    const { scene, rng } = this;
    const half = CITY.half;

    // Ground and sea on the south edge.
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(half * 2 + 260, half * 2 + 260),
      new THREE.MeshLambertMaterial({ color: PALETTE.ground }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, 0);
    ground.receiveShadow = true;
    scene.add(ground);

    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(half * 2 + 260, 130),
      new THREE.MeshLambertMaterial({ color: 0x1d6f8e }),
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(0, 0.02, half + 66);
    scene.add(sea);

    // Roads: one plane per street line, dashed centre line in the texture.
    const roadTex = makeRoadTexture();
    const roadMat = new THREE.MeshLambertMaterial({ map: roadTex });
    for (const line of this.streetLines) {
      for (const horizontal of [true, false]) {
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(half * 2, CITY.roadWidth), roadMat.clone());
        plane.material.map = roadTex.clone();
        plane.material.map.repeat.set(half * 2 / 32, 1);
        plane.material.map.needsUpdate = true;
        plane.rotation.x = -Math.PI / 2;
        plane.rotation.z = horizontal ? 0 : Math.PI / 2;
        plane.position.set(horizontal ? 0 : line, 0.02, horizontal ? line : 0);
        plane.receiveShadow = true;
        scene.add(plane);
      }
    }

    // Sidewalk slabs on every block corner.
    const walkMat = new THREE.MeshLambertMaterial({ color: PALETTE.sidewalk });
    const blockSize = CITY.block;
    for (let bx = -half; bx < half; bx += CITY.pitch) {
      for (let bz = -half; bz < half; bz += CITY.pitch) {
        const slab = new THREE.Mesh(new THREE.BoxGeometry(blockSize + 4, 0.3, blockSize + 4), walkMat);
        slab.position.set(bx + CITY.pitch / 2, 0.15, bz + CITY.pitch / 2);
        slab.receiveShadow = true;
        scene.add(slab);
      }
    }

    // Buildings: 1-3 towers per block, heights grow toward the centre.
    const windowTexes = PALETTE.building.map((c) => {
      const hex = '#' + c.toString(16).padStart(6, '0');
      return makeWindowTexture(rng, hex, 0.45);
    });
    const buildingMats = windowTexes.map((tex) => new THREE.MeshLambertMaterial({ map: tex }));
    let texIndex = 0;
    for (let bx = -half; bx < half; bx += CITY.pitch) {
      for (let bz = -half; bz < half; bz += CITY.pitch) {
        const cx = bx + CITY.pitch / 2;
        const cz = bz + CITY.pitch / 2;
        const distCentre = Math.max(Math.abs(cx), Math.abs(cz)) / half;
        const towers = rng.next() < 0.45 ? 2 : 1;
        for (let t = 0; t < towers; t += 1) {
          const w = rng.range(10, blockSize * 0.62);
          const d = rng.range(10, blockSize * 0.62);
          const h = rng.range(9, 9 + (1 - distCentre) * 42 + rng.range(0, 12));
          const ox = towers === 1 ? 0 : (t - 0.5) * (blockSize * 0.36);
          const oz = towers === 1 ? 0 : (rng.next() - 0.5) * (blockSize * 0.3);
          const mat = buildingMats[texIndex % buildingMats.length];
          texIndex += 1;
          const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
          tower.position.set(cx + ox, h / 2 + 0.3, cz + oz);
          tower.castShadow = true;
          tower.receiveShadow = true;
          scene.add(tower);
          this.buildings.push(tower);
          this.colliders.push({
            minX: cx + ox - w / 2 - 0.4,
            maxX: cx + ox + w / 2 + 0.4,
            minZ: cz + oz - d / 2 - 0.4,
            maxZ: cz + oz + d / 2 + 0.4,
          });
          // Rooftop beacon on the tallest towers.
          if (h > 34 && rng.next() < 0.5) {
            const beacon = new THREE.Mesh(
              new THREE.BoxGeometry(1.2, 2.2, 1.2),
              new THREE.MeshBasicMaterial({ color: rng.pick(PALETTE.neon) }),
            );
            beacon.position.set(cx + ox, h + 1.4, cz + oz);
            scene.add(beacon);
          }
        }
      }
    }

    // Neon signs along the main avenue (z = 0) and the marina.
    this.addNeonSign(0, 0, -24, 'NEON HARBOR', 0xff2e88);
    this.addNeonSign(96, 0, 24, 'PALMS', 0x22d3ee);
    this.addNeonSign(-96, 0, -24, 'DOCKS', 0xfacc15);
    this.addNeonSign(176, 0, 160, 'PIER 9', 0xa3e635);

    // Street lamps at intersections (only a few carry a real light).
    const lampMat = new THREE.MeshLambertMaterial({ color: 0x2b2f38 });
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
    let lightCount = 0;
    for (const line of this.streetLines) {
      for (const other of this.streetLines) {
        if (rng.next() < 0.35) continue;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 6.5, 6), lampMat);
        pole.position.set(line + 8, 3.25, other + 8);
        scene.add(pole);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 6), bulbMat);
        bulb.position.set(line + 8, 6.6, other + 8);
        scene.add(bulb);
        if (lightCount < 14) {
          lightCount += 1;
          const light = new THREE.PointLight(0xffe9a8, 12, 18, 1.8);
          light.position.set(line + 8, 6.4, other + 8);
          scene.add(light);
        }
      }
    }

    // Palms and crates near the marina corner.
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2f });
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f8f4e });
    for (let i = 0; i < 26; i += 1) {
      const px = rng.range(-half + 20, half - 20);
      const pz = rng.range(half - 60, half - 8);
      if (this.isOnRoad(px, pz)) continue;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 5, 6), trunkMat);
      trunk.position.set(px, 2.5, pz);
      trunk.rotation.z = rng.range(-0.12, 0.12);
      scene.add(trunk);
      const leaves = new THREE.Mesh(new THREE.ConeGeometry(2.4, 2.2, 7), leafMat);
      leaves.position.set(px, 6, pz);
      scene.add(leaves);
    }
    const crateMat = new THREE.MeshLambertMaterial({ color: 0x8a6a3a });
    for (let i = 0; i < 18; i += 1) {
      const px = rng.range(-half + 16, half - 16);
      const pz = rng.range(-half + 16, half - 16);
      if (this.isOnRoad(px, pz)) continue;
      const crate = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), crateMat);
      crate.position.set(px, 1.3, pz);
      crate.rotation.y = rng.range(0, Math.PI);
      crate.castShadow = true;
      scene.add(crate);
    }
  }

  addNeonSign(x, y, z, text, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#101018';
    ctx.fillRect(0, 0, 512, 96);
    ctx.font = 'bold 54px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#' + color.toString(16).padStart(6, '0');
    ctx.shadowBlur = 22;
    ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
    ctx.fillText(text, 256, 50);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 3),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }),
    );
    sign.position.set(x, 9, z);
    this.scene.add(sign);
  }
}
