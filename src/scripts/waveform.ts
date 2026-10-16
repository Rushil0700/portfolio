import { clamp, noise1 } from './env';
import { C, onThemeChange } from './theme';

interface Options {
  interactive: boolean;
  animate: boolean;
  /** Share of the trace still buried in noise, 0..100. */
  onNoise?: (pct: number) => void;
  onMode?: (name: string, index: number) => void;
}

const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/**
 * The clean signal hidden under the noise. It cycles through the kinds of
 * data the projects deal with, so the hero isn't only about audio.
 * Each shape returns roughly -1..1 for u in 0..1 across the canvas.
 */
export const MODES: { name: string; dashFrom?: number; shape: (u: number, t: number, narrow: boolean) => number }[] = [
  {
    name: 'Forecasting',
    dashFrom: 0.78, // last stretch drawn dashed: the forecast
    shape: (u, t, narrow) => -0.55 + u * 0.95 + 0.38 * Math.sin(u * Math.PI * 2 * (narrow ? 2.5 : 4) - t * 0.9),
  },
  {
    name: 'Audio',
    shape: (u, t, narrow) =>
      Math.sin(u * Math.PI * 2 * (narrow ? 5 : 9) - t * 5) * (0.2 + 0.8 * Math.abs(Math.sin(u * Math.PI * 2.2 - t * 0.5))),
  },
  {
    name: 'Finance',
    shape: (u, t) => {
      const v = u * 5 + t * 0.12;
      return (noise1(v + 3) * 0.75 + noise1(v * 2.6 + 9) * 0.3 + noise1(v * 7 + 1) * 0.1) * 0.95 + (u - 0.5) * 0.7;
    },
  },
  {
    name: 'Retrieval',
    // Ranked relevance: a descending staircase of top-k scores.
    shape: (u, t) => {
      const f = u * 7;
      const k = Math.floor(f);
      const level = (i: number) => 0.85 - Math.min(i, 6) * 0.28 + Math.sin(i * 1.7 + t * 0.6) * 0.04;
      return level(k) + (level(k + 1) - level(k)) * smooth(0.82, 1, f - k);
    },
  },
];

/**
 * Oscilloscope-style trace: a clean data shape buried in layered noise.
 * Noise falls away with scroll progress (`clean`) and around the cursor.
 */
export class Waveform {
  /** Intro multiplier: 0 = flat line (matches the preloader hand-off). */
  amp = 0;
  /** 0 → fully noisy, 1 → clean. Driven by scroll. */
  clean = 0;
  /** Easter-egg chaos, 0..1. */
  chaos = 0;
  /** Seconds each data mode holds before morphing to the next. */
  hold = 4.5;

  private mode = 0;
  private prevMode = 0;
  private morph = 1;
  private modeTimer = 0;
  private ctx: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private t = 0;
  private px = -1e4;
  private pStrength = 0;
  private pTarget = 0;
  private raf = 0;
  private last = 0;
  private visible = true;
  private noiseTimer = 0;
  private opts: Options;

  constructor(private canvas: HTMLCanvasElement, opts: Options) {
    this.ctx = canvas.getContext('2d')!;
    this.opts = opts;
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
    onThemeChange(() => {
      if (!opts.animate) this.drawStatic();
      else this.ctx.clearRect(0, 0, this.w, this.h); // drop trails in the old colours
    });

    if (opts.interactive) {
      window.addEventListener('pointermove', (e) => this.onPointer(e), { passive: true });
      document.documentElement.addEventListener('pointerleave', () => (this.pTarget = 0));
    }
    if (opts.animate) {
      new IntersectionObserver(([e]) => {
        this.visible = e.isIntersecting;
        this.visible ? this.start() : this.stop();
      }).observe(canvas);
      document.addEventListener('visibilitychange', () => (document.hidden ? this.stop() : this.visible && this.start()));
    }
  }

  /** Vertical centre of the trace in viewport coordinates. */
  centerY() {
    const r = this.canvas.getBoundingClientRect();
    return r.top + r.height / 2;
  }

  private resize() {
    const r = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = r.width;
    this.h = r.height;
    this.canvas.width = Math.round(r.width * this.dpr);
    this.canvas.height = Math.round(r.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (!this.opts.animate) this.drawStatic();
  }

  private onPointer(e: PointerEvent) {
    if (e.pointerType !== 'mouse') return;
    const r = this.canvas.getBoundingClientRect();
    this.px = e.clientX - r.left;
    const dy = Math.abs(e.clientY - (r.top + r.height / 2));
    this.pTarget = clamp(1 - dy / (r.height * 0.75 + 160));
  }

  start() {
    if (this.raf || !this.opts.animate) return;
    this.last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - this.last) / 1000, 0.05);
      this.last = now;
      this.frame(dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private frame(dt: number) {
    const { ctx, w, h } = this;
    this.t += dt;
    if (this.amp === 0) return; // hidden behind the preloader
    this.pStrength += (this.pTarget - this.pStrength) * Math.min(1, dt * 6);

    // Phosphor persistence: fade the previous frame instead of clearing.
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = `rgba(0,0,0,${this.chaos > 0.05 ? 0.5 : 0.32})`;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';

    // Advance the data mode; morph between shapes over ~1.4 s.
    this.modeTimer += dt;
    if (this.modeTimer > this.hold) {
      this.modeTimer = 0;
      this.prevMode = this.mode;
      this.mode = (this.mode + 1) % MODES.length;
      this.morph = 0;
      this.opts.onMode?.(MODES[this.mode].name, this.mode);
    }
    this.morph = Math.min(1, this.morph + dt / 1.4);
    const m = smooth(0, 1, this.morph);
    const from = MODES[this.prevMode];
    const to = MODES[this.mode];

    const mid = h / 2;
    const A = h * 0.27 * this.amp * (1 + this.chaos * 0.4);
    const lim = h / 2 - 3;
    const sigma = Math.max(110, w * 0.085);
    // Resting noise is high but not total, so the mode's shape stays legible.
    const base = (1 - this.clean) * 0.8;
    const t = this.t;
    const step = w < 700 ? 3 : 2;
    const narrow = w < 700;

    const pts: number[] = [];
    const ghost: number[] = [];
    let sum = 0;
    let n = 0;
    for (let x = 0; x <= w + step; x += step) {
      const u = x / w;
      const sig = from.shape(u, t, narrow) * (1 - m) + to.shape(u, t, narrow) * m;
      const d = x - this.px;
      const prox = this.pStrength * Math.exp(-(d * d) / (2 * sigma * sigma));
      const level = clamp(base * (1 - prox * 0.97), 0, 1) + this.chaos * 1.8;
      const noise =
        noise1(x * 0.011 + t * 2.6) * 0.55 +
        noise1(x * 0.043 - t * 6.5) * 0.32 +
        noise1(x * 0.17 + t * 14) * 0.18 +
        (Math.random() * 2 - 1) * 0.2;
      // Soft-clip like an overdriven scope input instead of leaving the canvas.
      pts.push(x, mid - lim * Math.tanh((A * (sig * (1 - Math.min(level, 1) * 0.3) + noise * level * 1.2)) / lim));
      ghost.push(x, mid - lim * Math.tanh((A * sig) / lim));
      sum += Math.min(level, 1.5);
      n++;
    }
    const dashFrom = m > 0.5 ? to.dashFrom : from.dashFrom;
    // The true signal, faintly, under the noisy trace.
    ctx.beginPath();
    for (let i = 0; i < ghost.length; i += 2) i ? ctx.lineTo(ghost[i], ghost[i + 1]) : ctx.moveTo(ghost[i], ghost[i + 1]);
    ctx.strokeStyle = C.ink(0.35 * Math.min(1, base * 1.6));
    ctx.lineWidth = 1;
    ctx.stroke();
    this.stroke(pts, dashFrom ? dashFrom * w : Infinity);

    this.noiseTimer += dt;
    if (this.opts.onNoise && this.noiseTimer > 0.12) {
      this.noiseTimer = 0;
      this.opts.onNoise(Math.round(clamp(sum / n / 0.8, 0, 1) * 100));
    }
  }

  /** Stroke [x0,y0,x1,y1,…] with a glow; points past `dashX` are a dashed forecast. */
  private stroke(pts: number[], dashX: number) {
    const { ctx } = this;
    const path = (fromX: number, toX: number) => {
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < pts.length; i += 2) {
        if (pts[i] < fromX - 3 || pts[i] > toX + 3) continue;
        started ? ctx.lineTo(pts[i], pts[i + 1]) : ctx.moveTo(pts[i], pts[i + 1]);
        started = true;
      }
    };
    ctx.lineJoin = 'round';
    for (const [a, b, dashed] of [[-Infinity, dashX, false], [dashX, Infinity, true]] as const) {
      if (a >= b || a === Infinity) continue;
      path(a, b);
      ctx.setLineDash(dashed ? [6, 6] : []);
      ctx.strokeStyle = dashed ? C.acc2(0.14) : C.acc(0.14);
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.strokeStyle = dashed ? C.accent2 : C.accent;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  /** Reduced-motion: a single clean frame of the first mode. */
  drawStatic() {
    const { ctx, w, h } = this;
    ctx.clearRect(0, 0, w, h);
    const mode = MODES[0];
    const pts: number[] = [];
    for (let x = 0; x <= w; x += 2) pts.push(x, h / 2 - h * 0.27 * mode.shape(x / w, 0, w < 700));
    this.stroke(pts, mode.dashFrom ? mode.dashFrom * w : Infinity);
    this.opts.onNoise?.(0);
    this.opts.onMode?.(mode.name, 0);
  }
}
