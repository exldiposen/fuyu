/**
 * 浮屿 · 环境声
 *
 * 全部用 Web Audio 合成：一层海浪噪声、一条缓慢的持续音、
 * 以及选择、拾取碎片、靠岸、抵达结局时的极简钟声。
 * 不加载任何音频文件。
 */

const MOOD_SOUND = {
  chart: { base: 98.0, fifth: 146.83, cutoff: 520, noise: 0.045 },
  prologue: { base: 110.0, fifth: 164.81, cutoff: 460, noise: 0.05 },
  silent: { base: 98.0, fifth: 146.83, cutoff: 380, noise: 0.035 },
  windless: { base: 130.81, fifth: 196.0, cutoff: 620, noise: 0.03 },
  echo: { base: 146.83, fifth: 220.0, cutoff: 700, noise: 0.028 },
  nameless: { base: 116.54, fifth: 174.61, cutoff: 430, noise: 0.055 },
  scale: { base: 87.31, fifth: 130.81, cutoff: 340, noise: 0.025 },
  paper: { base: 174.61, fifth: 261.63, cutoff: 900, noise: 0.03 },
  tide: { base: 123.47, fifth: 185.0, cutoff: 560, noise: 0.065 },
  finale: { base: 98.0, fifth: 146.83, cutoff: 480, noise: 0.04 },
  "ending-home": { base: 130.81, fifth: 196.0, cutoff: 700, noise: 0.035 },
  "ending-keeper": { base: 98.0, fifth: 146.83, cutoff: 520, noise: 0.04 },
  "ending-drift": { base: 110.0, fifth: 164.81, cutoff: 760, noise: 0.06 },
  "ending-nameless": { base: 87.31, fifth: 130.81, cutoff: 300, noise: 0.05 },
};

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export class Ambience {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.mood = "chart";
    this.nodes = null;
    this.lastBell = 0;
  }

  get supported() {
    return typeof window !== "undefined" && Boolean(window.AudioContext || window.webkitAudioContext);
  }

  ensureContext() {
    if (this.ctx) return this.ctx;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    this.ctx = new Ctor();
    return this.ctx;
  }

  buildGraph() {
    const ctx = this.ctx;
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // 海浪：粉噪声 + 低通
    const length = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const channel = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.018 * white) / 1.018;
      channel[i] = last * 2.8;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.value = 520;
    noiseFilter.Q.value = 0.4;

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.045;

    // 缓慢的潮汐起伏
    const swell = ctx.createOscillator();
    swell.type = "sine";
    swell.frequency.value = 0.07;
    const swellDepth = ctx.createGain();
    swellDepth.gain.value = 0.018;
    const swellOffset = ctx.createGain();
    swellOffset.gain.value = 0.03;
    swell.connect(swellDepth);
    swellDepth.connect(noiseGain.gain);
    swellOffset.connect(noiseGain.gain);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(master);

    // 持续音：根音 + 五度
    const toneGain = ctx.createGain();
    toneGain.gain.value = 0.0001;
    const toneFilter = ctx.createBiquadFilter();
    toneFilter.type = "lowpass";
    toneFilter.frequency.value = 700;
    toneFilter.Q.value = 0.3;

    const root = ctx.createOscillator();
    root.type = "sine";
    const fifth = ctx.createOscillator();
    fifth.type = "triangle";

    const rootGain = ctx.createGain();
    rootGain.gain.value = 0.5;
    const fifthGain = ctx.createGain();
    fifthGain.gain.value = 0.16;

    root.connect(rootGain);
    rootGain.connect(toneFilter);
    fifth.connect(fifthGain);
    fifthGain.connect(toneFilter);
    toneFilter.connect(toneGain);
    toneGain.connect(master);

    // 极慢的呼吸
    const breath = ctx.createOscillator();
    breath.type = "sine";
    breath.frequency.value = 0.045;
    const breathDepth = ctx.createGain();
    breathDepth.gain.value = 0.004;
    breath.connect(breathDepth);
    breathDepth.connect(toneGain.gain);

    noise.start();
    swell.start();
    root.start();
    fifth.start();
    breath.start();

    this.nodes = { master, noiseGain, noiseFilter, root, fifth, toneFilter, toneGain };
    this.applyMood(0.4);
  }

  applyMood(transition = 1.2) {
    if (!this.ctx || !this.nodes) return;
    const settings = MOOD_SOUND[this.mood] || MOOD_SOUND.chart;
    const now = this.ctx.currentTime;
    const { root, fifth, noiseGain, noiseFilter, toneFilter } = this.nodes;
    root.frequency.cancelScheduledValues(now);
    fifth.frequency.cancelScheduledValues(now);
    root.frequency.linearRampToValueAtTime(settings.base, now + transition);
    fifth.frequency.linearRampToValueAtTime(settings.fifth, now + transition);
    noiseGain.gain.cancelScheduledValues(now);
    noiseGain.gain.linearRampToValueAtTime(settings.noise, now + transition);
    noiseFilter.frequency.cancelScheduledValues(now);
    noiseFilter.frequency.linearRampToValueAtTime(settings.cutoff, now + transition);
    toneFilter.frequency.cancelScheduledValues(now);
    toneFilter.frequency.linearRampToValueAtTime(Math.max(240, settings.cutoff * 1.4), now + transition);
  }

  setMood(mood) {
    this.mood = mood;
    if (this.enabled) this.applyMood();
  }

  async enable() {
    if (!this.supported) return false;
    this.ensureContext();
    if (this.ctx.state === "suspended") {
      try {
        await this.ctx.resume();
      } catch {
        return false;
      }
    }
    if (!this.nodes) this.buildGraph();
    const now = this.ctx.currentTime;
    this.nodes.master.gain.cancelScheduledValues(now);
    this.nodes.master.gain.linearRampToValueAtTime(0.7, now + 1.6);
    this.nodes.toneGain.gain.cancelScheduledValues(now);
    this.nodes.toneGain.gain.linearRampToValueAtTime(0.018, now + 2.4);
    this.enabled = true;
    return true;
  }

  disable() {
    if (!this.ctx || !this.nodes) {
      this.enabled = false;
      return;
    }
    const now = this.ctx.currentTime;
    this.nodes.master.gain.cancelScheduledValues(now);
    this.nodes.master.gain.linearRampToValueAtTime(0.0001, now + 0.8);
    this.enabled = false;
  }

  async toggle() {
    if (this.enabled) {
      this.disable();
      return false;
    }
    return this.enable();
  }

  bell(frequency, when, duration, gainValue, pan = 0) {
    const ctx = this.ctx;
    const now = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = frequency;

    const overtone = ctx.createOscillator();
    overtone.type = "sine";
    overtone.frequency.value = frequency * 2.02;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    const overtoneGain = ctx.createGain();
    overtoneGain.gain.value = 0.16;

    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (panner) panner.pan.value = pan;

    osc.connect(gain);
    overtone.connect(overtoneGain);
    overtoneGain.connect(gain);
    if (panner) {
      gain.connect(panner);
      panner.connect(this.nodes.master);
    } else {
      gain.connect(this.nodes.master);
    }

    osc.start(now);
    overtone.start(now);
    osc.stop(now + duration + 0.1);
    overtone.stop(now + duration + 0.1);
  }

  chime(kind = "choice") {
    if (!this.enabled || !this.nodes) return;
    const now = performance.now();
    if (now - this.lastBell < 90) return;
    this.lastBell = now;

    if (kind === "choice") {
      this.bell(660, 0, 0.5, 0.022, -0.15);
      this.bell(990, 0.04, 0.35, 0.012, 0.15);
    } else if (kind === "fragment") {
      this.bell(523.25, 0, 1.8, 0.05, -0.1);
      this.bell(783.99, 0.18, 2.2, 0.035, 0.1);
      this.bell(1046.5, 0.4, 2.6, 0.02, 0);
    } else if (kind === "arrival") {
      this.bell(196, 0, 2.6, 0.05, 0);
      this.bell(293.66, 0.3, 2.2, 0.02, 0.2);
    } else if (kind === "ending") {
      [261.63, 329.63, 392.0, 523.25].forEach((freq, index) => {
        this.bell(freq, index * 0.5, 5.5 - index * 0.4, 0.035, (index - 1.5) * 0.25);
      });
    } else if (kind === "echo") {
      this.bell(440, 0, 0.9, 0.018, 0.2);
      this.bell(440, 0.22, 0.7, 0.009, -0.2);
    }
  }
}

export { midiToFreq };
