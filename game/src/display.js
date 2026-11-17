// display.js — HUD, menus and dialogs for Neon Harbor.
// All DOM lives in index.html; this module wires it, refreshes it every
// frame (only writing when a value changed), and shows story dialogs,
// damage flashes and the BUSTED / WASTED banners.

export function buildHud(G, handlers) {
  const $ = (id) => document.getElementById(id);
  G.ui = {
    hud: $('hud'),
    hpFill: $('hpFill'),
    hpText: $('hpText'),
    cash: $('cash'),
    stars: $('stars'),
    clock: $('clock'),
    speed: $('speed'),
    objTitle: $('objTitle'),
    objText: $('objText'),
    dialog: $('dialog'),
    dialogText: $('dialogText'),
    vignette: $('vignette'),
    banner: $('banner'),
    bannerText: $('bannerText'),
    crosshair: $('crosshair'),
    menu: $('menu'),
    btnNew: $('btnNew'),
    btnContinue: $('btnContinue'),
    pause: $('pause'),
    btnResume: $('btnResume'),
    btnRestart: $('btnRestart'),
    btnSave: $('btnSave'),
    minimap: $('minimap'),
    hint: $('hint'),
    last: {},
  };
  G.ui.btnNew.addEventListener('click', () => handlers.onNew());
  G.ui.btnContinue.addEventListener('click', () => handlers.onContinue());
  G.ui.btnResume.addEventListener('click', () => handlers.onResume());
  G.ui.btnRestart.addEventListener('click', () => handlers.onRestart());
  G.ui.btnSave.addEventListener('click', () => handlers.onSave());
  G.ui.btnContinue.style.display = handlers.hasSave ? '' : 'none';
  G.hurtFlash = 0;
}

export function showDialog(G, text, dur) {
  G.dialogText = text;
  G.dialogUntil = G.elapsed + dur;
}

export function flashDamage(G) {
  G.hurtFlash = 1;
}

function setText(ui, key, value) {
  if (ui.last[key] !== value) {
    ui.last[key] = value;
    ui[key].textContent = value;
  }
}

export function updateHud(G, dt) {
  const ui = G.ui;
  if (!ui.hud) return;
  const inGame = G.mode === 'play' || G.mode === 'busted' || G.mode === 'wasted';
  ui.hud.style.display = inGame ? '' : 'none';
  ui.menu.style.display = G.mode === 'menu' ? '' : 'none';
  ui.pause.style.display = G.mode === 'paused' ? '' : 'none';
  if (!inGame) return;
  // health
  const hpPct = Math.max(0, Math.round((G.hp / G.maxHp) * 100));
  if (ui.last.hp !== hpPct) {
    ui.last.hp = hpPct;
    ui.hpFill.style.width = `${hpPct}%`;
    ui.hpFill.style.background = hpPct > 50 ? '#37d67a' : hpPct > 25 ? '#ffb020' : '#ff4040';
    ui.hpText.textContent = `${hpPct}`;
  }
  setText(ui, 'cash', `$${G.cash}`);
  const stars = '★'.repeat(G.wanted) + '☆'.repeat(5 - G.wanted);
  if (ui.last.stars !== stars) {
    ui.last.stars = stars;
    ui.stars.textContent = stars;
    ui.stars.style.color = G.wanted > 0 ? '#ffd60a' : '#8a8aa0';
  }
  const hh = Math.floor(G.minutes / 60) % 24;
  const mm = Math.floor(G.minutes % 60);
  const clock = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  setText(ui, 'clock', clock);
  const speed = G.driving && G.playerCar ? `${Math.round(Math.abs(G.playerCar.speed) * 3.6)} km/h` : '—';
  setText(ui, 'speed', speed);
  setText(ui, 'objTitle', G.mission.title);
  setText(ui, 'objText', G.mission.text);
  // dialog
  const showDlg = G.elapsed < G.dialogUntil && G.dialogText;
  ui.dialog.style.display = showDlg ? '' : 'none';
  if (showDlg) setText(ui, 'dialogText', G.dialogText);
  // crosshair only on foot while aiming with mouse held
  ui.crosshair.style.display = !G.driving && G.mouse.right ? '' : 'none';
  // banner for busted / wasted
  const banner = G.mode === 'busted' ? 'BUSTED' : G.mode === 'wasted' ? 'WASTED' : '';
  ui.banner.style.display = banner ? '' : 'none';
  if (banner) {
    setText(ui, 'bannerText', banner);
    ui.bannerText.style.color = G.mode === 'busted' ? '#7db4ff' : '#ff5e5e';
  }
  // damage vignette decay
  G.hurtFlash = Math.max(0, (G.hurtFlash || 0) - dt * 1.8);
  ui.vignette.style.opacity = String((G.hurtFlash || 0) * 0.55);
  // hint line swaps with context
  const hint = G.driving
    ? 'W/S drive · A/D steer · E get out · F punch · Right-click shoot'
    : 'WASD move · Shift run · E enter car · F punch · Right-click shoot';
  setText(ui, 'hint', hint);
}
