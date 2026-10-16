/**
 * Generative "plates": the placeholders used until real screenshots exist
 * (set `image` in src/data/projects.ts). Featured projects get product
 * mock-ups (hbp, speech, chat, aqi, funds); the rest get diagrams of what
 * the project does. Example text in the mock-ups is illustrative.
 */
import { clamp, hashString, noise1, noise2, rng } from './env';
import { C } from './theme';
import type { ArtKind } from '../data/projects';

const MONO = '500 11px "JetBrains Mono", ui-monospace, monospace';
const SANS = (px: number, w = 450) => `${w} ${px}px "Inter Tight Variable", "Inter Tight", system-ui, sans-serif`;

type Ctx = CanvasRenderingContext2D;
type R = () => number;

export function drawArt(canvas: HTMLCanvasElement, kind: ArtKind, seedKey: string, caption = '') {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cssW = Math.max(320, rect.width || 800);
  const cssH = Math.max(200, rect.height || 500);
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  // Mock-ups are laid out for a ~720px plate and scaled up on bigger ones,
  // so a full-width project page shows the same UI, just larger.
  const k = kind in mockups ? Math.max(1, cssW / 720) : 1;
  const W = cssW / k;
  const H = cssH / k;
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr * k, 0, 0, dpr * k, 0, 0);
  const r = rng(hashString(seedKey));

  ctx.fillStyle = C.raise;
  ctx.fillRect(0, 0, W, H);
  // dot grid
  ctx.fillStyle = C.ink(0.05);
  for (let y = 4; y < H; y += 12) for (let x = 4; x < W; x += 12) ctx.fillRect(x, y, 1, 1);

  const pad = Math.max(22, Math.min(W, H) * 0.08);
  const box = { x: pad, y: pad + 4, w: W - pad * 2, h: H - pad * 2 - (caption ? 26 : 0) };
  painters[kind](ctx, box, r, W, H);

  // frame furniture
  ctx.strokeStyle = C.mid;
  ctx.lineWidth = 1;
  const t = 10;
  for (const [cx, cy, sx, sy] of [[12, 12, 1, 1], [W - 12, 12, -1, 1], [12, H - 12, 1, -1], [W - 12, H - 12, -1, -1]]) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + t * sy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + t * sx, cy);
    ctx.stroke();
  }
  if (caption) {
    ctx.font = MONO;
    ctx.fillStyle = C.muted;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(caption.toUpperCase(), 24, H - 22);
  }
}

type Box = { x: number; y: number; w: number; h: number };
type Painter = (ctx: Ctx, b: Box, r: R, W: number, H: number) => void;

function label(ctx: Ctx, text: string, x: number, y: number, color = C.muted, align: CanvasTextAlign = 'left') {
  ctx.font = MONO;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
  ctx.textAlign = 'left';
}


/* ── UI mock-up helpers ─────────────────────────────────── */
function rr(ctx: Ctx, x: number, y: number, w: number, h: number, rad = 6) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, rad);
}
/** Draw text, truncating with an ellipsis to fit `max` px. */
function txt(ctx: Ctx, s: string, x: number, y: number, font: string, color: string, max = Infinity, align: CanvasTextAlign = 'left') {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  let out = s;
  if (ctx.measureText(out).width > max) {
    while (out.length > 1 && ctx.measureText(out + '…').width > max) out = out.slice(0, -1);
    out = out.trimEnd() + '…';
  }
  ctx.fillText(out, x, y);
  ctx.textAlign = 'left';
}
function panel(ctx: Ctx, x: number, y: number, w: number, h: number, stroke = C.dim, fill = C.panel) {
  rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 8);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

function drawCandles(ctx: Ctx, b: Box, r: R, forecastLabel = true) {
  const n = Math.max(18, Math.round(b.w / 11));
  const split = Math.round(n * 0.76);
  const vals: number[] = [];
  let v = 0;
  for (let i = 0; i < n; i++) {
    v += (r() - 0.44) * 1.2;
    vals.push(v);
  }
  const ma = (i: number) => (vals[i] + vals[i - 1] + vals[i - 2] + vals[i - 3]) / 4;
  const span = n - 1 - split;
  // Keep the forecast cone (±0.25/step around +0.35/step) inside the box.
  const lo = Math.min(...vals.slice(0, split), ma(split) + span * 0.1) - 2;
  const hi = Math.max(...vals.slice(0, split), ma(split) + span * 0.6) + 2;
  const Y = (x: number) => b.y + b.h - ((x - lo) / (hi - lo)) * b.h;
  const cw = b.w / n;
  let prev = vals[0];
  for (let i = 0; i < split; i++) {
    const o = prev;
    const c = vals[i];
    const x = b.x + i * cw + cw / 2;
    ctx.fillStyle = C.mid;
    ctx.fillRect(x, Y(Math.max(o, c) + r() * 0.7), 1, Y(Math.min(o, c) - r() * 0.7) - Y(Math.max(o, c) + r() * 0.7));
    const up = c >= o;
    const yTop = Y(Math.max(o, c));
    const hgt = Math.max(1.5, Y(Math.min(o, c)) - yTop);
    ctx.fillStyle = up ? C.light : C.dim2;
    ctx.fillRect(x - cw * 0.3, yTop, cw * 0.6, hgt);
    prev = c;
  }
  ctx.beginPath();
  for (let i = 3; i <= split; i++) {
    const x = b.x + i * cw + cw / 2;
    i === 3 ? ctx.moveTo(x, Y(ma(i))) : ctx.lineTo(x, Y(ma(i)));
  }
  ctx.strokeStyle = C.accent;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // forecast cone + dashed path
  const sx = b.x + split * cw + cw / 2;
  const start = ma(split);
  ctx.beginPath();
  ctx.moveTo(sx, Y(start));
  for (let i = split + 1; i < n; i++) ctx.lineTo(b.x + i * cw + cw / 2, Y(start + (i - split) * 0.35 + (i - split) * 0.25));
  for (let i = n - 1; i > split; i--) ctx.lineTo(b.x + i * cw + cw / 2, Y(start + (i - split) * 0.35 - (i - split) * 0.25));
  ctx.closePath();
  ctx.fillStyle = C.acc(0.08);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(sx, Y(start));
  for (let i = split + 1; i < n; i++) ctx.lineTo(b.x + i * cw + cw / 2, Y(start + (i - split) * 0.35));
  ctx.setLineDash([3, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineWidth = 1;
  ctx.fillStyle = C.dim;
  ctx.fillRect(sx, b.y, 1, b.h);
  if (forecastLabel) label(ctx, 'FORECAST →', sx + 6, b.y + b.h - 2, C.accent);
}

const mockups: Record<'hbp' | 'speech' | 'chat' | 'aqi' | 'funds', Painter> = {
  /** HBP Finder: clinical case in, ranked PMJAY packages out. */
  hbp(ctx, b, r) {
    const wide = b.w > 520;
    const lw = wide ? b.w * 0.64 : b.w;
    label(ctx, 'CLINICAL CASE', b.x, b.y + 9);
    panel(ctx, b.x, b.y + 16, lw, 34, C.mid);
    txt(ctx, '⌕', b.x + 12, b.y + 38, SANS(14), C.muted);
    txt(ctx, '54 y/o, chest pain, ST elevation on ECG', b.x + 32, b.y + 38, SANS(13.5), C.text, lw - 44);
    const results: [string, string, number][] = [
      ['CARDIOLOGY', 'Coronary angioplasty (PTCA)', 0.93],
      ['CARDIOLOGY', 'Thrombolysis — acute MI', 0.71],
      ['GENERAL MEDICINE', 'Acute coronary syndrome', 0.46],
    ];
    const top = b.y + 66;
    label(ctx, 'TOP MATCHES', b.x, top + 4);
    const rowH = Math.min(46, (b.y + b.h - top - 12) / 3);
    results.forEach(([spec, name, score], i) => {
      const y = top + 12 + i * rowH;
      const h = rowH - 6;
      panel(ctx, b.x, y, lw, h, i === 0 ? C.accent : C.dim);
      const barW = Math.min(90, lw * 0.22);
      const tx = b.x + 12;
      const textMax = lw - barW - 40;
      if (h > 34) {
        txt(ctx, spec, tx, y + 15, MONO, i === 0 ? C.accent : C.muted, textMax);
        txt(ctx, name, tx, y + h - 9, SANS(13.5, 500), C.text, textMax);
      } else {
        txt(ctx, name, tx, y + h / 2 + 4.5, SANS(13, 500), C.text, textMax);
      }
      const bx = b.x + lw - barW - 12;
      ctx.fillStyle = C.dim;
      ctx.fillRect(bx, y + h / 2 - 2, barW, 4);
      ctx.fillStyle = i === 0 ? C.accent : C.muted;
      ctx.fillRect(bx, y + h / 2 - 2, barW * score, 4);
    });
    if (!wide) return;
    // package space: 2,441 dots, the matches lit
    const gx = b.x + lw + 22;
    const gw = b.x + b.w - gx;
    label(ctx, '2,441 PACKAGES', gx, b.y + 9);
    const gy = b.y + 22;
    const gh = b.y + b.h - gy;
    const cols = Math.max(10, Math.round(Math.sqrt((2441 * gw) / gh)));
    const rows = Math.ceil(2441 / cols);
    const sx = gw / cols;
    const sy = gh / rows;
    const hits = new Set([Math.floor(r() * 2441), Math.floor(r() * 2441), Math.floor(r() * 2441)]);
    for (let i = 0; i < 2441; i++) {
      const x = gx + (i % cols) * sx;
      const y = gy + Math.floor(i / cols) * sy;
      ctx.fillStyle = hits.has(i) ? C.accent : C.dim2;
      const s = hits.has(i) ? 4 : 1.4;
      ctx.fillRect(x - s / 2, y - s / 2, s, s);
    }
  },

  /** Speech enhancement: noisy lane in, clean lane out. */
  speech(ctx, b, r) {
    const gap = 26;
    const laneH = (b.h - gap - 20) / 2;
    const lanes = [
      { y: b.y + 14, name: 'NOISY INPUT', clean: false },
      { y: b.y + 14 + laneH + gap, name: 'ENHANCED OUTPUT', clean: true },
    ];
    const step = 3;
    const env = (x: number) => clamp(noise1(x * 0.022 + 4) * 1.5 + 0.35) * (0.6 + 0.4 * Math.abs(noise1(x * 0.11)));
    for (const lane of lanes) {
      panel(ctx, b.x, lane.y, b.w, laneH);
      label(ctx, lane.name, b.x + 10, lane.y + 16, lane.clean ? C.accent : C.muted);
      const mid = lane.y + laneH / 2 + 6;
      const amp = laneH / 2 - 14;
      for (let x = 12; x < b.w - 12; x += step) {
        const e = env(x);
        const v = lane.clean ? e * (0.55 + 0.45 * Math.abs(Math.sin(x * 0.7))) : clamp(e * 0.7 + 0.25 + r() * 0.45);
        const h = Math.max(1, v * amp);
        ctx.fillStyle = lane.clean ? (e > 0.05 ? C.accent : C.dim2) : C.muted;
        ctx.fillRect(b.x + x, mid - h, 1.6, h * 2);
      }
    }
    // model chip between lanes
    const chip = 'CONV-TASNET · ONNX INT8';
    ctx.font = MONO;
    const cw = ctx.measureText(chip).width + 22;
    const cy = b.y + 14 + laneH + gap / 2;
    rr(ctx, b.x + b.w / 2 - cw / 2, cy - 10, cw, 20, 10);
    ctx.fillStyle = C.raise;
    ctx.fill();
    ctx.strokeStyle = C.accent;
    ctx.stroke();
    label(ctx, chip, b.x + b.w / 2, cy + 4, C.accent, 'center');
    label(ctx, 'SI-SNR · STOI · PESQ', b.x + b.w, b.y + 4, C.muted, 'right');
  },

  /** LawEasy: a grounded answer with verified citations, fully offline. */
  chat(ctx, b) {
    const wide = b.w > 520;
    const cw = wide ? b.w * 0.6 : b.w;
    label(ctx, 'OFFLINE · LLAMA-3-8B · 16 GB', b.x, b.y + 9, C.accent);
    // question
    const q = 'Which precedent applies to this clause?';
    ctx.font = SANS(13);
    const qw = Math.min(cw * 0.86, ctx.measureText(q).width + 24);
    panel(ctx, b.x + cw - qw, b.y + 20, qw, 30, C.mid, C.panel2);
    txt(ctx, q, b.x + cw - qw + 12, b.y + 39, SANS(13), C.text, qw - 24);
    // answer
    const ay = b.y + 60;
    const ah = Math.min(b.h - 84, 118);
    panel(ctx, b.x, ay, cw * 0.92, ah);
    const lines = Math.max(2, Math.floor((ah - 24) / 14));
    for (let l = 0; l < lines; l++) {
      const lw = (cw * 0.92 - 70) * (l === lines - 1 ? 0.55 : 0.82 + (l % 2) * 0.12);
      ctx.fillStyle = C.ink(0.42);
      ctx.fillRect(b.x + 12, ay + 16 + l * 14, lw, 3);
      if (l === 0 || l === lines - 1) {
        const n = l === 0 ? '1' : '2';
        rr(ctx, b.x + 18 + lw, ay + 10 + l * 14, 18, 14, 3);
        ctx.fillStyle = C.accent;
        ctx.fill();
        txt(ctx, n, b.x + 27 + lw, ay + 21 + l * 14, '600 10px "JetBrains Mono", monospace', C.onAccent, 20, 'center');
      }
    }
    label(ctx, '✓ CITATIONS VERIFIED', b.x, ay + ah + 18, C.accent);
    if (!wide) return;
    // sources
    const sx = b.x + cw + 20;
    const sw = b.x + b.w - sx;
    label(ctx, 'SOURCES', sx, b.y + 9);
    const docs: [string, string, boolean][] = [
      ['judgment_2019.pdf', 'p. 14', true],
      ['contract_scan.pdf', 'OCR · p. 3', false],
      ['order_2021.pdf', 'p. 7', true],
      ['statute_excerpt.pdf', '§ 4', false],
    ];
    const rowH = Math.min(44, (b.h - 26) / docs.length);
    let cite = 0;
    docs.forEach(([name, page, used], i) => {
      const y = b.y + 20 + i * rowH;
      panel(ctx, sx, y, sw, rowH - 6, used ? C.accent : C.dim);
      ctx.strokeStyle = used ? C.accent : C.mid;
      ctx.strokeRect(sx + 10.5, y + (rowH - 6) / 2 - 7.5, 11, 15);
      txt(ctx, name, sx + 30, y + (rowH - 6) / 2 - 1, SANS(12.5, 500), C.text, sw - 64);
      txt(ctx, page, sx + 30, y + (rowH - 6) / 2 + 12, MONO, C.muted, sw - 64);
      if (used) txt(ctx, `[${++cite}]`, sx + sw - 10, y + (rowH - 6) / 2 + 4, MONO, C.accent, 40, 'right');
    });
  },

  /** BreathMumbai: last 48 h of AQI, an anomaly, and the 24 h forecast. */
  aqi(ctx, b, r) {
    label(ctx, 'MUMBAI · AQI', b.x, b.y + 9, C.text);
    label(ctx, '— OBSERVED   - - FORECAST   ○ ANOMALY', b.x + b.w, b.y + 9, C.muted, 'right');
    const c = { x: b.x + 30, y: b.y + 26, w: b.w - 30, h: b.h - 46 };
    const maxV = 250;
    const Y = (v: number) => c.y + c.h - (v / maxV) * c.h;
    for (const v of [50, 100, 150, 200]) {
      ctx.fillStyle = C.dim;
      ctx.fillRect(c.x, Y(v), c.w, 1);
      label(ctx, String(v), c.x - 6, Y(v) + 4, C.mid, 'right');
    }
    const past = 48;
    const fut = 24;
    const N = past + fut;
    const X = (i: number) => c.x + (i / (N - 1)) * c.w;
    const f = (i: number) => 120 + Math.sin((i / 24) * Math.PI * 2 - 1) * 38 + noise1(i * 0.25 + 7) * 22;
    const spike = 30;
    const obs = (i: number) => f(i) + (i === spike ? 75 : 0) + (r() - 0.5) * 10;
    ctx.beginPath();
    for (let i = 0; i < past; i++) i ? ctx.lineTo(X(i), Y(obs(i))) : ctx.moveTo(X(i), Y(obs(i)));
    ctx.strokeStyle = C.light;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // forecast band + line
    ctx.beginPath();
    for (let i = past - 1; i < N; i++) ctx.lineTo(X(i), Y(f(i) + 8 + (i - past) * 1.3));
    for (let i = N - 1; i >= past - 1; i--) ctx.lineTo(X(i), Y(f(i) - 8 - (i - past) * 1.3));
    ctx.closePath();
    ctx.fillStyle = C.acc(0.09);
    ctx.fill();
    ctx.beginPath();
    for (let i = past - 1; i < N; i++) i === past - 1 ? ctx.moveTo(X(i), Y(f(i))) : ctx.lineTo(X(i), Y(f(i)));
    ctx.strokeStyle = C.accent;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 1;
    // anomaly
    ctx.beginPath();
    ctx.arc(X(spike), Y(obs(spike) - 2), 9, 0, Math.PI * 2);
    ctx.strokeStyle = C.accent;
    ctx.stroke();
    // now marker + axis labels
    ctx.fillStyle = C.accent;
    ctx.fillRect(X(past - 1), c.y, 1, c.h);
    const by = c.y + c.h + 16;
    label(ctx, '−48 H', c.x, by);
    label(ctx, 'NOW', X(past - 1), by, C.accent, 'center');
    label(ctx, '+24 H', c.x + c.w, by, C.muted, 'right');
  },

  /** Mutual funds: NAV with walk-forward forecast + SHAP drivers. */
  funds(ctx, b, r) {
    const wide = b.w > 520;
    const cw = wide ? b.w * 0.62 : b.w;
    label(ctx, 'NAV · DAILY · ~20,000 FUNDS', b.x, b.y + 9, C.text);
    drawCandles(ctx, { x: b.x, y: b.y + 26, w: cw, h: b.h - 30 }, r);
    if (!wide) return;
    const sx = b.x + cw + 24;
    const sw = b.x + b.w - sx;
    label(ctx, 'SHAP · TOP DRIVERS', sx, b.y + 9);
    const feats: [string, number][] = [
      ['Rolling Sharpe', 0.86],
      ['Rolling Alpha', 0.64],
      ['Rolling Beta', 0.47],
      ['NAV momentum', 0.33],
      ['Drift score', 0.18],
    ];
    const rowH = Math.min(38, (b.h - 30) / feats.length);
    feats.forEach(([name, v], i) => {
      const y = b.y + 30 + i * rowH;
      txt(ctx, name, sx, y + 8, SANS(12.5, 500), i === 0 ? C.text : C.light, sw);
      ctx.fillStyle = C.dim;
      ctx.fillRect(sx, y + 15, sw, 4);
      ctx.fillStyle = i === 0 ? C.accent : C.muted;
      ctx.fillRect(sx, y + 15, sw * v, 4);
    });
  },
};

const painters: Record<ArtKind, Painter> = {
  ...mockups,
  /** Noisy input (left) vs enhanced output (right). */
  spectrogram(ctx, b, r) {
    const cols = Math.round(b.w / 9);
    const rows = Math.round(b.h / 9);
    const cw = b.w / cols;
    const ch = b.h / rows;
    const split = Math.floor(cols / 2);
    for (let c = 0; c < cols; c++) {
      const f0 = 0.07 + noise1(c * 0.06 + 3) * 0.02;
      const env = clamp(noise1(c * 0.16) * 1.4 + 0.45);
      for (let k = 0; k < rows; k++) {
        const fy = 1 - k / rows;
        let e = 0;
        for (let hm = 1; hm <= 9; hm++) {
          const d = fy - hm * f0;
          e += Math.exp(-(d * d) / (2 * 0.009 * 0.009)) / Math.sqrt(hm);
        }
        e *= env;
        if (c < split) e += r() * 0.55 + noise2(c * 0.3, k * 0.3) * 0.3;
        e = clamp(e);
        if (e < 0.08) continue;
        ctx.fillStyle =
          c >= split && e > 0.3
            ? C.acc(0.25 + e * 0.75)
            : C.ink(e * 0.5);
        ctx.fillRect(b.x + c * cw, b.y + k * ch, cw - 1.5, ch - 1.5);
      }
    }
    const sx = b.x + split * cw - 1;
    ctx.fillStyle = C.accent;
    ctx.fillRect(sx, b.y - 10, 1, b.h + 20);
    label(ctx, 'IN · NOISY', b.x, b.y - 10);
    label(ctx, 'OUT · ENHANCED', sx + 10, b.y - 10, C.accent);
  },

  /** Retrieval: chunks → query → grounded answer with citations. */
  graph(ctx, b, r) {
    const n = 12;
    const colW = b.w * 0.17;
    const gap = 10;
    const chH = (b.h - gap * (n / 2 - 1)) / (n / 2);
    const picked = new Set<number>();
    while (picked.size < 3) picked.add(Math.floor(r() * n));
    const qx = b.x + b.w * 0.58;
    const qy = b.y + b.h * 0.5;
    const chunks: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = b.x + col * (colW + gap);
      const y = b.y + row * (chH + gap);
      chunks.push([x + colW, y + chH / 2]);
      ctx.strokeStyle = picked.has(i) ? C.accent : C.dim;
      ctx.strokeRect(x + 0.5, y + 0.5, colW, chH);
      ctx.fillStyle = picked.has(i) ? C.ink(0.5) : C.dim;
      const lines = Math.max(2, Math.floor(chH / 9) - 1);
      for (let l = 0; l < lines; l++) ctx.fillRect(x + 8, y + 8 + l * 8, (colW - 16) * (0.5 + r() * 0.5), 2);
    }
    chunks.forEach(([x, y], i) => {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + (qx - x) * 0.5, y, x + (qx - x) * 0.5, qy, qx - 16, qy);
      ctx.strokeStyle = picked.has(i) ? C.accent : C.ink(0.06);
      ctx.lineWidth = picked.has(i) ? 1.2 : 1;
      ctx.stroke();
    });
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(qx, qy, 16, 0, Math.PI * 2);
    ctx.strokeStyle = C.accent;
    ctx.stroke();
    ctx.fillStyle = C.accent;
    ctx.beginPath();
    ctx.arc(qx, qy, 3, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, 'LLM', qx, qy + 36, C.light, 'center');
    // answer
    const ax = qx + 46;
    const aw = b.x + b.w - ax;
    ctx.strokeStyle = C.mid;
    ctx.strokeRect(ax + 0.5, b.y + b.h * 0.3, aw, b.h * 0.4);
    ctx.fillStyle = C.ink(0.55);
    const answerLines = Math.max(4, Math.floor((b.h * 0.4 - 24) / 12));
    for (let l = 0; l < answerLines; l++) {
      const ly = b.y + b.h * 0.3 + 16 + l * 12;
      const lw = (aw - 32) * (0.55 + r() * 0.45);
      ctx.fillRect(ax + 12, ly, lw, 2);
      if (l % 2 === 1) {
        ctx.fillStyle = C.accent;
        ctx.fillRect(ax + 16 + lw, ly - 2, 10, 6);
        ctx.fillStyle = C.ink(0.55);
      }
    }
    label(ctx, 'TOP-K · BM25 + DENSE', b.x, b.y - 10);
    label(ctx, 'CITED ✓', ax, b.y + b.h * 0.3 - 10, C.accent);
  },

  /** Pollution field as contour lines, with monitoring stations. */
  contour(ctx, b, r) {
    const res = 8;
    const nx = Math.ceil(b.w / res);
    const ny = Math.ceil(b.h / res);
    const ox = r() * 50;
    const oy = r() * 50;
    const f = (i: number, j: number) =>
      noise2(ox + i * 0.035, oy + j * 0.035) * 0.65 + noise2(ox + i * 0.09, oy + j * 0.09) * 0.35;
    const field: number[][] = [];
    for (let i = 0; i <= nx; i++) {
      field[i] = [];
      for (let j = 0; j <= ny; j++) field[i][j] = f(i, j);
    }
    const levels = 12;
    for (let L = 1; L < levels; L++) {
      const iso = 0.15 + (L / levels) * 0.7;
      ctx.strokeStyle = L === 8 ? C.accent : L % 3 === 0 ? C.mid : C.dim;
      ctx.beginPath();
      for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny; j++) {
          const a = field[i][j], bb = field[i + 1][j], c = field[i + 1][j + 1], d = field[i][j + 1];
          const pts: [number, number][] = [];
          const edge = (v1: number, v2: number, x1: number, y1: number, x2: number, y2: number) => {
            if ((v1 < iso) !== (v2 < iso)) {
              const t = (iso - v1) / (v2 - v1);
              pts.push([b.x + (x1 + (x2 - x1) * t) * res, b.y + (y1 + (y2 - y1) * t) * res]);
            }
          };
          edge(a, bb, i, j, i + 1, j);
          edge(bb, c, i + 1, j, i + 1, j + 1);
          edge(c, d, i + 1, j + 1, i, j + 1);
          edge(d, a, i, j + 1, i, j);
          for (let p = 0; p + 1 < pts.length; p += 2) {
            ctx.moveTo(pts[p][0], pts[p][1]);
            ctx.lineTo(pts[p + 1][0], pts[p + 1][1]);
          }
        }
      }
      ctx.stroke();
    }
    for (let s = 0; s < 7; s++) {
      const x = b.x + b.w * (0.1 + r() * 0.8);
      const y = b.y + b.h * (0.1 + r() * 0.8);
      ctx.fillStyle = s === 0 ? C.accent : C.light;
      ctx.fillRect(x - 3, y - 3, 6, 6);
      label(ctx, `ST.${String(s + 1).padStart(2, '0')}`, x + 8, y + 4, s === 0 ? C.accent : C.muted);
    }
    label(ctx, 'AQI FIELD · T+24H', b.x, b.y - 10);
  },

  /** NAV candles with a forecast tail. */
  candles(ctx, b, r) {
    const n = Math.round(b.w / 14);
    const split = Math.round(n * 0.78);
    const vals: number[] = [];
    let v = 0;
    for (let i = 0; i < n; i++) {
      v += (r() - 0.46) * 1.2;
      vals.push(v);
    }
    const lo = Math.min(...vals) - 2;
    const hi = Math.max(...vals) + 2;
    const Y = (x: number) => b.y + b.h - ((x - lo) / (hi - lo)) * b.h;
    const cw = b.w / n;
    let prev = vals[0];
    for (let i = 0; i < split; i++) {
      const o = prev;
      const c = vals[i];
      const top = Math.max(o, c) + r() * 0.8;
      const bot = Math.min(o, c) - r() * 0.8;
      const x = b.x + i * cw + cw / 2;
      ctx.fillStyle = C.mid;
      ctx.fillRect(x, Y(top), 1, Y(bot) - Y(top));
      const up = c >= o;
      ctx.fillStyle = up ? C.light : C.raise;
      ctx.strokeStyle = up ? C.light : C.mid;
      const yTop = Y(Math.max(o, c));
      const hgt = Math.max(1.5, Y(Math.min(o, c)) - yTop);
      ctx.fillRect(x - cw * 0.3, yTop, cw * 0.6, hgt);
      if (!up) ctx.strokeRect(x - cw * 0.3 + 0.5, yTop + 0.5, cw * 0.6 - 1, hgt - 1);
      prev = c;
    }
    // moving average + forecast
    ctx.beginPath();
    for (let i = 4; i < n; i++) {
      let s = 0;
      for (let k = 0; k < 5; k++) s += vals[i - k];
      const x = b.x + i * cw + cw / 2;
      i === 4 ? ctx.moveTo(x, Y(s / 5)) : ctx.lineTo(x, Y(s / 5));
      if (i === split) {
        ctx.strokeStyle = C.accent;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, Y(s / 5));
        ctx.setLineDash([3, 4]);
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);
    const sx = b.x + split * cw;
    ctx.fillStyle = C.dim;
    ctx.fillRect(sx, b.y, 1, b.h);
    label(ctx, 'WALK-FORWARD →', sx + 8, b.y + 12, C.accent);
    label(ctx, 'NAV · α β SHARPE', b.x, b.y - 10);
  },

  /** 2,441 packages; a handful matched. */
  nodes(ctx, b, r) {
    const cols = Math.round(Math.sqrt((2441 * b.w) / b.h));
    const rows = Math.ceil(2441 / cols);
    const gx = b.w / cols;
    const gy = b.h / rows;
    const hits = new Set<number>();
    while (hits.size < 5) hits.add(Math.floor(r() * 2441));
    let best = -1;
    for (let i = 0; i < 2441; i++) {
      const x = b.x + (i % cols) * gx + gx / 2;
      const y = b.y + Math.floor(i / cols) * gy + gy / 2;
      if (hits.has(i)) {
        if (best < 0) best = i;
        ctx.fillStyle = C.accent;
        ctx.fillRect(x - 2, y - 2, 4, 4);
        ctx.strokeStyle = C.accent;
        ctx.strokeRect(x - 6.5, y - 6.5, 13, 13);
      } else {
        ctx.fillStyle = noise2(i * 0.05, 1) > 0.6 ? C.mid : C.dim2;
        ctx.fillRect(x - 1, y - 1, 2, 2);
      }
    }
    label(ctx, '2,441 HBP PACKAGES', b.x, b.y - 10);
    label(ctx, 'MATCH ↗', b.x + b.w, b.y - 10, C.accent, 'right');
  },

  /** Goal → sub-tasks → tools. */
  agents(ctx, b, r) {
    const gx = b.x + 20;
    const gy = b.y + b.h / 2;
    const tools = ['RAG', 'WEB', 'LLM'];
    const tx = b.x + b.w - 40;
    const toolY = tools.map((_, i) => b.y + b.h * (0.2 + i * 0.3));
    const tasks = 5;
    const mx = b.x + b.w * 0.45;
    for (let i = 0; i < tasks; i++) {
      const ty = b.y + b.h * (0.1 + (i / (tasks - 1)) * 0.8);
      const tool = Math.floor(r() * 3);
      const active = i === 2;
      ctx.strokeStyle = active ? C.accent : C.mid;
      ctx.beginPath();
      ctx.moveTo(gx + 8, gy);
      ctx.lineTo(gx + (mx - gx) * 0.4, gy);
      ctx.lineTo(gx + (mx - gx) * 0.4, ty);
      ctx.lineTo(mx - 40, ty);
      ctx.stroke();
      ctx.strokeRect(mx - 40.5, ty - 9.5, 80, 19);
      label(ctx, `T.${i + 1}`, mx, ty + 4, active ? C.accent : C.light, 'center');
      ctx.beginPath();
      ctx.moveTo(mx + 40, ty);
      const bx = mx + 40 + (tx - mx - 40) * 0.5;
      ctx.lineTo(bx, ty);
      ctx.lineTo(bx, toolY[tool]);
      ctx.lineTo(tx - 14, toolY[tool]);
      ctx.strokeStyle = active ? C.accent : C.dim;
      ctx.stroke();
    }
    ctx.fillStyle = C.accent;
    ctx.beginPath();
    ctx.arc(gx, gy, 6, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, 'GOAL', gx - 6, gy - 16, C.light);
    tools.forEach((t, i) => {
      ctx.strokeStyle = C.light;
      ctx.beginPath();
      ctx.arc(tx, toolY[i], 12, 0, Math.PI * 2);
      ctx.stroke();
      label(ctx, t, tx, toolY[i] + 30, C.light, 'center');
    });
    label(ctx, 'DECOMPOSE → ROUTE', b.x, b.y - 10);
  },

  /** Six defensive layers; attackers probing inward. */
  network(ctx, b, r) {
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const R = Math.min(b.w, b.h) / 2;
    const ringPts: [number, number][][] = [];
    for (let L = 0; L < 6; L++) {
      const rad = R * (0.18 + L * 0.164);
      ctx.strokeStyle = L % 2 ? C.dim : C.dim;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.stroke();
      const k = 6 + L * 3;
      const pts: [number, number][] = [];
      for (let i = 0; i < k; i++) {
        const a = (i / k) * Math.PI * 2 + L * 0.3;
        const p: [number, number] = [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad];
        pts.push(p);
        ctx.fillStyle = C.mid;
        ctx.fillRect(p[0] - 1.5, p[1] - 1.5, 3, 3);
      }
      ringPts.push(pts);
    }
    // defenders
    for (let d = 0; d < 3; d++) {
      const pts = ringPts[1 + d * 2];
      const p = pts[Math.floor(r() * pts.length)];
      ctx.fillStyle = C.light;
      ctx.fillRect(p[0] - 5, p[1] - 5, 10, 10);
    }
    // attackers + paths
    for (let a = 0; a < 2; a++) {
      let ang = r() * Math.PI * 2;
      const start = ang;
      ctx.beginPath();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = C.accent;
      const depth = 2 + a;
      ctx.moveTo(cx + Math.cos(start) * (R + 8), cy + Math.sin(start) * (R + 8));
      for (let L = 5; L >= 5 - depth; L--) {
        const rad = R * (0.18 + L * 0.164);
        if (L < 5) ang += (r() - 0.5) * 0.5;
        const x = cx + Math.cos(ang) * rad;
        const y = cy + Math.sin(ang) * rad;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      const ox = cx + Math.cos(start) * (R + 14);
      const oy = cy + Math.sin(start) * (R + 14);
      ctx.fillStyle = C.accent;
      ctx.beginPath();
      ctx.moveTo(ox, oy - 6);
      ctx.lineTo(ox + 6, oy + 5);
      ctx.lineTo(ox - 6, oy + 5);
      ctx.fill();
    }
    label(ctx, '2 ATK · 3 DEF · 6 LAYERS', b.x, b.y - 10);
  },

  /** 267 scenarios, two outcomes, one learned boundary. */
  scatter(ctx, b, r) {
    const bound = (u: number) => 0.5 + Math.sin(u * 5 + 1) * 0.16 + (u - 0.5) * 0.25;
    for (let i = 0; i < 267; i++) {
      const u = r();
      const v = r();
      const above = v > bound(u) + (r() - 0.5) * 0.12;
      const x = b.x + u * b.w;
      const y = b.y + (1 - v) * b.h;
      if (above) {
        ctx.fillStyle = C.light;
        ctx.beginPath();
        ctx.arc(x, y, 2.4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = C.mid;
        ctx.beginPath();
        ctx.arc(x, y, 2.6, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const u = i / 200;
      const x = b.x + u * b.w;
      const y = b.y + (1 - bound(u)) * b.h;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.lineWidth = 1;
    label(ctx, 'N = 267 SCENARIOS', b.x, b.y - 10);
  },

  blocks(ctx, b, r) {
    const n = 8;
    const s = Math.min(b.w, b.h) / n;
    const ox = b.x + (b.w - s * n) / 2;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const on = noise2(i * 0.6, j * 0.6) > 0.5 || r() > 0.82;
        ctx.fillStyle = i === 5 ? C.accent : on ? C.text : C.panel2;
        ctx.fillRect(ox + i * s + 2, b.y + j * s + 2, s - 4, s - 4);
      }
  },
};
