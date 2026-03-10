/**
 * Sound Manager — Web Audio API based
 * Handles sound effects with low latency
 */

class SoundManager {
  constructor() {
    this.ctx = null;
    this.buffers = {};
    this.enabled = true;
    this.initialized = false;
  }

  /** Initialize AudioContext on first user gesture */
  async init() {
    if (this.initialized) return;

    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;
      await this._generateSounds();
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
      this.enabled = false;
    }
  }

  /** Resume context (required after user gesture) */
  async resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  /** Generate synthetic sounds (no external files needed) */
  async _generateSounds() {
    this.buffers.correct = this._createToneBuffer([523.25, 659.25, 783.99], 0.15, 0.4);
    this.buffers.wrong = this._createToneBuffer([300, 250], 0.12, 0.3);
    this.buffers.tap = this._createToneBuffer([800], 0.05, 0.1);
    this.buffers.coin = this._createToneBuffer([1200, 1600], 0.08, 0.35);
    this.buffers.combo = this._createToneBuffer([523, 659, 784, 1047], 0.12, 0.8);
    this.buffers.complete = this._createToneBuffer([523, 659, 784, 1047, 1319], 0.15, 1.2);
    this.buffers.merge = this._createToneBuffer([400, 600, 800], 0.1, 0.5);
    this.buffers.split = this._createToneBuffer([800, 600, 400], 0.1, 0.5);
  }

  /**
   * Create a synthetic tone buffer
   * @param {number[]} frequencies - Array of frequencies to play in sequence
   * @param {number} noteDuration - Duration per note in seconds
   * @param {number} totalDuration - Total buffer duration
   */
  _createToneBuffer(frequencies, noteDuration, totalDuration) {
    if (!this.ctx) return null;

    const sampleRate = this.ctx.sampleRate;
    const length = Math.ceil(sampleRate * totalDuration);
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < frequencies.length; i++) {
      const freq = frequencies[i];
      const startSample = Math.floor(i * noteDuration * sampleRate);
      const endSample = Math.min(startSample + Math.floor(noteDuration * sampleRate), length);

      for (let s = startSample; s < endSample; s++) {
        const t = (s - startSample) / sampleRate;
        const envelope = Math.exp(-t * 8); // Exponential decay
        data[s] += Math.sin(2 * Math.PI * freq * t) * envelope * 0.3;
      }
    }

    return buffer;
  }

  /** Play a named sound */
  play(name) {
    if (!this.enabled || !this.ctx || !this.buffers[name]) return;

    try {
      const source = this.ctx.createBufferSource();
      source.buffer = this.buffers[name];

      const gain = this.ctx.createGain();
      gain.gain.value = 0.5;

      source.connect(gain);
      gain.connect(this.ctx.destination);
      source.start(0);
    } catch (e) {
      // Silently fail
    }
  }

  /** Toggle sound on/off */
  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  setEnabled(val) {
    this.enabled = val;
  }
}

export const soundManager = new SoundManager();
