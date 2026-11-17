// vehicles.js — mesh factories for Neon Harbor.
// Cars, people and mission beacons, all built from boxes, cylinders and
// spheres with flat Lambert materials. No external models, no textures
// loaded from disk: everything is procedural geometry.

import * as THREE from 'three';

const CAR_COLORS = [0xd64545, 0x3f7fd9, 0xe8b93c, 0x37b57a, 0x8a5fd6, 0xd8d8e0, 0x22222c, 0xff7a3c];

export function randomCarColor(rng) {
  return CAR_COLORS[Math.floor(rng.next() * CAR_COLORS.length)];
}

function wheel() {
  const w = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 0.32, 12),
    new THREE.MeshLambertMaterial({ color: 0x111116 }),
  );
  w.rotation.z = Math.PI / 2;
  return w;
}

export function buildCarMesh(G, color, kind) {
  const group = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color });
  const glass = new THREE.MeshLambertMaterial({ color: 0x182233 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.62, 4.4), paint);
  body.position.y = 0.62;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.55, 2.2), glass);
  cabin.position.set(0, 1.18, -0.25);
  group.add(cabin);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.34, 0.5), paint);
  nose.position.set(0, 0.5, 2.2);
  group.add(nose);
  // headlights + taillights
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  for (const sx of [-0.7, 0.7]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.08), headMat);
    h.position.set(sx, 0.62, 2.46);
    group.add(h);
  }
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  for (const sx of [-0.7, 0.7]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.08), tailMat);
    t.position.set(sx, 0.62, -2.24);
    group.add(t);
  }
  const wheels = [];
  for (const [wx, wz] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const wh = wheel();
    wh.position.set(wx, 0.42, wz);
    group.add(wh);
    wheels.push(wh);
  }
  let lightL = null;
  let lightR = null;
  if (kind === 'cop') {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.5), new THREE.MeshLambertMaterial({ color: 0x1a1a22 }));
    bar.position.set(0, 1.56, -0.25);
    group.add(bar);
    lightL = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.2, 0.52), new THREE.MeshBasicMaterial({ color: 0xff2020 }));
    lightL.position.set(-0.3, 1.58, -0.25);
    group.add(lightL);
    lightR = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.2, 0.52), new THREE.MeshBasicMaterial({ color: 0x2060ff }));
    lightR.position.set(0.3, 1.58, -0.25);
    group.add(lightR);
  }
  group.userData = { wheels, lightL, lightR, kind };
  return group;
}

const PED_PALETTES = [
  { shirt: 0xe2725b, pants: 0x2e4057, skin: 0xd9a066 },
  { shirt: 0x5b8def, pants: 0x333a45, skin: 0x8d5524 },
  { shirt: 0x7ac74f, pants: 0x4a4a55, skin: 0xf1c27d },
  { shirt: 0xd6c35a, pants: 0x22303c, skin: 0xc68642 },
  { shirt: 0xb565d8, pants: 0x2b2b33, skin: 0xffdbac },
  { shirt: 0xdddddd, pants: 0x1f2937, skin: 0xa0663a },
];

export function buildPersonMesh(G, role) {
  const rng = G.rng;
  let pal;
  if (role === 'player') pal = { shirt: 0x14c8b8, pants: 0x1c2733, skin: 0xe8b88a };
  else if (role === 'rival') pal = { shirt: 0xb3202e, pants: 0x191921, skin: 0xd9a066 };
  else if (role === 'riko') pal = { shirt: 0xffb020, pants: 0x2e2a26, skin: 0x8d5524 };
  else pal = PED_PALETTES[Math.floor(rng.next() * PED_PALETTES.length)];
  const g = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: pal.skin });
  const shirt = new THREE.MeshLambertMaterial({ color: pal.shirt });
  const pants = new THREE.MeshLambertMaterial({ color: pal.pants });
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.8, 0.24), pants);
  legL.position.set(-0.14, 0.4, 0);
  const legR = legL.clone();
  legR.position.x = 0.14;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.34), shirt);
  torso.position.y = 1.16;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.4), skin);
  head.position.y = 1.78;
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.66, 0.18), shirt);
  armL.position.set(-0.4, 1.16, 0);
  const armR = armL.clone();
  armR.position.x = 0.4;
  g.add(legL, legR, torso, head, armL, armR);
  g.userData = { legL, legR, armL, armR, torso, head, role };
  return g;
}

export function buildBeaconMesh(color) {
  const g = new THREE.Group();
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 1.6, 26, 12, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }),
  );
  beam.position.y = 13;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.4, 2.1, 24),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.3;
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 10, 8),
    new THREE.MeshBasicMaterial({ color }),
  );
  core.position.y = 1.4;
  g.add(beam, ring, core);
  g.userData = { ring, core };
  return g;
}

export function buildPackageMesh() {
  const g = new THREE.Group();
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.6, 0.9),
    new THREE.MeshLambertMaterial({ color: 0xffd60a, emissive: 0x664d00 }),
  );
  box.position.y = 0.55;
  const strap = new THREE.Mesh(
    new THREE.BoxGeometry(0.94, 0.62, 0.2),
    new THREE.MeshLambertMaterial({ color: 0x22222c }),
  );
  strap.position.y = 0.55;
  g.add(box, strap);
  g.userData = { box };
  return g;
}
