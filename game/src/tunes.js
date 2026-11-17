// tunes.js — synthesized sound for Neon Harbor.
// Every sound is a WebAudio oscillator or filtered noise burst, built at
// runtime: no audio files, no network. The engine hum follows car speed,
// the siren wails while wanted, and the rest are one-shot effects.

export function initAudio(G) {
  if (G.audio.ctx) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const master = ctx.createGain();
  master.gain.value = 0.16;
  master.connect(ctx.destination);
  // engine: two detuned saws through a lowpass
  const engine = ctx.createOscillator();
  engine.type = 'sawtooth';
  engine.frequency.value = 52;
  const engine2 = ctx.createOscillator();
  engine2.type = 'square';
  engine2.frequency.value = 26;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 320;
  const eg = ctx.createGain();
  eg.gain.value = 0.0;
  engine.connect(lp);
  engine2.connect(lp);
  lp.connect(eg);
  eg.connect(master);
  engine.start();
  engine2.start();
  // siren: a sine that the update loop bends between two tones
  const siren = ctx.createOscillator();
  siren.type = 'sine';
  siren.frequency.value = 720;
  const sg = ctx.createGain();
  sg.gain.value = 0.0;
  siren.connect(sg);
  sg.connect(master);
  siren.start();
  G.audio.ctx = ctx;
  G.audio.master = master;
  G.audio.engine = engine;
  G.audio.engineGain = eg;
  G.audio.siren = siren;
  G.audio.sirenGain = sg;
  G.audio.enabled = true;
  G.audio.thud = () => oneShot(G, 'thud');
  G.audio.shot = () => oneShot(G, 'shot');
  G.audio.jingle = () => oneShot(G, 'jingle');
  G.audio.busted = () => oneShot(G, 'busted');
  G.audio.chime = () => oneShot(G, 'chime');
}

function noiseBuffer(ctx, seconds) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function oneShot(G, kind) {
  const ctx = G.audio.ctx;
  if (!ctx || !G.audio.enabled) return;
  const t = ctx.currentTime;
  if (kind === 'thud') {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.14);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    o.connect(g);
    g.connect(G.audio.master);
    o.start(t);
    o.stop(t + 0.18);
  } else if (kind === 'shot') {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, 0.12);
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 900;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.8, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    src.connect(f);
    f.connect(g);
    g.connect(G.audio.master);
    src.start(t);
  } else if (kind === 'jingle' || kind === 'chime') {
    const notes = kind === 'jingle' ? [523, 659, 784, 1047] : [880, 1175];
    notes.forEach((freq, i) => {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = freq;
      const g = ctx.createGain();
      const start = t + i * 0.09;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(0.35, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      o.connect(g);
      g.connect(G.audio.master);
      o.start(start);
      o.stop(start + 0.4);
    });
  } else if (kind === 'busted') {
    const notes = [392, 311, 233];
    notes.forEach((freq, i) => {
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = freq;
      const g = ctx.createGain();
      const start = t + i * 0.22;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
      o.connect(g);
      g.connect(G.audio.master);
      o.start(start);
      o.stop(start + 0.32);
    });
  }
}

export function stepAudio(G) {
  const a = G.audio;
  if (!a.ctx || !a.enabled) {
    if (a.engineGain) a.engineGain.gain.value = 0;
    if (a.sirenGain) a.sirenGain.gain.value = 0;
    return;
  }
  const t = a.ctx.currentTime;
  // engine hum: audible only while driving
  const target = G.driving && G.playerCar ? 0.05 + Math.abs(G.playerCar.speed) * 0.0016 : 0.0;
  a.engineGain.gain.setTargetAtTime(target, t, 0.1);
  // siren: two-tone wail while wanted
  if (G.wanted > 0) {
    const tone = Math.sin(G.elapsed * 2.4) > 0 ? 660 : 880;
    a.siren.frequency.setTargetAtTime(tone, t, 0.05);
    a.sirenGain.gain.setTargetAtTime(0.05, t, 0.2);
  } else {
    a.sirenGain.gain.setTargetAtTime(0, t, 0.2);
  }
}
