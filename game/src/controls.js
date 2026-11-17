// controls.js — keyboard + mouse input for Neon Harbor.
// Tracks held keys by code, one-frame "edge" presses, and mouse drag
// deltas for camera orbit. No game logic lives here, only input state.

const MOVE_CODES = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

export function bindControls(G) {
  const canvas = G.renderer.domElement;
  window.addEventListener('keydown', (ev) => {
    if (ev.repeat) return;
    G.keys[ev.code] = true;
    G.edge[ev.code] = true;
    if (MOVE_CODES.includes(ev.code) || ev.code === 'Space') ev.preventDefault();
    if (ev.code === 'KeyM') G.audio.enabled = !G.audio.enabled;
  });
  window.addEventListener('keyup', (ev) => {
    G.keys[ev.code] = false;
  });
  window.addEventListener('blur', () => {
    G.keys = {};
  });
  canvas.addEventListener('mousedown', (ev) => {
    if (ev.button === 0) {
      G.mouse.down = true;
      G.edge.Mouse0 = true;
    }
    if (ev.button === 2) {
      G.mouse.right = true;
      G.edge.Mouse2 = true;
    }
    G.mouse.dragging = true;
    G.audio.enabled = true;
  });
  window.addEventListener('mouseup', (ev) => {
    if (ev.button === 0) G.mouse.down = false;
    if (ev.button === 2) G.mouse.right = false;
    G.mouse.dragging = false;
  });
  window.addEventListener('mousemove', (ev) => {
    if (!G.mouse.dragging) return;
    G.mouse.dx += ev.movementX || 0;
    G.mouse.dy += ev.movementY || 0;
  });
  canvas.addEventListener('contextmenu', (ev) => ev.preventDefault());
}

export function clearEdges(G) {
  G.edge = {};
  G.mouse.dx = 0;
  G.mouse.dy = 0;
}

// WASD / arrows as a -1..1 pair, relative to the camera yaw.
export function moveAxes(G) {
  let f = 0;
  let s = 0;
  if (G.keys.KeyW || G.keys.ArrowUp) f += 1;
  if (G.keys.KeyS || G.keys.ArrowDown) f -= 1;
  if (G.keys.KeyA || G.keys.ArrowLeft) s -= 1;
  if (G.keys.KeyD || G.keys.ArrowRight) s += 1;
  return { f, s };
}

export function pressed(G, code) {
  return !!G.edge[code];
}

export function running(G) {
  return !!(G.keys.ShiftLeft || G.keys.ShiftRight);
}
