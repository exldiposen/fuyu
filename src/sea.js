/**
 * 浮屿 · 海面
 *
 * 一块由 Canvas 绘制的、随岛屿情绪变化的背景：
 * 星空、雾、潮汐、灯塔光束、纸月、回声环、秤星。
 * 不加载任何图片或字体，全部程序化生成。
 */

const PALETTES = {
  chart: {
    skyTop: "#060b15", skyBottom: "#0c1524", seaTop: "#0a1422", seaBottom: "#04080f",
    glow: "#f2c777", glowAlpha: 0.16, fog: "#8fa3c0", fogAlpha: 0.075,
    stars: 0.7, waves: 0.55, lighthouse: false, moon: false, rings: false,
    wakes: false, hanging: false, paper: false,
  },
  prologue: {
    skyTop: "#070c17", skyBottom: "#101a2c", seaTop: "#0b1524", seaBottom: "#050a12",
    glow: "#9fb4d6", glowAlpha: 0.1, fog: "#aebdd6", fogAlpha: 0.1,
    stars: 0.35, waves: 0.42, lighthouse: false, moon: false, rings: false,
    wakes: false, hanging: false, paper: false,
  },
  silent: {
    skyTop: "#080e1a", skyBottom: "#101a2e", seaTop: "#0b1727", seaBottom: "#050a12",
    glow: "#ffd98a", glowAlpha: 0.2, fog: "#b7c4d8", fogAlpha: 0.085,
    stars: 0.35, waves: 0.3, lighthouse: true, moon: false, rings: false,
    wakes: false, hanging: false, paper: false,
  },
  windless: {
    skyTop: "#071416", skyBottom: "#0c2226", seaTop: "#0b2528", seaBottom: "#041012",
    glow: "#a9d6c8", glowAlpha: 0.12, fog: "#a9d6c8", fogAlpha: 0.06,
    stars: 0.12, waves: 0.12, lighthouse: false, moon: false, rings: false,
    wakes: true, hanging: false, paper: false,
  },
  echo: {
    skyTop: "#0b0a1a", skyBottom: "#171331", seaTop: "#100d25", seaBottom: "#060411",
    glow: "#c2b3e0", glowAlpha: 0.16, fog: "#9d92bd", fogAlpha: 0.075,
    stars: 0.55, waves: 0.25, lighthouse: false, moon: false, rings: true,
    wakes: false, hanging: false, paper: false,
  },
  nameless: {
    skyTop: "#0c0f14", skyBottom: "#161b22", seaTop: "#0e141a", seaBottom: "#05080b",
    glow: "#d8d0c0", glowAlpha: 0.1, fog: "#bfc4c9", fogAlpha: 0.15,
    stars: 0.2, waves: 0.35, lighthouse: false, moon: false, rings: false,
    wakes: true, hanging: false, paper: false,
  },
  scale: {
    skyTop: "#0f0b06", skyBottom: "#221708", seaTop: "#191006", seaBottom: "#080402",
    glow: "#e8a95c", glowAlpha: 0.2, fog: "#c8a06a", fogAlpha: 0.05,
    stars: 0.5, waves: 0.3, lighthouse: false, moon: false, rings: false,
    wakes: false, hanging: true, paper: false,
  },
  paper: {
    skyTop: "#080a17", skyBottom: "#12162c", seaTop: "#0a1024", seaBottom: "#040611",
    glow: "#f0e6cf", glowAlpha: 0.22, fog: "#c8cde0", fogAlpha: 0.06,
    stars: 0.75, waves: 0.28, lighthouse: false, moon: true, rings: false,
    wakes: false, hanging: false, paper: true,
  },
  tide: {
    skyTop: "#150e13", skyBottom: "#2a1a1c", seaTop: "#1c1214", seaBottom: "#080405",
    glow: "#e8b4a0", glowAlpha: 0.16, fog: "#d8b8ae", fogAlpha: 0.05,
    stars: 0.25, waves: 0.8, lighthouse: false, moon: false, rings: false,
    wakes: true, hanging: false, paper: false,
  },
  vow: {
    skyTop: "#120e12", skyBottom: "#282028", seaTop: "#1c1420", seaBottom: "#080508",
    glow: "#e0c0a8", glowAlpha: 0.18, fog: "#c8b8c4", fogAlpha: 0.08,
    stars: 0.3, waves: 0.42, lighthouse: false, moon: false, rings: false,
    wakes: false, hanging: true, paper: false,
  },
  fold: {
    skyTop: "#0a1218", skyBottom: "#14262e", seaTop: "#102028", seaBottom: "#04080c",
    glow: "#9fd0d8", glowAlpha: 0.15, fog: "#a8c4cc", fogAlpha: 0.07,
    stars: 0.5, waves: 0.22, lighthouse: false, moon: false, rings: false,
    wakes: true, hanging: false, paper: false,
  },
  finale: {
    skyTop: "#080b15", skyBottom: "#121a2a", seaTop: "#0a1220", seaBottom: "#04060c",
    glow: "#f6cf7a", glowAlpha: 0.24, fog: "#bfc8d8", fogAlpha: 0.06,
    stars: 0.6, waves: 0.45, lighthouse: true, beam: true, moon: false, rings: false,
    wakes: false, hanging: false, paper: false,
  },
  "ending-home": {
    skyTop: "#120b0a", skyBottom: "#553528", seaTop: "#553528", seaBottom: "#0a0605",
    glow: "#ffd7a8", glowAlpha: 0.2, fog: "#e8cbb8", fogAlpha: 0.06,
    stars: 0.05, waves: 0.3, lighthouse: false, moon: false, rings: false,
    wakes: false, hanging: false, paper: false,
  },
  "ending-keeper": {
    skyTop: "#080d18", skyBottom: "#101b2c", seaTop: "#0a1422", seaBottom: "#04070d",
    glow: "#ffd98a", glowAlpha: 0.26, fog: "#b7c4d8", fogAlpha: 0.07,
    stars: 0.7, waves: 0.4, lighthouse: true, beam: true, moon: false, rings: false,
    wakes: false, hanging: false, paper: false,
  },
  "ending-drift": {
    skyTop: "#071018", skyBottom: "#0d2230", seaTop: "#0a1a25", seaBottom: "#040a0f",
    glow: "#9fd8d0", glowAlpha: 0.15, fog: "#9fc4c8", fogAlpha: 0.08,
    stars: 0.6, waves: 0.7, lighthouse: false, moon: true, rings: false,
    wakes: true, hanging: false, paper: false,
  },
  "ending-nameless": {
    skyTop: "#0a0d12", skyBottom: "#121922", seaTop: "#0b1218", seaBottom: "#04070a",
    glow: "#aeb8c4", glowAlpha: 0.08, fog: "#b8c0ca", fogAlpha: 0.16,
    stars: 0.2, waves: 0.25, lighthouse: false, moon: false, rings: false,
    wakes: false, hanging: false, paper: false,
  },
};

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class SeaScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: true });
    this.mood = "chart";
    this.palette = PALETTES.chart;
    this.time = 0;
    this.raf = 0;
    this.last = 0;
    this.running = false;
    this.ripples = [];
    this.pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    this.reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

    this.stars = this.makeStars(110);
    this.fogBlobs = this.makeFog(9);

    this._onResize = () => this.resize();
    this._onVisibility = () => {
      if (document.hidden) this.pause();
      else this.play();
    };
    this._onPointer = (event) => {
      this.pointer.tx = event.clientX / Math.max(1, window.innerWidth);
      this.pointer.ty = event.clientY / Math.max(1, window.innerHeight);
    };
    this._onDown = (event) => {
      if (this.reduceMotion) return;
      this.ripples.push({
        x: event.clientX,
        y: event.clientY,
        born: performance.now(),
        strength: 0.5 + Math.random() * 0.4,
      });
      if (this.ripples.length > 6) this.ripples.shift();
    };

    window.addEventListener("resize", this._onResize, { passive: true });
    document.addEventListener("visibilitychange", this._onVisibility);
    window.addEventListener("pointermove", this._onPointer, { passive: true });
    window.addEventListener("pointerdown", this._onDown, { passive: true });

    this.fogSprite = this.makeFogSprite(this.palette.fog);
    this.resize();
    this.renderOnce();
  }

  makeStars(count) {
    const random = mulberry32(20260214);
    return Array.from({ length: count }, () => ({
      x: random(),
      y: random() * 0.62,
      r: 0.4 + random() * 1.5,
      a: 0.2 + random() * 0.7,
      phase: random() * Math.PI * 2,
      speed: 0.15 + random() * 0.5,
    }));
  }

  makeFog(count) {
    const random = mulberry32(19870604);
    return Array.from({ length: count }, (_, index) => ({
      x: random() * 1.2 - 0.1,
      y: 0.45 + random() * 0.24,
      scale: 0.3 + random() * 0.75,
      alpha: 0.35 + random() * 0.65,
      speed: 0.004 + random() * 0.012,
      phase: random() * Math.PI * 2,
      drift: (random() - 0.5) * 0.02,
      index,
    }));
  }

  makeFogSprite(color) {
    const size = 320;
    const sprite = document.createElement("canvas");
    sprite.width = size;
    sprite.height = size;
    const ctx = sprite.getContext("2d");
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, this.hexToRgba(color, 0.5));
    gradient.addColorStop(0.45, this.hexToRgba(color, 0.16));
    gradient.addColorStop(1, this.hexToRgba(color, 0));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    return sprite;
  }

  hexToRgba(hex, alpha) {
    const value = hex.replace("#", "");
    const full = value.length === 3
      ? value.split("").map((c) => c + c).join("")
      : value;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (!this.running) this.renderOnce();
  }

  setMood(mood) {
    const next = PALETTES[mood] ? mood : "chart";
    if (next === this.mood) return;
    this.mood = next;
    this.palette = PALETTES[next];
    this.fogSprite = this.makeFogSprite(this.palette.fog);
    if (!this.running) this.renderOnce();
  }

  play() {
    if (this.running) return;
    if (this.reduceMotion) {
      this.renderOnce();
      return;
    }
    this.running = true;
    this.last = performance.now();
    const tick = (now) => {
      if (!this.running) return;
      const delta = Math.min(64, now - this.last);
      this.last = now;
      this.time += delta / 1000;
      this.draw(this.time);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  pause() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  renderOnce() {
    this.draw(this.reduceMotion ? 12 : 0);
  }

  draw(time) {
    const { ctx, width: w, height: h, palette: p } = this;
    if (!w || !h) return;

    this.pointer.x += (this.pointer.tx - this.pointer.x) * 0.04;
    this.pointer.y += (this.pointer.ty - this.pointer.y) * 0.04;

    const horizon = h * 0.635;

    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, p.skyTop);
    sky.addColorStop(1, p.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, horizon + 1);

    const sea = ctx.createLinearGradient(0, horizon, 0, h);
    sea.addColorStop(0, p.seaTop);
    sea.addColorStop(1, p.seaBottom);
    ctx.fillStyle = sea;
    ctx.fillRect(0, horizon, w, h - horizon);

    this.drawStars(time, horizon);
    this.drawMoon(time, horizon);
    this.drawHorizonGlow(horizon);
    this.drawHangingStars(time, horizon);
    this.drawSea(time, horizon);
    this.drawHorizonMist(horizon);
    this.drawWakes(time, horizon);
    this.drawRings(time, horizon);
    this.drawIsland(time, horizon);
    this.drawFog(time);
    this.drawRipples(time);

    // 远近两层暗角，让文字始终落在暗处
    const vignette = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.22, w * 0.5, h * 0.5, Math.max(w, h) * 0.78);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(0.7, "rgba(0,0,0,0.18)");
    vignette.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  }

  drawStars(time, horizon) {
    const { ctx, width: w, palette: p } = this;
    if (!p.stars) return;
    const shift = (this.pointer.x - 0.5) * 14;
    for (const star of this.stars) {
      const x = star.x * w + shift * (0.3 + star.r * 0.2);
      const y = star.y * horizon;
      const twinkle = 0.55 + 0.45 * Math.sin(time * star.speed + star.phase);
      ctx.globalAlpha = star.a * twinkle * p.stars;
      ctx.fillStyle = "#f4ecd8";
      ctx.beginPath();
      ctx.arc(x, y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawMoon(time, horizon) {
    const { ctx, width: w, palette: p } = this;
    if (!p.moon) return;
    const x = w * 0.72;
    const y = horizon * 0.3;
    const r = Math.min(w, horizon) * 0.135;

    const halo = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 2.6);
    halo.addColorStop(0, "rgba(240, 230, 207, 0.18)");
    halo.addColorStop(1, "rgba(240, 230, 207, 0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#efe6d2";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    if (p.paper) {
      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.strokeStyle = "#5b5446";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.92, y + r * 0.22);
      ctx.lineTo(x + r * 0.12, y - r * 0.07);
      ctx.lineTo(x + r * 0.9, y + r * 0.34);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + r * 0.02, y - r * 0.98);
      ctx.lineTo(x + r * 0.28, y + r * 0.02);
      ctx.lineTo(x + r * 0.18, y + r * 0.96);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(x - r * 0.25, y + r * 0.2, r * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + r * 0.3, y - r * 0.35, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawHorizonGlow(horizon) {
    const { ctx, width: w, palette: p } = this;
    const x = p.lighthouse ? w * 0.18 : w * 0.5;
    const glow = ctx.createRadialGradient(x, horizon, 0, x, horizon, w * 0.5);
    glow.addColorStop(0, this.hexToRgba(p.glow, p.glowAlpha));
    glow.addColorStop(0.5, this.hexToRgba(p.glow, p.glowAlpha * 0.3));
    glow.addColorStop(1, this.hexToRgba(p.glow, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, horizon - w * 0.32, w, w * 0.32);
  }

  drawHangingStars(time, horizon) {
    const { ctx, width: w, palette: p } = this;
    if (!p.hanging) return;
    ctx.save();
    ctx.strokeStyle = "rgba(232, 169, 92, 0.25)";
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 7; i += 1) {
      const x = w * (0.16 + i * 0.115);
      const sway = Math.sin(time * 0.35 + i) * 6;
      const top = horizon * (0.04 + i * 0.015);
      const length = horizon * (0.18 + (i % 3) * 0.06);
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.quadraticCurveTo(x + sway, top + length * 0.5, x + sway * 1.8, top + length);
      ctx.stroke();
      ctx.fillStyle = "rgba(246, 205, 122, 0.75)";
      ctx.beginPath();
      ctx.arc(x + sway * 1.8, top + length, 1.6 + (i % 3) * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawSea(time, horizon) {
    const { ctx, width: w, height: h, palette: p } = this;
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.055)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    ctx.lineTo(w, horizon);
    ctx.stroke();

    const lines = 34;
    for (let i = 0; i < lines; i += 1) {
      const depth = i / lines;
      const y = horizon + Math.pow(depth, 1.7) * (h - horizon);
      const alpha = 0.012 + depth * 0.075 * p.waves;
      const sway = Math.sin(time * (0.14 + depth * 0.22) + i * 0.7) * (6 + depth * 22);
      ctx.strokeStyle = `rgba(196, 216, 236, ${alpha})`;
      ctx.lineWidth = 0.6 + depth * 1.2;
      ctx.beginPath();
      ctx.moveTo(-20 + sway, y);
      ctx.quadraticCurveTo(w * 0.5 + sway * 1.6, y - 1.5 - depth * 2, w + 20 + sway, y);
      ctx.stroke();
    }

    // 灯塔在水面的倒影
    if (p.lighthouse && w >= 640) {
      const x = w * 0.14;
      const reflection = ctx.createLinearGradient(x, horizon, x, horizon + (h - horizon) * 0.55);
      reflection.addColorStop(0, this.hexToRgba(p.glow, 0.15));
      reflection.addColorStop(1, this.hexToRgba(p.glow, 0));
      ctx.fillStyle = reflection;
      ctx.beginPath();
      ctx.moveTo(x - 14, horizon);
      ctx.lineTo(x + 14, horizon);
      ctx.lineTo(x + 34, horizon + (h - horizon) * 0.55);
      ctx.lineTo(x - 34, horizon + (h - horizon) * 0.55);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  drawHorizonMist(horizon) {
    const { ctx, width: w, height: h, palette: p } = this;
    const band = Math.min(h * 0.16, 180);
    const gradient = ctx.createLinearGradient(0, horizon - band * 0.6, 0, horizon + band * 0.6);
    gradient.addColorStop(0, this.hexToRgba(p.fog, 0));
    gradient.addColorStop(0.5, this.hexToRgba(p.fog, Math.min(0.18, p.fogAlpha * 2.2)));
    gradient.addColorStop(1, this.hexToRgba(p.fog, 0));
    ctx.save();
    ctx.fillStyle = gradient;
    ctx.fillRect(0, horizon - band * 0.6, w, band * 1.2);
    ctx.restore();
  }

  drawWakes(time, horizon) {
    const { ctx, width: w, height: h, palette: p } = this;
    if (!p.wakes) return;
    ctx.save();
    ctx.lineCap = "round";
    for (let i = 0; i < 4; i += 1) {
      const y = horizon + (h - horizon) * (0.18 + i * 0.17);
      const drift = Math.sin(time * 0.18 + i) * 10;
      ctx.strokeStyle = `rgba(190, 220, 214, ${0.06 + i * 0.012})`;
      ctx.lineWidth = 1 + i * 0.3;
      ctx.setLineDash([2, 18]);
      ctx.lineDashOffset = -time * 12 - i * 30;
      ctx.beginPath();
      ctx.moveTo(w * 0.08 + drift, y);
      ctx.bezierCurveTo(w * 0.3, y - 10, w * 0.62, y + 14, w * 0.94 + drift, y - 4);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  }

  drawRings(time, horizon) {
    const { ctx, width: w, height: h, palette: p } = this;
    if (!p.rings) return;
    const x = w * 0.5;
    const y = horizon + (h - horizon) * 0.45;
    ctx.save();
    for (let i = 0; i < 6; i += 1) {
      const phase = (time * 0.22 + i / 6) % 1;
      const radius = phase * Math.min(w, h) * 0.36;
      ctx.strokeStyle = `rgba(194, 179, 224, ${(1 - phase) * 0.14})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(x, y, radius, radius * 0.32, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawIsland(time, horizon) {
    const { ctx, width: w, height: h, palette: p } = this;
    if (!p.lighthouse) return;
    // 窄屏上让位给文字：海、雾与星光已经足够
    if (w < 640) return;

    const x = w * 0.14;
    const baseY = horizon + 3;
    const scale = Math.min(Math.min(w, h) * 0.085, 95);

    ctx.save();
    // 礁石：不规则的一小片黑色
    ctx.fillStyle = "rgba(4, 8, 14, 0.92)";
    ctx.beginPath();
    ctx.moveTo(x - scale * 1.25, baseY);
    ctx.lineTo(x - scale * 0.96, baseY - scale * 0.12);
    ctx.lineTo(x - scale * 0.7, baseY - scale * 0.3);
    ctx.lineTo(x - scale * 0.36, baseY - scale * 0.22);
    ctx.lineTo(x - scale * 0.08, baseY - scale * 0.4);
    ctx.lineTo(x + scale * 0.2, baseY - scale * 0.28);
    ctx.lineTo(x + scale * 0.54, baseY - scale * 0.34);
    ctx.lineTo(x + scale * 0.86, baseY - scale * 0.14);
    ctx.lineTo(x + scale * 1.22, baseY);
    ctx.closePath();
    ctx.fill();

    // 塔身
    const towerH = scale * 1.75;
    const topY = baseY - towerH;
    ctx.fillStyle = "rgba(7, 12, 20, 0.98)";
    ctx.beginPath();
    ctx.moveTo(x - scale * 0.22, baseY - scale * 0.2);
    ctx.lineTo(x - scale * 0.11, topY);
    ctx.lineTo(x + scale * 0.11, topY);
    ctx.lineTo(x + scale * 0.22, baseY - scale * 0.2);
    ctx.closePath();
    ctx.fill();

    // 塔身的横纹
    ctx.strokeStyle = this.hexToRgba(p.glow, 0.16);
    ctx.lineWidth = 0.8;
    for (let i = 1; i <= 3; i += 1) {
      const y = baseY - scale * 0.2 - (towerH - scale * 0.2) * (i / 4);
      const half = scale * (0.22 - 0.11 * (i / 4));
      ctx.beginPath();
      ctx.moveTo(x - half, y);
      ctx.lineTo(x + half, y);
      ctx.stroke();
    }

    // 灯室
    ctx.fillStyle = this.hexToRgba(p.glow, 0.9);
    ctx.beginPath();
    ctx.arc(x, topY + scale * 0.02, scale * 0.085, 0, Math.PI * 2);
    ctx.fill();

    const halo = ctx.createRadialGradient(x, topY, 0, x, topY, scale * 0.85);
    halo.addColorStop(0, this.hexToRgba(p.glow, 0.5));
    halo.addColorStop(1, this.hexToRgba(p.glow, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, topY, scale * 0.85, 0, Math.PI * 2);
    ctx.fill();

    if (p.beam) {
      const swing = Math.sin(time * 0.35) * 0.55;
      ctx.globalCompositeOperation = "lighter";
      ctx.save();
      ctx.translate(x, topY);
      ctx.rotate(swing);
      const beam = ctx.createLinearGradient(0, 0, w * 0.62, 0);
      beam.addColorStop(0, this.hexToRgba(p.glow, 0.22));
      beam.addColorStop(0.6, this.hexToRgba(p.glow, 0.04));
      beam.addColorStop(1, this.hexToRgba(p.glow, 0));
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(0, -2);
      ctx.lineTo(w * 0.62, -w * 0.06);
      ctx.lineTo(w * 0.62, w * 0.02);
      ctx.lineTo(0, 2);
      ctx.closePath();
      ctx.fill();

      const back = ctx.createLinearGradient(0, 0, -w * 0.34, 0);
      back.addColorStop(0, this.hexToRgba(p.glow, 0.1));
      back.addColorStop(1, this.hexToRgba(p.glow, 0));
      ctx.fillStyle = back;
      ctx.beginPath();
      ctx.moveTo(0, -2);
      ctx.lineTo(-w * 0.34, -w * 0.035);
      ctx.lineTo(-w * 0.34, w * 0.02);
      ctx.lineTo(0, 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.globalCompositeOperation = "source-over";
    }
    ctx.restore();
  }

  drawFog(time) {
    const { ctx, width: w, height: h, palette: p } = this;
    if (!p.fogAlpha) return;
    ctx.save();
    for (const blob of this.fogBlobs) {
      const x = ((blob.x + Math.sin(time * blob.speed + blob.phase) * 0.05 + blob.drift * time * 0.02) % 1.3) * w - w * 0.15;
      const y = (blob.y + Math.sin(time * blob.speed * 0.7 + blob.phase) * 0.012) * h;
      const size = Math.min(w, h) * blob.scale * 1.9;
      ctx.globalAlpha = p.fogAlpha * blob.alpha;
      ctx.drawImage(this.fogSprite, x - size / 2, y - size / 2, size, size);
    }
    ctx.restore();
  }

  drawRipples(time) {
    const { ctx } = this;
    if (this.ripples.length === 0) return;
    const now = performance.now();
    ctx.save();
    for (const ripple of this.ripples) {
      const age = (now - ripple.born) / 1000;
      if (age > 2.2) continue;
      const radius = age * 140;
      ctx.strokeStyle = `rgba(220, 232, 244, ${Math.max(0, 0.22 - age * 0.1) * ripple.strength})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(ripple.x, ripple.y, radius, radius * 0.34, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    this.ripples = this.ripples.filter((ripple) => now - ripple.born < 2300);
    ctx.restore();
  }
}

export { PALETTES };
