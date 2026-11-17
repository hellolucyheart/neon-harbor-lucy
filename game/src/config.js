// Neon Harbor — tuning constants, city layout, mission script and palette.
// Everything the other modules agree on lives here so a single number change
// retunes the whole game.

export const CITY = {
  half: 216, // city spans -216..216 on x and z
  pitch: 48, // distance between street centrelines
  roadWidth: 14,
  block: 48 - 14,
};

export const PLAYER = {
  walkSpeed: 7,
  runSpeed: 11,
  radius: 0.6,
  health: 100,
};

export const CAR = {
  accel: 22,
  brake: 34,
  reverseAccel: 12,
  maxSpeed: 34,
  maxReverse: 10,
  steerRate: 2.4,
  drag: 0.6,
};

export const POLICE = {
  maxSpeed: 36,
  accel: 26,
  bustDistance: 4.2,
  bustTime: 1.6,
  spawnDistance: 55,
};

export const WANTED = {
  stealCar: 25,
  hitPedestrian: 30,
  shoot: 12,
  killThug: 0,
  decayPerSecond: 2.2,
  crimeMemory: 5,
  heatPerStar: 20,
  maxStars: 5,
};

export const MISSIONS = [
  {
    id: 'first-wheels',
    title: 'First Wheels',
    story:
      'Rook needs wheels. Borrow — permanently — any car on the street and bring it to the marina gate.',
    objective: 'Steal a car, then drive to the marina marker',
    steps: [
      { kind: 'steal', text: 'Get in a car (press E near one)' },
      { kind: 'goto', text: 'Drive to the marina marker', pos: [176, 176] },
    ],
    reward: 300,
    timeLimit: 0,
  },
  {
    id: 'harbor-drop',
    title: 'The Harbor Drop',
    story:
      'A crate of "imported" speakers is waiting at the old warehouse. Pick it up and deliver it to the Neon Palms sign before the buyer walks.',
    objective: 'Pick up the crate, then deliver it across town',
    steps: [
      { kind: 'goto', text: 'Reach the warehouse pickup', pos: [-176, -176] },
      { kind: 'goto', text: 'Deliver the crate to the Neon Palms sign', pos: [176, -176] },
    ],
    reward: 500,
    timeLimit: 120,
  },
  {
    id: 'shake-the-heat',
    title: 'Shake the Heat',
    story:
      'The drop went loud. Harbor Patrol is all over the district. Lose them — every last star — and meet Vex at the pier.',
    objective: 'Lose the wanted level, then reach the pier',
    steps: [
      { kind: 'wanted', text: 'Survive the heat — drop your wanted level to zero', want: 3 },
      { kind: 'goto', text: 'Meet Vex at the pier', pos: [-176, 176] },
    ],
    reward: 800,
    timeLimit: 150,
  },
];

export const STORY = {
  hero: 'Rook',
  fixer: 'Vex',
  city: 'Neon Harbor',
  intro:
    'Neon Harbor never sleeps — it just changes shifts. Rook came back to the docks with empty pockets and a name to rebuild. One stolen car, one loud delivery, one long night away from the patrol. That is the whole plan.',
  outro:
    'The pier lights blur into the water. Vex tosses Rook the keys to a real garage. Neon Harbor is theirs now — at least until the next sunrise.',
};

export const PALETTE = {
  sky: 0x8ec9ee,
  fog: 0xa8c8e0,
  ground: 0x3a3f4a,
  road: 0x23262e,
  roadLine: 0xd8c95a,
  sidewalk: 0x6b7280,
  building: [0x2e4a6b, 0x6b3a4a, 0x3a5a44, 0x54426b, 0x71563a, 0x35506b, 0x5a2e3a],
  neon: [0xff2e88, 0x22d3ee, 0xfacc15, 0xa3e635, 0xff7a1a],
  carPaint: [0xd43d2a, 0x2a7fd4, 0xf2b01e, 0x37b24d, 0x8e44ad, 0xe8e8e8, 0x222831],
  policePaint: 0x1c2733,
  thug: 0x7a1f1f,
};

export const SAVE_KEY = 'neon-harbor-save-v1';

export function starsFromHeat(heat) {
  return Math.max(0, Math.min(WANTED.maxStars, Math.floor(heat / WANTED.heatPerStar)));
}

export function formatMoney(n) {
  return '$' + Math.round(n).toLocaleString('en-US');
}

export function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}
