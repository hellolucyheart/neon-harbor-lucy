// Neon Harbor — every sound is synthesized with WebAudio. No audio files,
// no network: oscillators, filtered noise and a tiny step sequencer.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicTimer = null;
    this.musicStep = 0;
    this.engineOsc = null;
    this.engineGain = null;
    this.engineFilter = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenLfo = null;
    this.muted = false;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.startEngineHum();
      this.startMusic();
    } catch {
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  tone(freq, duration, type, volume, slideTo) {
    if (!this.ctx) return;
    const t = this.now();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + duration);
    gain.gain.setValueAtTime(volume || 0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  noiseBurst(duration, volume, filterFreq) {
    if (!this.ctx) return;
    const t = this.now();
    const length = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq || 1800;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume || 0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(t);
  }

  startEngineHum() {
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 55;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    osc.start();
    this.engineOsc = osc;
    this.engineGain = gain;
    this.engineFilter = filter;
  }

  /** speedRatio 0..1 while driving; 0 and silent when on foot. */
  setEngine(speedRatio, driving) {
    if (!this.engineOsc) return;
    const t = this.now();
    const target = driving ? 0.05 + speedRatio * 0.09 : 0;
    this.engineGain.gain.setTargetAtTime(target, t, 0.08);
    this.engineOsc.frequency.setTargetAtTime(50 + speedRatio * 130, t, 0.08);
    this.engineFilter.frequency.setTargetAtTime(280 + speedRatio * 900, t, 0.1);
  }

  setSiren(on) {
    if (!this.ctx) return;
    if (on && !this.sirenOsc) {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = 700;
      const lfo = this.ctx.createOscillator();
      lfo.type = 'square';
      lfo.frequency.value = 0.55;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 240;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      const gain = this.ctx.createGain();
      gain.gain.value = 0.045;
      osc.connect(gain);
      gain.connect(this.master);
      osc.start();
      lfo.start();
      this.sirenOsc = osc;
      this.sirenGain = gain;
      this.sirenLfo = lfo;
    } else if (!on && this.sirenOsc) {
      try {
        this.sirenOsc.stop();
        this.sirenLfo.stop();
      } catch {
        // Already stopped.
      }
      this.sirenOsc = null;
      this.sirenGain = null;
      this.sirenLfo = null;
    }
  }

  shot() {
    this.noiseBurst(0.12, 0.4, 2600);
    this.tone(140, 0.08, 'square', 0.16, 60);
  }

  enemyShot() {
    this.noiseBurst(0.1, 0.16, 2000);
  }

  hit() {
    this.tone(220, 0.07, 'square', 0.14, 110);
  }

  hurt() {
    this.tone(110, 0.25, 'sawtooth', 0.25, 55);
    this.noiseBurst(0.18, 0.2, 900);
  }

  pickup() {
    this.tone(660, 0.09, 'sine', 0.22);
    setTimeout(() => this.tone(880, 0.12, 'sine', 0.22), 70);
    setTimeout(() => this.tone(1320, 0.16, 'sine', 0.18), 140);
  }

  missionComplete() {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, 0.22, 'triangle', 0.22), i * 110));
  }

  busted() {
    [392, 330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, 'sawtooth', 0.16), i * 160));
  }

  crash() {
    this.noiseBurst(0.3, 0.4, 700);
    this.tone(70, 0.25, 'sine', 0.3, 35);
  }

  click() {
    this.tone(900, 0.05, 'square', 0.1);
  }

  startMusic() {
    if (this.musicTimer) return;
    // A slow neon-noir bassline: A minor walk, one step every 240 ms.
    const bass = [55, 0, 55, 0, 65.41, 0, 55, 0, 49, 0, 49, 0, 61.74, 0, 73.42, 0];
    const sparkle = [440, 0, 0, 523.25, 0, 0, 659.25, 0, 0, 0, 587.33, 0, 0, 523.25, 0, 0];
    this.musicTimer = setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running') return;
      const step = this.musicStep % 16;
      const b = bass[step];
      if (b) this.tone(b, 0.22, 'triangle', 0.075);
      const s = sparkle[step];
      if (s && this.musicStep % 32 >= 16) this.tone(s, 0.18, 'sine', 0.03);
      this.musicStep += 1;
    }, 240);
  }
}
