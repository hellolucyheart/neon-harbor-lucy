// state.js — shared constants and the single game-state object for Neon Harbor.
// Every module reads and writes fields on the object createGame() returns,
// so the wiring stays obvious: no hidden singletons, no globals.

// Street centrelines: 8 north-south and 8 east-west avenues, 42 units apart.
export const STREETS = [-147, -105, -63, -21, 21, 63, 105, 147];
// Block centres sit halfway between neighbouring streets.
export const BLOCKS = [-126, -84, -42, 0, 42, 84, 126];

export const WORLD = {
  half: 168, // playable city half-extent; water starts past +z
  streetWidth: 13,
  blockSize: 29,
  waterZ: 168,
  pierHalfWidth: 24,
  pierEndZ: 202,
  layoutSeed: 7, // fixed city seed: every screenshot shares one city
};

export const SAVE_KEY = 'neon-harbor-save-v7';

export function createGame() {
  return {
    seed: WORLD.layoutSeed,
    rng: null, // set by entry once the seed is known
    scene: null,
    camera: null,
    renderer: null,
    elapsed: 0,
    minutes: 19 * 60 + 35, // dusk, 19:35
    cash: 250,
    hp: 100,
    maxHp: 100,
    wanted: 0,
    heat: 0, // 0..1, how "hot" the player is; drives wanted decay
    calmTimer: 0, // seconds with no cop nearby
    mode: 'menu', // menu | play | paused | busted | wasted
    driving: false,
    playerCar: null,
    player: {
      x: 0,
      z: 14,
      heading: Math.PI,
      mesh: null,
      walkPhase: 0,
      speed: 0,
      punchCd: 0,
      shootCd: 0,
      hurtCd: 0,
      swing: 0, // punch swing animation 0..1
    },
    camYaw: Math.PI,
    camOffset: 0, // mouse-drag orbit offset, decays back to 0
    camOverride: null, // staging sets a fixed camera pose
    cars: [], // traffic + parked + player-driven car entities
    peds: [],
    cops: [],
    rivals: [],
    colliders: [], // {x0,z0,x1,z1} building footprints
    mission: {
      idx: 0,
      phase: 'go',
      done: false,
      allDone: false,
      target: { x: 0, z: 196 },
      title: 'Meet Riko at the pier',
      text: 'Walk south to the pier and meet your contact.',
      beacon: null,
      packageMesh: null,
      packageTaken: false,
      chaseSpawned: false,
    },
    dialogText: '',
    dialogUntil: 0,
    keys: {},
    edge: {}, // keys pressed this frame only
    mouse: { down: false, right: false, dx: 0, dy: 0, dragging: false },
    ui: {}, // DOM refs, filled by display.js
    audio: { ctx: null, master: null, engine: null, siren: null, sirenOn: false },
    sparks: null,
    stats: { stolen: 0, kos: 0, shots: 0, missions: 0 },
    shot: null, // {name, seed} when running a screenshot pose
    ready: false,
    shake: 0, // camera shake amount
    spots: {}, // named landmark positions, filled by city.js
  };
}
