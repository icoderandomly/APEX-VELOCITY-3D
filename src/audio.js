// ============================================================================
// APEX VELOCITY 3D - Procedural Web Audio API Synthesizer
// Zero external asset dependencies - 100% reliable synthesized racing audio
// ============================================================================

export class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.isInitialized = false;

    // Engine synth nodes
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineGain = null;
    this.engineFilter = null;

    // Tire screech nodes
    this.skidSource = null;
    this.skidGain = null;
    this.skidFilter = null;
  }

  init() {
    if (this.isInitialized) return;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      this.ctx = new AudioContext();

      // Setup Master Engine Synth
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0.0;

      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.value = 400;

      // Distortion shaper for growly engine harmonics
      const distortion = this.ctx.createWaveShaper();
      distortion.curve = this.makeDistortionCurve(20);
      distortion.oversample = '2x';

      // Primary cylinder rumble (sawtooth)
      this.engineOsc1 = this.ctx.createOscillator();
      this.engineOsc1.type = 'sawtooth';
      this.engineOsc1.frequency.value = 45;

      // Sub-harmonic rumble (triangle)
      this.engineOsc2 = this.ctx.createOscillator();
      this.engineOsc2.type = 'triangle';
      this.engineOsc2.frequency.value = 22.5;

      this.engineOsc1.connect(distortion);
      this.engineOsc2.connect(distortion);
      distortion.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);

      this.engineOsc1.start();
      this.engineOsc2.start();

      // Setup Skid / Tire screech generator (White noise through bandpass)
      this.setupSkidSound();

      this.isInitialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  makeDistortionCurve(amount) {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  setupSkidSound() {
    if (!this.ctx) return;

    // 2-second looped noise buffer
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    this.skidFilter = this.ctx.createBiquadFilter();
    this.skidFilter.type = 'bandpass';
    this.skidFilter.frequency.value = 1600;
    this.skidFilter.Q.value = 3.0;

    this.skidGain = this.ctx.createGain();
    this.skidGain.gain.value = 0.0;

    whiteNoise.connect(this.skidFilter);
    this.skidFilter.connect(this.skidGain);
    this.skidGain.connect(this.ctx.destination);

    whiteNoise.start();
    this.skidSource = whiteNoise;
  }

  resume() {
    if (!this.isInitialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) {
      if (this.engineGain) this.engineGain.gain.value = 0;
      if (this.skidGain) this.skidGain.gain.value = 0;
    }
    return this.muted;
  }

  // Update engine sound pitch & volume according to speed and throttle
  updateEngine(speed, maxSpeed, isAccelerating) {
    if (!this.isInitialized || this.muted || !this.ctx) return;

    const normSpeed = Math.min(Math.max(Math.abs(speed) / maxSpeed, 0), 1.2);
    // Simulated 5-gear curve for realistic revving
    const gearProgress = (normSpeed * 5) % 1.0;
    const baseFreq = 40 + normSpeed * 120 + gearProgress * 65;

    const now = this.ctx.currentTime;
    this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.05);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.05);

    // Open filter when accelerating
    const filterCutoff = 350 + normSpeed * 1400 + (isAccelerating ? 700 : 0);
    this.engineFilter.frequency.setTargetAtTime(filterCutoff, now, 0.06);

    const targetGain = 0.12 + normSpeed * 0.16 + (isAccelerating ? 0.06 : 0);
    this.engineGain.gain.setTargetAtTime(targetGain, now, 0.08);
  }

  stopEngine() {
    if (!this.isInitialized || !this.ctx || !this.engineGain) return;
    this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
  }

  // Update tire skid sound
  updateSkid(skidIntensity) {
    if (!this.isInitialized || this.muted || !this.ctx || !this.skidGain) return;

    const intensity = Math.min(Math.max(skidIntensity, 0), 1);
    const targetGain = intensity > 0.15 ? (intensity - 0.15) * 0.35 : 0;
    this.skidGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.04);
  }

  // Collision impact punch sound
  playCrash(intensity = 1.0) {
    if (!this.isInitialized || this.muted || !this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.18);

      const impactVol = Math.min(Math.max(intensity, 0.2), 1.0) * 0.45;
      gain.gain.setValueAtTime(impactVol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.28);
    } catch (e) {
      console.warn(e);
    }
  }

  // Countdown beeps (3, 2, 1, GO)
  playCountdown(count) {
    if (!this.isInitialized || this.muted || !this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const isGo = count === 0;
      osc.type = isGo ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(isGo ? 880 : 440, now);
      if (isGo) {
        osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.3); // High D
      }

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (isGo ? 0.6 : 0.25));

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + (isGo ? 0.65 : 0.3));
    } catch (e) {
      console.warn(e);
    }
  }

  // Victory fanfare arpeggio
  playVictory() {
    if (!this.isInitialized || this.muted || !this.ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      const startTime = this.ctx.currentTime;

      notes.forEach((freq, idx) => {
        const noteTime = startTime + idx * 0.12;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0.2, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.45);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(noteTime);
        osc.stop(noteTime + 0.5);
      });
    } catch (e) {
      console.warn(e);
    }
  }
}
