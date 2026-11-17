// Synthesized sound only — WebAudio oscillators and noise, no audio files.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.bassTimer = null;
    this.muted = false;
  }

  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.35;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch (err) {
      this.ctx = null;
    }
  }

  ready() {
    return !!this.ctx && this.ctx.state === 'running';
  }

  tone(freq, dur, type = 'sine', vol = 0.2, slideTo = null) {
    if (!this.ready()) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  noiseBurst(dur, vol = 0.3, lowpass = 1200) {
    if (!this.ready()) return;
    const t = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter).connect(g).connect(this.master);
    src.start(t);
  }

  shoot() {
    this.noiseBurst(0.14, 0.5, 2600);
    this.tone(180, 0.09, 'square', 0.16, 60);
  }

  thugShot() {
    this.noiseBurst(0.12, 0.22, 1800);
  }

  pickup() {
    [523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.16, 'triangle', 0.22), i * 70);
    });
  }

  crash() {
    this.noiseBurst(0.35, 0.5, 700);
    this.tone(90, 0.25, 'sawtooth', 0.2, 40);
  }

  bustedSting() {
    [392, 311, 233].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.4, 'sawtooth', 0.18), i * 180);
    });
  }

  startEngine() {
    if (!this.ready() || this.engineOsc) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.value = 55;
    g.gain.value = 0.0;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    o.connect(filter).connect(g).connect(this.master);
    o.start();
    this.engineOsc = o;
    this.engineGain = g;
  }

  setEngine(speed01, driving) {
    if (!this.engineOsc || !this.ready()) return;
    const t = this.ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(52 + speed01 * 130, t, 0.08);
    this.engineGain.gain.setTargetAtTime(driving ? 0.05 + speed01 * 0.06 : 0.0, t, 0.1);
  }

  startSiren() {
    if (!this.ready() || this.sirenOsc) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = 750;
    g.gain.value = 0.045;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.9;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 260;
    lfo.connect(lfoGain).connect(o.frequency);
    o.connect(g).connect(this.master);
    o.start();
    lfo.start();
    this.sirenOsc = o;
    this.sirenLfo = lfo;
  }

  stopSiren() {
    if (!this.sirenOsc) return;
    try { this.sirenOsc.stop(); this.sirenLfo.stop(); } catch (err) { /* already stopped */ }
    this.sirenOsc = null;
    this.sirenLfo = null;
  }

  startBassline() {
    if (!this.ready() || this.bassTimer) return;
    const roots = [55, 55, 65.41, 49];
    let step = 0;
    this.bassTimer = setInterval(() => {
      if (!this.ready()) return;
      const root = roots[Math.floor(step / 4) % roots.length];
      const note = step % 4 === 3 ? root * 1.5 : root;
      this.tone(note, 0.32, 'triangle', 0.1);
      if (step % 2 === 0) this.tone(root * 2, 0.1, 'sine', 0.05);
      step++;
    }, 300);
  }
}
