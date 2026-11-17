// quests.js — missions and story for Neon Harbor.
// Four jobs for Riko, a fixer on the pier: a meet, a boost, a getaway and
// a turf war. Each mission moves the beacon, writes the HUD objective and
// pays cash on completion. The story is original: a courier, a crew and a
// harbor that never sleeps.

import { buildBeaconMesh, buildPackageMesh } from './vehicles.js';
import { spawnRivals } from './fight.js';
import { spawnPatrol } from './patrol.js';
import { raiseWanted } from './wanted.js';
import { showDialog } from './display.js';

const MISSIONS = [
  {
    title: 'Meet Riko at the pier',
    text: 'Walk south to the pier and meet your contact.',
    brief: 'Riko: "Lena. You made it. The harbor pays people who move fast and ask nothing. First job is easy — just show up. I have work for you."',
    reward: 150,
  },
  {
    title: 'Boost a ride for the garage',
    text: 'Steal any car (E) and deliver it to the garage on the east side.',
    brief: 'Riko: "Nice. Now I need wheels. Take any car on the street — press E next to one — and bring it to my garage east. The cops will not love it."',
    reward: 300,
  },
  {
    title: 'Lose the heat',
    text: 'The cops are on you. Break line of sight until the stars clear.',
    brief: 'Riko: "That was loud. Harbor PD is rolling. Lose them — stay out of sight and the stars will fade. Call me when you are clean."',
    reward: 400,
  },
  {
    title: 'Take the package from Redline',
    text: 'Fight the Redline crew at their turf, grab the package, bring it back to Riko.',
    brief: 'Riko: "Last job. Redline took my package. Their turf is north-west — punch or shoot your way in, grab the gold case, and bring it back to the pier. This one pays."',
    reward: 800,
  },
];

function targetFor(G, idx) {
  if (idx === 0) return { x: G.spots.pierContact.x, z: G.spots.pierContact.z };
  if (idx === 1) return { x: G.spots.garage.x, z: G.spots.garage.z };
  if (idx === 2) return { x: G.player.x, z: G.player.z }; // no fixed target
  return { x: G.spots.turf.x, z: G.spots.turf.z };
}

export function startMission(G, idx) {
  const m = MISSIONS[idx];
  if (!m) return;
  G.mission.idx = idx;
  G.mission.phase = 'go';
  G.mission.title = m.title;
  G.mission.text = m.text;
  G.mission.target = targetFor(G, idx);
  G.mission.packageTaken = false;
  if (!G.mission.beacon) {
    G.mission.beacon = buildBeaconMesh(0xffd60a);
    G.scene.add(G.mission.beacon);
  }
  G.mission.beacon.visible = idx !== 2;
  G.mission.beacon.position.set(G.mission.target.x, 0, G.mission.target.z);
  showDialog(G, m.brief, 7);
  if (idx === 2) {
    raiseWanted(G, 3, 'mission heat');
    spawnPatrol(G, 1);
  }
  if (idx === 3) {
    spawnRivals(G, G.spots.turf.x, G.spots.turf.z, 3);
  }
}

function completeMission(G) {
  const m = MISSIONS[G.mission.idx];
  G.cash += m.reward;
  G.stats.missions += 1;
  showDialog(G, `Job done — Riko paid you $${m.reward}.`, 5);
  if (G.audio.enabled) G.audio.jingle?.();
  const next = G.mission.idx + 1;
  if (next >= MISSIONS.length) {
    G.mission.allDone = true;
    G.mission.title = 'Free roam — Neon Harbor is yours';
    G.mission.text = 'All jobs done. Explore, steal cars, outrun the law.';
    G.mission.beacon.visible = false;
    showDialog(G, 'Riko: "That is the whole set, Lena. The harbor is yours now — keep the engine warm."', 7);
    return;
  }
  startMission(G, next);
}

export function stepQuests(G, dt) {
  if (G.mission.allDone) return;
  const m = G.mission;
  // beacon pulse
  if (m.beacon && m.beacon.visible) {
    m.beacon.rotation.y += dt * 0.8;
    const s = 1 + Math.sin(G.elapsed * 3) * 0.12;
    m.beacon.userData.ring.scale.set(s, s, 1);
    m.beacon.userData.core.position.y = 1.4 + Math.sin(G.elapsed * 2.2) * 0.35;
  }
  const dx = G.player.x - m.target.x;
  const dz = G.player.z - m.target.z;
  const dist = Math.hypot(dx, dz);
  if (m.idx === 0) {
    if (dist < 5) completeMission(G);
  } else if (m.idx === 1) {
    if (dist < 7 && G.driving) completeMission(G);
  } else if (m.idx === 2) {
    if (G.wanted === 0) completeMission(G);
  } else if (m.idx === 3) {
    const rivalsLeft = G.rivals.filter((r) => r.state !== 'down').length;
    if (m.phase === 'go' && rivalsLeft === 0) {
      // package drops at the turf
      m.phase = 'grab';
      m.packageMesh = buildPackageMesh();
      m.packageMesh.position.set(G.spots.turf.x, 0.25, G.spots.turf.z);
      G.scene.add(m.packageMesh);
      showDialog(G, 'The crew is down. Grab the gold case.', 4);
    }
    if (m.phase === 'grab' && m.packageMesh) {
      const pd = Math.hypot(G.player.x - G.spots.turf.x, G.player.z - G.spots.turf.z);
      if (pd < 3 && !G.driving) {
        G.scene.remove(m.packageMesh);
        m.packageMesh = null;
        m.packageTaken = true;
        m.phase = 'return';
        m.target = { x: G.spots.pierContact.x, z: G.spots.pierContact.z };
        m.beacon.position.set(m.target.x, 0, m.target.z);
        m.text = 'Package secured. Bring it back to Riko at the pier.';
        showDialog(G, 'Package secured. Back to the pier — do not stop for anyone.', 5);
      }
    }
    if (m.phase === 'return') {
      const rd = Math.hypot(G.player.x - G.spots.pierContact.x, G.player.z - G.spots.pierContact.z);
      if (rd < 5) completeMission(G);
    }
  }
}
